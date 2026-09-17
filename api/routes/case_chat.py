import json
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from api.db import query_all, query_one, get_db
from api.routes.auth import get_session
from api.routes.cases import _get_user_from_auth, get_case_for_access
from api.embeddings import get_client

router = APIRouter()

MODEL = "gpt-4o-mini"

SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "search_judgments",
        "description": (
            "ابحث في قاعدة بيانات الأحكام القضائية السعودية. "
            "استخدم هذه الأداة عندما يحتاج السؤال إلى أحكام أو سوابق قضائية سعودية تدعم الإجابة."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "عبارة البحث بالعربية الفصحى"},
                "court_type": {"type": "string", "description": "نوع المحكمة لتضييق البحث (اختياري)"},
            },
            "required": ["query"],
        },
    },
}


def init_case_chat_tables():
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS case_messages (
                    id SERIAL PRIMARY KEY,
                    case_id INTEGER NOT NULL REFERENCES user_cases(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    role VARCHAR(20) NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_case_messages_case_id ON case_messages(case_id);")
            cur.close()
    except Exception as e:
        import logging
        logging.error(f"init_case_chat_tables failed: {e}")


def _build_case_context(case_id: int) -> str:
    """Assemble the case facts the assistant knows about."""
    case = query_one(
        """SELECT uc.*, u.first_name AS owner_first_name
           FROM user_cases uc LEFT JOIN users u ON u.id = uc.user_id WHERE uc.id = %s;""",
        [case_id],
    )
    if not case:
        return ""

    parts = ["معلومات القضية:"]
    parts.append(f"- العنوان: {case['title']}")
    if case.get("plaintiff"):
        parts.append(f"- المدعي: {case['plaintiff']}")
    if case.get("defendant"):
        parts.append(f"- المدعي عليه: {case['defendant']}")
    if case.get("client_role"):
        role = "المدعي" if case["client_role"] == "plaintiff" else "المدعي عليه"
        parts.append(f"- موكل المكتب في هذه القضية هو: {role}")
    if case.get("case_number"):
        parts.append(f"- رقم القضية: {case['case_number']}/{case.get('case_year') or ''}")
    if case.get("court_type"):
        parts.append(f"- المحكمة: {case['court_type']}")
    if case.get("city"):
        parts.append(f"- المدينة: {case['city']}")
    parts.append(f"- حالة القضية: {'نشطة' if case.get('status') == 'active' else 'مغلقة'}")
    if case.get("notes"):
        parts.append(f"- ملاحظات المكتب: {case['notes']}")

    hearings = query_all(
        """SELECT hearing_date, hearing_time, hijri_date, agenda, status
           FROM case_hearings WHERE case_id = %s ORDER BY hearing_date DESC LIMIT 20;""",
        [case_id],
    )
    if hearings:
        parts.append("\nالجلسات:")
        for h in hearings:
            status = {"upcoming": "قادمة", "done": "منعقدة", "postponed": "مؤجلة"}.get(h["status"], h["status"])
            line = f"- {h['hearing_date']}"
            if h.get("hijri_date"):
                line += f" ({h['hijri_date']})"
            if h.get("hearing_time"):
                line += f" الساعة {h['hearing_time']}"
            line += f" [{status}]"
            if h.get("agenda"):
                line += f": {h['agenda']}"
            parts.append(line)

    judgments = query_all(
        """SELECT cj.judgment_id, j.judgment_number, j.judgment_year, j.judgment_date_hijri,
                  ct.name_ar AS court_type, cl.name_ar AS court_level, l.city_ar AS city
           FROM case_judgments cj
           JOIN judgments j ON cj.judgment_id = j.id
           LEFT JOIN cases c ON j.case_id = c.id
           LEFT JOIN court_types ct ON c.court_type_id = ct.id
           LEFT JOIN locations l ON c.location_id = l.id
           LEFT JOIN court_levels cl ON j.court_level_id = cl.id
           WHERE cj.case_id = %s ORDER BY cj.added_at DESC LIMIT 30;""",
        [case_id],
    )
    if judgments:
        parts.append("\nالأحكام المرتبطة بالقضية (من بحث المكتب):")
        for j in judgments:
            line = f"- حكم رقم {j['judgment_number'] or j['judgment_id']}"
            if j.get("court_type"):
                line += f" — {j['court_type']}"
            if j.get("court_level"):
                line += f" ({j['court_level']})"
            if j.get("city"):
                line += f" — {j['city']}"
            if j.get("judgment_year"):
                line += f" — {j['judgment_year']}"
            parts.append(line)

    return "\n".join(parts)


def _execute_search(query: str, court_type: str | None = None) -> list:
    """Run the judgment search tool against the database."""
    from api.routes.search import _do_search

    try:
        result = _do_search(query, court_type, None, None, None, None, 5, 0, user_id=None)
        out = []
        for r in result.get("results", []):
            out.append({
                "judgment_number": r.get("judgment_number") or r.get("judgment_id"),
                "year": r.get("judgment_year"),
                "court": " ".join(filter(None, [r.get("court_type"), r.get("court_level")])),
                "city": r.get("city"),
                "snippet": (r.get("snippet") or "")[:500],
            })
        return out
    except Exception as e:
        return [{"error": f"search failed: {e}"}]


SYSTEM_PROMPT = """أنت "مساعد الباحث" — مستشار قانوني ذكي متخصص في القانون السعودي، تعمل داخل ملف قضية معينة لمكتب محاماة.

مهمتك:
1. الإجابة على أسئلة المحامي حول هذه القضية تحديداً، مستنداً إلى معلومات القضية المرفقة أدناه.
2. عند الحاجة إلى سوابق أو أحكام قضائية سعودية، استخدم أداة البحث search_judgments للعثور على أحكام ذات صلة من قاعدة بيانات الأحكام السعودية.
3. عند الاستشهاد بأحكام، اذكر أرقام الأحكام ومحاكمها بوضوح.
4. اكتب بالعربية الفصحى بأسلوب قانوني واضح ومنظم، واستخدم عناوين وترقيماً عند الحاجة.

إرشادات:
- لا تخترع أرقام أحكام أو معلومات غير موجودة في سياق القضية أو نتائج البحث.
- إذا لم تجد إجابة كافية، صرّح بذلك واقترح ما ينبغي البحث عنه.
- أضف في نهاية إجابتك تنبيهاً مختصراً بأن المساعد الذكي لا يغني عن مراجعة المحامي للمعلومات.

{case_context}"""


class ChatRequest(BaseModel):
    message: str


@router.get("/cases/{case_id}/chat")
def get_chat(case_id: int, authorization: str = Header(None)):
    """Get the assistant chat history for a case."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    if not get_case_for_access(case_id, user_id):
        raise HTTPException(status_code=404, detail="القضية غير موجودة")

    rows = query_all(
        """SELECT id, role, content, created_at FROM case_messages
           WHERE case_id = %s ORDER BY id ASC LIMIT 200;""",
        [case_id],
    )
    return {"messages": [dict(r) for r in rows]}


@router.delete("/cases/{case_id}/chat")
def clear_chat(case_id: int, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    if not get_case_for_access(case_id, user_id):
        raise HTTPException(status_code=404, detail="القضية غير موجودة")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM case_messages WHERE case_id = %s;", [case_id])
        cur.close()
    return {"status": "ok"}


@router.post("/cases/{case_id}/chat")
def send_chat_message(case_id: int, req: ChatRequest, authorization: str = Header(None)):
    """Send a message to the case assistant and get its reply.

    The assistant knows the case context (parties, hearings, linked judgments)
    and can search the Saudi judgments database as a tool.
    """
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    if not get_case_for_access(case_id, user_id):
        raise HTTPException(status_code=404, detail="القضية غير موجودة")
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="الرسالة مطلوبة")

    # Save the user message first so it is never lost
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO case_messages (case_id, user_id, role, content) VALUES (%s, %s, 'user', %s) RETURNING id, created_at;",
            (case_id, user_id, req.message.strip()),
        )
        user_msg = cur.fetchone()
        cur.close()

    # Recent history for continuity
    history = query_all(
        """SELECT role, content FROM case_messages
           WHERE case_id = %s ORDER BY id DESC LIMIT 20;""",
        [case_id],
    )
    history = [dict(h) for h in reversed(history)]

    try:
        case_context = _build_case_context(case_id)
        system = SYSTEM_PROMPT.replace("{case_context}", case_context)
        messages = [{"role": "system", "content": system}]
        for h in history:
            messages.append({"role": h["role"], "content": h["content"]})

        client = get_client()
        reply = None
        for _ in range(3):  # allow up to 3 rounds of tool calls
            resp = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=[SEARCH_TOOL],
                temperature=0.3,
                max_tokens=1200,
            )
            msg = resp.choices[0].message
            if msg.tool_calls:
                messages.append({
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                        }
                        for tc in msg.tool_calls
                    ],
                })
                for tc in msg.tool_calls:
                    try:
                        args = json.loads(tc.function.arguments or "{}")
                    except json.JSONDecodeError:
                        args = {"query": str(req.message)}
                    results = _execute_search(
                        args.get("query", req.message), args.get("court_type")
                    )
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(results, ensure_ascii=False),
                    })
                continue
            reply = msg.content
            break

        if not reply:
            reply = "عذراً، لم أتمكن من توليد إجابة. يرجى إعادة صياغة السؤال."

        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO case_messages (case_id, user_id, role, content) VALUES (%s, %s, 'assistant', %s) RETURNING id, created_at;",
                (case_id, user_id, reply),
            )
            ai_msg = cur.fetchone()
            cur.close()

        return {
            "messages": [
                {"id": user_msg[0], "role": "user", "content": req.message.strip(), "created_at": user_msg[1]},
                {"id": ai_msg[0], "role": "assistant", "content": reply, "created_at": ai_msg[1]},
            ],
            "ai_unavailable": False,
        }
    except Exception as e:
        # AI layer unavailable (e.g. credits exhausted) — keep the user message
        print(f"[CASE_CHAT] AI failed: {e}")
        return {
            "messages": [
                {"id": user_msg[0], "role": "user", "content": req.message.strip(), "created_at": user_msg[1]},
            ],
            "ai_unavailable": True,
        }
