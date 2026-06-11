"""
Lever crawler.
API: https://api.lever.co/v0/postings/{slug}?mode=json
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from ..schema.models import Job, JobSource, JobType, SalaryRange
from .base import ATSCrawler

logger = logging.getLogger(__name__)

_BASE = "https://api.lever.co/v0/postings/{slug}"

_COMMITMENT_MAP = {
    "full-time": JobType.FULL_TIME,
    "part-time": JobType.PART_TIME,
    "contract": JobType.CONTRACT,
    "internship": JobType.INTERNSHIP,
}


def _row_to_job(item: dict, slug: str, scraped_at: datetime) -> Job | None:
    try:
        title = (item.get("text") or "").strip()
        url = (item.get("hostedUrl") or "").strip()
        apply_url = (item.get("applyUrl") or url).strip()
        company = slug.replace("-", " ").title()

        location_raw = (item.get("workplaceType") or "")
        categories = item.get("categories") or {}
        location = categories.get("location") or location_raw or None
        commitment = (categories.get("commitment") or "").lower()
        job_type = _COMMITMENT_MAP.get(commitment, JobType.UNKNOWN)

        lists = item.get("lists") or []
        description_parts = [item.get("descriptionPlain") or ""]
        for lst in lists:
            description_parts.append(f"\n{lst.get('text', '')}\n")
            description_parts.append(lst.get("content", ""))
        description = "\n".join(description_parts).strip()

        is_remote = (
            item.get("workplaceType") == "remote"
            or "remote" in (location or "").lower()
        )

        # Lever timestamp is epoch ms
        posted_at = None
        if ts := item.get("createdAt"):
            posted_at = datetime.fromtimestamp(ts / 1000, tz=timezone.utc)

        tags = item.get("tags") or []

        return Job(
            id=Job.make_id(JobSource.LEVER, company, title, url),
            source=JobSource.LEVER,
            apply_url=apply_url,
            title=title,
            company=company,
            location=location,
            remote=is_remote,
            job_type=job_type,
            description=description,
            salary=None,  # Lever doesn't expose salary in public API
            tags=tags,
            posted_at=posted_at,
            scraped_at=scraped_at,
        )
    except Exception as exc:
        logger.warning("lever row parse fail: %s", exc)
        return None


class LeverCrawler(ATSCrawler):
    source = JobSource.LEVER

    async def fetch_company(self, company_slug: str) -> list[Job]:
        url = _BASE.format(slug=company_slug)
        resp = await self._client.get(url, params={"mode": "json", "limit": 500})
        resp.raise_for_status()

        items = resp.json()
        if not isinstance(items, list):
            items = items.get("postings", [])

        now = self._now()
        jobs = [j for item in items if (j := _row_to_job(item, company_slug, now)) is not None]
        logger.debug("lever slug=%r | raw=%d ok=%d", company_slug, len(items), len(jobs))
        return jobs
