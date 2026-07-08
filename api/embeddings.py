from openai import OpenAI
from api.config import OPENAI_API_KEY, EMBEDDING_MODEL

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
    )
    return response.data[0].embedding


def vector_to_pgvector(vector: list[float]) -> str:
    return "[" + ",".join(str(x) for x in vector) + "]"
