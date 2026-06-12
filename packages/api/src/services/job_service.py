from __future__ import annotations

import math
from typing import Optional

from supabase import AsyncClient

from ..schemas import JobFilters, JobResponse, PaginatedJobs


async def get_jobs(db: AsyncClient, filters: JobFilters) -> PaginatedJobs:
    offset = (filters.page - 1) * filters.page_size

    # Count query
    count_q = db.table("jobs").select("id", count="exact")
    count_q = _apply_filters(count_q, filters)
    count_res = await count_q.execute()
    total = count_res.count or 0

    # Data query
    q = db.table("jobs").select("*")
    q = _apply_filters(q, filters)
    q = q.order("match_score", desc=True).order("scraped_at", desc=True)
    q = q.range(offset, offset + filters.page_size - 1)
    res = await q.execute()

    items = [_row_to_job(row) for row in (res.data or [])]
    pages = math.ceil(total / filters.page_size) if total else 0

    return PaginatedJobs(
        items=items,
        total=total,
        page=filters.page,
        page_size=filters.page_size,
        pages=pages,
    )


async def get_job_by_id(db: AsyncClient, job_id: str) -> Optional[JobResponse]:
    res = await db.table("jobs").select("*").eq("id", job_id).single().execute()
    if not res.data:
        return None
    return _row_to_job(res.data)


def _apply_filters(q, filters: JobFilters):
    if filters.min_score is not None:
        q = q.gte("match_score", filters.min_score)
    if filters.remote is not None:
        q = q.eq("remote", filters.remote)
    if filters.source:
        q = q.eq("source", filters.source)
    if filters.job_type:
        q = q.eq("job_type", filters.job_type)
    if filters.date_from:
        q = q.gte("posted_at", filters.date_from.isoformat())
    return q


def _row_to_job(row: dict) -> JobResponse:
    salary = None
    if row.get("salary_min") or row.get("salary_max"):
        salary = {
            "min": row.get("salary_min"),
            "max": row.get("salary_max"),
            "currency": row.get("salary_currency", "USD"),
            "interval": row.get("salary_interval"),
        }
    return JobResponse(
        id=row["id"],
        title=row["title"],
        company=row["company"],
        location=row.get("location"),
        remote=row.get("remote", False),
        job_type=row.get("job_type"),
        source=row["source"],
        apply_url=row.get("apply_url"),
        description=row.get("description"),
        salary=salary,
        match_score=row.get("match_score"),
        posted_at=row.get("posted_at"),
        scraped_at=row["scraped_at"],
    )