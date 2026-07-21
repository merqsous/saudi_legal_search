from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import search, auth, payments, favorites, legal_study, export

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


@app.on_event("startup")
def startup():
    auth.init_auth_tables()


@app.get("/")
def root():
    return {"status": "ok", "service": "Saudi Legal Search API"}
