# Saudi Legal Search

Full-stack semantic search over Saudi court judgments scraped from [laws.moj.gov.sa](https://laws.moj.gov.sa).

## Architecture

```
saudi_legal_search/
├── api/                    # FastAPI backend
│   ├── config.py           # DB + OpenAI config
│   ├── db.py               # PostgreSQL connection helpers
│   ├── embeddings.py       # OpenAI text-embedding-3-small wrapper
│   ├── main.py             # FastAPI app entrypoint
│   └── routes/search.py    # /api/search, /api/judgments/{id}, /api/filters, /api/stats
├── frontend/               # Next.js + React + TailwindCSS
│   └── app/
│       ├── layout.tsx      # Root layout (RTL, Arabic fonts)
│       ├── page.tsx        # Search interface with filters + result cards
│       └── globals.css     # Tailwind styles
├── scripts/
│   └── weekly_scrape.py    # Weekly scraper: find new judgments, import, chunk, embed
├── saudi_legal_scraper/    # Existing scraper pipeline
│   ├── stage1_scrape_index.py
│   ├── stage1_scrape_appeal_index.py
│   ├── stage2_scrape_details.py
│   ├── stage2_scrape_appeal_details_parallel.py
│   ├── import_cases_to_db.py
│   ├── chunk_judgments.py
│   ├── embed_chunks.py
│   ├── search.py           # Original CLI search
│   ├── link_appeals.py
│   ├── schema.sql
│   └── data/               # Scraped data (gitignored)
├── requirements.txt
└── .gitignore
```

## Setup

### 1. Backend

```bash
cd saudi_legal_search
pip install -r requirements.txt
playwright install chromium

# Start the API
uvicorn api.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### 3. Weekly Scraper

```bash
# Full pipeline (first-instance + appeals + embedding)
python scripts/weekly_scrape.py

# Only appeals
python scripts/weekly_scrape.py --appeal

# Skip embedding step
python scripts/weekly_scrape.py --skip-embed
```

The scraper:
1. Scrapes all index pages from laws.moj.gov.sa
2. Compares URLs against existing entries in PostgreSQL
3. Scrapes details for new judgments only
4. Imports new judgments to DB
5. Chunks new sections and generates OpenAI embeddings

### 4. Cron (optional)

```bash
# Run weekly on Sunday at 2 AM
0 2 * * 0 cd /path/to/saudi_legal_search && python scripts/weekly_scrape.py >> logs/cron.log 2>&1
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/search?q=...` | Semantic search with optional filters (`court_type`, `city`, `year`, `court_level`) |
| `GET /api/judgments/{id}` | Full judgment details with sections + appeal links |
| `GET /api/filters` | Available filter values (court types, cities, years, court levels) |
| `GET /api/stats` | Database statistics |

## Database

PostgreSQL with pgvector. Schema in `saudi_legal_scraper/schema.sql`.

Key tables: `cases`, `judgments`, `judgment_sections`, `judgment_chunks` (with vector embeddings).
