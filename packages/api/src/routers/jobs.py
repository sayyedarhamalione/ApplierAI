from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from ..deps import SupabaseDep
from ..schemas import JobFilters, JobResponse, PaginatedJobs
from ..services.job_service import get_job_by_id, get_jobs

router = APIRouter()


@router.get("", response_model=PaginatedJobs)
async def list_jobs(
    db: SupabaseDep,
    min_score: Optional[float] = Query(None, ge=0.0, le=1.0, description="Min match score 0-1"),
    remote: Optional[bool] = Query(None),
    source: Optional[str] = Query(None, description="e.g. greenhouse, jobspy"),
    job_type: Optional[str] = Query(None, description="e.g. fulltime, contract"),
    date_from: Optional[datetime] = Query(None, description="ISO 8601 e.g. 2025-01-01"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedJobs:
    filters = JobFilters(
        min_score=min_score,
        remote=remote,
        source=source,
        job_type=job_type,
        date_from=date_from,
        page=page,
        page_size=page_size,
    )
    return await get_jobs(db, filters)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: SupabaseDep) -> JobResponse:
    job = await get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job