import json
import re
import time
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

INDEX_FILE = Path("data/index/all_cases_index.json")
CASES_DIR = Path("data/cases")
FAILED_FILE = Path("data/cases/failed_cases.json")

CASES_DIR.mkdir(parents=True, exist_ok=True)


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def safe_name(text: str) -> str:
    text = clean(text)
    for ch in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']:
        text = text.replace(ch, "_")
    return text[:80] if text else "unknown"


def extract_value(full_text: str, label: str, next_labels: list[str]) -> str | None:
    pattern = rf"{label}\s*[:：]?\s*(.*?)\s*(?=" + "|".join(map(re.escape, next_labels)) + r"|$)"
    m = re.search(pattern, full_text, re.S)
    if m:
        return clean(m.group(1))
    return None


def extract_detail_metadata(full_text: str) -> dict:
    data = {}

    m = re.search(r"القضية رقم\s+([0-9٠-٩]+)\s+لعام\s+([0-9٠-٩]+)", full_text)
    if m:
        data["case_number"] = m.group(1)
        data["case_year"] = m.group(2)

    court = extract_value(
        full_text,
        "المحكمة",
        ["المدينة:", "رقم الحكم:", "التاريخ:", "نص الحكم"]
    )
    if court:
        data["court_from_details"] = court

    city = extract_value(
        full_text,
        "المدينة:",
        ["رقم الحكم:", "التاريخ:", "نص الحكم"]
    )
    if city:
        data["city_from_details"] = city

    judgment = extract_value(
        full_text,
        "رقم الحكم:",
        ["التاريخ:", "نص الحكم"]
    )
    if judgment:
        data["judgment_number_from_details"] = judgment

    date = extract_value(
        full_text,
        "التاريخ:",
        ["نص الحكم"]
    )
    if date:
        data["judgment_date_hijri_from_details"] = date

    m = re.search(r"(نص الحكم[^\n\r]*)", full_text)
    if m:
        data["judgment_type"] = clean(m.group(1))

    return data


def extract_sections(full_text: str) -> dict:
    sections = {}

    if "الوقائع:" in full_text:
        after = full_text.split("الوقائع:", 1)[1]
        sections["facts"] = clean(after.split("الأسباب:", 1)[0]) if "الأسباب:" in after else clean(after)

    if "الأسباب:" in full_text:
        after = full_text.split("الأسباب:", 1)[1]
        sections["reasoning"] = clean(after.split("نص الحكم:", 1)[0]) if "نص الحكم:" in after else clean(after)

    if "نص الحكم:" in full_text:
        sections["ruling"] = clean(full_text.split("نص الحكم:", 1)[1])

    return sections


def get_case_folder(case: dict) -> Path:
    court = (
        case.get("court_from_details")
        or case.get("court")
        or "المحكمة العامة"
    )

    city = (
        case.get("city_from_details")
        or case.get("city")
        or "unknown_city"
    )

    year = (
        case.get("case_year")
        or case.get("judgment_year")
        or "unknown_year"
    )

    judgment_number = (
        case.get("judgment_number_from_details")
        or case.get("judgment_number")
        or case.get("case_number")
        or "unknown_case"
    )

    return (
        CASES_DIR
        / safe_name(court)
        / safe_name(city)
        / safe_name(year)
        / safe_name(judgment_number)
    )


def save_case(case: dict, html: str, full_text: str) -> Path:
    case_dir = get_case_folder(case)
    case_dir.mkdir(parents=True, exist_ok=True)

    metadata = dict(case)
    metadata["scraped_at"] = datetime.now().isoformat(timespec="seconds")

    sections = extract_sections(full_text)

    (case_dir / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    (case_dir / "full_text.txt").write_text(full_text, encoding="utf-8")
    (case_dir / "details.html").write_text(html, encoding="utf-8")

    if sections.get("facts"):
        (case_dir / "facts.txt").write_text(sections["facts"], encoding="utf-8")

    if sections.get("reasoning"):
        (case_dir / "reasoning.txt").write_text(sections["reasoning"], encoding="utf-8")

    if sections.get("ruling"):
        (case_dir / "ruling.txt").write_text(sections["ruling"], encoding="utf-8")

    return case_dir


def already_scraped(case: dict) -> bool:
    judgment_number = case.get("judgment_number")
    if not judgment_number:
        return False

    matches = list(CASES_DIR.glob(f"**/{safe_name(judgment_number)}/full_text.txt"))
    return len(matches) > 0


def scrape_one_case(browser, case: dict, index: int, total: int):
    details_url = case.get("details_url")
    if not details_url:
        return None

    print(f"\n[{index}/{total}] Opening details:")
    print(details_url)

    page = browser.new_page(locale="ar-SA")

    try:
        page.goto(details_url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector("body", timeout=30000)
        time.sleep(2)

        html = page.content()
        full_text = clean(page.locator("body").inner_text())

        detail_metadata = extract_detail_metadata(full_text)
        case.update(detail_metadata)

        case_dir = save_case(case, html, full_text)
        print(f"Saved: {case_dir}")

        page.close()
        return str(case_dir)

    finally:
        try:
            page.close()
        except Exception:
            pass


def scrape_details():
    cases = json.loads(INDEX_FILE.read_text(encoding="utf-8"))

    saved_index = []
    failed = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=150)

        for i, case in enumerate(cases, start=1):
            if already_scraped(case):
                print(f"\n[{i}/{len(cases)}] Skipping already scraped: {case.get('judgment_number')}")
                continue

            success = False

            for attempt in range(1, 4):
                try:
                    case_dir = scrape_one_case(browser, case, i, len(cases))
                    if case_dir:
                        item = dict(case)
                        item["local_folder"] = case_dir
                        saved_index.append(item)
                        success = True
                        break

                except Exception as e:
                    print(f"Attempt {attempt} failed: {type(e).__name__}: {e}")
                    time.sleep(5)

                    # Reopen browser if Playwright closed it
                    try:
                        browser.close()
                    except Exception:
                        pass

                    browser = p.chromium.launch(headless=False, slow_mo=150)

            if not success:
                failed.append({
                    "case": case,
                    "error": "Failed after 3 attempts"
                })

        browser.close()

    (CASES_DIR / "scraped_cases_index.json").write_text(
        json.dumps(saved_index, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    FAILED_FILE.write_text(
        json.dumps(failed, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"\nDone.")
    print(f"Newly saved cases: {len(saved_index)}")
    print(f"Failed cases: {len(failed)}")


if __name__ == "__main__":
    scrape_details()

    