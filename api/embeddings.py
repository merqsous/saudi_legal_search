import os
import time
from openai import OpenAI
from api.config import OPENAI_API_KEY, EMBEDDING_DIMENSIONS

_client = None

SMALL_MODEL = "text-embedding-3-small"
LARGE_MODEL = "text-embedding-3-large"

# Env override: "1" forces the large model, "0" forces the small one.
# Unset = auto-detect (switch to large once the embedding_large migration completes).
_FORCE_LARGE = os.getenv("USE_LARGE_EMBEDDINGS", "")

# Cache the auto-detection result (DB count) to avoid a scan per request
_detection_cache: tuple[float, bool] | None = None
_CACHE_SECONDS = 600


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


def use_large_embeddings() -> bool:
    """Whether to serve searches from text-embedding-3-large (embedding_large column).

    Auto-detects completion of the re-embedding job: once every chunk has an
    embedding_large value, the platform switches over with zero downtime.
    """
    global _detection_cache
    if _FORCE_LARGE == "1":
        return True
    if _FORCE_LARGE == "0":
        return False

    now = time.time()
    if _detection_cache and now - _detection_cache[0] < _CACHE_SECONDS:
        return _detection_cache[1]

    try:
        from api.db import query_one
        remaining = query_one(
            "SELECT COUNT(*) AS c FROM judgment_chunks WHERE embedding_large IS NULL"
        )["c"]
        use = remaining == 0
    except Exception:
        use = False
    _detection_cache = (now, use)
    return use


def get_embedding_model() -> str:
    return LARGE_MODEL if use_large_embeddings() else SMALL_MODEL


def get_embedding_column() -> str:
    return "embedding_large" if use_large_embeddings() else "embedding"


def embed_text(text: str) -> list[float]:
    response = get_client().embeddings.create(
        model=get_embedding_model(),
        input=text,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    return response.data[0].embedding


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts in a single API call. Returns list of embeddings in order."""
    response = get_client().embeddings.create(
        model=get_embedding_model(),
        input=texts,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    return [d.embedding for d in response.data]


def vector_to_pgvector(vector: list[float]) -> str:
    return "[" + ",".join(str(x) for x in vector) + "]"
