CREATE TABLE IF NOT EXISTS court_levels (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name_ar TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS court_types (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name_ar TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    city_ar TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    case_number TEXT,
    case_year TEXT,
    court_type_id INTEGER REFERENCES court_types(id),
    location_id INTEGER REFERENCES locations(id),
    UNIQUE(case_number, case_year)
);

CREATE TABLE IF NOT EXISTS judgments (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    court_level_id INTEGER REFERENCES court_levels(id),
    judgment_number TEXT UNIQUE,
    judgment_year TEXT,
    judgment_date_hijri TEXT,
    judgment_type TEXT,
    source_collection TEXT,
    details_url TEXT UNIQUE,
    local_folder TEXT,
    full_text TEXT,
    scraped_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS judgment_sections (
    id SERIAL PRIMARY KEY,
    judgment_id INTEGER REFERENCES judgments(id) ON DELETE CASCADE,
    section_order INTEGER,
    section_code TEXT,
    section_name_ar TEXT,
    section_text TEXT
);
