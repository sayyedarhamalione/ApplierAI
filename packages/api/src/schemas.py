from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ── Requests ──────────────────────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    sources: List[Literal["jobspy", "greenhouse", "lever", "ashby", "remoteok", "wwr"]] = Field(
        default=["jobspy", "greenhouse", "lever", "ashby"],
        description="Which scrapers to run",
    )
    keywords: List[str] = Field(default=["software engineer", "backend engineer"])
    location: str = Field(default="Remote")
    limit_per_source: int = Field(default=50, ge=1, le=500)


class JobFilters(BaseModel):
    min_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    remote: Optional[bool] = None
    source: Optional[str] = None
    job_type: Optional[str] = None
    date_from: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


# ── Responses ─────────────────────────────────────────────────────────────────

class ScrapeStatusResponse(BaseModel):
    task_id: str
    status: Literal["queued", "running", "done", "failed"]
    message: str


class SalaryRangeOut(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    currency: str = "USD"
    interval: Optional[str] = None


class JobResponse(BaseModel):
    id: str
    title: str
    company: str
    location: Optional[str] = None
    remote: bool = False
    job_type: Optional[str] = None
    source: str
    apply_url: Optional[str] = None
    description: Optional[str] = None
    salary: Optional[SalaryRangeOut] = None
    match_score: Optional[float] = None
    posted_at: Optional[datetime] = None
    scraped_at: datetime


class PaginatedJobs(BaseModel):
    items: List[JobResponse]
    total: int
    page: int
    page_size: int
    pages: int