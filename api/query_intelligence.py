"""Query intent understanding for Saudi legal search.

Uses an LLM to analyze the user's query before embedding:
- Detects the legal domain (court type) for metadata filtering
- Extracts key legal concepts
- Rewrites the query as an optimized legal search query

This runs on every search request, so it must be fast (~500ms).
Caches results to avoid repeated LLM calls for the same query.
"""
import json
import time
from api.embeddings import get_client

# Cache: query -> (result, timestamp)
_CACHE: dict[str, tuple[dict, float]] = {}
_CACHE_TTL = 3600  # 1 hour
_CACHE_MAX = 500


def _get_cached(query: str) -> dict | None:
    entry = _CACHE.get(query)
    if not entry:
        return None
    result, ts = entry
    if time.time() - ts > _CACHE_TTL:
        del _CACHE[query]
        return None
    return result


def _set_cached(query: str, result: dict) -> None:
    if len(_CACHE) >= _CACHE_MAX:
        oldest = min(_CACHE, key=lambda k: _CACHE[k][1])
        del _CACHE[oldest]
    _CACHE[query] = (result, time.time())


VALID_COURT_TYPES = {"personal_status", "commercial", "general", "labor"}

SYSTEM_PROMPT = """أنت محلل استعلامات قانونية سعودي خبير. حلل استعلام المستخدم وأعد نتيجة JSON.

القواعد:
1. اكتشف نوع المحكمة المناسبة من: personal_status (أحوال شخصية), commercial (تجاري), labor (عمالي), general (عام/غير محدد)
2. استخرج المفاهيم القانونية الأساسية في الاستعلام
3. أعد صياغة الاستعلام بصيغة قانونية دقيقة ومحسّنة للبحث الدلالي في نصوص الأحكام

مثال 1:
الاستعلام: "الحد الأقصى للتعويض لا يتجاوز أجر شهرين"
النتيجة: {"court_type": "labor", "concepts": ["تعويض العامل", "الحد الأقصى للتعويض", "أجر شهرين", "إنهاء العقد"], "rewritten_query": "حكم محكمة عمالية في تحديد التعويض عن إنهاء عقد العمل بغير سبب مشروع والحد الأقصى للتعويض بأجر شهرين وفقاً لنظام العمل"}

مثال 2:
الاستعلام: "شريك يريد سحب حصته من الشركة"
النتيجة: {"court_type": "commercial", "concepts": ["انسحاب الشريك", "حصص الشراكة", "تصفية الحصص"], "rewritten_query": "حكم تجاري في انسحاب الشريك من الشركة وحققه في استرداد حصته وتصفية حقوق الشركاء"}

مثال 3:
الاستعلام: "حضانة الأطفال بعد الطلاق"
النتيجة: {"court_type": "personal_status", "concepts": ["الحضانة", "الطلاق", "مصلحة المحضون"], "rewritten_query": "حكم أحوال شخصية في حضانة الأولاد بعد الطلاق وتحديد الحاضن وفقاً لمصلحة المحضون"}

أعد JSON فقط بدون أي نص إضافي بهذا الشكل:
{"court_type": "...", "concepts": ["...", "..."], "rewritten_query": "..."}"""


def analyze_query(query: str) -> dict | None:
    """Analyze user query intent. Returns dict with court_type, concepts, rewritten_query.
    Falls back to None on any error (search proceeds without intelligence)."""
    query = query.strip()
    if not query or len(query) < 3:
        return None

    cached = _get_cached(query)
    if cached:
        return cached

    try:
        response = get_client().chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": query},
            ],
            temperature=0.1,
            max_tokens=300,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)

        # Validate and sanitize
        court_type = result.get("court_type", "general")
        if court_type not in VALID_COURT_TYPES:
            court_type = "general"

        output = {
            "court_type": court_type,
            "concepts": [str(c) for c in result.get("concepts", [])][:8],
            "rewritten_query": str(result.get("rewritten_query", query))[:500],
        }
        _set_cached(query, output)
        return output
    except Exception as e:
        print(f"[QUERY_INTELLIGENCE] Failed: {e}")
        return None
