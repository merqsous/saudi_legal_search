-- Add المحكمة العليا (Supreme Court) as a court level
-- Run this on both local and production databases

INSERT INTO court_levels (code, name_ar) 
VALUES ('supreme', 'المحكمة العليا')
ON CONFLICT (code) DO NOTHING;

-- Verify the insert
SELECT code, name_ar FROM court_levels ORDER BY name_ar;
