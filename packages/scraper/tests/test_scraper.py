"""
Scraper unit tests.
Uses respx to mock httpx — no real network calls.
"""
import json
from datetime import datetime, timezone

import pytest
import respx
from httpx import Response

from src.schema.models import Job, JobSource, JobType
from src.ats.greenhouse import GreenhouseCrawler
from src.ats.lever import LeverCrawler
from src.ats.ashby import AshbyCrawler
from src.rss.fetcher import fetch_remoteok, fetch_wwr


# ── Schema ────────────────────────────────────────────────────────────────────

def test_job_id_stable():
    id1 = Job.make_id(JobSource.GREENHOUSE, "Stripe", "SWE", "https://example.com/1")
    id2 = Job.make_id(JobSource.GREENHOUSE, "Stripe", "SWE", "https://example.com/1")
    assert id1 == id2


def test_job_id_unique():
    id1 = Job.make_id(JobSource.GREENHOUSE, "Stripe", "SWE", "https://example.com/1")
    id2 = Job.make_id(JobSource.GREENHOUSE, "Stripe", "SWE", "https://example.com/2")
    assert id1 != id2


def test_job_description_stripped():
    job = Job(
        id="abc",
        source=JobSource.REMOTEOK,
        apply_url="https://example.com",
        title="Eng",
        company="ACME",
        description="  hello  ",
        scraped_at=datetime.now(timezone.utc),
    )
    assert job.description == "hello"


# ── Greenhouse ────────────────────────────────────────────────────────────────

GH_RESPONSE = {
    "jobs": [
        {
            "id": 12345,
            "title": "Backend Engineer",
            "absolute_url": "https://boards.greenhouse.io/stripe/jobs/12345",
            "location": {"name": "Remote"},
            "content": "Build payment APIs.",
            "updated_at": "2024-05-01T10:00:00Z",
            "departments": [{"name": "Engineering"}],
            "metadata": [],
        }
    ]
}


@pytest.mark.asyncio
@respx.mock
async def test_greenhouse_fetch():
    respx.get("https://boards-api.greenhouse.io/v1/boards/stripe/jobs").mock(
        return_value=Response(200, json=GH_RESPONSE)
    )
    async with GreenhouseCrawler() as crawler:
        jobs = await crawler.fetch_company("stripe")

    assert len(jobs) == 1
    job = jobs[0]
    assert job.title == "Backend Engineer"
    assert job.source == JobSource.GREENHOUSE
    assert job.remote is True
    assert "Engineering" in job.tags


# ── Lever ─────────────────────────────────────────────────────────────────────

LEVER_RESPONSE = [
    {
        "text": "Data Scientist",
        "hostedUrl": "https://jobs.lever.co/openai/abc-123",
        "applyUrl": "https://jobs.lever.co/openai/abc-123/apply",
        "categories": {"location": "San Francisco", "commitment": "full-time"},
        "workplaceType": "hybrid",
        "createdAt": 1714550400000,
        "tags": ["ml", "python"],
        "descriptionPlain": "Build models.",
        "lists": [],
    }
]


@pytest.mark.asyncio
@respx.mock
async def test_lever_fetch():
    respx.get("https://api.lever.co/v0/postings/openai").mock(
        return_value=Response(200, json=LEVER_RESPONSE)
    )
    async with LeverCrawler() as crawler:
        jobs = await crawler.fetch_company("openai")

    assert len(jobs) == 1
    job = jobs[0]
    assert job.title == "Data Scientist"
    assert job.job_type == JobType.FULL_TIME
    assert "ml" in job.tags


# ── Ashby ─────────────────────────────────────────────────────────────────────

ASHBY_RESPONSE = {
    "data": {
        "jobBoard": {
            "jobPostings": [
                {
                    "id": "xyz-789",
                    "title": "Frontend Engineer",
                    "locationName": "Remote",
                    "employmentType": "FullTime",
                    "isRemote": True,
                    "publishedDate": "2024-05-10T00:00:00Z",
                    "externalLink": "https://jobs.ashbyhq.com/vercel/xyz-789",
                    "descriptionHtml": "<p>Build UI.</p>",
                    "departmentName": "Product",
                    "compensationTierSummary": None,
                }
            ]
        }
    }
}


@pytest.mark.asyncio
@respx.mock
async def test_ashby_fetch():
    respx.post("https://jobs.ashbyhq.com/api/non-user-graphql").mock(
        return_value=Response(200, json=ASHBY_RESPONSE)
    )
    async with AshbyCrawler() as crawler:
        jobs = await crawler.fetch_company("vercel")

    assert len(jobs) == 1
    job = jobs[0]
    assert job.title == "Frontend Engineer"
    assert job.remote is True
    assert job.job_type == JobType.FULL_TIME


# ── RemoteOK ──────────────────────────────────────────────────────────────────

REMOTEOK_RESPONSE = [
    {"legal": "..."},  # first item always legal notice
    {
        "position": "DevOps Engineer",
        "company": "Acme Corp",
        "url": "/remote-jobs/devops-engineer-acme-corp",
        "description": "<p>Manage infra.</p>",
        "tags": ["devops", "aws"],
        "epoch": "1714550400",
    },
]


@pytest.mark.asyncio
@respx.mock
async def test_remoteok_fetch():
    import httpx

    respx.get("https://remoteok.com/api").mock(
        return_value=Response(200, json=REMOTEOK_RESPONSE)
    )
    async with httpx.AsyncClient() as client:
        jobs = await fetch_remoteok(client)

    assert len(jobs) == 1
    assert jobs[0].company == "Acme Corp"
    assert jobs[0].remote is True
    assert "devops" in jobs[0].tags
