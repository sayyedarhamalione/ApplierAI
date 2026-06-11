"""Wellfound (AngelList) job scraper using Apify."""

from apify_client import ApifyClient

from job_applier_core.models.job import Job, Platform


# Apify actor ID for Wellfound scraper
WELLFOUND_ACTOR_ID = "miscscraper/wellfound-jobs-scraper"


def scrape_wellfound(
    api_token: str,
    keywords: list[str],
    location: str = "Remote",
    max_items: int = 50,
) -> list[Job]:
    """Run the Wellfound Apify actor and return parsed Job objects."""
    client = ApifyClient(api_token)

    actor_input = {
        "keyword": keywords[0] if keywords else "software engineer",
        "location": location,
        "maxItems": max_items,
    }

    run = client.actor(WELLFOUND_ACTOR_ID).call(run_input=actor_input)

    jobs = []
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        job = Job(
            platform=Platform.WELLFOUND,
            external_id=item.get("id", item.get("slug", "")),
            title=item.get("title", ""),
            company=item.get("company", item.get("startupName", "")),
            location=item.get("location", ""),
            salary_range=item.get("salary", None),
            description=item.get("description", ""),
            url=item.get("url", ""),
            posted_date=item.get("postedAt", None),
            is_easy_apply=item.get("oneClickApply", False),
        )
        jobs.append(job)

    return jobs
