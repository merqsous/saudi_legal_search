# Search Performance Optimization Guide

## Quick Start

To optimize search performance, run the database optimization script:

```bash
# Local database
psql -U $USER -d saudi_cases -f api/optimize_search.sql

# Production database (Railway)
# Get your DATABASE_URL from Railway dashboard, then:
psql $DATABASE_URL -f api/optimize_search.sql
```

## What This Does

The optimization script creates indexes that dramatically improve search performance:

1. **Vector similarity index** - Speeds up semantic search by 10-100x
2. **Filter indexes** - Makes filtering by court type, location, year, and level instant
3. **Composite indexes** - Optimizes common filter combinations
4. **Query statistics** - Updates PostgreSQL query planner for better execution plans

## New Features

### 1. Quick Filter Chips
One-click access to common searches:
- **تجاري** - Commercial court cases
- **الرياض** - Cases in Riyadh
- **استئناف** - Appeal court judgments

### 2. Enhanced البيانات الأساسية
Key metadata is now displayed in a prominent, organized section:
- رقم القضية (Case number)
- رقم الحكم (Judgment number)
- التاريخ (Date)

### 3. Improved Filter UI
- Visual active state for quick filters
- Better organized filter panel
- Clear "مسح الكل" (Clear all) button

## Performance Tips

1. **Always use filters** when possible - They're indexed and very fast
2. **Quick filters** are optimized for the most common searches
3. **Combine filters** for more precise results (e.g., تجاري + الرياض)

## Expected Performance

After running the optimization:
- **Filtered searches**: < 100ms
- **Semantic search**: 200-500ms
- **Combined (semantic + filters)**: 300-600ms

## Monitoring

Check index usage:
```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

Check query performance:
```sql
EXPLAIN ANALYZE
SELECT * FROM judgment_chunks
WHERE embedding IS NOT NULL
  AND length(chunk_text) >= 100
  AND embedding <=> '[...]'::vector < 0.60
LIMIT 20;
```
