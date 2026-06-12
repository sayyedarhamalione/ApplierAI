from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from supabase import AsyncClient, acreate_client

from .config import Settings, get_settings


@lru_cache
async def _get_supabase(settings: Settings) -> AsyncClient:
    return await acreate_client(settings.supabase_url, settings.supabase_service_key)


async def get_supabase(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AsyncClient:
    return await _get_supabase(settings)


SupabaseDep = Annotated[AsyncClient, Depends(get_supabase)]
SettingsDep = Annotated[Settings, Depends(get_settings)]