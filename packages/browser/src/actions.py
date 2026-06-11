"""Browser action primitives: click, type, upload, screenshot."""

from pathlib import Path

from playwright.async_api import Page

from .anti_detect import human_click, human_delay, human_type


async def fill_text_field(page: Page, selector: str, value: str) -> None:
    """Clear and fill a text input field with human-like typing."""
    await page.fill(selector, "")  # Clear existing
    await human_type(page, selector, value)


async def select_dropdown(page: Page, selector: str, value: str) -> None:
    """Select an option from a dropdown."""
    await human_delay(0.5, 1.0)
    await page.select_option(selector, value)


async def upload_file(page: Page, selector: str, file_path: str) -> None:
    """Upload a file (resume) to a file input."""
    await human_delay(0.5, 1.0)
    file_input = await page.query_selector(selector)
    if file_input:
        await file_input.set_input_files(file_path)


async def click_checkbox(page: Page, selector: str, check: bool = True) -> None:
    """Check or uncheck a checkbox."""
    await human_click(page, selector)
    # Verify state
    is_checked = await page.is_checked(selector)
    if is_checked != check:
        await human_click(page, selector)


async def take_screenshot(page: Page, path: str = "./screenshots/debug.png") -> str:
    """Take a screenshot for debugging or Claude vision fallback."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    await page.screenshot(path=path, full_page=False)
    return path


async def check_captcha(page: Page) -> bool:
    """Detect if a CAPTCHA is present on the page.

    Checks for common CAPTCHA iframes and elements.
    """
    captcha_selectors = [
        "iframe[src*='hcaptcha']",
        "iframe[src*='recaptcha']",
        "iframe[src*='turnstile']",
        ".h-captcha",
        ".g-recaptcha",
        "#captcha",
        "[data-testid='captcha']",
    ]
    for selector in captcha_selectors:
        element = await page.query_selector(selector)
        if element:
            return True
    return False
