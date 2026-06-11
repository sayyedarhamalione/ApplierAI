"""Temporal activities — individual units of work executed by the worker."""

from datetime import datetime


async def scrape_jobs(config: dict) -> list[dict]:
    """Activity: trigger Apify scrapers and return raw job data.

    Args:
        config: Dict with 'platforms', 'keywords', 'location', etc.

    Returns:
        List of job dicts from Apify actors.
    """
    # TODO: Call scraper package functions
    return []


async def match_jobs(params: dict) -> list[dict]:
    """Activity: embed jobs, query Qdrant, return matched jobs above threshold.

    Args:
        params: Dict with 'jobs' and 'config' keys.

    Returns:
        List of matched job dicts with match scores.
    """
    # TODO: Call core.matching.scorer.match_jobs()
    return []


async def apply_to_job(params: dict) -> dict:
    """Activity: open job page in Playwright, fill form, submit.

    Args:
        params: Dict with 'job' and 'config' keys.

    Returns:
        Dict with 'success' (bool), 'error' (str|None), 'screenshot_url' (str|None).
    """
    # TODO: Call browser package functions
    return {"success": False, "error": "not implemented", "screenshot_url": None}


async def log_application(result: dict) -> None:
    """Activity: write application result to Supabase.

    Args:
        result: Dict with application result from apply_to_job.
    """
    # TODO: Call core.matching.supabase_writer functions
    pass
