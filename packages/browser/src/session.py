"""Cookie/session persistence for browser contexts."""

import json
from pathlib import Path

from playwright.async_api import BrowserContext


async def save_cookies(context: BrowserContext, path: str) -> None:
    """Save browser cookies to a JSON file.

    Args:
        context: Playwright browser context
        path: File path to save cookies JSON
    """
    cookies = await context.cookies()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(cookies, indent=2))


async def load_cookies(context: BrowserContext, path: str) -> None:
    """Load cookies from a JSON file into a browser context.

    Args:
        context: Playwright browser context
        path: File path to load cookies from
    """
    if not Path(path).exists():
        return
    cookies = json.loads(Path(path).read_text())
    await context.add_cookies(cookies)


async def save_local_storage(page, path: str) -> None:
    """Save localStorage from the current page.

    Args:
        page: Playwright page
        path: File path to save localStorage JSON
    """
    storage = await page.evaluate("() => Object.assign({}, localStorage)")
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(storage, indent=2))


async def load_local_storage(page, storage_data: dict) -> None:
    """Load localStorage into the current page.

    Args:
        page: Playwright page
        storage_data: Dict of key-value pairs to set in localStorage
    """
    for key, value in storage_data.items():
        await page.evaluate(f"localStorage.setItem('{key}', '{value}')")
