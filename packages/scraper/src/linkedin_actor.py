"""LinkedIn job scraper using Apify."""

from apify_client import ApifyClient

from ..models.job import Job, Platform


# Apify actor IDs for pre-built LinkedIn scrapers
LINKEDIN_ACTOR_ID = "curious_coder/linkedin-jobs-scraper"


def scrape_linkedin(
    api_token: str,
    keywords: list[str],
    location: str = "Remote",
    max_items: int = 50,
    easy_apply_only: bool = False,
) -> list[Job]:
    """Run the LinkedIn Apify actor and return parsed Job objects.

    Args:
        api_token: Apify API token
        keywords: Search keywords (job titles)
        location: Geographic location filter
        max_items: Maximum number of jobs to scrape
        easy_apply_only: Filter for Easy Apply jobs only

    Returns:
        List of Job objects from scraped results
    """
    client = ApifyClient(api_token)

    actor_input = {
        "keywords": keywords,
        "location": location,
        "maxItems": max_items,
        "easyApplyOnly": easy_apply_only,
    }

    run = client.actor(LINKEDIN_ACTOR_ID).call(run_input=actor_input)

    jobs = []
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        job = Job(
            platform=Platform.LINKEDIN,
            external_id=item.get("id", item.get("jobId", "")),
            title=item.get("title", ""),
            company=item.get("companyName", item.get("company", "")),
            location=item.get("location", ""),
            salary_range=item.get("salary", None),
            description=item.get("description", ""),
            url=item.get("url", item.get("jobUrl", "")),
            posted_date=item.get("postedAt", None),
            is_easy_apply=item.get("easyApply", False),
        )
        jobs.append(job)

    return jobs
