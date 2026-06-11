"""LangGraph agent state definition."""

from typing import TypedDict

from ...models.job import ApplyType, Job, JobMatch


class AgentState(TypedDict):
    """State flowing through the LangGraph agent graph."""

    jobs: list[Job]                # Raw scraped jobs
    matched_jobs: list[JobMatch]   # Scored & filtered by Qdrant
    current_job: JobMatch          # Job currently being processed
    apply_type: str                # "easy_apply" | "full_form"
    form_data: dict                # Mapped form fields (field_name → value)
    cover_letter: str              # Generated cover letter text
    screenshot: bytes              # Screenshot bytes for vision fallback
    status: str                    # Current processing status
    errors: list[str]              # Error accumulator
