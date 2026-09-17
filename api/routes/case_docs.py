import io
from fastapi import APIRouter, Header, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from api.db import query_all, query_one, get_db
from api.routes.cases import _get_user_from_auth, get_case_for_access
from api.embeddings import get_client

router = APIRouter()

MODEL = "gpt-4o-mini"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

ANALYSIS_SYSTEM_PROMPT = """أنت "مساعد الباحث" — محلل مستندات قانونية متخصص في القانون السعودي.
يوجد لديك مستند مرفوع في ملف قضية. حلل المستند المرفق وأجب بدقة.

معلومات القضية:
{case_context}

المستند (الاسم: {filename}):
{document_text}

{question}"""


def init_case_docs_tables():
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS case_documents (
                    id SERIAL PRIMARY KEY,
                    case_id INTEGER NOT NULL REFERENCES user_cases(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    filename VARCHAR(300) NOT NULL,
                    mime_type VARCHAR(100),
                    size_bytes INTEGER,
                    extracted_text TEXT,
                    file_data BYTEA,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id);")
            cur.close()
    except Exception as e:
        import logging
        logging.error(f"init_case_docs_tables failed: {e}")


def _extract_text(filename: str, data: bytes) -> str:
    """Extract plain text from DOCX / PDF / TXT uploads."""
    lower = (filename or "").lower()
    try:
        if lower.endswith(".docx"):
            from docx import Document
            doc = Document(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        if lower.endswith(".pdf"):
            try:
                from pypdf import PdfReader
            except ImportError:
                return "[استخراج النص من PDF غير مدعوم حالياً — يرجى رفع نسخة Word أو نصية]"
            reader = PdfReader(io.BytesIO(data))
            pages = []
            for page in reader.pages:
                text = page.extract_text() or ""
                pages.append(text.strip())
            return "\n".join(pages)
        if lower.endswith((".txt", ".md", ".csv")):
            return data.decode("utf-8", errors="replace")
    except Exception as e:
        return f"[تعذر استخراج النص: {e}]"
    return ""


@router.get("/cases/{case_id}/documents")
def list_documents(case_id: int, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    if not get_case_for_access(case_id, user_id):
        raise HTTPException(status_code=404, detail="القضية غير موجودة")

    rows = query_all(
        """SELECT id, filename, mime_type, size_bytes,
                  (extracted_text IS NOT NULL AND length(extracted_text) > 0) AS has_text,
                  created_at
           FROM case_documents WHERE case_id = %s ORDER BY created_at DESC;""",
        [case_id],
    )
    return {"documents": [dict(r) for r in rows]}


@router.post("/cases/{case_id}/documents")
async def upload_document(case_id: int, authorization: str = Header(None), file: UploadFile = File(...)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    if not get_case_for_access(case_id, user_id):
        raise HTTPException(status_code=404, detail="القضية غير موجودة")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="حجم الملف يتجاوز 10 ميجابايت")

    filename = file.filename or "document"
    extracted = _extract_text(filename, data)

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO case_documents (case_id, user_id, filename, mime_type, size_bytes, extracted_text, file_data)
               VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at;""",
            (case_id, user_id, filename, file.content_type, len(data), extracted, data),
        )
        row = cur.fetchone()
        cur.execute("UPDATE user_cases SET updated_at = NOW() WHERE id = %s;", [case_id])
        cur.close()
    return {"status": "ok", "document_id": row[0], "has_text": bool(extracted)}


@router.get("/cases/{case_id}/documents/{document_id}/download")
def download_document(case_id: int, document_id: int, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    if not get_case_for_access(case_id, user_id):
        raise HTTPException(status_code=404, detail="القضية غير موجودة")

    doc = query_one(
        "SELECT filename, mime_type, file_data FROM case_documents WHERE id = %s AND case_id = %s;",
        [document_id, case_id],
    )
    if not doc:
        raise HTTPException(status_code=404, detail="المستند غير موجود")

    return Response(
        content=doc["file_data"],
        media_type=doc["mime_type"] or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{doc["filename"]}"'},
    )


@router.delete("/cases/{case_id}/documents/{document_id}")
def delete_document(case_id: int, document_id: int, authorization: str = Header(None)):
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    if not get_case_for_access(case_id, user_id):
        raise HTTPException(status_code=404, detail="القضية غير موجودة")

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM case_documents WHERE id = %s AND case_id = %s;", [document_id, case_id])
        cur.close()
    return {"status": "ok"}


class AnalyzeRequest(BaseModel):
    question: str | None = None


@router.post("/cases/{case_id}/documents/{document_id}/analyze")
def analyze_document(case_id: int, document_id: int, req: AnalyzeRequest, authorization: str = Header(None)):
    """AI analysis of an uploaded document: summary, key points, or a specific question."""
    user_id = _get_user_from_auth(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="غير مصرح")
    if not get_case_for_access(case_id, user_id):
        raise HTTPException(status_code=404, detail="القضية غير موجودة")

    doc = query_one(
        "SELECT filename, extracted_text FROM case_documents WHERE id = %s AND case_id = %s;",
        [document_id, case_id],
    )
    if not doc:
        raise HTTPException(status_code=404, detail="المستند غير موجود")

    text = (doc["extracted_text"] or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="لا يمكن تحليل هذا المستند لأنه لا يحتوي على نص مستخرج")

    # Keep the prompt within reasonable limits
    if len(text) > 60000:
        text = text[:60000] + "\n[... تم اقتطاع بقية المستند ...]"

    from api.routes.case_chat import _build_case_context
    case_context = _build_case_context(case_id)

    if req.question and req.question.strip():
        task = f"أجب على هذا السؤال حول المستند: {req.question.strip()}"
    else:
        task = (
            "قم بتحليل المستند وقدم:\n"
            "1. ملخص تنفيذي (3-5 أسطر)\n"
            "2. النقاط القانونية الرئيسية (قائمة مرقمة)\n"
            "3. المواعيد والمبالغ المذكورة إن وجدت\n"
            "4. المخاطر أو النقاط التي تستحق انتباه المحامي"
        )

    prompt = ANALYSIS_SYSTEM_PROMPT.format(
        case_context=case_context,
        filename=doc["filename"],
        document_text=text,
        question=task,
    )

    try:
        client = get_client()
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500,
        )
        return {"analysis": resp.choices[0].message.content.strip()}
    except Exception as e:
        print(f"[DOC_ANALYZE] AI failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="الخدمة الذكية غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.",
        )
