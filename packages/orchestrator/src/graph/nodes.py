"""LangGraph agent nodes — each node is one step in the pipeline."""

from .state import AgentState


def scrape_node(state: AgentState) -> dict:
    """Trigger Apify scrapers and collect raw jobs.

    Returns partial state update with 'jobs' key.
    """
    # TODO: Call Apify actors via scraper package
    return {"jobs": [], "status": "scraped"}


def match_node(state: AgentState) -> dict:
    """Embed jobs, query Qdrant for profile matches, filter by threshold.

    Returns partial state update with 'matched_jobs' key.
    """
    # TODO: Call core.matching.scorer.match_jobs()
    return {"matched_jobs": [], "status": "matched"}


def route_node(state: AgentState) -> dict:
    """Determine apply type: easy_apply or full_form.

    Returns partial state update with 'apply_type' key.
    """
    job = state.get("current_job")
    if job and job.job.is_easy_apply:
        return {"apply_type": "easy_apply"}
    return {"apply_type": "full_form"}


def easy_apply_node(state: AgentState) -> dict:
    """Execute LinkedIn Easy Apply via Playwright.

    Returns partial state update with 'status' key.
    """
    # TODO: Call browser.linkedin_easy.apply()
    return {"status": "applied"}


def full_form_node(state: AgentState) -> dict:
    """Execute generic form fill via Playwright + Claude.

    Returns partial state update with 'status' key.
    """
    # TODO: Call browser.generic_form.fill()
    return {"status": "applied"}


def vision_fallback_node(state: AgentState) -> dict:
    """Use Claude vision on a screenshot when DOM parsing fails.

    Returns partial state update with 'form_data' key.
    """
    # TODO: Call core.ai.vision.parse_screenshot()
    return {"form_data": {}}


def submit_node(state: AgentState) -> dict:
    """Submit the application and take a confirmation screenshot.

    Returns partial state update with 'status' key.
    """
    # TODO: Call browser.actions.submit()
    return {"status": "submitted"}


def log_node(state: AgentState) -> dict:
    """Log the application result to Supabase.

    Returns partial state update with 'status' key.
    """
    # TODO: Call core.matching.supabase_writer.insert_application()
    return {"status": "logged"}
