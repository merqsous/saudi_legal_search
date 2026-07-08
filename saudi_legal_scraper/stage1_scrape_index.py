import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright

BASE_URL = "https://laws.moj.gov.sa"
OUT = Path("data/index")
OUT.mkdir(parents=True, exist_ok=True)

def clean(x):
    return re.sub(r"\s+", " ", x or "").strip()

def scrape_index():
    all_cases = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        page = browser.new_page(locale="ar-SA")

        for page_number in range(1, 9):
            url = (
                "https://laws.moj.gov.sa/ar/JudicialDecisionsList/1"
                f"?pageNumber={page_number}"
                "&pageSize=12"
                "&viewType=grid"
                "&courtTypes=1"
                "&courtId=1"
                "&sortingBy=2"
            )

            print(f"\nOpening page {page_number}")
            page.goto(url, wait_until="domcontentloaded", timeout=60000)

            page.wait_for_selector("a.details-link", timeout=60000)
            time.sleep(3)

            links = page.locator("a.details-link")
            count = links.count()
            print(f"Found details links: {count}")

            page_cases = []

            for i in range(count):
                link = links.nth(i)
                href = link.get_attribute("href")

                if not href:
                    continue

                details_url = urljoin(BASE_URL, href)

                card = link.locator("xpath=ancestor::div[contains(@class, 'row')][1]")
                card_text = clean(card.inner_text())

                judgment_number = None
                m = re.search(r"رقم الحكم\s*/\s*([0-9٠-٩]+)", card_text)
                if m:
                    judgment_number = m.group(1)

                case_type = None
                judgment_year = None
                m = re.search(r"(عام|تجاري|جزائي|أحوال شخصية|عمالي)\s*/\s*([0-9٠-٩]{4})", card_text)
                if m:
                    case_type = m.group(1)
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

                item = {
                    "source_collection": "المحكمة العامة / أحكام محاكم الدرجة الأولى النهائية",
                    "court_level": "أحكام محاكم الدرجة الأولى النهائية",
                    "page_number": page_number,
                    "judgment_number": judgment_number,
                    "case_type": case_type,
                    "judgment_year": judgment_year,
                    "judgment_date_hijri": date,
                    "court": court,
                    "city": city,
                    "details_url": details_url,
                    "card_text": card_text
                }

                print(item["judgment_number"], item["details_url"])
                page_cases.append(item)
                all_cases.append(item)

            (OUT / f"page_{page_number}_index.json").write_text(
                json.dumps(page_cases, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )

        browser.close()

    (OUT / "all_cases_index.json").write_text(
        json.dumps(all_cases, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"\nDone. Total scraped links: {len(all_cases)}")

if __name__ == "__main__":
    scrape_index()