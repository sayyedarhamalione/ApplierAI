"""
Ashby crawler.
Public GQL: https://api.ashbyhq.com/posting-api/graphql
Job board JSON: https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from ..schema.models import Job, JobSource, JobType
from .base import ATSCrawler

logger = logging.getLogger(__name__)

_GQL_URL = "https://jobs.ashbyhq.com/api/non-user-graphql"

_JOB_BOARD_QUERY = """
query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
  jobBoard: jobBoardWithTeams(
    organizationHostedJobsPageName: $organizationHostedJobsPageName
  ) {
    jobPostings {
      id
      title
      locationName
      employmentType
      isRemote
      publishedDate
      externalLink
      descriptionHtml
      departmentName
      compensationTierSummary
    }
  }
}
"""

_TYPE_MAP = {
    "FullTime": JobType.FULL_TIME,
    "PartTime": JobType.PART_TIME,
    "Contract": JobType.CONTRACT,
    "Internship": JobType.INTERNSHIP,
}


def _row_to_job(item: dict[str, Any], slug: str, scraped_at: datetime) -> Job | None:
    try:
        title = (item.get("title") or "").strip()
        company = slug.replace("-", " ").title()

        apply_url = (
            item.get("externalLink")
            or f"https://jobs.ashbyhq.com/{slug}/{item.get('id', '')}"
        )

        description_raw = (item.get("descriptionHtml") or "").strip()
        # Strip basic HTML tags for plain text description
        import re
        description = re.sub(r"<[^>]+>", " ", description_raw).strip()
        description = re.sub(r"\s{2,}", " ", description)

        emp_type = item.get("employmentType") or ""
        job_type = _TYPE_MAP.get(emp_type, JobType.UNKNOWN)

        location = item.get("locationName")
        is_remote = bool(item.get("isRemote")) or "remote" in (location or "").lower()

        posted_at = None
        if raw_date := item.get("publishedDate"):
            try:
                posted_at = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
            except ValueError:
                pass

        dept = item.get("departmentName")
        tags = [dept] if dept else []

        return Job(
            id=Job.make_id(JobSource.ASHBY, company, title, apply_url),
            source=JobSource.ASHBY,
            apply_url=apply_url,
            title=title,
            company=company,
            location=location,
            remote=is_remote,
            job_type=job_type,
            description=description,
            salary=None,
            tags=tags,
            posted_at=posted_at,
            scraped_at=scraped_at,
        )
    except Exception as exc:
        logger.warning("ashby row parse fail: %s", exc)
        return None


class AshbyCrawler(ATSCrawler):
    source = JobSource.ASHBY

    async def fetch_company(self, company_slug: str) -> list[Job]:
        payload = {
            "operationName": "ApiJobBoardWithTeams",
            "query": _JOB_BOARD_QUERY,
            "variables": {"organizationHostedJobsPageName": company_slug},
        }
        resp = await self._client.post(
            _GQL_URL,
            json=payload,
            params={"op": "ApiJobBoardWithTeams"},
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()

        data = resp.json()
        job_board = (data.get("data") or {}).get("jobBoard") or {}
        items = job_board.get("jobPostings") or []

        now = self._now()
        jobs = [j for item in items if (j := _row_to_job(item, company_slug, now)) is not None]
        logger.debug("ashby slug=%r | raw=%d ok=%d", company_slug, len(items), len(jobs))
        return jobs
