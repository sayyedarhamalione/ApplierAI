"""
Greenhouse crawler.
API: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from ..schema.models import Job, JobSource, JobType, SalaryRange
from .base import ATSCrawler

logger = logging.getLogger(__name__)

_BASE = "https://boards-api.greenhouse.io/v1/boards/{slug}/jobs"


def _parse_gh_date(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def _extract_salary(metadata: list[dict]) -> SalaryRange | None:
    for field in metadata:
        name = (field.get("name") or "").lower()
        if "salary" in name or "compensation" in name:
            val = field.get("value")
            if val:
                return SalaryRange(min=None, max=None, currency="USD", period="year")
    return None


def _row_to_job(item: dict[str, Any], scraped_at: datetime) -> Job | None:
    try:
        title = (item.get("title") or "").strip()
        url = (item.get("absolute_url") or "").strip()
        gh_id = str(item.get("id", ""))
        location_raw = item.get("location", {})
        location = location_raw.get("name") if isinstance(location_raw, dict) else str(location_raw)

        # company slug embedded in URL: boards.greenhouse.io/{slug}/jobs/{id}
        company = "unknown"
        if url:
            parts = url.split("/")
            try:
                idx = parts.index("jobs") - 1
                if idx > 0:
                    company = parts[idx].replace("-", " ").title()
            except (ValueError, IndexError):
                pass

        description = (item.get("content") or "").strip()
        metadata = item.get("metadata") or []

        is_remote = "remote" in (location or "").lower()

        return Job(
            id=Job.make_id(JobSource.GREENHOUSE, company, title, url),
            source=JobSource.GREENHOUSE,
            apply_url=url,
            title=title,
            company=company,
            location=location,
            remote=is_remote,
            job_type=JobType.FULL_TIME,  # GH doesn't surface type in list API
            description=description,
            salary=_extract_salary(metadata),
            tags=[dept.get("name", "") for dept in (item.get("departments") or [])],
            posted_at=_parse_gh_date(item.get("updated_at")),
            scraped_at=scraped_at,
        )
    except Exception as exc:
        logger.warning("greenhouse row parse fail: %s", exc)
        return None


class GreenhouseCrawler(ATSCrawler):
    source = JobSource.GREENHOUSE

    async def fetch_company(self, company_slug: str) -> list[Job]:
        url = _BASE.format(slug=company_slug)
        resp = await self._client.get(url, params={"content": "true"})
        resp.raise_for_status()

        data = resp.json()
        items = data.get("jobs") or []
        now = self._now()
        jobs = [j for item in items if (j := _row_to_job(item, now)) is not None]
        logger.debug("greenhouse slug=%r | raw=%d ok=%d", company_slug, len(items), len(jobs))
        return jobs
