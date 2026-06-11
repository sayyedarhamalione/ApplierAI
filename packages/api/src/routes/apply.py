"""Apply queue API routes — queue, cancel, pause applications."""

from fastapi import APIRouter, Depends
from supabase import Client

from ..deps import get_db

router = APIRouter()


@router.post("/queue")
async def add_to_queue(job_ids: list[str], db: Client = Depends(get_db)):
    """Add jobs to the apply queue."""
    applications = []
    for job_id in job_ids:
        app_data = {
            "job_id": job_id,
            "status": "queued",
        }
        response = db.table("applications").insert(app_data).execute()
        applications.extend(response.data)
    return {"queued": len(applications), "applications": applications}


@router.delete("/queue/{job_id}")
async def remove_from_queue(job_id: str, db: Client = Depends(get_db)):
    """Remove a job from the apply queue."""
    response = db.table("applications").delete().eq("job_id", job_id).eq("status", "queued").execute()
    return {"removed": len(response.data)}


@router.patch("/queue/{job_id}")
async def update_queue_item(job_id: str, action: str, db: Client = Depends(get_db)):
    """Pause or resume a queued application.

    Args:
        action: "pause" or "resume"
    """
    if action == "pause":
        db.table("applications").update({"status": "paused"}).eq("job_id", job_id).execute()
        return {"status": "paused", "job_id": job_id}
    elif action == "resume":
        db.table("applications").update({"status": "queued"}).eq("job_id", job_id).execute()
        return {"status": "queued", "job_id": job_id}
    return {"error": "Invalid action. Use 'pause' or 'resume'."}


@router.post("/now/{job_id}")
async def apply_now(job_id: str, db: Client = Depends(get_db)):
    """Apply to a single job immediately (bypass queue).

    In production, this triggers a Temporal child workflow.
    """
    # TODO: Trigger Temporal ApplyChildWorkflow
    return {"status": "triggered", "job_id": job_id, "message": "Apply workflow not yet connected (P0 stub)"}
