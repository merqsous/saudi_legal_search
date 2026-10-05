import re
from fastapi import APIRouter, Query, HTTPException, Request
from api.db import query_all, query_one
from api.embeddings import embed_text, vector_to_pgvector
from api.routes.auth import log_search, get_client_ip, get_country_from_ip
from api.routes.search import (
    normalize_arabic,
    _get_user_id_by_phone,
    _has_active_subscription,
    _get_search_count,
    _get_anonymous_search_count,
    FREE_SEARCH_LIMIT,
    ANON_SEARCH_LIMIT,
    UNLIMITED_SEARCH_PHONES,
    _rrf_merge,
)

router = APIRouter()

# Function words excluded from the OR fallback — they match most of the
# corpus and inflate totals without adding signal.
_OR_STOPWORDS = {
    'في', 'من', 'علي', 'الي', 'عن', 'ما', 'هل', 'كيف', 'اذا', 'او', 'انا',
    'هو', 'هي', 'اني', 'ان', 'لم', 'لن', 'لا', 'قد', 'ثم', 'كل', 'هذا',
    'هذه', 'ذلك', 'التي', 'الذي', 'مع', 'بعد', 'قبل', 'عند', 'بين',
}

# FTS over question + consolidated answer — GIN-indexed expression, must
# match idx_threads_tsv verbatim.
_FTS_EXPR = (
    "to_tsvector('arabic', coalesce(t.canonical_question,'') || ' ' || "
    "coalesce(t.consolidated_answer,''))"
)


def _kw_fetch(tsq_expr, tsq_param, topic, limit, offset):
    """One FTS pass with a caller-supplied tsquery expression."""
    topic_filter = "AND t.topic = %s" if topic else ""
    cte = f"WITH q AS (SELECT {tsq_expr} AS tsq)"
    params = [tsq_param] + ([topic] if topic else [])

    count_row = query_one(f"""
        {cte} SELECT COUNT(*) AS c FROM legal_threads t CROSS JOIN q
        WHERE q.tsq <> ''::tsquery AND {_FTS_EXPR} @@ q.tsq {topic_filter}
    """, params)
    total = count_row["c"] if count_row else 0
    if not total:
        return [], 0

    rows = query_all(f"""
        {cte}
        SELECT t.id AS thread_pk, t.thread_id, t.topic, t.canonical_question,
               t.consolidated_answer, t.confidence, t.status, t.responder_count,
               t.turn_count, t.conversation,
               ts_headline('arabic', coalesce(t.consolidated_answer,''), q.tsq,
                   'MaxWords=50, MinWords=15, MaxFragments=2, FragmentDelimiter='' ... ''') AS answer_headline,
               ts_rank({_FTS_EXPR}, q.tsq) AS kw_rank,
               0.08 AS distance
        FROM legal_threads t CROSS JOIN q
        WHERE q.tsq <> ''::tsquery AND {_FTS_EXPR} @@ q.tsq {topic_filter}
        ORDER BY kw_rank DESC, t.id
        LIMIT %s OFFSET %s
    """, params + [limit, offset])
    return rows, total


def _keyword_threads(q, topic, limit, offset):
    """Arabic FTS over threads — AND first for precision, OR fallback for recall.

    The corpus is small (~3.3k), so strict AND matching misses paraphrases
    like 'اجار' vs 'ايجار'. When AND finds nothing we OR the stemmed terms
    and let ts_rank order them; semantic results still fuse on top via RRF.
    """
    tsv_q = normalize_arabic(q).strip()
    if not tsv_q:
        return [], 0

    rows, total = _kw_fetch(
        "plainto_tsquery('arabic', %s)", tsv_q, topic, limit, offset
    )
    terms = [t for t in tsv_q.split() if t not in _OR_STOPWORDS]
    if not total and terms:
        try:
            rows, total = _kw_fetch(
                "to_tsquery('arabic', %s)", " | ".join(terms), topic, limit, offset
            )
        except Exception:
            pass
    for r in rows:
        r["kw"] = True
        r["match_type"] = "keyword"
    return rows, total


def _semantic_threads(q, topic, cand_k):
    """Vector stage over thread embeddings — returns (id rows, total)."""
    try:
        vec = vector_to_pgvector(embed_text(q))
    except Exception as e:
        print(f"[PROCEDURAL WARNING] Embedding failed: {e}")
        return [], 0

    topic_filter = "AND t.topic = %s" if topic else ""
    rows = query_all(f"""
        SELECT t.id AS thread_pk, MIN(t.embedding <=> %s::vector) AS distance,
               COUNT(*) OVER() AS total_count
        FROM legal_threads t
        WHERE t.embedding IS NOT NULL AND t.embedding <=> %s::vector < 0.45
          {topic_filter}
        GROUP BY t.id
        ORDER BY distance
        LIMIT %s
    """, [vec, vec] + ([topic] if topic else []) + [cand_k])
    total = rows[0]["total_count"] if rows else 0
    return rows, total


@router.get("/procedural-search")
def procedural_search(
    request: Request,
    q: str = Query("", description="Procedural question in Arabic"),
    topic: str | None = Query(None),
    anonymous: bool = Query(False),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    source: str | None = Query(None),
):
    phone = request.headers.get("X-User-Phone", "")
    ip = get_client_ip(request)
    user_id = _get_user_id_by_phone(phone) if phone else None

    # Same funnel as judgment search: anonymous preview then registration,
    # two free searches for registered users, unlimited for subscribers.
    if user_id is not None:
        if phone not in UNLIMITED_SEARCH_PHONES and not _has_active_subscription(user_id):
            if _get_search_count(user_id) >= FREE_SEARCH_LIMIT:
                raise HTTPException(status_code=402, detail="subscription_required")
    else:
        if ip and _get_anonymous_search_count(ip) >= ANON_SEARCH_LIMIT:
            raise HTTPException(status_code=402, detail="registration_required")

    effective_limit = 3 if (anonymous or user_id is None) else limit
    has_query = bool(q and q.strip())

    rows: list = []
    total = 0

    if has_query:
        cand_k = min(max(offset + effective_limit + 40, 60), 300)
        try:
            kw_rows, kw_total = _keyword_threads(q, topic, cand_k, 0)
        except Exception as e:
            print(f"[PROCEDURAL WARNING] Keyword search failed: {e}")
            kw_rows, kw_total = [], 0

        sem_rows, sem_total = _semantic_threads(q, topic, cand_k)

        fused_ids, _ = _rrf_merge(
            [{"judgment_id": r["thread_pk"]} for r in kw_rows],
            [{"judgment_id": r["thread_pk"]} for r in sem_rows],
        )
        sem_id_set = {r["thread_pk"] for r in sem_rows}
        kw_by_id = {r["thread_pk"]: r for r in kw_rows}
        total = max(kw_total + sem_total - len(sem_id_set & set(kw_by_id)), len(fused_ids))

        page_ids = fused_ids[offset:offset + effective_limit]

        # Fetch full thread data for semantic-only hits on this page.
        fetch_ids = [j for j in page_ids if j not in kw_by_id]
        sem_meta = {}
        if fetch_ids:
            for r in query_all("""
                SELECT t.id AS thread_pk, t.thread_id, t.topic, t.canonical_question,
                       t.consolidated_answer, t.confidence, t.status, t.responder_count,
                       t.turn_count, t.conversation, NULL AS answer_headline
                FROM legal_threads t WHERE t.id = ANY(%s)
            """, [fetch_ids]):
                sem_meta[r["thread_pk"]] = r

        for pos, pk in enumerate(page_ids, start=1):
            row = kw_by_id.get(pk) or sem_meta.get(pk)
            if not row:
                continue
            row = dict(row)
            row["_fp"] = pos
            if pk in kw_by_id and pk in sem_id_set:
                row["match_type"] = "hybrid"
            rows.append(row)
    else:
        # Browse: latest topics when no query — newest threads first.
        topic_filter = "WHERE t.topic = %s" if topic else ""
        total = (query_one(f"SELECT COUNT(*) c FROM legal_threads t {topic_filter}",
                           [topic] if topic else []) or {"c": 0})["c"]
        rows = query_all(f"""
            SELECT t.id AS thread_pk, t.thread_id, t.topic, t.canonical_question,
                   t.consolidated_answer, t.confidence, t.status, t.responder_count,
                   t.turn_count, t.conversation, NULL AS answer_headline
            FROM legal_threads t {topic_filter}
            ORDER BY t.id DESC LIMIT %s OFFSET %s
        """, ([topic] if topic else []) + [effective_limit, offset])

    results = []
    for row in rows:
        answer = re.sub(r"</?b>", "", row.get("answer_headline") or row.get("consolidated_answer") or "")
        results.append({
            "thread_id": row["thread_id"],
            "topic": row["topic"],
            "question": row["canonical_question"],
            "answer": answer,
            "confidence": row["confidence"],
            "status": row["status"],
            "responder_count": row["responder_count"],
            "turn_count": row["turn_count"],
            "conversation": row.get("conversation"),
            "match_type": row.get("match_type") or ("semantic" if has_query else "browse"),
            "fused_rank": row.get("_fp"),
        })

    country = get_country_from_ip(ip)
    is_anon = anonymous or not phone
    log_search(
        "" if is_anon else phone, q, topic, None, None, None, total, ip, country,
        is_anonymous=is_anon, source=source,
    )

    return {"results": results, "total": total, "limit": effective_limit, "offset": offset}


@router.get("/procedural-topics")
def procedural_topics():
    rows = query_all("""
        SELECT topic, COUNT(*) AS c FROM legal_threads
        WHERE topic IS NOT NULL GROUP BY topic ORDER BY c DESC
    """)
    return {"topics": [{"topic": r["topic"], "count": r["c"]} for r in rows]}
