"""Application status API routes — kanban board + realtime."""

from fastapi import APIRouter, Depends
from supabase import Client

from ..deps import get_db

router = APIRouter()


@router.get("")
async def list_applications(
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Client = Depends(get_db),
):
    """List all applications with their latest status."""
    query = db.table("applications").select("*, application_status(*)").order("created_at", desc=True).range(offset, offset + limit - 1)
    if status:
        query = query.eq("status", status)
    response = query.execute()
    return {"applications": response.data, "count": len(response.data)}


@router.patch("/{application_id}/status")
async def update_status(application_id: str, new_status: str, db: Client = Depends(get_db)):
    """Update the kanban status of an application."""
    # Insert new status record
    status_data = {
        "application_id": application_id,
        "status": new_status,
    }
    db.table("application_status").insert(status_data).execute()

    # Also update the application record
    db.table("applications").update({"status": new_status}).eq("id", application_id).execute()

    return {"status": "updated", "application_id": application_id, "new_status": new_status}
