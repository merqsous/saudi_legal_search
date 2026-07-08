import json
import os
import re
from pathlib import Path
from datetime import datetime

import psycopg2


DB_NAME = "saudi_cases"
DB_USER = os.getenv("USER")
DB_PASSWORD = ""
DB_HOST = "localhost"
DB_PORT = "5432"

ROOT_DIRS = [
    Path("data/cases_appeal"),
    Path("data/cases"),
]

AR_TO_EN = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def normalize_digits(text):
    if not text:
        return None
    return str(text).translate(AR_TO_EN).strip()


def clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def first_nonempty(*values):
    for value in values:
        if value is not None and str(value).strip():
            return str(value).strip()
    return None


def extract(pattern, text):
    match = re.search(pattern, text or "", re.S)
    if not match:
        return None
    return normalize_digits(clean(match.group(1)))


def read_text(path: Path) -> str | None:
    if path.exists():
        return path.read_text(encoding="utf-8")
    return None


def parse_datetime(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def detect_court_type(text, meta):
    combined = json.dumps(meta, ensure_ascii=False) + " " + (text or "")

    if "المحكمة العمالية" in combined or "الدائرة العمالية" in combined:
        return "labor", "عمالي"
    if "المحكمة التجارية" in combined or "الدائرة التجارية" in combined:
        return "commercial", "تجاري"
    if "المحكمة الجزائية" in combined or "الدائرة الجزائية" in combined:
        return "criminal", "جزائي"
    if "الأحوال الشخصية" in combined or "محكمة الأحوال الشخصية" in combined:
        return "personal_status", "أحوال شخصية"
    if "المحكمة العامة" in combined or "الدائرة العامة" in combined:
        return "general", "عام"

    return "unknown", "غير معروف"


def detect_court_level(meta, text):
    combined = json.dumps(meta, ensure_ascii=False) + " " + (text or "")

    if "نص الاستئناف" in combined or "محكمة الاستئناف" in combined:
        return "appeal", "أحكام محكمة الاستئناف"

    if "نص الحكم الإبتدائي" in combined or "نص الحكم الابتدائي" in combined:
        return "first_instance", "أحكام محاكم الدرجة الأولى النهائية"

    return meta.get("court_level") or "unknown", meta.get("source_collection") or "غير معروف"


def get_or_create(cur, table, unique_col, value, extra_cols=None):
    value = value or "unknown"

    cur.execute(f"SELECT id FROM {table} WHERE {unique_col} = %s", (value,))
    row = cur.fetchone()
    if row:
        return row[0]

    if extra_cols:
        cols = [unique_col] + list(extra_cols.keys())
        vals = [value] + list(extra_cols.values())
        placeholders = ",".join(["%s"] * len(vals))
        cur.execute(
            f"INSERT INTO {table} ({','.join(cols)}) VALUES ({placeholders}) RETURNING id",
            vals,
        )
    else:
        cur.execute(
            f"INSERT INTO {table} ({unique_col}) VALUES (%s) RETURNING id",
            (value,),
        )

    return cur.fetchone()[0]


def import_case_folder(cur, case_dir: Path):
    meta_file = case_dir / "00_metadata.json"
    full_text_file = case_dir / "07_full_text.txt"

    if not meta_file.exists() or not full_text_file.exists():
        return False

    meta = json.loads(meta_file.read_text(encoding="utf-8"))
    full_text = full_text_file.read_text(encoding="utf-8")

    case_number_from_text = extract(r"القضية رقم\s*([0-9٠-٩]+)", full_text)
    case_year_from_text = extract(r"القضية رقم\s*[0-9٠-٩]+\s*لعام\s*([0-9٠-٩]+)", full_text)
    judgment_number_from_text = extract(r"رقم الحكم:\s*([0-9٠-٩]+)", full_text)
    judgment_date_from_text = extract(r"التاريخ:\s*([^ن]+?)\s+نص", full_text)

    case_number = first_nonempty(
        case_number_from_text,
        meta.get("case_number"),
        meta.get("case_number_from_details"),
        meta.get("judgment_number_from_details"),
        meta.get("judgment_number"),
    )

    case_year = first_nonempty(
        case_year_from_text,
        meta.get("case_year"),
        meta.get("case_year_from_details"),
        meta.get("year"),
        meta.get("judgment_year"),
    )

    judgment_number = first_nonempty(
        judgment_number_from_text,
        meta.get("judgment_number_from_details"),
        meta.get("judgment_number"),
        case_number,
    )

    judgment_year = first_nonempty(
        meta.get("judgment_year"),
        case_year,
    )

    judgment_date = first_nonempty(
        judgment_date_from_text,
        meta.get("judgment_date_hijri_from_details"),
        meta.get("judgment_date_hijri"),
    )

    court_level_code, court_level_name = detect_court_level(meta, full_text)
    court_type_code, court_type_name = detect_court_type(full_text, meta)

    city = first_nonempty(
        meta.get("city_from_details"),
        meta.get("city"),
        extract(r"المدينة:\s*([^ر]+?)\s+رقم الحكم", full_text),
    ) or "unknown"

    judgment_type = first_nonempty(
        meta.get("judgment_type"),
        "نص الاستئناف" if "نص الاستئناف" in full_text else None,
        "نص الحكم الإبتدائي" if "نص الحكم الإبتدائي" in full_text else None,
    )

    details_url = meta.get("details_url")

    court_level_id = get_or_create(
        cur,
        "court_levels",
        "code",
        court_level_code,
        {"name_ar": court_level_name},
    )

    court_type_id = get_or_create(
        cur,
        "court_types",
        "code",
        court_type_code,
        {"name_ar": court_type_name},
    )

    location_id = get_or_create(
        cur,
        "locations",
        "city_ar",
        city,
    )

    cur.execute(
        """
        INSERT INTO cases (
            case_number,
            case_year,
            court_type_id,
            location_id
        )
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (case_number, case_year)
        DO UPDATE SET
            court_type_id = EXCLUDED.court_type_id,
            location_id = EXCLUDED.location_id
        RETURNING id;
        """,
        (case_number, case_year, court_type_id, location_id),
    )

    case_id = cur.fetchone()[0]

    cur.execute(
        """
        INSERT INTO judgments (
            case_id,
            court_level_id,
            judgment_number,
            judgment_year,
            judgment_date_hijri,
            judgment_type,
            source_collection,
            details_url,
            local_folder,
            full_text,
            scraped_at
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (details_url)
        DO UPDATE SET
            case_id = EXCLUDED.case_id,
            court_level_id = EXCLUDED.court_level_id,
            judgment_number = EXCLUDED.judgment_number,
            judgment_year = EXCLUDED.judgment_year,
            judgment_date_hijri = EXCLUDED.judgment_date_hijri,
            judgment_type = EXCLUDED.judgment_type,
            source_collection = EXCLUDED.source_collection,
            local_folder = EXCLUDED.local_folder,
            full_text = EXCLUDED.full_text,
            scraped_at = EXCLUDED.scraped_at
        RETURNING id;
        """,
        (
            case_id,
            court_level_id,
            judgment_number,
            judgment_year,
            judgment_date,
            judgment_type,
            meta.get("source_collection"),
            details_url,
            str(case_dir),
            full_text,
            parse_datetime(meta.get("scraped_at")),
        ),
    )

    judgment_id = cur.fetchone()[0]

    cur.execute("DELETE FROM judgment_sections WHERE judgment_id = %s", (judgment_id,))

    sections = [
        (1, "metadata", "البيانات الأساسية", json.dumps(meta, ensure_ascii=False, indent=2)),
        (2, "facts", "الوقائع", read_text(case_dir / "02_facts.txt")),
        (5, "reasoning", "الأسباب", read_text(case_dir / "05_reasoning.txt")),
        (6, "ruling", "الحكم", read_text(case_dir / "06_ruling.txt")),
        (7, "full_text", "النص الكامل", full_text),
    ]

    for order, code, name_ar, text in sections:
        if not text:
            continue

        cur.execute(
            """
            INSERT INTO judgment_sections (
                judgment_id,
                section_order,
                section_code,
                section_name_ar,
                section_text
            )
            VALUES (%s, %s, %s, %s, %s);
            """,
            (judgment_id, order, code, name_ar, text),
        )

    return True


def main():
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
    )

    cur = conn.cursor()
    count = 0
    failed = 0

    for root in ROOT_DIRS:
        if not root.exists():
            continue

        for meta_file in root.glob("**/00_metadata.json"):
            case_dir = meta_file.parent

            try:
                ok = import_case_folder(cur, case_dir)
                if ok:
                    count += 1

                if count % 100 == 0:
                    conn.commit()
                    print(f"Imported {count} judgments")

            except Exception as e:
                conn.rollback()
                failed += 1
                print(f"Failed: {case_dir}")
                print(type(e).__name__, e)

    conn.commit()
    cur.close()
    conn.close()

    print(f"Done. Imported {count} judgments. Failed: {failed}")


if __name__ == "__main__":
    main()