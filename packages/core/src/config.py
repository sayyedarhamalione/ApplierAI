"""Configuration loader for YAML files and environment variables."""

import os
from pathlib import Path

import yaml
from dotenv import load_dotenv

from .config import Preferences, Secrets
from .profile import UserProfile

# Default config directory (project root /config)
CONFIG_DIR = Path(__file__).resolve().parents[3] / "config"


def load_profile(path: Path | None = None) -> UserProfile:
    """Load user profile from YAML."""
    path = path or CONFIG_DIR / "profile.yaml"
    if not path.exists():
        return UserProfile()
    with open(path) as f:
        data = yaml.safe_load(f) or {}
    return UserProfile(**data)


def load_preferences(path: Path | None = None) -> Preferences:
    """Load job preferences from YAML."""
    path = path or CONFIG_DIR / "preferences.yaml"
    if not path.exists():
        return Preferences()
    with open(path) as f:
        data = yaml.safe_load(f) or {}
    return Preferences(**data)


def load_secrets(env_path: Path | None = None) -> Secrets:
    """Load secrets from .env file and environment variables.

    Environment variables take precedence over .env file values.
    """
    env_path = env_path or CONFIG_DIR / "secrets.env"
    if env_path.exists():
        load_dotenv(env_path)

    return Secrets(
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        apify_api_token=os.getenv("APIFY_API_TOKEN", ""),
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_key=os.getenv("SUPABASE_KEY", ""),
        qdrant_url=os.getenv("QDRANT_URL", "http://localhost:6333"),
        qdrant_api_key=os.getenv("QDRANT_API_KEY", ""),
        proxy_url=os.getenv("PROXY_URL", ""),
        temporal_host=os.getenv("TEMPORAL_HOST", "localhost:7233"),
    )


def save_profile(profile: UserProfile, path: Path | None = None) -> None:
    """Save user profile back to YAML."""
    path = path or CONFIG_DIR / "profile.yaml"
    with open(path, "w") as f:
        yaml.dump(profile.model_dump(), f, default_flow_style=False, sort_keys=False)


def save_preferences(prefs: Preferences, path: Path | None = None) -> None:
    """Save preferences back to YAML."""
    path = path or CONFIG_DIR / "preferences.yaml"
    with open(path, "w") as f:
        yaml.dump(prefs.model_dump(), f, default_flow_style=False, sort_keys=False)
