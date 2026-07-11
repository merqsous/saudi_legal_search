-- Performance optimization indexes for efficient search
-- Run this to improve search query performance

-- Index for vector similarity search (most important)
CREATE INDEX IF NOT EXISTS idx_judgment_chunks_embedding 
ON judgment_chunks USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Index for filtering by court type
CREATE INDEX IF NOT EXISTS idx_cases_court_type_id ON cases(court_type_id);

-- Index for filtering by location (city)
CREATE INDEX IF NOT EXISTS idx_cases_location_id ON cases(location_id);

-- Index for filtering by court level
CREATE INDEX IF NOT EXISTS idx_judgments_court_level_id ON judgments(court_level_id);

-- Index for filtering by year
CREATE INDEX IF NOT EXISTS idx_judgments_year ON judgments(judgment_year);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_cases_court_location 
ON cases(court_type_id, location_id);

-- Index for chunk length filtering (used in WHERE clause)
CREATE INDEX IF NOT EXISTS idx_judgment_chunks_length 
ON judgment_chunks(judgment_id) 
WHERE embedding IS NOT NULL AND length(chunk_text) >= 100;

-- Index for joining chunks to judgments
CREATE INDEX IF NOT EXISTS idx_judgment_chunks_judgment_id 
ON judgment_chunks(judgment_id);

-- Index for joining judgments to cases
CREATE INDEX IF NOT EXISTS idx_judgments_case_id 
ON judgments(case_id);

-- Analyze tables to update statistics for query planner
ANALYZE judgment_chunks;
ANALYZE judgments;
ANALYZE cases;
ANALYZE court_types;
ANALYZE locations;
ANALYZE court_levels;
