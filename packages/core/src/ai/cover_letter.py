"""Cover letter generator — creates tailored cover letters using Claude."""

from anthropic import Anthropic

from .client import chat

SYSTEM_PROMPT = """You are a cover letter writer. Generate a professional, tailored cover letter 
based on the job description and the applicant's profile.

Guidelines:
- 150-250 words
- Reference specific requirements from the JD
- Highlight relevant experience from the profile
- Professional but not generic
- No placeholders or brackets — write as if ready to send
- Do NOT include date, addresses, or formal letter header — start with "Dear Hiring Manager,""""


async def generate_cover_letter(
    client: Anthropic,
    job_description: str,
    profile_data: dict,
    model: str = "claude-sonnet-4-20250514",
) -> str:
    """Generate a tailored cover letter for a job application.

    Args:
        client: Anthropic client
        job_description: Full job description text
        profile_data: Dict with applicant's profile fields
        model: Claude model to use

    Returns:
        Cover letter text
    """
    import json

    profile_text = json.dumps(profile_data, indent=2)

    response = await chat(
        client,
        system_prompt=SYSTEM_PROMPT,
        user_message=f"Job description:\n{job_description}\n\nApplicant profile:\n{profile_text}",
        model=model,
        max_tokens=500,
    )

    return response.strip()
