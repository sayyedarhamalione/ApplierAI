"""Configuration models for scraping, matching, and applying."""

from pydantic import BaseModel, Field


class SearchConfig(BaseModel):
    """Job search parameters."""

    keywords: list[str] = ["software engineer"]
    locations: list[str] = ["Remote"]
    salary_min: int | None = None
    job_types: list[str] = ["full-time"]
    experience_level: list[str] = ["mid-senior"]


class MatchingConfig(BaseModel):
    """Semantic matching parameters."""

    score_threshold: float = Field(default=0.65, ge=0.0, le=1.0)
    max_jobs_per_run: int = Field(default=50, ge=1)
    daily_apply_limit: int = Field(default=25, ge=1)


class PlatformConfig(BaseModel):
    """Per-platform settings."""

    enabled: bool = True
    easy_apply_only: bool = False
    cookies_file: str = ""
    proxy: str = "residential-us"


class ApplyConfig(BaseModel):
    """Application behavior settings."""

    cover_letter: bool = True
    follow_up_days: int = 5
    skip_if_applied: bool = True


class Preferences(BaseModel):
    """Top-level preferences loaded from preferences.yaml."""

    search: SearchConfig = Field(default_factory=SearchConfig)
    matching: MatchingConfig = Field(default_factory=MatchingConfig)
    platforms: dict[str, PlatformConfig] = Field(default_factory=lambda: {
        "linkedin": PlatformConfig(),
        "indeed": PlatformConfig(),
        "wellfound": PlatformConfig(),
    })
    apply: ApplyConfig = Field(default_factory=ApplyConfig)


class Secrets(BaseModel):
    """API keys and sensitive configuration (loaded from .env)."""

    anthropic_api_key: str = ""
    apify_api_token: str = ""
    supabase_url: str = ""
    supabase_key: str = ""
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    proxy_url: str = ""
    temporal_host: str = "localhost:7233"
