"""Indeed job scraper using Apify."""

from apify_client import ApifyClient

from job_applier_core.models.job import Job, Platform


# Apify actor ID for Indeed scraper
INDEED_ACTOR_ID = "miscscraper/indeed-jobs-scraper"


def scrape_indeed(
    api_token: str,
    keywords: list[str],
    location: str = "Remote",
    max_items: int = 50,
) -> list[Job]:
    """Run the Indeed Apify actor and return parsed Job objects."""
    client = ApifyClient(api_token)

    actor_input = {
        "keyword": keywords[0] if keywords else "software engineer",
        "location": location,
        "maxItems": max_items,
    }

    run = client.actor(INDEED_ACTOR_ID).call(run_input=actor_input)

    jobs = []
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        job = Job(
            platform=Platform.INDEED,
            external_id=item.get("id", item.get("jobKey", "")),
            title=item.get("title", ""),
            company=item.get("company", item.get("companyName", "")),
            location=item.get("location", ""),
            salary_range=item.get("salary", None),
            description=item.get("description", item.get("snippet", "")),
            url=item.get("url", item.get("jobUrl", "")),
            posted_date=item.get("date", None),
            is_easy_apply=False,  # Indeed doesn't have "Easy Apply"
        )
        jobs.append(job)

    return jobs
