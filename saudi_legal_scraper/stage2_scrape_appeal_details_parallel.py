import asyncio
import json
import re
from datetime import datetime
from pathlib import Path

from playwright.async_api import async_playwright

INDEX_FILE = Path("data/index_appeal/all_appeal_cases_index.json")
CASES_DIR = Path("data/cases_appeal")
FAILED_FILE = CASES_DIR / "failed_appeal_details.json"

MAX_CONCURRENT = 2

CASES_DIR.mkdir(parents=True, exist_ok=True)


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def safe_name(text: str) -> str:
    text = clean(text)
    for ch in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']:
        text = text.replace(ch, "_")
    return text[:80] if text else "unknown"


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

    data["court_type_code"] = detect_court_type(full_text)
    data["court_type_ar"] = court_type_ar(data["court_type_code"])

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
        "labor": "عمالي",
        "commercial": "تجاري",
        "criminal": "جزائي",
        "personal_status": "أحوال شخصية",
        "general": "عام",
        "unknown": "غير معروف",
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
    court_level = "appeal"

    court_type = case.get("court_type_code") or "unknown"
    court = case.get("court_from_details") or case.get("court") or "محكمة الاستئناف"
    city = case.get("city_from_details") or case.get("city") or "unknown_city"
    year = case.get("case_year") or case.get("judgment_year") or "unknown_year"

    judgment_number = (
        case.get("judgment_number_from_details")
        or case.get("judgment_number")
        or case.get("case_number")
        or "unknown_case"
    )

    return (
        CASES_DIR
        / court_level
        / safe_name(court_type)
        / safe_name(court)
        / safe_name(city)
        / safe_name(year)
        / safe_name(judgment_number)
    )


def already_scraped(case: dict) -> bool:
    judgment_number = case.get("judgment_number")
    if not judgment_number:
        return False

    return len(list(CASES_DIR.glob(f"**/{safe_name(judgment_number)}/07_full_text.txt"))) > 0


async def block_resources(route):
    resource_type = route.request.resource_type

    # Do NOT block stylesheet on MOJ because it can keep body hidden.
    if resource_type in ["image", "font", "media"]:
        await route.abort()
    else:
        await route.continue_()


async def scrape_one(context, case: dict, semaphore: asyncio.Semaphore, index: int, total: int):
    async with semaphore:
        if already_scraped(case):
            print(f"[{index}/{total}] Skip existing: {case.get('judgment_number')}")
            return {"status": "skipped", "case": case}

        url = case.get("details_url")
        if not url:
            return {"status": "failed", "case": case, "error": "missing details_url"}

        page = await context.new_page()

        try:
            print(f"[{index}/{total}] Scraping: {url}")

            await page.goto(url, wait_until="domcontentloaded", timeout=60000)

            # body may be hidden, so use attached not visible
            await page.wait_for_selector("body", state="attached", timeout=30000)

            # Allow the Vue/JS page to render content
            await page.wait_for_timeout(3500)

            html = await page.content()
            full_text = clean(await page.locator("body").inner_text(timeout=30000))

            if len(full_text) < 200 or "رقم الحكم" not in full_text:
                raise ValueError(f"Details text looks incomplete. Length={len(full_text)}")

            detail_metadata = extract_metadata(full_text)
            case.update(detail_metadata)

            case["source_collection"] = "المحكمة العامة / أحكام محكمة الاستئناف"
            case["court_level"] = "appeal"
            case["scraped_at"] = datetime.now().isoformat(timespec="seconds")

            case_dir = get_case_folder(case)
            case_dir.mkdir(parents=True, exist_ok=True)

            metadata = dict(case)
            metadata["local_folder"] = str(case_dir)

            (case_dir / "00_metadata.json").write_text(
                json.dumps(metadata, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            (case_dir / "07_full_text.txt").write_text(full_text, encoding="utf-8")
            (case_dir / "08_details.html").write_text(html, encoding="utf-8")

            sections = extract_sections(full_text)
            for filename, section_text in sections.items():
                (case_dir / filename).write_text(section_text, encoding="utf-8")

            print(f"Saved: {case_dir}")

            return {"status": "saved", "case": metadata}

        except Exception as e:
            print(f"FAILED [{index}/{total}]: {type(e).__name__}: {e}")
            return {
                "status": "failed",
                "case": case,
                "error": f"{type(e).__name__}: {e}",
            }

        finally:
            try:
                await page.close()
            except Exception:
                pass


async def main():
    if not INDEX_FILE.exists():
        raise FileNotFoundError(f"Missing index file: {INDEX_FILE}")

    cases = json.loads(INDEX_FILE.read_text(encoding="utf-8"))

    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    saved = []
    failed = []
    skipped = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
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

        tasks = [
            scrape_one(context, case, semaphore, i, len(cases))
            for i, case in enumerate(cases, start=1)
        ]

        results = await asyncio.gather(*tasks)

        await browser.close()

    for r in results:
        if r["status"] == "saved":
            saved.append(r["case"])
        elif r["status"] == "failed":
            failed.append(r)
        elif r["status"] == "skipped":
            skipped += 1

    (CASES_DIR / "scraped_appeal_cases_index.json").write_text(
        json.dumps(saved, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    FAILED_FILE.write_text(
        json.dumps(failed, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("\nDone.")
    print(f"Saved new: {len(saved)}")
    print(f"Skipped existing: {skipped}")
    print(f"Failed: {len(failed)}")
    print(f"Failed file: {FAILED_FILE}")


if __name__ == "__main__":
    asyncio.run(main())