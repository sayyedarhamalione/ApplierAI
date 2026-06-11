# Job Applier 2026

AI-powered job application automation system. Scrape → Match → Apply → Track.

## Architecture

```
Apify scrape → raw jobs → Qdrant match score → filter >threshold
  → Temporal queue → Playwright open job → Claude parse form
  → fill fields → upload resume → submit
  → Supabase log → realtime → dashboard update
```

## Stack

| Layer | Tech |
|-------|------|
| Scraping | Apify (LinkedIn, Indeed, Wellfound actors) |
| Matching | Qdrant + BAAI/bge-small-en-v1.5 embeddings |
| Orchestration | LangGraph + Temporal.io |
| Browser | Playwright + playwright-stealth |
| AI | Claude claude-sonnet-4-20250514 (API) |
| Store | Supabase (Postgres + Realtime) |
| Dashboard | Next.js + shadcn/ui |
| Deploy | Railway (backend) + Vercel (dashboard) + Apify Cloud |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker + Docker Compose
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### 1. Start infrastructure

```bash
cd infra
docker compose up -d    # Starts Qdrant + Temporal + Postgres
```

### 2. Install Python dependencies

```bash
uv sync                 # Install all workspace packages
```

### 3. Configure

```bash
cp config/secrets.env config/secrets.env.local
# Edit config/secrets.env.local with your API keys:
#   ANTHROPIC_API_KEY=sk-...
#   APIFY_API_TOKEN=...
#   SUPABASE_URL=https://xxx.supabase.co
#   SUPABASE_KEY=...
```

Edit `config/profile.yaml` with your resume data and `config/preferences.yaml` with your job search preferences.

### 4. Run Supabase migrations

Run `infra/supabase_schema.sql` in your Supabase SQL editor.

### 5. P0 Pipeline (scrape → match → store)

```python
from job_applier_core.config import load_profile, load_preferences, load_secrets
from job_applier_core.matching.scorer import index_jobs, match_jobs
from job_applier_core.matching.supabase_writer import insert_jobs, update_job_match_score, get_supabase_client
from job_applier_scraper.linkedin_actor import scrape_linkedin

secrets = load_secrets()
profile = load_profile()
prefs = load_preferences()

# Scrape
jobs = scrape_linkedin(secrets.apify_api_token, prefs.search.keywords)

# Index in Qdrant
index_jobs(jobs, secrets.qdrant_url, secrets.qdrant_api_key)

# Match
matches = match_jobs(profile, prefs.matching, secrets.qdrant_url, secrets.qdrant_api_key)

# Store in Supabase
client = get_supabase_client(secrets.supabase_url, secrets.supabase_key)
insert_jobs(client, jobs)
for m in matches:
    update_job_match_score(client, m.job.id, m.match_score, m.embedding_id)
```

## Project Structure

```
job-applier-2026/
├── packages/
│   ├── core/         # Models, matching, AI, config (shared)
│   ├── scraper/      # Apify actor configs + local dev
│   ├── orchestrator/ # LangGraph graph + Temporal workflows
│   ├── browser/      # Playwright automation + anti-detect
│   └── api/          # FastAPI backend
├── dashboard/        # Next.js + shadcn/ui frontend
├── config/           # YAML configs + secrets
├── infra/            # Docker compose + SQL migrations
└── pyproject.toml    # uv workspace root
```

## Phases

| Phase | Deliverable | Status |
|-------|-------------|--------|
| P0 | Apify scraper + Qdrant matcher + Supabase tracker | ✅ Scaffolded |
| P1 | LinkedIn Easy Apply via Playwright | 🔜 Next |
| P2 | Generic full-form filler (Claude vision fallback) | 🔜 |
| P3 | Cover letter gen + email follow-up | 🔜 |
| P4 | Dashboard + apply queue controls | 🔜 |

## Anti-Detection

- Residential proxy (Bright Data / Oxylabs)
- playwright-stealth + real Chrome CDP
- Human-like delays (1-4s between actions)
- Persistent sessions (cookie import)
- CAPTCHA → pause + manual solve (no auto-solve)

## License

Private — not for distribution.
