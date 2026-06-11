"""Jobs API routes — CRUD + match scores."""

from fastapi import APIRouter, Depends
from supabase import Client

from ..deps import get_db

router = APIRouter()


@router.get("")
async def list_jobs(
    platform: str | None = None,
    min_score: float | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Client = Depends(get_db),
):
    """List jobs with optional filtering by platform and match score."""
    query = db.table("jobs").select("*").order("scraped_at", desc=True).range(offset, offset + limit - 1)
    if platform:
        query = query.eq("platform", platform)
    if min_score is not None:
        query = query.gte("match_score", min_score)
    response = query.execute()
    return {"jobs": response.data, "count": len(response.data)}


@router.get("/{job_id}")
async def get_job(job_id: str, db: Client = Depends(get_db)):
    """Get a single job by ID."""
    response = db.table("jobs").select("*").eq("id", job_id).execute()
    if not response.data:
        return {"error": "Job not found"}, 404
    return response.data[0]


@router.post("/scrape")
async def trigger_scrape(platform: str = "linkedin", db: Client = Depends(get_db)):
    """Trigger a manual scrape run.

    In production, this would enqueue a Temporal workflow.
    For P0, it returns a stub response.
    """
    # TODO: Trigger Temporal ScrapeWorkflow
    return {"status": "triggered", "platform": platform, "message": "Scrape workflow not yet connected (P0 stub)"}
