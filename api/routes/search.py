import json
from fastapi import APIRouter, Query, HTTPException
from api.db import query_all, query_one
from api.embeddings import embed_text, vector_to_pgvector, get_client

router = APIRouter()


def rerank_with_gpt(query: str, results: list[dict], top_k: int) -> list[dict]:
    """Use GPT-4o-mini to re-rank search results by actual relevance to the query."""
    if len(results) <= top_k:
        return results[:top_k]

    candidates = []
    for i, r in enumerate(results):
        snippet = r.get("snippet", "")[:300]
        candidates.append({
            "index": i,
            "judgment_number": r.get("judgment_number", ""),
            "court_type": r.get("court_type", ""),
            "court_level": r.get("court_level", ""),
            "snippet": snippet,
        })

    prompt = (
        "أنت خبير قانوني سعودي. أعد ترتيب النتائج التالية حسب مدى صلتها باستعلام المستخدم.\n"
        "أعطِ قائمة بأرقام المؤشرات (index) مرتبة من الأكثر صلة إلى الأقل صلة.\n"
        f"استعلام المستخدم: {query}\n\n"
        f"النتائج المرشحة:\n{json.dumps(candidates, ensure_ascii=False, indent=2)}\n\n"
        "أجب بقائمة JSON فقط، مثال: {\"ranked_indices\": [3, 0, 5, 1, ...]}"
    )

    try:
        response = get_client().chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=1000,
        )
        content = response.choices[0].message.content.strip()
        parsed = json.loads(content)
        ranked_indices = parsed.get("ranked_indices", [])

        reranked = []
        for idx in ranked_indices:
            if 0 <= idx < len(results) and len(reranked) < top_k:
                reranked.append(results[idx])

        if len(reranked) < top_k:
            for r in results:
                if r not in reranked and len(reranked) < top_k:
                    reranked.append(r)

        return reranked
    except Exception:
        return results[:top_k]


@router.get("/search")
def search(
    q: str = Query(..., description="Search query in Arabic or English"),
    court_type: str | None = Query(None),
    city: str | None = Query(None),
    year: str | None = Query(None),
    court_level: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    try:
        embedding = embed_text(q)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")

    vec_str = vector_to_pgvector(embedding)

    filters = []
    params: list = [vec_str, vec_str]

    if court_type:
        filters.append("ct.code = %s")
        params.append(court_type)
    if city:
        filters.append("l.city_ar = %s")
        params.append(city)
    if year:
        filters.append("(j.judgment_year = %s OR c.case_year = %s)")
        params.extend([year, year])
    if court_level:
        filters.append("cl.code = %s")
        params.append(court_level)

    where_clause = ""
    if filters:
        where_clause = "AND " + " AND ".join(filters)

    count_sql = f"""
        SELECT COUNT(DISTINCT j.id)
        FROM judgment_chunks jc
        JOIN judgments j ON jc.judgment_id = j.id
        JOIN cases c ON j.case_id = c.id
        LEFT JOIN court_types ct ON c.court_type_id = ct.id
        LEFT JOIN locations l ON c.location_id = l.id
        LEFT JOIN court_levels cl ON j.court_level_id = cl.id
        WHERE jc.embedding IS NOT NULL
          AND length(jc.chunk_text) >= 100
          {where_clause}
    """

    count_params = params[2:] if len(params) > 2 else []
    count_row = query_one(count_sql, count_params)
    total = count_row["count"] if count_row else 0

    rerank_pool = min(limit * 5, 50)
    params_with_pagination = params + [rerank_pool, offset]

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
                jc.embedding <=> %s::vector AS distance
            FROM judgment_chunks jc
            JOIN judgments j ON jc.judgment_id = j.id
            JOIN cases c ON j.case_id = c.id
            LEFT JOIN judgment_sections js ON jc.section_id = js.id
            LEFT JOIN court_types ct ON c.court_type_id = ct.id
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN court_levels cl ON j.court_level_id = cl.id
            WHERE jc.embedding IS NOT NULL
              AND length(jc.chunk_text) >= 100
              {where_clause}
            ORDER BY j.id, jc.embedding <=> %s::vector
        ) AS best_chunks
        ORDER BY distance
        LIMIT %s OFFSET %s;
    """

    rows = query_all(sql, params_with_pagination)

    results = []
    for row in rows:
        snippet = row.get("chunk_text", "")
        if len(snippet) > 500:
            snippet = snippet[:500] + "..."

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
            "distance": float(row["distance"]) if row["distance"] else None,
        })

    reranked = rerank_with_gpt(q, results, limit)

    return {"results": reranked, "total": total, "limit": limit, "offset": offset}


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
            j.appealed_judgment_number,
            j.parent_judgment_id,
            j.appeal_outcome,
            c.case_number,
            c.case_year,
            ct.name_ar AS court_type,
            ct.code AS court_type_code,
            l.city_ar AS city,
            cl.name_ar AS court_level,
            cl.code AS court_level_code
        FROM judgments j
        JOIN cases c ON j.case_id = c.id
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

    if judgment.get("parent_judgment_id"):
        parent = query_one(
            """
            SELECT id, judgment_number, judgment_year, judgment_type, details_url
            FROM judgments WHERE id = %s;
            """,
            (judgment["parent_judgment_id"],),
        )
        judgment["parent_judgment"] = parent
    else:
        judgment["parent_judgment"] = None

    children = query_all(
        """
        SELECT id, judgment_number, judgment_year, judgment_type, appeal_outcome, details_url
        FROM judgments WHERE parent_judgment_id = %s
        ORDER BY id;
        """,
        (judgment_id,),
    )
    judgment["appeal_judgments"] = children

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
        "SELECT COUNT(*) AS count FROM judgment_chunks WHERE embedding IS NOT NULL;"
    )
    appeals_linked = query_one(
        "SELECT COUNT(*) AS count FROM judgments WHERE parent_judgment_id IS NOT NULL;"
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
        "appeals_linked": appeals_linked["count"] if appeals_linked else 0,
        "by_court_type": by_court_type,
        "by_court_level": by_court_level,
    }
