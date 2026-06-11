"""Claude vision fallback — parse form screenshots when DOM extraction fails."""

import json

from anthropic import Anthropic

from .client import chat_with_image

SYSTEM_PROMPT = """You are a form analyzer. You will see a screenshot of a job application form.
Identify all visible form fields and return them as a JSON list.

For each field, include:
- label: the field label or placeholder text
- type: text/select/checkbox/textarea/file_upload
- selector_hint: a CSS selector hint to find this element

Return ONLY a JSON array, no markdown or explanation."""


async def parse_form_screenshot(
    client: Anthropic,
    image_data: bytes,
    model: str = "claude-sonnet-4-20250514",
) -> list[dict]:
    """Parse a form screenshot using Claude vision.

    Args:
        client: Anthropic client
        image_data: Screenshot image bytes (PNG)
        model: Claude model to use

    Returns:
        List of form field dicts extracted from the image
    """
    response = await chat_with_image(
        client,
        system_prompt=SYSTEM_PROMPT,
        user_message="Identify all form fields in this screenshot.",
        image_data=image_data,
        image_media_type="image/png",
        model=model,
        max_tokens=1024,
    )

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return [{"raw_response": response, "parse_error": True}]
