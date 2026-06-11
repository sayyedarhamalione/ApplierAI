"""Job description parser — extracts structured requirements from raw JDs."""

import json

from anthropic import Anthropic

from .client import chat

SYSTEM_PROMPT = """You are a job description parser. Extract structured information from job postings.

Return a JSON object with these fields:
- title: job title
- company: company name
- requirements: list of required skills/qualifications
- preferred: list of preferred/nice-to-have skills
- experience_level: junior/mid/senior/staff
- salary_hint: any salary information mentioned
- job_type: full-time/part-time/contract
- location_type: remote/hybrid/onsite
- key_technologies: list of specific technologies mentioned

Return ONLY valid JSON, no markdown or explanation."""


async def parse_jd(client: Anthropic, description: str, model: str = "claude-sonnet-4-20250514") -> dict:
    """Parse a job description into structured data.

    Args:
        client: Anthropic client
        description: Raw job description text
        model: Claude model to use

    Returns:
        Dict with parsed JD fields
    """
    response = await chat(
        client,
        system_prompt=SYSTEM_PROMPT,
        user_message=f"Parse this job description:\n\n{description}",
        model=model,
        max_tokens=500,
    )

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"raw_response": response, "parse_error": True}
