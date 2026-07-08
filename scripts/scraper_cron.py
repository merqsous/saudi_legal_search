"""
Cron-like scheduler for running the weekly scraper on Railway.
Runs the scraper on a schedule and keeps the container alive.
"""
import os
import time
import subprocess
import threading
from datetime import datetime, timedelta

# Run every N hours (set via env, default 168 = weekly)
SCRAPE_INTERVAL_HOURS = int(os.getenv("SCRAPE_INTERVAL_HOURS", "168"))

# Run on startup? Set SCRAPE_ON_START=true
SCRAPE_ON_START = os.getenv("SCRAPE_ON_START", "false").lower() == "true"

# Max pages per run (0 = all pages)
MAX_PAGES = os.getenv("SCRAPE_MAX_PAGES", "0")

VENV_PYTHON = "/app/venv/bin/python"


def run_scraper(max_pages=0):
    """Run the weekly scraper."""
    cmd = [VENV_PYTHON, "scripts/weekly_scrape.py"]
    if max_pages and max_pages > 0:
        cmd.extend(["--max-pages", str(max_pages)])

    print(f"[CRON] Starting scraper at {datetime.now()}")
    print(f"[CRON] Command: {' '.join(cmd)}")

    result = subprocess.run(cmd, capture_output=False)
    print(f"[CRON] Scraper finished with exit code {result.returncode} at {datetime.now()}")


def schedule_next_run():
    """Calculate next run time."""
    now = datetime.now()
    # Find next Sunday 2:00 AM
    days_ahead = (6 - now.weekday()) % 7
    if days_ahead == 0 and now.hour >= 2:
        days_ahead = 7
    next_run = now + timedelta(days=days_ahead)
    next_run = next_run.replace(hour=2, minute=0, second=0, microsecond=0)
    return next_run


def main():
    print(f"[CRON] Scraper scheduler started")
    print(f"[CRON] Interval: every {SCRAPE_INTERVAL_HOURS} hours")
    print(f"[CRON] Run on start: {SCRAPE_ON_START}")

    # Optional: run once on startup
    if SCRAPE_ON_START:
        threading.Thread(target=run_scraper, args=(int(MAX_PAGES) if MAX_PAGES else 0,), daemon=True).start()

    # Keep container alive and run on schedule
    while True:
        next_run = schedule_next_run()
        wait_seconds = (next_run - datetime.now()).total_seconds()
        print(f"[CRON] Next scheduled run: {next_run} (in {wait_seconds/3600:.1f} hours)")

        # Sleep in chunks so Railway doesn't think we're dead
        while wait_seconds > 0:
            sleep_time = min(wait_seconds, 300)  # Sleep max 5 min at a time
            time.sleep(sleep_time)
            wait_seconds = (next_run - datetime.now()).total_seconds()

        # Run the scraper
        run_scraper()


if __name__ == "__main__":
    main()
