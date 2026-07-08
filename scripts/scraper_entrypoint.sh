#!/bin/bash
# Scraper service entrypoint — runs scraper on startup then weekly

set -e

cd /app

# Load env vars (Railway provides DATABASE_URL and OPENAI_API_KEY)
export DATABASE_URL="${DATABASE_URL}"
export OPENAI_API_KEY="${OPENAI_API_KEY}"

LOG_FILE="/app/logs/scraper.log"
mkdir -p /app/logs

echo "[$(date)] Scraper service started" >> "$LOG_FILE"
echo "[$(date)] DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo yes || echo no)" >> "$LOG_FILE"
echo "[$(date)] OPENAI_API_KEY is set: $([ -n "$OPENAI_API_KEY" ] && echo yes || echo no)" >> "$LOG_FILE"

# Run scraper immediately on startup
echo "[$(date)] Running initial scrape..." >> "$LOG_FILE"
python scripts/weekly_scrape.py >> "$LOG_FILE" 2>&1 || true
echo "[$(date)] Initial scrape completed" >> "$LOG_FILE"

# Then run weekly (every 7 days)
while true; do
    echo "[$(date)] Sleeping for 7 days until next scrape..." >> "$LOG_FILE"
    sleep $((7 * 24 * 60 * 60))
    echo "[$(date)] Starting weekly scrape..." >> "$LOG_FILE"
    python scripts/weekly_scrape.py >> "$LOG_FILE" 2>&1 || true
    echo "[$(date)] Weekly scrape completed" >> "$LOG_FILE"
done
