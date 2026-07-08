#!/bin/bash
# Export local PostgreSQL data for upload to Railway
# Usage: bash scripts/export_db.sh

set -e

EXPORT_FILE="/Users/moaztalal/code/saudi_legal_search/data/db_export.sql"

mkdir -p /Users/moaztalal/code/saudi_legal_search/data

echo "Exporting local database to $EXPORT_FILE..."

# Export schema + data (excluding pgvector extension which needs to be created manually)
pg_dump \
  --dbname=saudi_cases \
  --no-owner \
  --no-privileges \
  --no-comments \
  --column-inserts \
  --exclude-table-data='judgment_chunks' \
  -f "$EXPORT_FILE"

echo ""
echo "Schema + metadata exported (excluding judgment_chunks for size)."
echo ""
echo "To also export judgment_chunks (large, includes embeddings):"
echo "  pg_dump --dbname=saudi_cases --no-owner --no-privileges --column-inserts -t judgment_chunks >> $EXPORT_FILE"
echo ""
echo "File size: $(du -h $EXPORT_FILE | cut -f1)"
echo ""
echo "Next steps:"
echo "  1. Create a PostgreSQL database on Railway"
echo "  2. Enable pgvector: CREATE EXTENSION IF NOT EXISTS vector;"
echo "  3. Import: psql \"\$DATABASE_URL\" -f $EXPORT_FILE"
