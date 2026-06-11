"""Generic form filler using Claude AI for field mapping."""

from playwright.async_api import Browser, BrowserContext, Page

from .anti_detect import human_click, human_delay, warmup_browse
from .actions import (
    check_captcha,
    fill_text_field,
    select_dropdown,
    upload_file,
    take_screenshot,
)


class GenericFormFiller:
    """Handles generic job application forms using Claude for field mapping.

    Flow:
    1. Navigate to job application page
    2. Parse form DOM → extract fields and labels
    3. If DOM parse fails → screenshot → Claude vision
    4. Claude maps profile data to form fields
    5. Playwright fills and submits
    """

    def __init__(self, browser: Browser, context: BrowserContext):
        self.browser = browser
        self.context = context

    async def fill(
        self,
        job_url: str,
        profile_data: dict,
        resume_path: str = "./config/resume.pdf",
    ) -> dict:
        """Fill and submit a generic job application form.

        Args:
            job_url: Job application URL
            profile_data: Dict with profile fields
            resume_path: Path to resume PDF

        Returns:
            Dict with 'success' (bool), 'error' (str|None), 'screenshot_url' (str|None)
        """
        # TODO: Full implementation in P2
        return {"success": False, "error": "Generic form filler not yet implemented (P2)", "screenshot_url": None}

    async def parse_form_fields(self, page: Page) -> list[dict]:
        """Extract form fields from the page DOM.

        Returns:
            List of dicts with 'selector', 'type', 'label', 'name' keys.
        """
        fields = []

        # Extract input fields
        inputs = await page.query_selector_all("input[type='text'], input[type='email'], input[type='tel'], input:not([type])")
        for inp in inputs:
            name = await inp.get_attribute("name") or ""
            placeholder = await inp.get_attribute("placeholder") or ""
            aria_label = await inp.get_attribute("aria-label") or ""
            label_text = ""

            # Try to find associated label
            input_id = await inp.get_attribute("id")
            if input_id:
                label = await page.query_selector(f"label[for='{input_id}']")
                if label:
                    label_text = await label.inner_text()

            fields.append({
                "selector": f"input[name='{name}']" if name else f"#{input_id}" if input_id else "",
                "type": "text",
                "label": label_text or placeholder or aria_label,
                "name": name,
            })

        # Extract select dropdowns
        selects = await page.query_selector_all("select")
        for sel in selects:
            name = await sel.get_attribute("name") or ""
            fields.append({
                "selector": f"select[name='{name}']",
                "type": "select",
                "label": "",
                "name": name,
            })

        # Extract textareas
        textareas = await page.query_selector_all("textarea")
        for ta in textareas:
            name = await ta.get_attribute("name") or ""
            fields.append({
                "selector": f"textarea[name='{name}']",
                "type": "textarea",
                "label": "",
                "name": name,
            })

        return fields
