import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Generator, List, Optional

from ..config import settings
from ..utils.normalization import normalize_and_hash_email, normalize_and_hash_phone
from ..utils.time import parse_date_to_unix_seconds


CSV_HEADERS_FYBECA = [
    "CORREO",
    "CELULAR",
    "FACTURA",
    "NOMBRE_CATEGORIA",
    "COD_ITEM",
    "VENTA_NETA",
    "FECHA",
]


@dataclass
class TransformConfig:
    dataset_id: str
    event_name: str = "Purchase"
    upload_tag: Optional[str] = None
    timezone: str = settings.timezone_default


def iter_transform_events(input_csv_path: Path, config: TransformConfig, job_progress, progress_store) -> Generator[Dict, None, None]:
    """Yield events one-by-one from the CSV, updating progress as we go."""
    with input_csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        # Validate expected headers (best-effort)
        missing = [h for h in CSV_HEADERS_FYBECA if h not in reader.fieldnames]
        if missing:
            job_progress.status = "failed"
            job_progress.message = f"Faltan columnas: {', '.join(missing)}"
            progress_store.set(job_progress)
            return

        # Optionally count rows first to show progress percentage
        try:
            total = 0
            for _ in reader:
                total += 1
            job_progress.total_rows = total
            f.seek(0)
            reader = csv.DictReader(f)
        except Exception:
            pass

        for row in reader:
            raw = {k: (v or "").strip() for k, v in row.items()}
            if not any(raw.values()):
                continue

            email_h = normalize_and_hash_email(raw.get("CORREO"))
            phone_h = normalize_and_hash_phone(raw.get("CELULAR"), default_region="EC")
            if not email_h and not phone_h:
                job_progress.failed += 1
                progress_store.append_error(job_progress.job_id, raw, "Sin email ni teléfono válido")
                job_progress.processed_rows += 1
                progress_store.set(job_progress)
                continue

            event_time = parse_date_to_unix_seconds(raw.get("FECHA"), timezone_name=config.timezone)
            if not event_time:
                job_progress.failed += 1
                progress_store.append_error(job_progress.job_id, raw, "Fecha inválida")
                job_progress.processed_rows += 1
                progress_store.set(job_progress)
                continue

            try:
                value = float(raw.get("VENTA_NETA") or 0)
            except ValueError:
                value = 0.0

            factura = (raw.get("FACTURA") or "").strip()
            cod_item = (raw.get("COD_ITEM") or "").strip()
            categoria = (raw.get("NOMBRE_CATEGORIA") or "").strip()

            user_data = {}
            if email_h:
                user_data["em"] = email_h
            if phone_h:
                user_data["ph"] = phone_h

            custom_data = {
                "value": value,
                "currency": "USD",
                "order_id": factura or None,
                "content_ids": [cod_item] if cod_item else [],
                "content_type": "product",
                "content_category": categoria or None,
            }

            event = {
                "event_name": config.event_name,
                "event_time": event_time,
                "user_data": user_data,
                "custom_data": custom_data,
                "action_source": "physical_store",
                "event_id": factura or None,
            }

            job_progress.succeeded += 1
            job_progress.processed_rows += 1
            progress_store.set(job_progress)
            yield event


def iter_event_batches(input_csv_path: Path, config: TransformConfig, job_progress, progress_store, batch_size: int) -> Generator[List[Dict], None, None]:
    batch: List[Dict] = []
    for event in iter_transform_events(input_csv_path, config, job_progress, progress_store):
        batch.append(event)
        if len(batch) >= batch_size:
            yield batch
            batch = []
    if batch:
        yield batch


