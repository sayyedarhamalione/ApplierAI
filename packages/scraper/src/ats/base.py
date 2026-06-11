"""
Base ATS crawler. Greenhouse / Lever / Ashby extend this.
Uses httpx async + BeautifulSoup.
"""
from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional

import httpx

from ..schema.models import Job, JobSource

logger = logging.getLogger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/html;q=0.9, */*;q=0.8",
}

TIMEOUT = httpx.Timeout(15.0, connect=5.0)
MAX_CONCURRENT = 8  # parallel company fetches


class ATSCrawler(ABC):
    source: JobSource

    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self._owned = client is None
        self._client = client or httpx.AsyncClient(
            headers=DEFAULT_HEADERS,
            timeout=TIMEOUT,
            follow_redirects=True,
            http2=True,
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        if self._owned:
            await self._client.aclose()

    @abstractmethod
    async def fetch_company(self, company_slug: str) -> list[Job]:
        """Fetch all open jobs for one company slug."""
        ...

    async def fetch_many(self, company_slugs: list[str]) -> list[Job]:
        """Fetch multiple companies with concurrency cap."""
        sem = asyncio.Semaphore(MAX_CONCURRENT)

        async def _guarded(slug: str) -> list[Job]:
            async with sem:
                try:
                    return await self.fetch_company(slug)
                except Exception as exc:
                    logger.warning("%s fetch fail slug=%r: %s", self.source, slug, exc)
                    return []

        results = await asyncio.gather(*[_guarded(s) for s in company_slugs])
        jobs = [j for batch in results for j in batch]
        logger.info("%s | slugs=%d jobs=%d", self.source, len(company_slugs), len(jobs))
        return jobs

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)
