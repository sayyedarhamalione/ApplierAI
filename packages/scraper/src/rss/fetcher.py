"""
RSS fetcher for RemoteOK + WeWorkRemotely (WWR).

RemoteOK JSON API: https://remoteok.com/api
WWR RSS:           https://weworkremotely.com/remote-jobs.rss
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from xml.etree import ElementTree as ET

import httpx

from ..schema.models import Job, JobSource, JobType

logger = logging.getLogger(__name__)

_REMOTEOK_URL = "https://remoteok.com/api"
_WWR_URL = "https://weworkremotely.com/remote-jobs.rss"

_HEADERS = {
    "User-Agent": "Mozilla/5.0 ApplierAI/1.0 (+https://github.com/sayyedarhamalione/ApplierAI)",
    "Accept": "application/json, application/rss+xml, text/xml, */*;q=0.8",
}

_TIMEOUT = httpx.Timeout(20.0, connect=5.0)


# ─── RemoteOK ────────────────────────────────────────────────────────────────

def _remoteok_row_to_job(item: dict[str, Any]) -> Job | None:
    try:
        title = (item.get("position") or "").strip()
        company = (item.get("company") or "").strip()
        url = (item.get("url") or "").strip()
        if not url.startswith("http"):
            url = f"https://remoteok.com{url}"

        description = re.sub(r"<[^>]+>", " ", item.get("description") or "").strip()
        tags = item.get("tags") or []

        posted_at = None
        if ts := item.get("epoch"):
            posted_at = datetime.fromtimestamp(int(ts), tz=timezone.utc)
        elif raw := item.get("date"):
            try:
                posted_at = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            except ValueError:
                pass

        return Job(
            id=Job.make_id(JobSource.REMOTEOK, company, title, url),
            source=JobSource.REMOTEOK,
            apply_url=url,
            title=title,
            company=company,
            location="Remote",
            remote=True,
            job_type=JobType.FULL_TIME,
            description=description,
            salary=None,
            tags=tags,
            posted_at=posted_at,
            scraped_at=datetime.now(timezone.utc),
        )
    except Exception as exc:
        logger.warning("remoteok parse fail: %s", exc)
        return None


async def fetch_remoteok(
    client: httpx.AsyncClient,
    limit: int = 100,
) -> list[Job]:
    resp = await client.get(_REMOTEOK_URL, headers=_HEADERS)
    resp.raise_for_status()

    data = resp.json()
    # First item is a legal notice dict, skip it
    items = [i for i in data if isinstance(i, dict) and i.get("position")]
    items = items[:limit]

    jobs = [j for item in items if (j := _remoteok_row_to_job(item)) is not None]
    logger.info("remoteok | raw=%d normalized=%d", len(items), len(jobs))
    return jobs


# ─── WeWorkRemotely ──────────────────────────────────────────────────────────

_NS = {"content": "http://purl.org/rss/1.0/modules/content/"}


def _wwr_item_to_job(item: ET.Element) -> Job | None:
    try:
        def _text(tag: str) -> str:
            el = item.find(tag)
            return (el.text or "").strip() if el is not None else ""

        title = _text("title")
        link = _text("link")
        guid = _text("guid")
        url = link or guid

        # WWR title format: "Company Name: Job Title"
        company = "Unknown"
        if ": " in title:
            company, title = title.split(": ", 1)

        content_el = item.find("content:encoded", _NS)
        raw_html = content_el.text if content_el is not None else _text("description")
        description = re.sub(r"<[^>]+>", " ", raw_html or "").strip()
        description = re.sub(r"\s{2,}", " ", description)

        pub_date_raw = _text("pubDate")
        posted_at = None
        if pub_date_raw:
            try:
                posted_at = parsedate_to_datetime(pub_date_raw)
            except Exception:
                pass

        category_el = item.find("category")
        tags = [category_el.text.strip()] if category_el is not None and category_el.text else []

        return Job(
            id=Job.make_id(JobSource.WWR, company, title, url),
            source=JobSource.WWR,
            apply_url=url,
            title=title,
            company=company,
            location="Remote",
            remote=True,
            job_type=JobType.FULL_TIME,
            description=description,
            salary=None,
            tags=tags,
            posted_at=posted_at,
            scraped_at=datetime.now(timezone.utc),
        )
    except Exception as exc:
        logger.warning("wwr parse fail: %s", exc)
        return None


async def fetch_wwr(
    client: httpx.AsyncClient,
    feed_url: str = _WWR_URL,
) -> list[Job]:
    resp = await client.get(feed_url, headers=_HEADERS)
    resp.raise_for_status()

    root = ET.fromstring(resp.content)
    items = root.findall(".//item")

    jobs = [j for item in items if (j := _wwr_item_to_job(item)) is not None]
    logger.info("wwr | raw=%d normalized=%d", len(items), len(jobs))
    return jobs


# ─── Unified RSS fetcher ─────────────────────────────────────────────────────

async def fetch_rss_all(
    remoteok: bool = True,
    wwr: bool = True,
    remoteok_limit: int = 100,
) -> list[Job]:
    """Fetch RemoteOK + WWR concurrently."""
    import asyncio

    async with httpx.AsyncClient(
        timeout=_TIMEOUT,
        follow_redirects=True,
        http2=True,
    ) as client:
        tasks = []
        if remoteok:
            tasks.append(fetch_remoteok(client, limit=remoteok_limit))
        if wwr:
            tasks.append(fetch_wwr(client))

        results = await asyncio.gather(*tasks, return_exceptions=True)

    jobs: list[Job] = []
    for r in results:
        if isinstance(r, Exception):
            logger.error("rss fetch error: %s", r)
        else:
            jobs.extend(r)

    return jobs
