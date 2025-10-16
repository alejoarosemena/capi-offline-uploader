import csv
import json
from dataclasses import dataclass, asdict
from pathlib import Path
from threading import Lock
from typing import Optional

from ..config import settings


@dataclass
class JobProgress:
    job_id: str
    total_rows: int = 0
    processed_rows: int = 0
    succeeded: int = 0
    failed: int = 0
    status: str = "pending"  # pending | running | completed | failed | cancelled
    message: str = ""
    should_cancel: bool = False  # Flag to signal cancellation

    def to_dict(self) -> dict:
        return asdict(self)


class ProgressStore:
    def __init__(self, base_dir: Path) -> None:
        self._base_dir = base_dir
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()

    def job_dir(self, job_id: str) -> Path:
        d = self._base_dir / job_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    def progress_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "progress.json"

    def errors_csv_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "errors.csv"

    def log_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "run.log"

    def input_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "input.csv"

    def set(self, progress: JobProgress) -> None:
        with self._lock:
            self.progress_path(progress.job_id).write_text(json.dumps(progress.to_dict(), ensure_ascii=False))

    def get(self, job_id: str) -> Optional[JobProgress]:
        try:
            data = json.loads(self.progress_path(job_id).read_text())
            return JobProgress(**data)
        except Exception:
            return None

    def append_error(self, job_id: str, row: dict, reason: str) -> None:
        with self._lock:
            path = self.errors_csv_path(job_id)
            file_exists = path.exists()
            with path.open("a", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=[*row.keys(), "_error_reason"]) if row else csv.DictWriter(f, fieldnames=["_error_reason"])
                if not file_exists:
                    writer.writeheader()
                payload = {**row, "_error_reason": reason} if row else {"_error_reason": reason}
                writer.writerow(payload)


progress_store = ProgressStore(settings.uploads_dir)


