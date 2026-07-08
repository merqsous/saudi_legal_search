FROM python:3.12-slim

# Install system dependencies for psycopg2 and pgvector
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY api/ ./api/
COPY saudi_legal_scraper/schema.sql ./schema.sql

# Expose port
EXPOSE 8000

# Start command: run schema migration then start API
CMD ["sh", "-c", "python -c \"import psycopg2, os; conn = psycopg2.connect(os.environ['DATABASE_URL']); cur = conn.cursor(); cur.execute(open('schema.sql').read()); conn.commit(); conn.close()\" && uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
