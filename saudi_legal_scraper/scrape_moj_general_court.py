import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

BASE_URL = "https://laws.moj.gov.sa"

OUTPUT_DIR = Path("data/cases")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def safe_name(text: str) -> str:
    text = clean(text)
    text = text.replace("/", "_").replace("\\", "_").replace(":", "_")
    return text[:120] if text else "unknown"


def parse_case_card(card, page_number: int) -> dict:
    data = {
        "source_collection": "المحكمة العامة / أحكام محاكم الدرجة الأولى النهائية",
        "court_level": "أحكام محاكم الدرجة الأولى النهائية",
        "page_number": page_number,
    }

    link = card.select_one("a.details-link")
    if link and link.get("href"):
        data["details_url"] = urljoin(BASE_URL, link["href"])

    judgment_el = card.select_one(".h4.pointer.ellipsis")
    if judgment_el:
        text = clean(judgment_el.get_text(" "))
        match = re.search(r"رقم الحكم\s*/\s*([0-9٠-٩]+)", text)
        if match:
            data["judgment_number"] = match.group(1)

    for block in card.select(".legislation-content > .deatils"):
        text = clean(block.get_text(" "))
        match = re.search(r"(.+?)\s*/\s*([0-9٠-٩]{4})", text)
        if match:
            data["case_type"] = clean(match.group(1))
            data["judgment_year"] = match.group(2)

    for col in card.select(".col-md-6.col-sm-12"):
        label = col.select_one(".label")
        value = col.select_one(".deatils")
        if not label or not value:
            continue

        label_text = clean(label.get_text())
        value_text = clean(value.get_text())

        if label_text == "التاريخ":
            data["judgment_date_hijri"] = value_text
        elif label_text == "المحكمة":
            data["court"] = value_text
        elif label_text == "المدينة":
            data["city"] = value_text

    return data


def extract_detail_data(detail_html: str) -> dict:
    soup = BeautifulSoup(detail_html, "lxml")
    full_text = clean(soup.get_text(" "))

    data = {
        "full_text": full_text
    }

    case_match = re.search(
        r"القضية رقم\s+([0-9٠-٩]+)\s+لعام\s+([0-9٠-٩]+)",
        full_text
    )
    if case_match:
        data["case_number"] = case_match.group(1)
        data["case_year"] = case_match.group(2)

    judgment_match = re.search(r"رقم الحكم:\s*([0-9٠-٩]+)", full_text)
    if judgment_match:
        data["judgment_number_from_details"] = judgment_match.group(1)

    date_match = re.search(r"التاريخ:\s*([^ن]+?)\s+نص الحكم", full_text)
    if date_match:
        data["judgment_date_hijri_from_details"] = clean(date_match.group(1))

    if "الوقائع:" in full_text:
        data["facts"] = full_text.split("الوقائع:", 1)[1].split("الأسباب:", 1)[0].strip()

    if "الأسباب:" in full_text:
        data["reasoning"] = full_text.split("الأسباب:", 1)[1].split("نص الحكم:", 1)[0].strip()

    if "نص الحكم:" in full_text:
        data["ruling"] = full_text.split("نص الحكم:", 1)[1].strip()

    return data


def save_case(case_data: dict, detail_html: str):
    court = safe_name(case_data.get("court", "unknown_court"))
    city = safe_name(case_data.get("city", "unknown_city"))
    year = safe_name(case_data.get("judgment_year", case_data.get("case_year", "unknown_year")))
    judgment_number = safe_name(case_data.get("judgment_number", case_data.get("case_number", "unknown_case")))

    case_dir = OUTPUT_DIR / court / city / year / judgment_number
    case_dir.mkdir(parents=True, exist_ok=True)

    metadata = dict(case_data)
    full_text = metadata.pop("full_text", "")

    (case_dir / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    (case_dir / "full_text.txt").write_text(
        full_text,
        encoding="utf-8"
    )

    (case_dir / "raw_detail.html").write_text(
        detail_html,
        encoding="utf-8"
    )

    return case_dir


def scrape():
    all_metadata = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        list_page = browser.new_page(locale="ar-SA")

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

            print(f"\nScraping page {page_number}")
            list_page.goto(url, wait_until="networkidle", timeout=60000)
            time.sleep(2)

            soup = BeautifulSoup(list_page.content(), "lxml")

            cards = soup.select(".row .col-11")
            if not cards:
                cards = soup.select(".legislation-content")

            seen_urls = set()

            for card in cards:
                case_data = parse_case_card(card, page_number)

                details_url = case_data.get("details_url")
                judgment_number = case_data.get("judgment_number")

                if not details_url or not judgment_number:
                    continue

                if details_url in seen_urls:
                    continue
                seen_urls.add(details_url)

                print(f"  Opening details for الحكم {judgment_number}")

                detail_page = browser.new_page(locale="ar-SA")
                detail_page.goto(details_url, wait_until="networkidle", timeout=60000)
                time.sleep(2)

                detail_html = detail_page.content()
                detail_page.close()

                detail_data = extract_detail_data(detail_html)
                case_data.update(detail_data)

                case_dir = save_case(case_data, detail_html)

                metadata_for_index = dict(case_data)
                metadata_for_index.pop("full_text", None)
                metadata_for_index["local_folder"] = str(case_dir)

                all_metadata.append(metadata_for_index)

                print(f"    Saved: {case_dir}")

        browser.close()

    index_file = OUTPUT_DIR / "all_cases_index.json"
    index_file.write_text(
        json.dumps(all_metadata, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"\nDone. Saved {len(all_metadata)} cases.")
    print(f"Index file: {index_file}")


if __name__ == "__main__":
    scrape()