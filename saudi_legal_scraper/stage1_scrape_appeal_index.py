import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

BASE_URL = "https://laws.moj.gov.sa"

COURT_LEVEL = "أحكام محكمة الاستئناف"
SOURCE_COLLECTION = "المحكمة العامة / أحكام محكمة الاستئناف"

START_PAGE = 1
END_PAGE = 768
PAGE_SIZE = 12

OUT = Path("data/index_appeal")
RAW = Path("data/raw_appeal_list_pages")

OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def page_url(page_number: int) -> str:
    return (
        "https://laws.moj.gov.sa/ar/JudicialDecisionsList/2"
        f"?pageNumber={page_number}"
        f"&pageSize={PAGE_SIZE}"
        "&viewType=grid"
        "&courtTypes=2"
        "&sortingBy=2"
    )


def parse_case_from_card_text(card_text: str, details_url: str, page_number: int) -> dict:
    judgment_number = None
    case_type = None
    judgment_year = None
    date = None
    court = None
    city = None

    m = re.search(r"رقم الحكم\s*/\s*([0-9٠-٩]+)", card_text)
    if m:
        judgment_number = m.group(1)

    m = re.search(r"(.+?)\s*/\s*([0-9٠-٩]{4})", card_text)
    if m:
        possible_type = clean(m.group(1))
        if "رقم الحكم" not in possible_type and len(possible_type) < 40:
            case_type = possible_type
            judgment_year = m.group(2)

    m = re.search(r"التاريخ\s+(.+?)(?:المحكمة|$)", card_text)
    if m:
        date = clean(m.group(1))

    m = re.search(r"المحكمة\s+(.+?)(?:المدينة|$)", card_text)
    if m:
        court = clean(m.group(1))

    m = re.search(r"المدينة\s+(.+)$", card_text)
    if m:
        city = clean(m.group(1))

    return {
        "source_collection": SOURCE_COLLECTION,
        "court_level": COURT_LEVEL,
        "court_type_code": 2,
        "list_type_code": 2,
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


def scrape_page(browser, page_number: int) -> list[dict]:
    url = page_url(page_number)
    page = browser.new_page(locale="ar-SA")

    try:
        print(f"\nOpening appeal index page {page_number}: {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=60000)

        try:
            page.wait_for_selector("a.details-link", timeout=30000)
        except PlaywrightTimeoutError:
            print(f"No details links found on page {page_number}")
            return []

        time.sleep(1.5)

        html = page.content()
        (RAW / f"appeal_page_{page_number}.html").write_text(html, encoding="utf-8")

        links = page.locator("a.details-link")
        count = links.count()

        print(f"Found details links: {count}")

        page_cases = []
        seen_urls = set()

        for i in range(count):
            link = links.nth(i)
            href = link.get_attribute("href")

            if not href:
                continue

            details_url = urljoin(BASE_URL, href)

            if details_url in seen_urls:
                continue

            seen_urls.add(details_url)

            # Find surrounding visible text for this case card
            try:
                card = link.locator("xpath=ancestor::div[contains(@class, 'row')][1]")
                card_text = clean(card.inner_text())
            except Exception:
                card_text = ""

            item = parse_case_from_card_text(
                card_text=card_text,
                details_url=details_url,
                page_number=page_number,
            )

            print(" ", item.get("judgment_number"), item["details_url"])
            page_cases.append(item)

        return page_cases

    finally:
        page.close()


def scrape_appeal_index():
    failed_pages = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=100)

        for page_number in range(START_PAGE, END_PAGE + 1):
            page_file = OUT / f"appeal_page_{page_number}_index.json"

            # Resume support
            if page_file.exists():
                print(f"Skipping page {page_number}, already exists.")
                continue

            success = False

            for attempt in range(1, 4):
                try:
                    page_cases = scrape_page(browser, page_number)

                    page_file.write_text(
                        json.dumps(page_cases, ensure_ascii=False, indent=2),
                        encoding="utf-8",
                    )

                    print(f"Saved page {page_number}: {len(page_cases)} cases")
                    success = True
                    break

                except Exception as e:
                    print(f"Page {page_number} attempt {attempt} failed: {type(e).__name__}: {e}")
                    time.sleep(5)

                    try:
                        browser.close()
                    except Exception:
                        pass

                    browser = p.chromium.launch(headless=False, slow_mo=100)

            if not success:
                failed_pages.append(page_number)

            # Be polite to the server
            time.sleep(1)

        browser.close()

    # Combine all page JSON files into one index
    all_cases = []
    seen_urls = set()

    for page_number in range(START_PAGE, END_PAGE + 1):
        page_file = OUT / f"appeal_page_{page_number}_index.json"
        if not page_file.exists():
            continue

        page_cases = json.loads(page_file.read_text(encoding="utf-8"))

        for case in page_cases:
            url = case.get("details_url")
            if not url or url in seen_urls:
                continue

            seen_urls.add(url)
            all_cases.append(case)

    (OUT / "all_appeal_cases_index.json").write_text(
        json.dumps(all_cases, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    (OUT / "failed_appeal_pages.json").write_text(
        json.dumps(failed_pages, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("\nDone.")
    print(f"Total appeal cases indexed: {len(all_cases)}")
    print(f"Failed pages: {len(failed_pages)}")
    print(f"Main index: {OUT / 'all_appeal_cases_index.json'}")


if __name__ == "__main__":
    scrape_appeal_index()