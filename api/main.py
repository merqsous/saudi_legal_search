from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import search, auth

app = FastAPI(
    title="Saudi Legal Search API",
    description="Semantic search over Saudi court judgments",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api", tags=["search"])
app.include_router(auth.router, prefix="/api", tags=["auth"])


@app.on_event("startup")
def startup():
    auth.init_auth_tables()


@app.get("/")
def root():
    return {"status": "ok", "service": "Saudi Legal Search API"}
