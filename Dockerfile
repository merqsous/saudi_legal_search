FROM python:3.12-slim

# Install system dependencies for psycopg2 + Playwright + Node.js
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 for Next.js frontend
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright system dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxext6 \
    libx11-6 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (needed for scraper)
RUN playwright install chromium

# Copy all application code
COPY api/ ./api/
COPY scripts/ ./scripts/
COPY saudi_legal_scraper/schema.sql ./schema.sql

# Copy and build frontend (reordered to bust Docker layer cache)
COPY frontend/ ./frontend/
RUN cd frontend && npm install && npm run build

# Create directories
RUN mkdir -p /app/logs /app/data
RUN chmod +x ./scripts/scraper_entrypoint.sh

# Expose port for API
EXPOSE 8000

# Default to API+frontend. Set SERVICE_TYPE=scraper for scraper service.
# uvicorn runs on 8000 internally, Next.js runs on Railway's PORT (proxies /api to 8000)
CMD ["sh", "-c", "if [ \"$SERVICE_TYPE\" = \"scraper\" ]; then ./scripts/scraper_entrypoint.sh; else uvicorn api.main:app --host 0.0.0.0 --port 8000 & cd frontend && npx next start -p ${PORT:-8000}; fi"]
