"""
Runs in a FastAPI BackgroundTask.
Imports scraper pipeline from packages/core (installed as applierai-core).
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict

from supabase import AsyncClient

from ..schemas import ScrapeRequest

logger = logging.getLogger(__name__)

# In-memory task registry (replace with Redis/Supabase row for multi-worker)
_tasks: Dict[str, dict] = {}


def new_task() -> str:
    task_id = str(uuid.uuid4())
    _tasks[task_id] = {"status": "queued", "started_at": None, "finished_at": None, "count": 0}
    return task_id


def get_task(task_id: str) -> dict | None:
    return _tasks.get(task_id)


async def run_scrape_task(task_id: str, req: ScrapeRequest, supabase: AsyncClient) -> None:
    _tasks[task_id]["status"] = "running"
    _tasks[task_id]["started_at"] = datetime.now(timezone.utc).isoformat()

    try:
        # Import here to avoid circular imports at module load
        from applierai_scraper.pipeline import ScraperConfig, run_scraper  # type: ignore

        config = ScraperConfig(
            sources=req.sources,
            keywords=req.keywords,
            location=req.location,
            limit_per_source=req.limit_per_source,
        )

        jobs = await asyncio.get_event_loop().run_in_executor(None, run_scraper, config)

        rows = [_job_to_row(j) for j in jobs]
        if rows:
            # Supabase upsert in batches of 100
            for i in range(0, len(rows), 100):
                batch = rows[i : i + 100]
                await supabase.table("jobs").upsert(batch, on_conflict="id").execute()

        _tasks[task_id]["status"] = "done"
        _tasks[task_id]["count"] = len(rows)
        logger.info(f"Scrape task {task_id}: upserted {len(rows)} jobs")

    except Exception as exc:
        logger.exception(f"Scrape task {task_id} failed: {exc}")
        _tasks[task_id]["status"] = "failed"
        _tasks[task_id]["error"] = str(exc)
    finally:
        _tasks[task_id]["finished_at"] = datetime.now(timezone.utc).isoformat()


def _job_to_row(job) -> dict:
    """Convert Job pydantic model → Supabase row dict."""
    row = job.model_dump(mode="json")
    # Flatten nested salary
    if row.get("salary"):
        s = row.pop("salary")
        row["salary_min"] = s.get("min")
        row["salary_max"] = s.get("max")
        row["salary_currency"] = s.get("currency", "USD")
        row["salary_interval"] = s.get("interval")
    else:
        row.pop("salary", None)
    return row