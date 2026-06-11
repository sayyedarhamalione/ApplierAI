"""Shared dependencies for FastAPI routes."""

from functools import lru_cache

from supabase import Client

from job_applier_core.config import load_secrets, load_profile, load_preferences
from job_applier_core.matching.supabase_writer import get_supabase_client
from job_applier_core.models.profile import UserProfile
from job_applier_core.models.config import Preferences


@lru_cache
def get_secrets():
    return load_secrets()


def get_db() -> Client:
    """Get a Supabase client for the current request."""
    secrets = get_secrets()
    return get_supabase_client(secrets.supabase_url, secrets.supabase_key)


@lru_cache
def get_current_profile() -> UserProfile:
    """Load the current user profile from YAML."""
    return load_profile()


@lru_cache
def get_current_preferences() -> Preferences:
    """Load the current preferences from YAML."""
    return load_preferences()
