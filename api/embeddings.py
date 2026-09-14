from openai import OpenAI
from api.config import OPENAI_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


def embed_text(text: str) -> list[float]:
    response = get_client().embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    return response.data[0].embedding


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts in a single API call. Returns list of embeddings in order."""
    response = get_client().embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    return [d.embedding for d in response.data]


def vector_to_pgvector(vector: list[float]) -> str:
    return "[" + ",".join(str(x) for x in vector) + "]"
