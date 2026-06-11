"""Text embedding using sentence-transformers."""

from functools import lru_cache

from sentence_transformers import SentenceTransformer

MODEL_NAME = "BAAI/bge-small-en-v1.5"
MAX_TEXT_LENGTH = 512


@lru_cache(maxsize=1)
def get_encoder() -> SentenceTransformer:
    """Lazy-load and cache the embedding model."""
    return SentenceTransformer(MODEL_NAME)


def embed_text(text: str) -> list[float]:
    """Embed a single text string into a vector.

    Truncates input to MAX_TEXT_LENGTH characters to stay within model limits.
    """
    model = get_encoder()
    truncated = text[:MAX_TEXT_LENGTH]
    embedding = model.encode(truncated, normalize_embeddings=True)
    return embedding.tolist()


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed multiple text strings into vectors (batched)."""
    model = get_encoder()
    truncated = [t[:MAX_TEXT_LENGTH] for t in texts]
    embeddings = model.encode(truncated, normalize_embeddings=True)
    return embeddings.tolist()


def embed_job_text(job: "Job") -> list[float]:
    """Create embedding text from a Job: title + description."""
    from ..models.job import Job

    parts = [job.title, job.company]
    if job.description:
        parts.append(job.description)
    combined = " | ".join(parts)
    return embed_text(combined)


def embed_profile_text(profile: "UserProfile") -> list[float]:
    """Create embedding from a UserProfile."""
    return embed_text(profile.embedding_text)
