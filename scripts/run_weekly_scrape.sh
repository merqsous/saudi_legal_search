#!/bin/bash
# Weekly automated scraper for Saudi legal judgments
# Runs the full pipeline: scrape index → find new → scrape details → import → chunk → embed

cd /Users/moaztalal/code/saudi_legal_search

# Load environment variables
export $(grep -v '^#' saudi_legal_scraper/.env | xargs)

# Python path (venv with all dependencies)
PYTHON=/Users/moaztalal/code/saudi_legal_search/saudi_legal_scraper/venv/bin/python

# Run the scraper (fresh index scrape to catch new judgments on page 1)
# Use --resume only for manual crash recovery: python scripts/weekly_scrape.py --resume
$PYTHON scripts/weekly_scrape.py >> /Users/moaztalal/code/saudi_legal_search/logs/scraper_$(date +%Y%m%d).log 2>&1

echo "Scraper run completed at $(date)" >> /Users/moaztalal/code/saudi_legal_search/logs/scraper_$(date +%Y%m%d).log
