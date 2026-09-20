import json
import os
import re
from fastapi import APIRouter, Query, HTTPException, Request
from api.db import query_all, query_one, get_db
from api.embeddings import embed_text, vector_to_pgvector, get_client, get_embedding_column, get_embedding_model
from api.query_intelligence import analyze_query
from api.legal_kb import get_kb_expansions, CONCEPTS as KB_CONCEPTS
from api.routes.auth import log_search, get_client_ip, get_country_from_ip, ADMIN_PHONE

router = APIRouter()

# Registered users who have not subscribed get a fixed number of free searches
# before being required to upgrade. Anonymous users get a smaller preview
# (handled separately via the `anonymous` query param).
FREE_SEARCH_LIMIT = 20

# Phone numbers that always bypass the subscription requirement (admin/owner).
UNLIMITED_SEARCH_PHONES = {ADMIN_PHONE, "966553466235"}


def _get_user_id_by_phone(phone: str) -> int | None:
    if not phone:
        return None
    row = query_one("SELECT id FROM users WHERE phone = %s", [phone])
    return row["id"] if row else None


def _has_active_subscription(user_id: int) -> bool:
    row = query_one(
        "SELECT 1 FROM user_subscriptions WHERE user_id = %s AND status = 'active' "
        "AND expires_at > NOW() LIMIT 1",
        [user_id],
    )
    return row is not None


def _get_search_count(user_id: int) -> int:
    row = query_one(
        "SELECT COUNT(*) as c FROM search_logs WHERE user_id = %s AND is_anonymous = FALSE",
        [user_id],
    )
    return row["c"] if row else 0

# Footer/boilerplate chunks have been deleted from the DB.
# No NOT LIKE filters needed - keeps queries fast.
_FOOTER_CHUNK_FILTER = ""

# MOJ website footer markers - text after these is website navigation, not judgment content
_FOOTER_MARKERS = [
    "البريدية اتفاقية مستوى الخدمة",
    "الإلكترونية تقديم شكوى بلاغ عن فساد",
    "الاتصال و المساعدة اتصل بنا",
    "عن البوابة من نحن استراتيجية",
    "من نحن استراتيجية امن المعلومات",
    "المجلس الأعلى للقضاء المنصة",
    "الأسئلة الشائعة روابط مهمة",
]


def _clean_full_text(text: str) -> str:
    """Remove MOJ website footer/navigation from full_text."""
    if not text:
        return text
    earliest_pos = len(text)
    for marker in _FOOTER_MARKERS:
        pos = text.find(marker)
        if pos != -1 and pos < earliest_pos:
            earliest_pos = pos
    if earliest_pos < len(text):
        text = text[:earliest_pos].strip()
    return text


@router.get("/version")
def get_version():
    """Return deployment version info for debugging cache/deploy issues."""
    return {
        "commit_sha": os.environ.get("RAILWAY_GIT_COMMIT_SHA", "unknown"),
        "railway_service": os.environ.get("RAILWAY_SERVICE_NAME", "unknown"),
        "deployment_id": os.environ.get("RAILWAY_DEPLOYMENT_ID", "unknown"),
        "timestamp": os.environ.get("RAILWAY_DEPLOYMENT_CREATED_AT", "unknown"),
    }


def normalize_arabic(text: str) -> str:
    """Normalize Arabic text: remove diacritics, standardize letters, remove noise."""
    text = re.sub(r'[\u064B-\u065F\u0670\u0640]', '', text)
    text = text.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    text = text.replace('ى', 'ي').replace('ؤ', 'و').replace('ئ', 'ي').replace('ة', 'ه')
    text = re.sub(r'[^\u0600-\u06FF\u0750-\u077Fa-zA-Z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def normalize_hamzas(text: str) -> str:
    """Light normalization: only standardize hamza variants for embedding consistency."""
    return text.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')


# Metadata keyword mapping: Arabic terms -> filter codes
METADATA_KEYWORDS = {
    'تجاري': {'court_type': 'commercial'},
    'تجاريه': {'court_type': 'commercial'},
    'عمالي': {'court_type': 'labor'},
    'عماليه': {'court_type': 'labor'},
    'استئناف': {'court_level': 'appeal'},
}

# Terms that should trigger filter-only browsing (no semantic search)
BROWSE_ONLY_TERMS = {'تجاري', 'تجاريه', 'عمالي', 'عماليه', 'استئناف'}


def detect_metadata_filters(q: str) -> dict:
    """Check if the query contains metadata keywords and return implied filters."""
    normalized = normalize_arabic(q)
    detected = {}
    for keyword, filters in METADATA_KEYWORDS.items():
        if keyword in normalized:
            detected.update(filters)
    return detected


def expand_query(query: str) -> str:
    """Expand very short queries (≤2 words) with legal context for better semantic matching.
    Longer, specific queries are passed as-is to preserve the user's precise intent."""
    words = query.split()
    if len(words) > 2:
        return query

    normalized = normalize_arabic(query)

    legal_keywords = {
        'محكمه': 'محكمه حكم قضائي',
        'محامي': 'محامي اتعاب محاماه الدعوي',
        'اضرار': 'اضرار تعويض ضرر مادي معنوي',
        'تعويض': 'تعويض ضرر مادي معنوي مبلغ',
        'نقض': 'نقض حكم استئناف محكمه العليا',
        'استئناف': 'استئناف حكم محكمه الاستئناف',
        'تجاري': 'تجاري محكمه تجاريه دعوي تجاريه',
        'عمالي': 'عمالي محكمه عماليه حقوق العمال',
        'مطالبه': 'مطالبه مالي دين حقوق',
        'عقد': 'عقد اتفاق التزام طرفين',
        'فسخ': 'فسخ عقد انهاء فسخ العقد',
        'ارض': 'ارض عقار ملكيه عقاري',
        'شركه': 'شركه شريك حصص شراكه',
        'وكاله': 'وكاله وكيل توكيل',
        'ايراد': 'ايراد دخل مالي استثمار',
        'ميراث': 'ميراث ارث تركه وارث',
        'طلاق': 'طلاق الزوج زوجه',
        'نفقه': 'نفقه زوجه اولاد',
        'حضانه': 'حضانه اولاد ولي',
        'جنائي': 'جنائي قضايا جزائيه جريمه عقوبه',
        'لامر': 'لأمر',  # Hamza variant normalization
        'سند': 'سند لأمر',  # Common legal term
    }
    
    words = query.split()
    normalized_words = normalized.split()
    expanded_words = list(words)
    for norm_word in normalized_words:
        for key, expansion in legal_keywords.items():
            if key in norm_word and expansion not in expanded_words:
                expanded_words.append(expansion)
                break
    
    return ' '.join(expanded_words[:20]) if len(expanded_words) > len(words) else query


def generate_ai_answer(query: str, results: list[dict]) -> str | None:
    """Generate an AI summary answer based on search results, like Google AI Overview."""
    if not results:
        return None

    # Skip if top results are not relevant enough (distance > 0.45 means < 55% match)
    best_distance = min((r.get("distance") or 1.0) for r in results[:3])
    if best_distance > 0.45:
        return None

    top_results = results[:5]
    context_parts = []
    for i, r in enumerate(top_results):
        context_parts.append(
            f"القضية {i+1}: رقم الحكم {r.get('judgment_number', 'غير محدد')} - "
            f"المحكمة: {r.get('court_type', '')} - {r.get('court_level', '')}\n"
            f"النص: {r.get('snippet', '')[:300]}"
        )
    context = "\n\n".join(context_parts)

    user_question = query.strip() if query.strip() else "الأحكام المعروضة"
    prompt = (
        "أنت مساعد قانوني سعودي متخصص. بناءً على الأحكام القضائية التالية، "
        "أجب على سؤال المستخدم بشكل مباشر وواضح.\n\n"
        f"سؤال المستخدم: {user_question}\n\n"
        f"الأحكام المرتبطة:\n{context}\n\n"
        "اكتب إجابة مختصرة (3-5 أسطر) تلخص الموقف القانوني، "
        "واشرح المبدأ القانوني المستخلص من هذه الأحكام. "
        "اذكر أرقام الأحكام المرتبطة في الإجابة. "
        "اكتب بالعربية الفصحى بأسلوب قانوني واضح."
    )

    try:
        response = get_client().chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=500,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return None


@router.get("/search")
def search(
    request: Request,
    q: str = Query("", description="Search query in Arabic or English"),
    court_type: str | None = Query(None),
    city: str | None = Query(None),
    year: str | None = Query(None),
    court_level: str | None = Query(None),
    section: str | None = Query(None),
    anonymous: bool = Query(False, description="Anonymous preview mode, limits results"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    source: str | None = Query(None, description="Traffic source (where the visitor came from)"),
):
    phone = request.headers.get("X-User-Phone", "")

    # Anonymous users are limited to a small preview of results
    effective_limit = 3 if anonymous else limit

    # Registered, non-subscribed users are limited to a fixed number of free
    # searches. Admin phone always bypasses this check.
    user_id = None
    if not anonymous and phone and phone not in UNLIMITED_SEARCH_PHONES:
        user_id = _get_user_id_by_phone(phone)
        if user_id and not _has_active_subscription(user_id):
            prior_searches = _get_search_count(user_id)
            if prior_searches >= FREE_SEARCH_LIMIT:
                raise HTTPException(
                    status_code=402,
                    detail="subscription_required",
                )
    elif phone:
        user_id = _get_user_id_by_phone(phone)

    result = _do_search(q, court_type, city, year, court_level, section, effective_limit, offset, user_id=user_id)

    # Log the search with IP for both authenticated and anonymous users
    ip = get_client_ip(request)
    country = get_country_from_ip(ip)
    if anonymous or not phone:
        log_search("", q, court_type, city, year, court_level, result.get("total", 0), ip, country, is_anonymous=True, source=source)
    else:
        log_search(phone, q, court_type, city, year, court_level, result.get("total", 0), ip, country, is_anonymous=False, source=source)

    return result


def _apply_feedback_boost(results: list[dict], q: str, user_id: int | None) -> list[dict]:
    """Boost ranking based on relevance feedback (clicks and explicit ratings).

    Signal weights: click=+1 (weak), relevant=+3 (strong), not_relevant=-3.
    Distance adjustment: -min(score * 0.05, 0.30) — max 30% boost.
    Personal signals (user's own 'relevant' ratings on any query) add extra weight.
    """
    if not results or not q or not q.strip():
        return results

    try:
        feedback = query_all("""
            SELECT judgment_id,
                   SUM(CASE signal_type
                       WHEN 'relevant' THEN 3
                       WHEN 'click' THEN 1
                       WHEN 'not_relevant' THEN -3
                       ELSE 0 END) as score
            FROM search_feedback
            WHERE query = %s
            GROUP BY judgment_id
        """, [q.strip()])
        boost_map: dict[int, float] = {f["judgment_id"]: float(f["score"]) for f in feedback}

        if user_id:
            personal = query_all("""
                SELECT judgment_id, COUNT(*) as cnt
                FROM search_feedback
                WHERE user_id = %s AND signal_type = 'relevant'
                GROUP BY judgment_id
            """, [user_id])
            for p in personal:
                boost_map[p["judgment_id"]] = boost_map.get(p["judgment_id"], 0.0) + float(p["cnt"]) * 2

        for r in results:
            jid = r.get("judgment_id")
            if jid in boost_map and r.get("distance") is not None:
                boost = max(-0.30, min(boost_map[jid] * 0.05, 0.30))
                r["distance"] = max(0.0, r["distance"] - boost)

        results.sort(key=lambda x: x["distance"] if x["distance"] is not None else 1.0)
    except Exception as e:
        print(f"[FEEDBACK BOOST] Failed (non-fatal): {e}")

    return results


def _do_search(q, court_type, city, year, court_level, section, limit, offset, user_id: int | None = None):
    has_query = q and q.strip()

    # Query intelligence: LLM analyzes intent, detects domain, rewrites query.
    # Falls back to keyword detection if LLM fails or is too slow.
    intelligence = None
    if has_query:
        intelligence = analyze_query(q)

    # Legal KB: instant concept detection from user's exact words.
    # Provides synonyms, related concepts, and domain as backup signal.
    kb_labels = []
    kb_court_type = None
    if has_query:
        kb_labels, kb_concepts = get_kb_expansions(q)
        if kb_concepts:
            # Use KB concept court type if consistent across all matched concepts
            kb_courts = {KB_CONCEPTS[cid]["court"] for cid in kb_concepts if cid in KB_CONCEPTS}
            if len(kb_courts) == 1:
                kb_court_type = kb_courts.pop()

    # Detect metadata keywords in query (e.g. "تجاري" -> court_type filter)
    metadata_filters = {}
    if has_query:
        metadata_filters = detect_metadata_filters(q)
    # Merge priority: explicit user filter > keyword detection > LLM intelligence > KB concepts
    effective_court_type = (
        court_type
        or metadata_filters.get('court_type')
        or (intelligence or {}).get('court_type')
        or kb_court_type
    )
    if effective_court_type == 'general':
        # 'general' means LLM couldn't determine domain — try KB, else no filter
        effective_court_type = court_type or metadata_filters.get('court_type') or kb_court_type
    effective_court_level = court_level or metadata_filters.get('court_level')

    # Check if query is a pure browse term (e.g. just "تجاري") -> skip semantic search
    normalized_q = normalize_arabic(q).strip() if has_query else ""
    is_browse_only = has_query and normalized_q in BROWSE_ONLY_TERMS

    filters = []
    params: list = []

    if effective_court_type:
        filters.append("ct.code = %s")
        params.append(effective_court_type)
    if city:
        filters.append("l.city_ar = %s")
        params.append(city)
    if year:
        filters.append("(j.judgment_year = %s OR c.case_year = %s)")
        params.extend([year, year])
    if effective_court_level:
        filters.append("cl.code = %s")
        params.append(effective_court_level)
    if section:
        filters.append("js.section_name_ar = %s")
        params.append(section)

    where_clause = ""
    if filters:
        where_clause = "AND " + " AND ".join(filters)

    embedding = None
    vec_str = None
    # Column serving this request (embedding or embedding_large once migration completes)
    col = get_embedding_column()
    if has_query and not is_browse_only:
        try:
            # Use LLM-rewritten query if available, else dictionary expansion
            if intelligence and intelligence.get('rewritten_query'):
                embedding_q = intelligence['rewritten_query']
            else:
                embedding_q = expand_query(q)
            # KB enrichment: append alternative labels + related concepts
            # (synonym variations from the legal knowledge base)
            if kb_labels:
                embedding_q = embedding_q + " " + " ".join(kb_labels)
            embedding = embed_text(embedding_q)
            vec_str = vector_to_pgvector(embedding)
        except Exception as e:
            print(f"[SEARCH WARNING] Embedding failed, falling back to browse mode: {e}")
            embedding = None
            vec_str = None

    if embedding and vec_str and has_query and not is_browse_only:
        # Two-step approach for accurate + fast pagination:
        # Step 1: GROUP BY judgment to get the best (min) distance per judgment
        # and an accurate COUNT(*) OVER() (computed post-dedup since each group
        # produces exactly one row). Only id/distance columns are projected here.
        # Step 2: fetch full metadata + chunk text only for the current page's
        # judgment ids (bounded to `limit` rows, so this join is fast).
        step1_sql = f"""
            WITH matched AS (
                SELECT j.id AS judgment_id, MIN(jc.{col} <=> %s::vector) AS distance
                FROM judgment_chunks jc
                JOIN judgments j ON jc.judgment_id = j.id
                JOIN cases c ON j.case_id = c.id
                LEFT JOIN judgment_sections js ON jc.section_id = js.id
                LEFT JOIN court_types ct ON c.court_type_id = ct.id
                LEFT JOIN locations l ON c.location_id = l.id
                LEFT JOIN court_levels cl ON j.court_level_id = cl.id
                WHERE jc.{col} IS NOT NULL
                  AND length(jc.chunk_text) >= 100
                  AND length(COALESCE(j.full_text, '')) > 800
                  {_FOOTER_CHUNK_FILTER}
                  AND jc.{col} <=> %s::vector < 0.45
                  {where_clause}
                GROUP BY j.id
            )
            SELECT judgment_id, distance, COUNT(*) OVER() AS total_count
            FROM matched
            ORDER BY distance
            LIMIT %s OFFSET %s;
        """

        step1_params = [vec_str, vec_str] + params + [limit, offset]

        try:
            step1_rows = query_all(step1_sql, step1_params)
            total = step1_rows[0]["total_count"] if step1_rows else 0
        except Exception as e:
            print(f"[SEARCH WARNING] Step1 query failed, returning empty: {e}")
            return {"results": [], "total": 0, "limit": limit, "offset": offset}

        if not step1_rows:
            rows = []
        else:
            page_ids = [r["judgment_id"] for r in step1_rows]
            step2_sql = f"""
                SELECT DISTINCT ON (j.id)
                    j.id AS judgment_id,
                    j.judgment_number,
                    j.judgment_year,
                    j.judgment_date_hijri,
                    j.judgment_type,
                    j.details_url,
                    c.case_number,
                    c.case_year,
                    ct.name_ar AS court_type,
                    ct.code AS court_type_code,
                    l.city_ar AS city,
                    cl.name_ar AS court_level,
                    cl.code AS court_level_code,
                    js.section_name_ar,
                    jc.chunk_text,
                    jc.{col} <=> %s::vector AS distance
                FROM judgment_chunks jc
                JOIN judgments j ON jc.judgment_id = j.id
                JOIN cases c ON j.case_id = c.id
                LEFT JOIN judgment_sections js ON jc.section_id = js.id
                LEFT JOIN court_types ct ON c.court_type_id = ct.id
                LEFT JOIN locations l ON c.location_id = l.id
                LEFT JOIN court_levels cl ON j.court_level_id = cl.id
                WHERE j.id = ANY(%s)
                  AND jc.{col} IS NOT NULL
                  AND length(jc.chunk_text) >= 100
                  {_FOOTER_CHUNK_FILTER}
                ORDER BY j.id, jc.{col} <=> %s::vector;
            """
            try:
                unordered_rows = query_all(step2_sql, [vec_str, page_ids, vec_str])
                rows_by_id = {r["judgment_id"]: r for r in unordered_rows}
                rows = [rows_by_id[i] for i in page_ids if i in rows_by_id]
            except Exception as e:
                print(f"[SEARCH WARNING] Step2 query failed, returning empty: {e}")
                return {"results": [], "total": 0, "limit": limit, "offset": offset}
    elif is_browse_only:
        # Pure metadata term like "تجاري" - browse all cases of that type
        count_sql = f"""
            SELECT COUNT(DISTINCT j.id)
            FROM judgment_chunks jc
            JOIN judgments j ON jc.judgment_id = j.id
            JOIN cases c ON j.case_id = c.id
            LEFT JOIN judgment_sections js ON jc.section_id = js.id
            LEFT JOIN court_types ct ON c.court_type_id = ct.id
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN court_levels cl ON j.court_level_id = cl.id
            WHERE jc.{col} IS NOT NULL
              AND length(jc.chunk_text) >= 100
              {where_clause}
        """

        try:
            count_row = query_one(count_sql, params)
            total = count_row["count"] if count_row else 0
        except Exception as e:
            print(f"[SEARCH WARNING] Count query failed, returning empty: {e}")
            return {"results": [], "total": 0, "limit": limit, "offset": offset}

        fetch_pool = min(limit * 5, 50)

        sql = f"""
            SELECT * FROM (
                SELECT DISTINCT ON (j.id)
                    j.id AS judgment_id,
                    j.judgment_number,
                    j.judgment_year,
                    j.judgment_date_hijri,
                    j.judgment_type,
                    j.details_url,
                    c.case_number,
                    c.case_year,
                    ct.name_ar AS court_type,
                    ct.code AS court_type_code,
                    l.city_ar AS city,
                    cl.name_ar AS court_level,
                    cl.code AS court_level_code,
                    js.section_name_ar,
                    jc.chunk_text,
                    0.5 AS distance
                FROM judgment_chunks jc
                JOIN judgments j ON jc.judgment_id = j.id
                JOIN cases c ON j.case_id = c.id
                LEFT JOIN judgment_sections js ON jc.section_id = js.id
                LEFT JOIN court_types ct ON c.court_type_id = ct.id
                LEFT JOIN locations l ON c.location_id = l.id
                LEFT JOIN court_levels cl ON j.court_level_id = cl.id
                WHERE jc.{col} IS NOT NULL
                  AND length(jc.chunk_text) >= 100
                  {where_clause}
                ORDER BY j.id
            ) AS best_chunks
            ORDER BY judgment_year DESC, judgment_id DESC
            LIMIT %s OFFSET %s;
        """

        all_params = params + [fetch_pool, offset]

        try:
            rows = query_all(sql, all_params)
        except Exception as e:
            print(f"[SEARCH WARNING] Fetch query failed, returning empty: {e}")
            return {"results": [], "total": 0, "limit": limit, "offset": offset}
    else:
        # Filter-only browsing (no query) - return latest judgments matching filters
        count_sql = f"""
            SELECT COUNT(DISTINCT j.id)
            FROM judgment_chunks jc
            JOIN judgments j ON jc.judgment_id = j.id
            JOIN cases c ON j.case_id = c.id
            LEFT JOIN judgment_sections js ON jc.section_id = js.id
            LEFT JOIN court_types ct ON c.court_type_id = ct.id
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN court_levels cl ON j.court_level_id = cl.id
            WHERE jc.{col} IS NOT NULL
              AND length(jc.chunk_text) >= 100
              AND length(COALESCE(j.full_text, '')) > 800
              {_FOOTER_CHUNK_FILTER}
              {where_clause}
        """

        try:
            count_row = query_one(count_sql, params)
            total = count_row["count"] if count_row else 0
        except Exception as e:
            print(f"[SEARCH WARNING] Count query failed, returning empty: {e}")
            return {"results": [], "total": 0, "limit": limit, "offset": offset}

        fetch_pool = min(limit * 5, 50)

        sql = f"""
            SELECT * FROM (
                SELECT DISTINCT ON (j.id)
                    j.id AS judgment_id,
                    j.judgment_number,
                    j.judgment_year,
                    j.judgment_date_hijri,
                    j.judgment_type,
                    j.details_url,
                    c.case_number,
                    c.case_year,
                    ct.name_ar AS court_type,
                    ct.code AS court_type_code,
                    l.city_ar AS city,
                    cl.name_ar AS court_level,
                    cl.code AS court_level_code,
                    js.section_name_ar,
                    jc.chunk_text,
                    0.5 AS distance
                FROM judgment_chunks jc
                JOIN judgments j ON jc.judgment_id = j.id
                JOIN cases c ON j.case_id = c.id
                LEFT JOIN judgment_sections js ON jc.section_id = js.id
                LEFT JOIN court_types ct ON c.court_type_id = ct.id
                LEFT JOIN locations l ON c.location_id = l.id
                LEFT JOIN court_levels cl ON j.court_level_id = cl.id
                WHERE jc.{col} IS NOT NULL
                  AND length(jc.chunk_text) >= 100
                  AND length(COALESCE(j.full_text, '')) > 800
                  {_FOOTER_CHUNK_FILTER}
                  {where_clause}
                ORDER BY j.id
            ) AS best_chunks
            ORDER BY judgment_year DESC, judgment_id DESC
            LIMIT %s OFFSET %s;
        """

        all_params = params + [fetch_pool, offset]

        try:
            rows = query_all(sql, all_params)
        except Exception as e:
            print(f"[SEARCH WARNING] Fetch query failed, returning empty: {e}")
            return {"results": [], "total": 0, "limit": limit, "offset": offset}

    # Sentence-level re-ranking: split every row's chunk into sentences, then
    # embed ALL sentences from ALL rows in a single batched OpenAI call
    # (instead of one call per row) to minimize network round-trips.
    import re as _re
    import math

    do_rerank = has_query and not is_browse_only and embedding is not None

    row_sentences: list[list[str]] = []
    all_sentences: list[str] = []
    sentence_owner: list[int] = []  # row index for each entry in all_sentences

    for row_idx, row in enumerate(rows):
        chunk_text = row.get("chunk_text", "")
        sentences = [s.strip() for s in _re.split(r'(?<=[.؟!\n])\s+', chunk_text) if len(s.strip()) >= 20]
        row_sentences.append(sentences)

        if do_rerank and len(sentences) > 1:
            for sent in sentences:
                all_sentences.append(sent)
                sentence_owner.append(row_idx)

    sentence_embeddings_by_row: dict[int, list] = {}
    if all_sentences:
        try:
            embed_data = get_client().embeddings.create(
                model=get_embedding_model(),
                input=all_sentences,
            ).data
            for owner_idx, sent, emb_obj in zip(sentence_owner, all_sentences, embed_data):
                sentence_embeddings_by_row.setdefault(owner_idx, []).append((sent, emb_obj.embedding))
        except Exception:
            sentence_embeddings_by_row = {}

    query_norm = math.sqrt(sum(x * x for x in embedding)) if embedding else 0

    results = []
    for row_idx, row in enumerate(rows):
        chunk_text = row.get("chunk_text", "")
        chunk_distance = float(row["distance"]) if row["distance"] else None
        sentences = row_sentences[row_idx]

        if len(sentences) <= 1 or not do_rerank:
            best_sentences = [{"text": chunk_text, "distance": chunk_distance}]
        elif row_idx in sentence_embeddings_by_row:
            scored_sentences = []
            for sent, sent_vec in sentence_embeddings_by_row[row_idx]:
                dot = sum(a * b for a, b in zip(embedding, sent_vec))
                sent_norm = math.sqrt(sum(x * x for x in sent_vec))
                cos_sim = dot / (query_norm * sent_norm + 1e-9) if sent_norm > 0 else 0
                sent_distance = 1 - cos_sim
                scored_sentences.append({"text": sent, "distance": sent_distance})

            scored_sentences.sort(key=lambda x: x["distance"])
            best_sentences = scored_sentences[:3]
        else:
            # Batch embedding failed: fallback to chunk as-is
            best_sentences = [{"text": chunk_text, "distance": chunk_distance}]

        # Build snippet from best sentences, highlight them
        snippet_parts = [s["text"] for s in best_sentences]
        snippet = " ... ".join(snippet_parts)

        # Use the best sentence distance as the result distance
        best_distance = best_sentences[0]["distance"] if best_sentences else chunk_distance

        results.append({
            "judgment_id": row["judgment_id"],
            "judgment_number": row["judgment_number"],
            "judgment_year": row["judgment_year"],
            "judgment_date_hijri": row["judgment_date_hijri"],
            "judgment_type": row["judgment_type"],
            "details_url": row["details_url"],
            "case_number": row["case_number"],
            "case_year": row["case_year"],
            "court_type": row["court_type"],
            "court_type_code": row["court_type_code"],
            "city": row["city"],
            "court_level": row["court_level"],
            "court_level_code": row["court_level_code"],
            "section_name": row["section_name_ar"],
            "snippet": snippet,
            "distance": best_distance,
        })

    # Re-sort results by sentence-level distance
    results.sort(key=lambda x: x["distance"] if x["distance"] is not None else 1.0)

    # Keyword overlap post-filter: for multi-word queries (3+ words), require
    # at least 2 significant query terms to appear in the result snippet.
    # This catches cases where embedding distance is small but the result
    # doesn't actually discuss the specific legal point.
    if has_query and not is_browse_only:
        query_words = set(normalize_arabic(q).split())
        # Remove common stopwords
        stopwords = {'في', 'من', 'على', 'الى', 'عن', 'مع', 'او', 'و', 'ال', 'لا', 'ما', 'هو', 'هي', 'هذا', 'هذه', 'التي', 'الذي', 'عند', 'قد', 'ثم', 'بين', 'كل', 'بعض', 'غير', 'حيث', 'كما', 'لكن', 'ان', 'اذا', 'اذ', 'عن'}
        significant_words = query_words - stopwords
        if len(significant_words) >= 3:
            filtered_results = []
            for r in results:
                snippet_norm = normalize_arabic(r.get("snippet", ""))
                overlap = sum(1 for w in significant_words if w in snippet_norm)
                if overlap >= 2:
                    filtered_results.append(r)
            if filtered_results:
                results = filtered_results
                total = len(results)

    # Relevance feedback boost: promote judgments with positive signals
    results = _apply_feedback_boost(results, q, user_id)

    return {"results": results[:limit], "total": total, "limit": limit, "offset": offset}


@router.post("/search/feedback")
def record_search_feedback(request: Request, payload: dict):
    """Record a relevance signal for a judgment from search results.

    Body: {
        "query": str,            -- the search query
        "judgment_id": int,      -- judgment clicked/rated
        "signal_type": str,      -- "click" | "relevant" | "not_relevant"
        "position": int | null   -- rank position in results (optional)
    }
    """
    query = (payload.get("query") or "").strip()
    judgment_id = payload.get("judgment_id")
    signal_type = payload.get("signal_type")
    position = payload.get("position")

    if not query or not judgment_id or signal_type not in ("click", "relevant", "not_relevant"):
        raise HTTPException(status_code=400, detail="بيانات غير صالحة")

    phone = request.headers.get("X-User-Phone", "")
    user_id = _get_user_id_by_phone(phone) if phone else None

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO search_feedback (user_id, query, judgment_id, signal_type, position)
                   VALUES (%s, %s, %s, %s, %s)""",
                (user_id, query, judgment_id, signal_type, position),
            )

    return {"ok": True}


@router.get("/ai-answer")
def get_ai_answer(
    q: str = Query("", description="Search query"),
    court_type: str | None = Query(None),
    city: str | None = Query(None),
    year: str | None = Query(None),
    court_level: str | None = Query(None),
    section: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    search_result = _do_search(q, court_type, city, year, court_level, section, limit, 0)
    return {"ai_answer": generate_ai_answer(q, search_result["results"])}


@router.get("/judgments/ids")
def get_judgment_ids(limit: int = Query(50000, ge=1, le=100000)):
    """Return all judgment IDs and scraped_at dates for sitemap generation."""
    rows = query_all(
        """
        SELECT j.id, j.scraped_at, j.judgment_number,
               ct.name_ar AS court_type, cl.name_ar AS court_level,
               l.city_ar AS city
        FROM judgments j
        LEFT JOIN cases c ON j.case_id = c.id
        LEFT JOIN court_types ct ON c.court_type_id = ct.id
        LEFT JOIN locations l ON c.location_id = l.id
        LEFT JOIN court_levels cl ON j.court_level_id = cl.id
        ORDER BY j.id DESC LIMIT %s;
        """,
        [limit],
    )
    return {"ids": [dict(r) for r in rows]}


@router.get("/judgments/{judgment_id}")
def get_judgment(judgment_id: int):
    judgment = query_one(
        """
        SELECT
            j.id,
            j.judgment_number,
            j.judgment_year,
            j.judgment_date_hijri,
            j.judgment_type,
            j.source_collection,
            j.details_url,
            j.local_folder,
            j.full_text,
            j.scraped_at,
            c.case_number,
            c.case_year,
            ct.name_ar AS court_type,
            ct.code AS court_type_code,
            l.city_ar AS city,
            cl.name_ar AS court_level,
            cl.code AS court_level_code
        FROM judgments j
        LEFT JOIN cases c ON j.case_id = c.id
        LEFT JOIN court_types ct ON c.court_type_id = ct.id
        LEFT JOIN locations l ON c.location_id = l.id
        LEFT JOIN court_levels cl ON j.court_level_id = cl.id
        WHERE j.id = %s;
        """,
        (judgment_id,),
    )

    if not judgment:
        raise HTTPException(status_code=404, detail="Judgment not found")

    sections = query_all(
        """
        SELECT id, section_order, section_code, section_name_ar, section_text
        FROM judgment_sections
        WHERE judgment_id = %s
        ORDER BY section_order;
        """,
        (judgment_id,),
    )

    judgment["sections"] = sections

    return judgment


@router.get("/filters")
def get_filters():
    court_types = query_all(
        "SELECT code, name_ar FROM court_types ORDER BY name_ar;"
    )
    locations = query_all(
        "SELECT id, city_ar FROM locations ORDER BY city_ar;"
    )
    years = query_all(
        """
        SELECT DISTINCT COALESCE(judgment_year, case_year) AS year
        FROM judgments j
        JOIN cases c ON j.case_id = c.id
        WHERE COALESCE(judgment_year, case_year) IS NOT NULL
        ORDER BY year DESC;
        """
    )
    court_levels = query_all(
        "SELECT code, name_ar FROM court_levels ORDER BY name_ar;"
    )

    return {
        "court_types": court_types,
        "locations": locations,
        "years": [r["year"] for r in years],
        "court_levels": court_levels,
    }


@router.get("/stats")
def get_stats():
    total_judgments = query_one("SELECT COUNT(*) AS count FROM judgments;")
    total_cases = query_one("SELECT COUNT(*) AS count FROM cases;")
    total_chunks = query_one("SELECT COUNT(*) AS count FROM judgment_chunks;")
    embedded_chunks = query_one(
        f"SELECT COUNT(*) AS count FROM judgment_chunks WHERE {get_embedding_column()} IS NOT NULL;"
    )

    by_court_type = query_all(
        """
        SELECT ct.code, ct.name_ar, COUNT(j.id) AS count
        FROM judgments j
        JOIN cases c ON j.case_id = c.id
        LEFT JOIN court_types ct ON c.court_type_id = ct.id
        GROUP BY ct.code, ct.name_ar
        ORDER BY count DESC;
        """
    )

    by_court_level = query_all(
        """
        SELECT cl.code, cl.name_ar, COUNT(j.id) AS count
        FROM judgments j
        LEFT JOIN court_levels cl ON j.court_level_id = cl.id
        GROUP BY cl.code, cl.name_ar
        ORDER BY count DESC;
        """
    )

    return {
        "total_judgments": total_judgments["count"] if total_judgments else 0,
        "total_cases": total_cases["count"] if total_cases else 0,
        "total_chunks": total_chunks["count"] if total_chunks else 0,
        "embedded_chunks": embedded_chunks["count"] if embedded_chunks else 0,
        "by_court_type": by_court_type,
        "by_court_level": by_court_level,
    }


@router.get("/judgment/{judgment_id}")
def get_judgment_detail(judgment_id: int):
    """Return public details for a single judgment (used by SEO detail pages)."""
    judgment = query_one(
        """
        SELECT j.id, j.judgment_number, j.judgment_year, j.judgment_type,
               j.judgment_date_hijri, j.details_url, j.full_text,
               c.case_number, c.case_year,
               ct.name_ar AS court_type, ct.code AS court_type_code,
               l.city_ar AS city,
               cl.name_ar AS court_level, cl.code AS court_level_code
        FROM judgments j
        LEFT JOIN cases c ON j.case_id = c.id
        LEFT JOIN court_types ct ON c.court_type_id = ct.id
        LEFT JOIN locations l ON c.location_id = l.id
        LEFT JOIN court_levels cl ON j.court_level_id = cl.id
        WHERE j.id = %s;
        """,
        [judgment_id],
    )
    if not judgment:
        raise HTTPException(status_code=404, detail="Judgment not found")

    # Clean MOJ boilerplate from full_text
    judgment["full_text"] = _clean_full_text(judgment.get("full_text", ""))

    # Get related chunks (snippets) for the judgment content
    chunks = query_all(
        """SELECT id, chunk_text, chunk_order FROM judgment_chunks
           WHERE judgment_id = %s
           ORDER BY chunk_order LIMIT 100;""",
        [judgment_id],
    )

    return {
        "judgment": dict(judgment),
        "chunks": [dict(c) for c in chunks],
    }


@router.get("/judgments/related/{judgment_id}")
def get_related_judgments(judgment_id: int, limit: int = Query(5, ge=1, le=20)):
    """Return related judgments for internal linking on judgment pages."""
    # First get the current judgment's court_type and court_level
    current = query_one(
        """
        SELECT j.court_level_id, c.court_type_id
        FROM judgments j
        LEFT JOIN cases c ON j.case_id = c.id
        WHERE j.id = %s;
        """,
        [judgment_id],
    )
    if not current:
        return {"results": []}

    # Find judgments with same court_type or court_level, excluding current
    related = query_all(
        """
        SELECT j.id, j.judgment_number, j.judgment_year, j.judgment_date_hijri,
               ct.name_ar AS court_type, cl.name_ar AS court_level,
               l.city_ar AS city
        FROM judgments j
        LEFT JOIN cases c ON j.case_id = c.id
        LEFT JOIN court_types ct ON c.court_type_id = ct.id
        LEFT JOIN locations l ON c.location_id = l.id
        LEFT JOIN court_levels cl ON j.court_level_id = cl.id
        WHERE j.id != %s
          AND (
            (c.court_type_id = %s AND c.court_type_id IS NOT NULL)
            OR (j.court_level_id = %s AND j.court_level_id IS NOT NULL)
          )
        ORDER BY j.id DESC
        LIMIT %s;
        """,
        [judgment_id, current.get("court_type_id"), current.get("court_level_id"), limit],
    )
    return {"results": [dict(r) for r in related]}
