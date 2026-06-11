"""Playwright browser context factory with stealth and proxy configuration."""

import json
from pathlib import Path
from playwright.async_api import async_playwright, Browser, BrowserContext

from .stealth import apply_stealth_config


async def create_browser_context(
    cookies_file: str | None = None,
    proxy_url: str | None = None,
    headless: bool = True,
    user_data_dir: str | None = None,
) -> tuple[Browser, BrowserContext]:
    """Create a stealth Playwright browser context.

    Args:
        cookies_file: Path to JSON file with exported cookies
        proxy_url: Residential proxy URL (e.g. http://user:pass@proxy:port)
        headless: Run in headless mode (default True)
        user_data_dir: Persistent browser profile directory

    Returns:
        Tuple of (Browser, BrowserContext) — caller is responsible for closing.
    """
    pw = await async_playwright().start()

    launch_args = {
        "headless": headless,
        "args": [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
        ],
    }

    if proxy_url:
        launch_args["proxy"] = {"server": proxy_url}

    browser = await pw.chromium.launch(**launch_args)

    context_args: dict = {}
    if user_data_dir:
        context_args["user_data_dir"] = user_data_dir

    context = await browser.new_context(**context_args)

    # Apply stealth patches
    await apply_stealth_config(context)

    # Load cookies if provided
    if cookies_file and Path(cookies_file).exists():
        cookies = json.loads(Path(cookies_file).read_text())
        await context.add_cookies(cookies)

    return browser, context


async def close_browser(browser: Browser, context: BrowserContext) -> None:
    """Gracefully close browser context and browser."""
    await context.close()
    await browser.close()
