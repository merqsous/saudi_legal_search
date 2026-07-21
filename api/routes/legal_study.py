import json
from datetime import datetime
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel
from api.db import query_all, query_one, get_db
from api.routes.auth import get_session
from api.embeddings import get_client

router = APIRouter()


def _get_user_from_auth(authorization: str | None) -> int | None:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "")
    session = get_session(token)
    return session["user_id"] if session else None


class GenerateStudyRequest(BaseModel):
    query: str
    court_type: str | None = None
    city: str | None = None
    year: str | None = None
    court_level: str | None = None
    section: str | None = None


def _fetch_search_results(req: GenerateStudyRequest, limit: int = 10) -> list[dict]:
    """Fetch search results for the study context."""
    from api.routes.search import _do_search
    result = _do_search(
        req.query, req.court_type, req.city, req.year,
        req.court_level, req.section, limit, 0,
    )
    return result.get("results", [])


def _generate_legal_study(query: str, results: list[dict]) -> dict:
    """Generate a comprehensive legal study using GPT-4o."""
    if not results:
        return None

    # Build context from top results
    context_parts = []
    for i, r in enumerate(results[:8]):
        context_parts.append(
            f"الحكم {i+1}: رقم {r.get('judgment_number', 'غير محدد')} - "
            f"المحكمة: {r.get('court_type', '')} - {r.get('court_level', '')} - "
            f"المدينة: {r.get('city', '')}\n"
            f"رقم القضية: {r.get('case_number', '')}/{r.get('case_year', '')}\n"
            f"النص: {r.get('snippet', '')[:500]}"
        )
    context = "\n\n".join(context_parts)

    prompt = (
        "أنت خبير قانوني سعودي متخصص. بناءً على الأحكام القضائية التالية، "
        "اكتب دراسة قانونية شاملة ومفصلة بالعربية الفصحى بأسلوب قانوني أكاديمي.\n\n"
        f"موضوع البحث: {query}\n\n"
        f"الأحكام المرتبطة:\n{context}\n\n"
        "اكتب الدراسة بالشكل التالي:\n"
        "1. مقدمة: عرض موجز للموضوع القانوني وأهميته\n"
        "2. الإطار القانوني: النصوص القانونية ذات الصلة\n"
        "3. تحليل الأحكام: تحليل كل حكم وتطبيقه على الموضوع\n"
        "4. المبادئ القانونية المستخلصة: المبادئ التي تخرج من هذه الأحكام\n"
        "5. الخلاصة والتوصيات: خلاصة الموقف القانوني وتوصيات عملية\n"
        "اذكر أرقام الأحكام في كل قسم ذي صلة. اجعل الدراسة مفصلة وشاملة."
    )

    try:
        response = get_client().chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=3000,
        )
        content = response.choices[0].message.content.strip()
    except Exception:
        return None

    # Build citations list
    citations = []
    for r in results[:8]:
        citations.append({
            "judgment_id": r.get("judgment_id"),
            "judgment_number": r.get("judgment_number"),
            "court_type": r.get("court_type"),
            "court_level": r.get("court_level"),
            "city": r.get("city"),
            "case_number": r.get("case_number"),
            "case_year": r.get("case_year"),
            "judgment_date_hijri": r.get("judgment_date_hijri"),
            "details_url": r.get("details_url"),
        })

    return {
        "content": content,
        "citations": citations,
        "query": query,
        "generated_at": datetime.now().isoformat(),
    }


@router.post("/legal-study/generate")
def generate_study(req: GenerateStudyRequest, authorization: str = Header(None)):
    """Generate a legal study and optionally save it."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح — يجب تسجيل الدخول")

    results = _fetch_search_results(req)
    if not results:
        raise HTTPException(status_code=404, detail="لا توجد أحكام لإنشاء دراسة قانونية")

    study = _generate_legal_study(req.query, results)
    if not study:
        raise HTTPException(status_code=500, detail="فشل في توليد الدراسة القانونية")

    # Save to database
    study_id = None
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO legal_studies (user_id, query, content, citations, created_at)
               VALUES (%s, %s, %s, %s, NOW()) RETURNING id;""",
            [user_id, req.query, study["content"], json.dumps(study["citations"], ensure_ascii=False)],
        )
        row = cur.fetchone()
        study_id = row[0] if row else None
        cur.close()

    study["id"] = study_id
    return study


@router.get("/legal-study/history")
def list_studies(authorization: str = Header(None)):
    """List all saved legal studies for the user."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    rows = query_all(
        """SELECT id, query, created_at FROM legal_studies
           WHERE user_id = %s ORDER BY created_at DESC LIMIT 50;""",
        [user_id],
    )
    return {"studies": [dict(r) for r in rows]}


@router.get("/legal-study/{study_id}")
def get_study(study_id: int, authorization: str = Header(None)):
    """Get a specific legal study by ID."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    row = query_one(
        """SELECT id, query, content, citations, created_at
           FROM legal_studies WHERE id = %s AND user_id = %s;""",
        [study_id, user_id],
    )
    if not row:
        raise HTTPException(status_code=404, detail="الدراسة غير موجودة")

    result = dict(row)
    if isinstance(result.get("citations"), str):
        result["citations"] = json.loads(result["citations"])
    return result


@router.delete("/legal-study/{study_id}")
def delete_study(study_id: int, authorization: str = Header(None)):
    """Delete a legal study."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM legal_studies WHERE id = %s AND user_id = %s;",
            [study_id, user_id],
        )
        cur.close()
    return {"status": "ok"}
