import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


load_dotenv()


@dataclass
class Settings:
    meta_access_token: str = os.getenv("META_ACCESS_TOKEN", "")
    graph_api_version: str = os.getenv("GRAPH_API_VERSION", "v20.0")
    cors_allowed_origins: str = os.getenv("CORS_ALLOWED_ORIGINS", "")
    timezone_default: str = os.getenv("TIMEZONE_DEFAULT", "America/Guayaquil")
    uploads_dir: Path = Path(os.getenv("UPLOADS_DIR", "uploads"))
    batch_size: int = int(os.getenv("BATCH_SIZE", "999"))  # Meta permite máximo 1000 eventos por batch
    max_retries: int = int(os.getenv("MAX_RETRIES", "3"))
    retry_backoff_base: float = float(os.getenv("RETRY_BACKOFF_BASE", "0.5"))

    def ensure_dirs(self) -> None:
        self.uploads_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()


