"""Supabase database writer for jobs, applications, and status records."""

from supabase import create_client, Client

from ..models.job import Application, ApplicationStatus, Job, ScrapeRun


def get_supabase_client(url: str, key: str) -> Client:
    """Create a Supabase client."""
    return create_client(url, key)


def insert_jobs(client: Client, jobs: list[Job]) -> list[Job]:
    """Insert scraped jobs into the jobs table.

    Returns the list of jobs with Supabase-generated IDs.
    Skips duplicates (by platform + external_id unique constraint).
    """
    rows = []
    for job in jobs:
        rows.append({
            "platform": job.platform.value,
            "external_id": job.external_id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "salary_range": job.salary_range,
            "description": job.description,
            "url": job.url,
            "posted_date": job.posted_date.isoformat() if job.posted_date else None,
            "scraped_at": job.scraped_at.isoformat(),
            "is_easy_apply": job.is_easy_apply,
        })

    if not rows:
        return []

    # Insert in batch; on conflict (duplicate external_id), skip
    response = client.table("jobs").upsert(
        rows,
        on_conflict="platform,external_id",
        ignore_duplicates=True,
    ).execute()

    return jobs


def update_job_match_score(client: Client, job_id: str, match_score: float, embedding_id: str) -> None:
    """Update a job's match score and Qdrant embedding ID."""
    client.table("jobs").update({
        "match_score": match_score,
        "embedding_id": embedding_id,
    }).eq("id", job_id).execute()


def insert_application(client: Client, application: Application) -> Application:
    """Insert an application record."""
    row = {
        "job_id": application.job_id,
        "status": application.status.value,
        "apply_type": application.apply_type.value if application.apply_type else None,
        "cover_letter": application.cover_letter,
        "applied_at": application.applied_at.isoformat() if application.applied_at else None,
        "error": application.error,
        "screenshot_url": application.screenshot_url,
    }
    response = client.table("applications").insert(row).execute()
    return application


def update_application_status(client: Client, app_id: str, status: str, error: str | None = None) -> None:
    """Update an application's status."""
    update_data = {"status": status}
    if error is not None:
        update_data["error"] = error
    client.table("applications").update(update_data).eq("id", app_id).execute()


def insert_application_status(client: Client, app_status: ApplicationStatus) -> ApplicationStatus:
    """Insert a kanban status record for an application."""
    row = {
        "application_id": app_status.application_id,
        "status": app_status.status.value,
        "platform_status": app_status.platform_status,
    }
    client.table("application_status").insert(row).execute()
    return app_status


def insert_scrape_run(client: Client, run: ScrapeRun) -> ScrapeRun:
    """Insert a scrape run record."""
    row = {
        "platform": run.platform.value,
        "started_at": run.started_at.isoformat(),
        "jobs_found": run.jobs_found,
        "jobs_new": run.jobs_new,
        "status": run.status,
    }
    client.table("scrape_runs").insert(row).execute()
    return run


def complete_scrape_run(client: Client, run_id: str, jobs_found: int, jobs_new: int) -> None:
    """Mark a scrape run as completed."""
    from datetime import datetime
    client.table("scrape_runs").update({
        "completed_at": datetime.utcnow().isoformat(),
        "jobs_found": jobs_found,
        "jobs_new": jobs_new,
        "status": "completed",
    }).eq("id", run_id).execute()


def get_applied_job_ids(client: Client) -> set[str]:
    """Get set of job IDs that have already been applied to (for dedup)."""
    response = client.table("applications").select("job_id").execute()
    return {row["job_id"] for row in response.data}
