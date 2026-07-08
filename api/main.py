from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import search

app = FastAPI(
    title="Saudi Legal Search API",
    description="Semantic search over Saudi court judgments",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api", tags=["search"])


@app.get("/")
def root():
    return {"status": "ok", "service": "Saudi Legal Search API"}
