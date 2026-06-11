"""
Scraper pipeline — unified entry point.
Runs JobSpy + ATS crawlers + RSS in one call.
Deduplicates by job.id.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Optional

import httpx

from .ats import AshbyCrawler, GreenhouseCrawler, LeverCrawler
from .jobspy import fetch_jobspy
from .rss import fetch_rss_all
from .schema.models import Job

logger = logging.getLogger(__name__)


@dataclass
class ATSSlugs:
    """Company slugs per ATS platform, typically loaded from Google Sheet."""
    greenhouse: list[str] = field(default_factory=list)
    lever: list[str] = field(default_factory=list)
    ashby: list[str] = field(default_factory=list)


@dataclass
class ScraperConfig:
    # JobSpy
    jobspy_query: str = "software engineer"
    jobspy_location: str = "Remote"
    jobspy_results: int = 50
    jobspy_sites: Optional[list[str]] = None
    jobspy_hours_old: int = 72
    jobspy_enabled: bool = True

    # ATS crawlers
    ats_slugs: ATSSlugs = field(default_factory=ATSSlugs)
    ats_enabled: bool = True

    # RSS
    rss_remoteok: bool = True
    rss_wwr: bool = True
    rss_remoteok_limit: int = 100
    rss_enabled: bool = True


async def run_scraper(config: ScraperConfig) -> list[Job]:
    """
    Full scraper run. Returns deduplicated jobs from all sources.
    JobSpy runs in thread (sync lib). ATS + RSS run async.
    """
    tasks: list = []

    # ── ATS + RSS (async) ──────────────────────────────────────────────
    if config.ats_enabled:
        slugs = config.ats_slugs

        async def _run_ats() -> list[Job]:
            async with httpx.AsyncClient(
                follow_redirects=True,
                http2=True,
                timeout=httpx.Timeout(15.0, connect=5.0),
            ) as client:
                crawlers = []
                if slugs.greenhouse:
                    crawlers.append(
                        GreenhouseCrawler(client).fetch_many(slugs.greenhouse)
                    )
                if slugs.lever:
                    crawlers.append(
                        LeverCrawler(client).fetch_many(slugs.lever)
                    )
                if slugs.ashby:
                    crawlers.append(
                        AshbyCrawler(client).fetch_many(slugs.ashby)
                    )
                if not crawlers:
                    return []
                results = await asyncio.gather(*crawlers, return_exceptions=True)
                jobs = []
                for r in results:
                    if isinstance(r, Exception):
                        logger.error("ats batch error: %s", r)
                    else:
                        jobs.extend(r)
                return jobs

        tasks.append(_run_ats())

    if config.rss_enabled:
        tasks.append(
            fetch_rss_all(
                remoteok=config.rss_remoteok,
                wwr=config.rss_wwr,
                remoteok_limit=config.rss_remoteok_limit,
            )
        )

    # ── JobSpy (sync → thread) ─────────────────────────────────────────
    jobspy_jobs: list[Job] = []
    if config.jobspy_enabled:
        loop = asyncio.get_event_loop()
        jobspy_jobs = await loop.run_in_executor(
            None,
            lambda: fetch_jobspy(
                query=config.jobspy_query,
                location=config.jobspy_location,
                results_wanted=config.jobspy_results,
                site_names=config.jobspy_sites,
                hours_old=config.jobspy_hours_old,
            ),
        )

    async_results = await asyncio.gather(*tasks, return_exceptions=True)
    all_jobs: list[Job] = list(jobspy_jobs)

    for r in async_results:
        if isinstance(r, Exception):
            logger.error("async scraper error: %s", r)
        else:
            all_jobs.extend(r)

    # ── Deduplicate by id ──────────────────────────────────────────────
    seen: set[str] = set()
    unique: list[Job] = []
    for job in all_jobs:
        if job.id not in seen:
            seen.add(job.id)
            unique.append(job)

    logger.info(
        "scraper done | total=%d unique=%d dupes_dropped=%d",
        len(all_jobs),
        len(unique),
        len(all_jobs) - len(unique),
    )
    return unique


def run_scraper_sync(config: ScraperConfig) -> list[Job]:
    """Convenience wrapper for non-async callers."""
    return asyncio.run(run_scraper(config))
