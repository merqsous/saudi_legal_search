"""
Automated weekly scraper for laws.moj.gov.sa.

Scrapes all 2486 index pages from JudicialDecisionsList/0,
finds new judgments not in the database, scrapes their details,
saves them in the same folder structure, imports to PostgreSQL,
chunks them, and generates OpenAI embeddings.

Usage:
    python weekly_scrape.py                    # Run full pipeline
    python weekly_scrape.py --skip-embed       # Skip embedding step
    python weekly_scrape.py --resume           # Resume from last saved index page
    python weekly_scrape.py --max-pages 100    # Limit index pages (for testing)
"""

import argparse
import asyncio
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

import psycopg2
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from urllib.parse import urlparse

load_dotenv(Path(__file__).resolve().parent.parent / "saudi_legal_scraper" / ".env")

SCRAPER_DIR = Path(__file__).resolve().parent.parent / "saudi_legal_scraper"
sys.path.insert(0, str(SCRAPER_DIR))

BASE_URL = "https://laws.moj.gov.sa"

# Support Railway DATABASE_URL, fall back to individual env vars
_DATABASE_URL = os.getenv("DATABASE_URL", "")
if _DATABASE_URL:
    _parsed = urlparse(_DATABASE_URL)
    DB_NAME = _parsed.path.lstrip("/")
    DB_USER = _parsed.username
    DB_PASSWORD = _parsed.password or ""
    DB_HOST = _parsed.hostname
    DB_PORT = str(_parsed.port or 5432)
else:
    DB_NAME = os.getenv("DB_NAME", "saudi_cases")
    DB_USER = os.getenv("DB_USER", os.getenv("USER", "postgres"))
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")

AR_TO_EN = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

MAX_CONCURRENT = 3
PAGE_SIZE = 12
TOTAL_PAGES = 2486

INDEX_DIR = SCRAPER_DIR / "data" / "index_all"
INDEX_DIR.mkdir(parents=True, exist_ok=True)

LOG_FILE = SCRAPER_DIR / "data" / "weekly_scrape_log.json"


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def safe_name(text: str) -> str:
    text = clean(text)
    for ch in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']:
        text = text.replace(ch, "_")
    return text[:80] if text else "unknown"


def normalize_digits(text):
    if not text:
        return None
    return str(text).translate(AR_TO_EN).strip()


def log(message: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {message}")


def get_db_conn():
    return psycopg2.connect(
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD,
        host=DB_HOST, port=DB_PORT,
    )


def get_existing_urls(conn) -> set[str]:
    cur = conn.cursor()
    cur.execute("SELECT details_url FROM judgments WHERE details_url IS NOT NULL;")
    urls = {row[0] for row in cur.fetchall()}
    cur.close()
    return urls


# ─── Index scraping ──────────────────────────────────────────────

def page_url(page_number: int) -> str:
    return (
        f"https://laws.moj.gov.sa/ar/JudicialDecisionsList/0"
        f"?pageNumber={page_number}&pageSize={PAGE_SIZE}"
        f"&viewType=grid&sortingBy=2"
    )


def parse_card_text(card_text: str, details_url: str, page_number: int) -> dict:
    judgment_number = None
    m = re.search(r"رقم الحكم\s*/\s*([0-9٠-٩]+)", card_text)
    if m:
        judgment_number = m.group(1)

    case_type = None
    judgment_year = None
    m = re.search(r"(.+?)\s*/\s*([0-9٠-٩]{4})", card_text)
    if m:
        possible_type = clean(m.group(1))
        if "رقم الحكم" not in possible_type and len(possible_type) < 40:
            case_type = possible_type
            judgment_year = m.group(2)

    date = None
    m = re.search(r"التاريخ\s+(.+?)(?:المحكمة|$)", card_text)
    if m:
        date = clean(m.group(1))

    court = None
    m = re.search(r"المحكمة\s+(.+?)(?:المدينة|$)", card_text)
    if m:
        court = clean(m.group(1))

    city = None
    m = re.search(r"المدينة\s+(.+)$", card_text)
    if m:
        city = clean(m.group(1))

    return {
        "page_number": page_number,
        "judgment_number": judgment_number,
        "case_type": case_type,
        "judgment_year": judgment_year,
        "judgment_date_hijri": date,
        "court": court,
        "city": city,
        "details_url": details_url,
        "card_text": card_text,
    }


async def scrape_index_page(context, page_number: int) -> list[dict]:
    url = page_url(page_number)
    page = await context.new_page()
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        try:
            await page.wait_for_selector("a.details-link", timeout=30000)
        except Exception:
            return []

        await page.wait_for_timeout(1500)

        links = page.locator("a.details-link")
        count = await links.count()

        page_cases = []
        seen_urls = set()

        for i in range(count):
            link = links.nth(i)
            href = await link.get_attribute("href")
            if not href:
                continue

            details_url = urljoin(BASE_URL, href)
            if details_url in seen_urls:
                continue
            seen_urls.add(details_url)

            try:
                card = link.locator("xpath=ancestor::div[contains(@class, 'row')][1]")
                card_text = clean(await card.inner_text())
            except Exception:
                card_text = ""

            item = parse_card_text(card_text, details_url, page_number)
            page_cases.append(item)

        return page_cases
    finally:
        try:
            await page.close()
        except Exception:
            pass


def load_saved_index() -> list[dict]:
    """Load all saved index page JSONs from disk."""
    all_cases = []
    seen_urls = set()

    for page_file in sorted(INDEX_DIR.glob("page_*_index.json")):
        try:
            cases = json.loads(page_file.read_text(encoding="utf-8"))
            for case in cases:
                url = case.get("details_url")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_cases.append(case)
        except Exception:
            continue

    return all_cases


def get_last_saved_page() -> int:
    """Find the highest page number already saved."""
    max_page = 0
    for page_file in INDEX_DIR.glob("page_*_index.json"):
        try:
            num = int(page_file.stem.split("_")[1])
            if num > max_page:
                max_page = num
        except Exception:
            continue
    return max_page


async def scrape_all_index_pages(max_pages: int | None = None, resume: bool = False) -> list[dict]:
    start_page = 1
    if resume:
        start_page = get_last_saved_page() + 1
        log(f"Resuming from page {start_page}")
    else:
        # Clear old index files for a fresh scrape (catches new judgments on earlier pages)
        old_files = list(INDEX_DIR.glob("page_*_index.json"))
        if old_files:
            log(f"Clearing {len(old_files)} old index files for fresh scrape")
            for f in old_files:
                f.unlink()

    end_page = max_pages or TOTAL_PAGES

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        context = await browser.new_context(
            locale="ar-SA",
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )

        for page_number in range(start_page, end_page + 1):
            page_file = INDEX_DIR / f"page_{page_number}_index.json"

            if page_file.exists():
                continue

            log(f"Scraping index page {page_number}/{end_page}")

            success = False
            for attempt in range(1, 4):
                try:
                    cases = await scrape_index_page(context, page_number)
                    page_file.write_text(
                        json.dumps(cases, ensure_ascii=False, indent=2),
                        encoding="utf-8",
                    )
                    log(f"  Saved {len(cases)} cases from page {page_number}")
                    success = True
                    break
                except Exception as e:
                    log(f"  Attempt {attempt} failed: {type(e).__name__}: {e}")
                    await asyncio.sleep(5)

                    try:
                        await browser.close()
                    except Exception:
                        pass
                    browser = await p.chromium.launch(
                        headless=True,
                        args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
                    )
                    context = await browser.new_context(
                        locale="ar-SA",
                        viewport={"width": 1280, "height": 900},
                        user_agent=(
                            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/124.0.0.0 Safari/537.36"
                        ),
                    )

            if not success:
                log(f"  FAILED page {page_number} after 3 attempts, skipping")

            await asyncio.sleep(1)

        await browser.close()

    all_cases = load_saved_index()
    log(f"Total indexed cases: {len(all_cases)}")
    return all_cases


# ─── Detail scraping ─────────────────────────────────────────────

def extract_value(text: str, label: str, next_labels: list[str]) -> str | None:
    pattern = rf"{re.escape(label)}\s*[:：]?\s*(.*?)\s*(?=" + "|".join(map(re.escape, next_labels)) + r"|$)"
    m = re.search(pattern, text, re.S)
    return clean(m.group(1)) if m else None


def extract_metadata(full_text: str) -> dict:
    data = {}

    m = re.search(r"القضية رقم\s+([0-9٠-٩]+)\s+لعام\s+([0-9٠-٩]+)", full_text)
    if m:
        data["case_number"] = m.group(1)
        data["case_year"] = m.group(2)

    court = extract_value(full_text, "المحكمة", ["المدينة:", "رقم الحكم:", "التاريخ:", "نص"])
    if court:
        data["court_from_details"] = court

    city = extract_value(full_text, "المدينة:", ["رقم الحكم:", "التاريخ:", "نص"])
    if city:
        data["city_from_details"] = city

    judgment_number = extract_value(full_text, "رقم الحكم:", ["التاريخ:", "نص"])
    if judgment_number:
        data["judgment_number_from_details"] = judgment_number

    date = extract_value(full_text, "التاريخ:", ["نص الحكم", "نص الاستئناف"])
    if date:
        data["judgment_date_hijri_from_details"] = date

    if "نص الاستئناف" in full_text:
        data["judgment_type"] = "نص الاستئناف"
    elif "نص الحكم الإبتدائي" in full_text:
        data["judgment_type"] = "نص الحكم الإبتدائي"
    elif "نص الحكم الابتدائي" in full_text:
        data["judgment_type"] = "نص الحكم الابتدائي"

    return data


def detect_court_type(text: str) -> str:
    if "المحكمة العمالية" in text or "الدائرة العمالية" in text:
        return "labor"
    if "المحكمة التجارية" in text or "الدائرة التجارية" in text:
        return "commercial"
    if "المحكمة الجزائية" in text or "الدائرة الجزائية" in text:
        return "criminal"
    if "الأحوال الشخصية" in text or "محكمة الأحوال الشخصية" in text:
        return "personal_status"
    if "المحكمة العامة" in text or "الدائرة العامة" in text:
        return "general"
    return "unknown"


def court_type_ar(code: str) -> str:
    mapping = {
        "labor": "عمالي", "commercial": "تجاري", "criminal": "جزائي",
        "personal_status": "أحوال شخصية", "general": "عام", "unknown": "غير معروف",
    }
    return mapping.get(code, "غير معروف")


def extract_sections(full_text: str) -> dict:
    sections = {}

    if "الوقائع:" in full_text:
        after = full_text.split("الوقائع:", 1)[1]
        if "الأسباب:" in after:
            sections["02_facts.txt"] = clean(after.split("الأسباب:", 1)[0])
        else:
            sections["02_facts.txt"] = clean(after)

    if "الأسباب:" in full_text:
        after = full_text.split("الأسباب:", 1)[1]
        if "الحكم:" in after:
            sections["05_reasoning.txt"] = clean(after.split("الحكم:", 1)[0])
        elif "نص الحكم:" in after:
            sections["05_reasoning.txt"] = clean(after.split("نص الحكم:", 1)[0])
        else:
            sections["05_reasoning.txt"] = clean(after)

    if "الحكم:" in full_text:
        sections["06_ruling.txt"] = clean(full_text.split("الحكم:", 1)[1])
    elif "نص الحكم:" in full_text:
        sections["06_ruling.txt"] = clean(full_text.split("نص الحكم:", 1)[1])

    return sections


def get_case_folder(case: dict) -> Path:
    court_type = case.get("court_type_code") or detect_court_type(case.get("full_text", ""))
    court = case.get("court_from_details") or case.get("court") or "المحكمة العامة"
    city = case.get("city_from_details") or case.get("city") or "unknown_city"
    year = case.get("case_year") or case.get("judgment_year") or "unknown_year"
    judgment_number = (
        case.get("judgment_number_from_details")
        or case.get("judgment_number")
        or case.get("case_number")
        or "unknown_case"
    )
    is_appeal = "نص الاستئناف" in (case.get("full_text", "") or "") or case.get("court_level") == "appeal"
    if is_appeal:
        return (
            SCRAPER_DIR / "data" / "cases_appeal" / "appeal"
            / safe_name(court_type) / safe_name(court) / safe_name(city)
            / safe_name(year) / safe_name(judgment_number)
        )
    else:
        return (
            SCRAPER_DIR / "data" / "cases"
            / safe_name(court) / safe_name(city) / safe_name(year)
            / safe_name(judgment_number)
        )


async def block_resources(route):
    resource_type = route.request.resource_type
    if resource_type in ["image", "font", "media"]:
        await route.abort()
    else:
        await route.continue_()


async def scrape_details(new_cases: list[dict]) -> list[dict]:
    if not new_cases:
        return []

    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    saved = []
    failed = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        context = await browser.new_context(
            locale="ar-SA",
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        await context.route("**/*", block_resources)

        async def scrape_one(case: dict, index: int, total: int):
            async with semaphore:
                url = case.get("details_url")
                if not url:
                    return

                page = await context.new_page()
                try:
                    log(f"[{index}/{total}] Scraping: {url}")
                    await page.goto(url, wait_until="domcontentloaded", timeout=60000)
                    await page.wait_for_selector("body", state="attached", timeout=30000)
                    await page.wait_for_timeout(3500)

                    html = await page.content()
                    full_text = clean(await page.locator("body").inner_text(timeout=30000))

                    if len(full_text) < 200 or "رقم الحكم" not in full_text:
                        raise ValueError(f"Details text incomplete. Length={len(full_text)}")

                    detail_meta = extract_metadata(full_text)
                    case.update(detail_meta)
                    case["full_text"] = full_text
                    case["scraped_at"] = datetime.now().isoformat(timespec="seconds")

                    case["court_type_code"] = detect_court_type(full_text)
                    case["court_type_ar"] = court_type_ar(case["court_type_code"])

                    is_appeal = "نص الاستئناف" in full_text
                    if is_appeal:
                        case["court_level"] = "appeal"
                        case["source_collection"] = "المحكمة العامة / أحكام محكمة الاستئناف"
                    else:
                        case["court_level"] = "أحكام محاكم الدرجة الأولى النهائية"
                        case["source_collection"] = "المحكمة العامة / أحكام محاكم الدرجة الأولى النهائية"

                    case_dir = get_case_folder(case)
                    case_dir.mkdir(parents=True, exist_ok=True)

                    metadata = dict(case)
                    metadata["local_folder"] = str(case_dir)

                    meta_filename = "00_metadata.json" if is_appeal else "metadata.json"
                    text_filename = "07_full_text.txt" if is_appeal else "full_text.txt"
                    html_filename = "08_details.html" if is_appeal else "details.html"

                    (case_dir / meta_filename).write_text(
                        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
                    )
                    (case_dir / text_filename).write_text(full_text, encoding="utf-8")
                    (case_dir / html_filename).write_text(html, encoding="utf-8")

                    sections = extract_sections(full_text)
                    for filename, section_text in sections.items():
                        (case_dir / filename).write_text(section_text, encoding="utf-8")

                    case["local_folder"] = str(case_dir)
                    saved.append(case)
                    log(f"  Saved: {case_dir}")

                except Exception as e:
                    log(f"  FAILED [{index}/{total}]: {type(e).__name__}: {e}")
                    failed.append({"url": url, "error": str(e)})
                finally:
                    try:
                        await page.close()
                    except Exception:
                        pass

        tasks = [
            scrape_one(case, i, len(new_cases))
            for i, case in enumerate(new_cases, start=1)
        ]
        await asyncio.gather(*tasks)

        await browser.close()

    log(f"Details: saved={len(saved)}, failed={len(failed)}")

    if failed:
        fail_file = SCRAPER_DIR / "data" / "weekly_failed.json"
        fail_file.write_text(json.dumps(failed, ensure_ascii=False, indent=2), encoding="utf-8")

    return saved


# ─── DB import ───────────────────────────────────────────────────

def first_nonempty(*values):
    for v in values:
        if v is not None and str(v).strip():
            return str(v).strip()
    return None


def detect_court_level_code(meta, full_text):
    combined = json.dumps(meta, ensure_ascii=False) + " " + (full_text or "")
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
        cur.execute(f"INSERT INTO {table} ({unique_col}) VALUES (%s) RETURNING id", (value,))

    return cur.fetchone()[0]


def import_to_db(saved_cases: list[dict]) -> int:
    if not saved_cases:
        return 0

    conn = get_db_conn()
    cur = conn.cursor()
    count = 0

    for case in saved_cases:
        try:
            full_text = ""
            case_dir = Path(case.get("local_folder", ""))
            text_file = case_dir / "07_full_text.txt"
            if not text_file.exists():
                text_file = case_dir / "full_text.txt"
            if text_file.exists():
                full_text = text_file.read_text(encoding="utf-8")

            case_number = first_nonempty(
                case.get("case_number"),
                case.get("case_number_from_details"),
            )
            case_year = first_nonempty(
                case.get("case_year"),
                case.get("case_year_from_details"),
                case.get("judgment_year"),
            )
            judgment_number = first_nonempty(
                case.get("judgment_number_from_details"),
                case.get("judgment_number"),
                case_number,
            )
            judgment_year = first_nonempty(case.get("judgment_year"), case_year)
            judgment_date = first_nonempty(
                case.get("judgment_date_hijri_from_details"),
                case.get("judgment_date_hijri"),
            )

            court_level_code, court_level_name = detect_court_level_code(case, full_text)

            court_type_code = case.get("court_type_code") or detect_court_type(full_text)
            court_type_name = court_type_ar(court_type_code)

            city = first_nonempty(case.get("city_from_details"), case.get("city")) or "unknown"

            judgment_type = first_nonempty(case.get("judgment_type"))
            details_url = case.get("details_url")

            court_level_id = get_or_create(cur, "court_levels", "code", court_level_code, {"name_ar": court_level_name})
            court_type_id = get_or_create(cur, "court_types", "code", court_type_code, {"name_ar": court_type_name})
            location_id = get_or_create(cur, "locations", "city_ar", city)

            cur.execute(
                """
                INSERT INTO cases (case_number, case_year, court_type_id, location_id)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (case_number, case_year)
                DO UPDATE SET court_type_id = EXCLUDED.court_type_id, location_id = EXCLUDED.location_id
                RETURNING id;
                """,
                (case_number, case_year, court_type_id, location_id),
            )
            case_id = cur.fetchone()[0]

            cur.execute(
                """
                INSERT INTO judgments (
                    case_id, court_level_id, judgment_number, judgment_year,
                    judgment_date_hijri, judgment_type, source_collection,
                    details_url, local_folder, full_text, scraped_at
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
                (case_id, court_level_id, judgment_number, judgment_year, judgment_date,
                 judgment_type, case.get("source_collection"), details_url,
                 str(case_dir), full_text,
                 case.get("scraped_at")),
            )
            judgment_id = cur.fetchone()[0]

            cur.execute("DELETE FROM judgment_sections WHERE judgment_id = %s", (judgment_id,))

            sections = [
                (1, "metadata", "البيانات الأساسية", json.dumps(case, ensure_ascii=False, indent=2)),
                (2, "facts", "الوقائع", read_text(case_dir / "02_facts.txt") or read_text(case_dir / "facts.txt")),
                (5, "reasoning", "الأسباب", read_text(case_dir / "05_reasoning.txt") or read_text(case_dir / "reasoning.txt")),
                (6, "ruling", "الحكم", read_text(case_dir / "06_ruling.txt") or read_text(case_dir / "ruling.txt")),
                (7, "full_text", "النص الكامل", full_text),
            ]

            for order, code, name_ar, text in sections:
                if not text:
                    continue
                cur.execute(
                    """
                    INSERT INTO judgment_sections (judgment_id, section_order, section_code, section_name_ar, section_text)
                    VALUES (%s, %s, %s, %s, %s);
                    """,
                    (judgment_id, order, code, name_ar, text),
                )

            count += 1
            if count % 50 == 0:
                conn.commit()
                log(f"  Imported {count} judgments")

        except Exception as e:
            conn.rollback()
            log(f"  Import failed: {type(e).__name__}: {e}")

    conn.commit()
    cur.close()
    conn.close()
    log(f"Imported {count} new judgments to DB")
    return count


def read_text(path: Path) -> str | None:
    if path.exists():
        return path.read_text(encoding="utf-8")
    return None


# ─── Chunking + Embedding ────────────────────────────────────────

MAX_CHARS = 2500
OVERLAP_CHARS = 300


def chunk_text(text: str, max_chars=MAX_CHARS, overlap=OVERLAP_CHARS):
    text = clean(text)
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + max_chars
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap
        if start < 0:
            start = 0
        if start >= len(text):
            break
    return chunks


def chunk_and_embed_new(conn) -> int:
    from openai import OpenAI
    client = OpenAI()

    cur = conn.cursor()

    # Reset the sequence to avoid duplicate key violations
    cur.execute("SELECT setval('judgment_chunks_id_seq', COALESCE((SELECT MAX(id) FROM judgment_chunks), 0));")
    conn.commit()

    cur.execute("""
        SELECT j.id, js.id AS section_id, js.section_code, js.section_text
        FROM judgment_sections js
        JOIN judgments j ON js.judgment_id = j.id
        WHERE js.section_text IS NOT NULL
          AND length(js.section_text) > 0
          AND NOT EXISTS (
              SELECT 1 FROM judgment_chunks jc WHERE jc.section_id = js.id
          )
        ORDER BY j.id, js.section_order;
    """)

    sections = cur.fetchall()
    if not sections:
        log("No new sections to chunk")
        cur.close()
        return 0

    total_chunks = 0
    batch_texts = []
    batch_meta = []

    for judgment_id, section_id, section_code, section_text in sections:
        chunks = chunk_text(section_text)
        for i, chunk in enumerate(chunks, start=1):
            batch_texts.append(chunk)
            batch_meta.append((judgment_id, section_id, i, chunk))
            total_chunks += 1

            if len(batch_texts) >= 100:
                _embed_and_insert(cur, client, batch_texts, batch_meta)
                conn.commit()
                log(f"  Embedded {total_chunks} chunks so far")
                batch_texts = []
                batch_meta = []

    if batch_texts:
        _embed_and_insert(cur, client, batch_texts, batch_meta)
        conn.commit()

    cur.close()
    log(f"Chunked and embedded {total_chunks} new chunks")
    return total_chunks


def _embed_and_insert(cur, client, texts, meta):
    response = client.embeddings.create(model="text-embedding-3-small", input=texts)
    vectors = [item.embedding for item in response.data]

    for (judgment_id, section_id, chunk_order, chunk_text), vector in zip(meta, vectors):
        vec_str = "[" + ",".join(str(x) for x in vector) + "]"
        cur.execute(
            """
            INSERT INTO judgment_chunks (judgment_id, section_id, chunk_order, chunk_text)
            VALUES (%s, %s, %s, %s);
            """,
            (judgment_id, section_id, chunk_order, chunk_text),
        )
        cur.execute(
            "UPDATE judgment_chunks SET embedding = %s::vector WHERE id = currval('judgment_chunks_id_seq');",
            (vec_str,),
        )


# ─── Main pipeline ───────────────────────────────────────────────

async def run_pipeline(skip_embed: bool, max_pages: int | None, resume: bool):
    start_time = datetime.now()
    log("=" * 60)
    log("Starting automated scrape pipeline")
    log("=" * 60)

    conn = get_db_conn()
    existing_urls = get_existing_urls(conn)
    log(f"Existing URLs in DB: {len(existing_urls)}")

    # Step 1: Scrape all index pages (2486 pages)
    log("\n--- Index Scraping ---")
    all_cases = await scrape_all_index_pages(max_pages=max_pages, resume=resume)
    log(f"Total indexed cases: {len(all_cases)}")

    # Step 2: Filter to new cases only
    new_cases = [c for c in all_cases if c.get("details_url") and c["details_url"] not in existing_urls]
    log(f"New cases not in DB: {len(new_cases)}")

    # Step 3: Scrape details for new cases
    total_imported = 0
    if new_cases:
        log("\n--- Detail Scraping ---")
        saved = await scrape_details(new_cases)

        # Step 4: Import to DB
        log("\n--- DB Import ---")
        total_imported = import_to_db(saved)

    # Step 5: Chunk + embed
    total_chunks = 0
    if not skip_embed and total_imported > 0:
        log("\n--- Chunking & Embedding ---")
        total_chunks = chunk_and_embed_new(conn)

    conn.close()

    elapsed = (datetime.now() - start_time).total_seconds()
    log(f"\n{'=' * 60}")
    log(f"Pipeline complete in {elapsed:.0f}s")
    log(f"  Total indexed:       {len(all_cases)}")
    log(f"  New cases found:     {len(new_cases)}")
    log(f"  Imported to DB:      {total_imported}")
    log(f"  New chunks embedded: {total_chunks}")
    log(f"{'=' * 60}")

    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    log_entry = {
        "run_at": start_time.isoformat(),
        "elapsed_seconds": elapsed,
        "total_indexed": len(all_cases),
        "new_cases_found": len(new_cases),
        "imported_to_db": total_imported,
        "new_chunks_embedded": total_chunks,
    }
    existing_log = []
    if LOG_FILE.exists():
        try:
            existing_log = json.loads(LOG_FILE.read_text(encoding="utf-8"))
        except Exception:
            existing_log = []
    existing_log.append(log_entry)
    LOG_FILE.write_text(json.dumps(existing_log, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automated Saudi legal judgment scraper")
    parser.add_argument("--skip-embed", action="store_true", help="Skip chunking and embedding")
    parser.add_argument("--resume", action="store_true", help="Resume index scraping from last saved page")
    parser.add_argument("--max-pages", type=int, default=None, help="Limit number of index pages (for testing)")
    args = parser.parse_args()

    asyncio.run(run_pipeline(args.skip_embed, args.max_pages, args.resume))
