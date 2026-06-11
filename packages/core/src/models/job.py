"""Job data models."""

from datetime import datetime
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field


class Platform(str, Enum):
    LINKEDIN = "linkedin"
    INDEED = "indeed"
    WELLFOUND = "wellfound"


class ApplyType(str, Enum):
    EASY_APPLY = "easy_apply"
    FULL_FORM = "full_form"


class ApplyStatus(str, Enum):
    QUEUED = "queued"
    APPLYING = "applying"
    APPLIED = "applied"
    FAILED = "failed"
    PAUSED = "paused"
    CAPTCHA_BLOCKED = "captcha_blocked"


class KanbanStatus(str, Enum):
    APPLIED = "applied"
    VIEWED = "viewed"
    INTERVIEW = "interview"
    REJECTED = "rejected"
    OFFER = "offer"


class Job(BaseModel):
    """Raw job listing scraped from a platform."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    platform: Platform
    external_id: str
    title: str
    company: str
    location: str | None = None
    salary_range: str | None = None
    description: str | None = None
    url: str
    posted_date: datetime | None = None
    scraped_at: datetime = Field(default_factory=datetime.utcnow)
    is_easy_apply: bool = False


class JobMatch(BaseModel):
    """Job with semantic match score from Qdrant."""

    job: Job
    match_score: float = Field(ge=0.0, le=1.0)
    embedding_id: str | None = None

    @property
    def passes_threshold(self) -> bool:
        """Check if score meets default threshold (0.65)."""
        return self.match_score >= 0.65


class Application(BaseModel):
    """An application attempt for a job."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    job_id: str
    status: ApplyStatus = ApplyStatus.QUEUED
    apply_type: ApplyType | None = None
    cover_letter: str | None = None
    applied_at: datetime | None = None
    error: str | None = None
    screenshot_url: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ApplicationStatus(BaseModel):
    """Kanban board status tracking for an application."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    application_id: str
    status: KanbanStatus = KanbanStatus.APPLIED
    platform_status: str | None = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ScrapeRun(BaseModel):
    """A single scraping execution record."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    platform: Platform
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
    jobs_found: int = 0
    jobs_new: int = 0
    status: str = "running"  # running | completed | failed
