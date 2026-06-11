"""Qdrant vector store client wrapper."""

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    PointStruct,
    VectorParams,
)

COLLECTION_NAME = "job_matches"
VECTOR_SIZE = 384  # bge-small-en-v1.5 output dimension


def get_client(url: str = "http://localhost:6333", api_key: str = "") -> QdrantClient:
    """Create a Qdrant client connection."""
    kwargs: dict = {"url": url}
    if api_key:
        kwargs["api_key"] = api_key
    return QdrantClient(**kwargs)


def ensure_collection(client: QdrantClient) -> None:
    """Create the collection if it doesn't exist."""
    collections = client.get_collections().collections
    names = [c.name for c in collections]
    if COLLECTION_NAME not in names:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE,
            ),
        )


def upsert_job(client: QdrantClient, job_id: str, vector: list[float], payload: dict) -> None:
    """Insert or update a job vector in Qdrant."""
    point = PointStruct(
        id=job_id,
        vector=vector,
        payload=payload,
    )
    client.upsert(collection_name=COLLECTION_NAME, points=[point])


def upsert_jobs_batch(
    client: QdrantClient,
    ids: list[str],
    vectors: list[list[float]],
    payloads: list[dict],
) -> None:
    """Batch insert or update job vectors in Qdrant."""
    points = [
        PointStruct(id=id_, vector=vec, payload=payload)
        for id_, vec, payload in zip(ids, vectors, payloads)
    ]
    client.upsert(collection_name=COLLECTION_NAME, points=points)


def query_similar(
    client: QdrantClient,
    query_vector: list[float],
    limit: int = 50,
    score_threshold: float = 0.0,
) -> list[dict]:
    """Find jobs similar to the query vector (profile embedding).

    Returns list of dicts with 'id', 'score', and 'payload' keys.
    """
    results = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        limit=limit,
        score_threshold=score_threshold,
    )
    return [
        {
            "id": str(r.id),
            "score": r.score,
            "payload": r.payload,
        }
        for r in results
    ]


def delete_job(client: QdrantClient, job_id: str) -> None:
    """Remove a job vector from Qdrant."""
    client.delete(collection_name=COLLECTION_NAME, points_selector=[job_id])
