from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, HttpUrl, field_validator
import hashlib


class JobSource(str, Enum):
    JOBSPY = "jobspy"
    GREENHOUSE = "greenhouse"
    LEVER = "lever"
    ASHBY = "ashby"
    REMOTEOK = "remoteok"
    WWR = "weworkremotely"


class JobType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERNSHIP = "internship"
    UNKNOWN = "unknown"


class SalaryRange(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    currency: str = "USD"
    period: str = "year"  # year | month | hour


class Job(BaseModel):
    # Identity
    id: str                          # sha256(source + company + title + url)
    source: JobSource
    apply_url: str

    # Core
    title: str
    company: str
    location: Optional[str] = None
    remote: bool = False
    job_type: JobType = JobType.UNKNOWN

    # Content
    description: str
    salary: Optional[SalaryRange] = None
    tags: list[str] = []

    # Meta
    posted_at: Optional[datetime] = None
    scraped_at: datetime

    # Matching (filled by matcher, not scraper)
    match_score: Optional[float] = None

    @field_validator("description")
    @classmethod
    def strip_description(cls, v: str) -> str:
        return v.strip()

    @classmethod
    def make_id(cls, source: JobSource, company: str, title: str, url: str) -> str:
        raw = f"{source.value}::{company.lower()}::{title.lower()}::{url}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    class Config:
        use_enum_values = True
