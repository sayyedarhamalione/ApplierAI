"""LangGraph agent graph — compile and export."""

from langgraph.graph import END, StateGraph

from .edges import apply_type_edge, dom_parse_succeeded, should_apply
from .nodes import (
    easy_apply_node,
    full_form_node,
    log_node,
    match_node,
    route_node,
    scrape_node,
    submit_node,
    vision_fallback_node,
)
from .state import AgentState


def build_graph() -> StateGraph:
    """Build the job application agent graph.

    Flow:
        START → scrape → match → (should_apply?) → route → (easy_apply | full_form)
          → submit → log → END
        If DOM parse fails: full_form → vision_fallback → submit
        If score < threshold: match → END (skip)
    """
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("scrape", scrape_node)
    graph.add_node("match", match_node)
    graph.add_node("route", route_node)
    graph.add_node("easy_apply", easy_apply_node)
    graph.add_node("full_form", full_form_node)
    graph.add_node("vision_fallback", vision_fallback_node)
    graph.add_node("submit", submit_node)
    graph.add_node("log", log_node)

    # Set entry point
    graph.set_entry_point("scrape")

    # Linear edges
    graph.add_edge("scrape", "match")
    graph.add_edge("easy_apply", "submit")
    graph.add_edge("vision_fallback", "submit")
    graph.add_edge("submit", "log")
    graph.add_edge("log", END)

    # Conditional edges
    graph.add_conditional_edges("match", should_apply, {
        "route": "route",
        "skip": END,
    })
    graph.add_conditional_edges("route", apply_type_edge, {
        "easy_apply": "easy_apply",
        "full_form": "full_form",
    })
    graph.add_conditional_edges("full_form", dom_parse_succeeded, {
        "submit": "submit",
        "vision_fallback": "vision_fallback",
    })

    return graph


def compile_graph():
    """Compile the graph for execution."""
    return build_graph().compile()
