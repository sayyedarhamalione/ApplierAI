"""Form field mapper — maps profile data to application form fields using Claude."""

import json

from anthropic import Anthropic

from .client import chat

SYSTEM_PROMPT = """You are a form field mapper. Given a list of form fields and a user profile, 
map each form field to the appropriate profile value.

For each field, return a JSON object mapping:
- field_name: the value to fill in

If a field cannot be mapped from the profile, set its value to null.

Return ONLY a JSON object, no markdown or explanation."""


async def map_fields(
    client: Anthropic,
    form_fields: list[dict],
    profile_data: dict,
    model: str = "claude-sonnet-4-20250514",
) -> dict:
    """Map form fields to profile values using Claude.

    Args:
        client: Anthropic client
        form_fields: List of form field dicts with 'name', 'type', 'label'
        profile_data: Dict of profile fields
        model: Claude model to use

    Returns:
        Dict mapping field names to values
    """
    fields_text = json.dumps(form_fields, indent=2)
    profile_text = json.dumps(profile_data, indent=2)

    response = await chat(
        client,
        system_prompt=SYSTEM_PROMPT,
        user_message=f"Form fields:\n{fields_text}\n\nUser profile:\n{profile_text}",
        model=model,
        max_tokens=1024,
    )

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"raw_response": response, "parse_error": True}
