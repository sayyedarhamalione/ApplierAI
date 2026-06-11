"""
JobSpy wrapper — scrapes LinkedIn, Indeed, Glassdoor, ZipRecruiter.
Normalizes to canonical Job schema.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from jobspy import scrape_jobs

from ..schema.models import Job, JobSource, JobType, SalaryRange

logger = logging.getLogger(__name__)

_JOB_TYPE_MAP = {
    "fulltime": JobType.FULL_TIME,
    "full-time": JobType.FULL_TIME,
    "full_time": JobType.FULL_TIME,
    "parttime": JobType.PART_TIME,
    "part-time": JobType.PART_TIME,
    "contract": JobType.CONTRACT,
    "internship": JobType.INTERNSHIP,
}


def _parse_salary(row: dict) -> Optional[SalaryRange]:
    min_val = row.get("min_amount")
    max_val = row.get("max_amount")
    if not min_val and not max_val:
        return None
    return SalaryRange(
        min=float(min_val) if min_val else None,
        max=float(max_val) if max_val else None,
        currency=row.get("currency", "USD") or "USD",
        period=row.get("interval", "year") or "year",
    )


def _row_to_job(row: dict) -> Optional[Job]:
    try:
        title = row.get("title", "").strip()
        company = row.get("company", "").strip()
        url = row.get("job_url", "").strip()
        description = row.get("description") or ""

        if not all([title, company, url]):
            return None

        job_type_raw = str(row.get("job_type") or "").lower()
        job_type = _JOB_TYPE_MAP.get(job_type_raw, JobType.UNKNOWN)

        is_remote = bool(row.get("is_remote")) or "remote" in (
            row.get("location") or ""
        ).lower()

        posted_at = None
        if raw_date := row.get("date_posted"):
            try:
                posted_at = datetime.fromisoformat(str(raw_date)).replace(
                    tzinfo=timezone.utc
                )
            except (ValueError, TypeError):
                pass

        return Job(
            id=Job.make_id(JobSource.JOBSPY, company, title, url),
            source=JobSource.JOBSPY,
            apply_url=url,
            title=title,
            company=company,
            location=row.get("location"),
            remote=is_remote,
            job_type=job_type,
            description=description,
            salary=_parse_salary(row),
            tags=[],
            posted_at=posted_at,
            scraped_at=datetime.now(timezone.utc),
        )
    except Exception as exc:
        logger.warning("jobspy row parse fail: %s", exc)
        return None


def fetch_jobspy(
    query: str,
    location: str = "Remote",
    results_wanted: int = 50,
    site_names: list[str] | None = None,
    hours_old: int = 72,
    country_indeed: str = "USA",
) -> list[Job]:
    """
    Scrape jobs via JobSpy.

    Args:
        query: Job title / keywords, e.g. "backend engineer python"
        location: City or "Remote"
        results_wanted: Per-site target (JobSpy internally multiplies)
        site_names: Subset of ["linkedin","indeed","glassdoor","zip_recruiter"]
        hours_old: Only jobs posted within N hours
        country_indeed: Indeed country context

    Returns:
        List of normalized Job objects
    """
    sites = site_names or ["linkedin", "indeed", "glassdoor", "zip_recruiter"]
    logger.info("jobspy fetch | query=%r location=%r sites=%s", query, location, sites)

    try:
        df = scrape_jobs(
            site_name=sites,
            search_term=query,
            location=location,
            results_wanted=results_wanted,
            hours_old=hours_old,
            country_indeed=country_indeed,
            description_format="markdown",
            linkedin_fetch_description=True,
        )
    except Exception as exc:
        logger.error("jobspy scrape error: %s", exc)
        return []

    rows = df.to_dict(orient="records") if df is not None and len(df) > 0 else []
    jobs = [j for row in rows if (j := _row_to_job(row)) is not None]
    logger.info("jobspy done | raw=%d normalized=%d", len(rows), len(jobs))
    return jobs
