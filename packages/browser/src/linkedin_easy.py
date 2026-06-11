"""LinkedIn Easy Apply handler using Playwright."""

from playwright.async_api import Browser, BrowserContext, Page

from .anti_detect import human_click, human_delay, human_scroll, warmup_browse
from .actions import (
    check_captcha,
    fill_text_field,
    select_dropdown,
    upload_file,
    take_screenshot,
)


class LinkedInEasyApply:
    """Handles the LinkedIn Easy Apply flow.

    Steps:
    1. Navigate to job page
    2. Click "Easy Apply" button
    3. Step through modal pages
    4. Fill fields (name, email, phone, experience, resume)
    5. Submit application
    6. Confirm and close
    """

    def __init__(self, browser: Browser, context: BrowserContext):
        self.browser = browser
        self.context = context

    async def apply(
        self,
        job_url: str,
        profile_data: dict,
        resume_path: str = "./config/resume.pdf",
    ) -> dict:
        """Apply to a LinkedIn Easy Apply job.

        Args:
            job_url: LinkedIn job posting URL
            profile_data: Dict with personal info fields
            resume_path: Path to resume PDF

        Returns:
            Dict with 'success' (bool), 'error' (str|None), 'screenshot_url' (str|None)
        """
        page = await self.context.new_page()

        try:
            # Navigate to job
            await page.goto(job_url, wait_until="networkidle")
            await warmup_browse(page, duration_s=20)

            # Check for CAPTCHA
            if await check_captcha(page):
                screenshot_path = await take_screenshot(page, "./screenshots/captcha_linkedin.png")
                return {
                    "success": False,
                    "error": "CAPTCHA detected — manual resolution required",
                    "screenshot_url": screenshot_path,
                }

            # Click Easy Apply button
            easy_apply_btn = await page.query_selector("button:has-text('Easy Apply')")
            if not easy_apply_btn:
                return {"success": False, "error": "Easy Apply button not found", "screenshot_url": None}

            await human_click(page, "button:has-text('Easy Apply')")
            await human_delay(1.0, 2.0)

            # Step through modal pages
            # TODO: Implement full modal stepping logic with Claude form mapping
            # For P0, this is a stub

            return {"success": False, "error": "Easy Apply not yet implemented (P1)", "screenshot_url": None}

        except Exception as e:
            screenshot_path = await take_screenshot(page, "./screenshots/error_linkedin.png")
            return {"success": False, "error": str(e), "screenshot_url": screenshot_path}

        finally:
            await page.close()
