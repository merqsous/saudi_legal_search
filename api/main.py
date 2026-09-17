from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import search, auth, payments, favorites, legal_study, export, support, cases, case_chat, case_docs, case_drafts, firms

app = FastAPI(
    title="Saudi Legal Search API",
    description="Semantic search over Saudi court judgments",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://128.4.100.11:3000", "http://128.4.100.11:3001", "http://128.4.100.11:3002", "http://128.4.100.11:3003", "https://albaheth.app", "https://www.albaheth.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api", tags=["search"])
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(payments.router, prefix="/api", tags=["payments"])
app.include_router(favorites.router, prefix="/api", tags=["favorites"])
app.include_router(legal_study.router, prefix="/api", tags=["legal-study"])
app.include_router(export.router, prefix="/api", tags=["export"])
app.include_router(support.router, prefix="/api", tags=["support"])
app.include_router(cases.router, prefix="/api", tags=["cases"])
app.include_router(case_chat.router, prefix="/api", tags=["case-chat"])
app.include_router(case_docs.router, prefix="/api", tags=["case-docs"])
app.include_router(case_drafts.router, prefix="/api", tags=["case-drafts"])
app.include_router(firms.router, prefix="/api", tags=["firms"])


@app.on_event("startup")
def startup():
    try:
        auth.init_auth_tables()
    except Exception as e:
        import logging
        logging.error(f"init_auth_tables failed: {e}")
    try:
        support.init_support_tables()
    except Exception as e:
        import logging
        logging.error(f"init_support_tables failed: {e}")
    try:
        cases.init_case_tables()
    except Exception as e:
        import logging
        logging.error(f"init_case_tables failed: {e}")
    try:
        case_chat.init_case_chat_tables()
    except Exception as e:
        import logging
        logging.error(f"init_case_chat_tables failed: {e}")
    try:
        case_docs.init_case_docs_tables()
    except Exception as e:
        import logging
        logging.error(f"init_case_docs_tables failed: {e}")
    try:
        case_drafts.init_case_drafts_tables()
    except Exception as e:
        import logging
        logging.error(f"init_case_drafts_tables failed: {e}")
    try:
        firms.init_firm_tables()
    except Exception as e:
        import logging
        logging.error(f"init_firm_tables failed: {e}")


@app.get("/")
def root():
    return {"status": "ok", "service": "Saudi Legal Search API"}
