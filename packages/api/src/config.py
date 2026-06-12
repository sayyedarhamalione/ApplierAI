from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_key: str

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "jobs"

    # API
    cors_origins: List[str] = ["http://localhost:3000"]
    scrape_timeout_seconds: int = 300

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()