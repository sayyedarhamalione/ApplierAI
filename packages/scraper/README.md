# packages/scraper

Job scraping for ApplierAI. Three source types → one `Job` schema.

## Sources

| Source | Mechanism | Rate limit |
|---|---|---|
| **JobSpy** | LinkedIn / Indeed / Glassdoor / ZipRecruiter | ~50 results/site |
| **Greenhouse** | `boards-api.greenhouse.io` JSON | Public, no auth |
| **Lever** | `api.lever.co/v0/postings` JSON | Public, no auth |
| **Ashby** | `jobs.ashbyhq.com` GraphQL | Public, no auth |
| **RemoteOK** | JSON API | 1 req/min recommended |
| **WWR** | RSS feed | No limit |

## Structure

```
src/
  schema/models.py      # canonical Job model (Pydantic v2)
  jobspy/wrapper.py     # JobSpy sync wrapper → normalized Jobs
  ats/
    base.py             # ATSCrawler ABC (httpx async + concurrency cap)
    greenhouse.py       # Greenhouse crawler
    lever.py            # Lever crawler
    ashby.py            # Ashby GQL crawler
  rss/fetcher.py        # RemoteOK + WWR async fetcher
  pipeline.py           # unified ScraperConfig → run_scraper()
```

## Quick start

```python
import asyncio
from src import run_scraper, ScraperConfig, ATSSlugs

config = ScraperConfig(
    jobspy_query="backend engineer python",
    jobspy_location="Remote",
    ats_slugs=ATSSlugs(
        greenhouse=["stripe", "airbnb"],
        lever=["openai", "anthropic"],
        ashby=["vercel", "linear"],
    ),
    rss_remoteok=True,
    rss_wwr=True,
)

jobs = asyncio.run(run_scraper(config))
print(f"{len(jobs)} jobs scraped")
```

## ATS slug lookup

- **Greenhouse:** `boards.greenhouse.io/{slug}` → use `{slug}`
- **Lever:** `jobs.lever.co/{slug}` → use `{slug}`  
- **Ashby:** `jobs.ashbyhq.com/{slug}` → use `{slug}`

Slugs loaded from Google Sheet in P4.

## Install

```bash
pip install -e "packages/scraper[dev]"
pytest packages/scraper/tests/
```
