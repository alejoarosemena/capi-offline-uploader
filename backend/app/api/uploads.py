import asyncio
import logging
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..config import settings
from ..services.capi_client import CapiClient
from ..services.progress import JobProgress, progress_store
from ..services.transform import TransformConfig, iter_event_batches

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/uploads")
async def create_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    dataset_id: str = Form(...),
    event_name: str = Form("Purchase"),
    upload_tag: Optional[str] = Form(None),
    timezone: str = Form(None),
):
    if not settings.meta_access_token:
        raise HTTPException(status_code=500, detail="META_ACCESS_TOKEN no configurado en backend")

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .csv")

    job_id = str(uuid.uuid4())
    job_dir = progress_store.job_dir(job_id)
    input_path = progress_store.input_path(job_id)

    # Persist file to disk in chunks to support large files
    with input_path.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)

    progress = JobProgress(job_id=job_id, status="running")
    progress_store.set(progress)

    tz = timezone or settings.timezone_default
    cfg = TransformConfig(dataset_id=dataset_id, event_name=event_name, upload_tag=upload_tag, timezone=tz)

    background_tasks.add_task(_process_job, job_id, cfg)

    return {"job_id": job_id}


async def _process_job(job_id: str, cfg: TransformConfig) -> None:
    logger.info(f"Starting job {job_id} for dataset {cfg.dataset_id}")
    progress = progress_store.get(job_id)
    if not progress:
        progress = JobProgress(job_id=job_id, status="running")

    try:
        # Stream-transform and send in batches without keeping all events in memory
        failed_batches = 0
        total_batches = 0
        client = CapiClient(access_token=settings.meta_access_token)
        try:
            for batch in iter_event_batches(progress_store.input_path(job_id), cfg, progress, progress_store, settings.batch_size):
                # Check if cancellation was requested
                current_progress = progress_store.get(job_id)
                if current_progress and current_progress.should_cancel:
                    logger.info(f"Job {job_id} cancelled by user at batch {total_batches}")
                    progress.status = "cancelled"
                    progress.message = f"Cancelado por usuario después de {total_batches} lotes"
                    progress_store.set(progress)
                    return
                
                total_batches += 1
                logger.info(f"Processing batch {total_batches} ({len(batch)} events)")
                ok, info = await client.send_batch(cfg.dataset_id, batch, upload_tag=cfg.upload_tag)
                if not ok:
                    failed_batches += 1
                    logger.error(f"Batch {total_batches} failed: {info}")
        finally:
            await client.close()
        
        logger.info(f"Job {job_id} finished: {total_batches} batches, {failed_batches} failed")
        if failed_batches > 0:
            progress.status = "failed"
            progress.message = f"Fallaron {failed_batches} lotes al enviar a Meta"
        else:
            progress.status = "completed"
            progress.message = "Completado"
        progress_store.set(progress)
    except Exception as exc:
        logger.error(f"Job {job_id} crashed: {exc}", exc_info=True)
        progress.status = "failed"
        progress.message = f"Error: {exc}"
        progress_store.set(progress)


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    progress = progress_store.get(job_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return progress.to_dict()


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    progress = progress_store.get(job_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    
    if progress.status in ("completed", "failed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"No se puede cancelar un job con estado: {progress.status}")
    
    # Set cancellation flag
    progress.should_cancel = True
    progress_store.set(progress)
    logger.info(f"Cancellation requested for job {job_id}")
    
    return {"message": "Cancelación solicitada", "job_id": job_id}


@router.post("/jobs/cancel-all")
async def cancel_all_jobs():
    """Cancel all running and pending jobs"""
    cancelled_jobs = []
    jobs_dir = settings.uploads_dir
    
    if not jobs_dir.exists():
        return {"message": "No hay jobs", "cancelled": []}
    
    for job_dir in jobs_dir.iterdir():
        if job_dir.is_dir():
            job_id = job_dir.name
            progress = progress_store.get(job_id)
            if progress and progress.status in ("running", "pending"):
                progress.should_cancel = True
                progress_store.set(progress)
                cancelled_jobs.append(job_id)
                logger.info(f"Cancellation requested for job {job_id} (via cancel-all)")
    
    return {
        "message": f"Se solicitó cancelación de {len(cancelled_jobs)} jobs",
        "cancelled": cancelled_jobs
    }


@router.get("/jobs/{job_id}/errors")
async def download_errors(job_id: str):
    path = progress_store.errors_csv_path(job_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="No hay archivo de errores")
    return FileResponse(path, media_type="text/csv", filename="errors.csv")


