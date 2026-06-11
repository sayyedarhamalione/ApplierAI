"""Profile management API routes."""

from fastapi import APIRouter

from job_applier_core.config import load_profile, save_profile
from job_applier_core.models.profile import UserProfile

router = APIRouter()


@router.get("")
async def get_profile():
    """Get the current user profile."""
    profile = load_profile()
    return profile.model_dump()


@router.put("")
async def update_profile(profile_data: dict):
    """Update the user profile (writes to profile.yaml)."""
    profile = UserProfile(**profile_data)
    save_profile(profile)
    return {"status": "updated", "profile": profile.model_dump()}
