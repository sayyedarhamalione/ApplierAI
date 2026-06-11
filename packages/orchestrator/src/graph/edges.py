"""LangGraph conditional edge definitions."""

from .state import AgentState


def should_apply(state: AgentState) -> str:
    """Route: skip jobs below match threshold, process those above."""
    current = state.get("current_job")
    if current and current.passes_threshold:
        return "route"
    return "skip"


def apply_type_edge(state: AgentState) -> str:
    """Route: easy_apply or full_form based on job type."""
    apply_type = state.get("apply_type", "full_form")
    if apply_type == "easy_apply":
        return "easy_apply"
    return "full_form"


def dom_parse_succeeded(state: AgentState) -> str:
    """Route: if DOM parsing got the fields, fill normally; else vision fallback."""
    form_data = state.get("form_data", {})
    if form_data:
        return "submit"
    return "vision_fallback"
