from fastapi import APIRouter, BackgroundTasks, HTTPException

from ..deps import SupabaseDep
from ..schemas import ScrapeRequest, ScrapeStatusResponse
from ..services.scraper_service import get_task, new_task, run_scrape_task

router = APIRouter()


@router.post("", status_code=202, response_model=ScrapeStatusResponse)
async def trigger_scrape(
    req: ScrapeRequest,
    background_tasks: BackgroundTasks,
    db: SupabaseDep,
) -> ScrapeStatusResponse:
    """Kick off async scrape. Returns 202 immediately with task_id."""
    task_id = new_task()
    background_tasks.add_task(run_scrape_task, task_id, req, db)
    return ScrapeStatusResponse(
        task_id=task_id,
        status="queued",
        message="Scrape started. Poll /scrape/{task_id} for status.",
    )


@router.get("/{task_id}", response_model=ScrapeStatusResponse)
async def scrape_status(task_id: str) -> ScrapeStatusResponse:
    """Poll scrape task status."""
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return ScrapeStatusResponse(
        task_id=task_id,
        status=task["status"],
        message=f"Jobs scraped: {task.get('count', 0)}" if task["status"] == "done"
        else task.get("error", task["status"]),
    )