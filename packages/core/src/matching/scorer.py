"""Semantic job-profile matching scorer."""

from ..models.job import Job, JobMatch
from ..models.profile import UserProfile
from ..models.config import MatchingConfig
from .embedder import embed_job_text, embed_profile_text
from .store import (
    ensure_collection,
    get_client,
    query_similar,
    upsert_job,
    upsert_jobs_batch,
)


def index_jobs(jobs: list[Job], qdrant_url: str = "http://localhost:6333", qdrant_api_key: str = "") -> None:
    """Embed and index a batch of jobs into Qdrant.

    Each job is embedded and upserted with its metadata as payload.
    """
    client = get_client(qdrant_url, qdrant_api_key)
    ensure_collection(client)

    ids = []
    vectors = []
    payloads = []

    for job in jobs:
        vector = embed_job_text(job)
        ids.append(job.id)
        vectors.append(vector)
        payloads.append({
            "platform": job.platform.value,
            "external_id": job.external_id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "url": job.url,
            "is_easy_apply": job.is_easy_apply,
        })

    upsert_jobs_batch(client, ids, vectors, payloads)


def match_jobs(
    profile: UserProfile,
    config: MatchingConfig,
    qdrant_url: str = "http://localhost:6333",
    qdrant_api_key: str = "",
) -> list[JobMatch]:
    """Find jobs that match the user profile above the score threshold.

    Returns a list of JobMatch objects sorted by match_score descending.
    """
    client = get_client(qdrant_url, qdrant_api_key)
    ensure_collection(client)

    profile_vector = embed_profile_text(profile)
    results = query_similar(
        client,
        profile_vector,
        limit=config.max_jobs_per_run,
        score_threshold=config.score_threshold,
    )

    matches = []
    for r in results:
        payload = r["payload"]
        job = Job(
            id=r["id"],
            platform=payload.get("platform", "linkedin"),
            external_id=payload.get("external_id", ""),
            title=payload.get("title", ""),
            company=payload.get("company", ""),
            location=payload.get("location"),
            url=payload.get("url", ""),
            is_easy_apply=payload.get("is_easy_apply", False),
        )
        matches.append(JobMatch(
            job=job,
            match_score=r["score"],
            embedding_id=r["id"],
        ))

    return sorted(matches, key=lambda m: m.match_score, reverse=True)
