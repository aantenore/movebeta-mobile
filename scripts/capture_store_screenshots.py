import os
import re
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "store" / "screenshots"


SCREENSHOTS = [
    ("01-analyze.png", "Analyze", "On-device climbing coach"),
    ("02-drills.png", "Drills", "Weekly drill plan"),
    ("03-progress.png", "Progress", "Technique trends"),
    ("04-sessions.png", "Sessions", "Local attempts"),
    ("05-plan.png", "Plan", "Plan catalog"),
    ("06-privacy.png", "Privacy", "No upload by default"),
    ("07-release-unblock.png", "Plan", "Release unblock checklist"),
    ("09-release-critical-path.png", "Plan", "Release critical path"),
    ("10-release-evidence-scenarios.png", "Plan", "Release evidence scenarios"),
    ("11-release-freshness.png", "Plan", "Release evidence freshness"),
    ("08-data-portability.png", "Privacy", "Data portability"),
]


def reset_scroll(page) -> None:
    page.evaluate(
        """() => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            for (const element of document.querySelectorAll('*')) {
                if (element.scrollTop) element.scrollTop = 0;
            }
        }"""
    )


def seed_repeat_outcome(page) -> None:
    page.get_by_role("tab", name="Sessions").click()
    page.wait_for_load_state("networkidle")
    expect(page.get_by_text("Training log", exact=True)).to_be_visible()
    page.get_by_label("Project status Repeat").click()
    page.get_by_label("Repeat outcome Improved").click()
    page.get_by_label("Repeat attempts 2").click()
    page.get_by_label(re.compile("Resolved cue")).first.click()
    page.get_by_text("Save", exact=True).click()
    page.get_by_role("tab", name="Analyze").click()
    page.wait_for_load_state("networkidle")


def main() -> None:
    base_url = os.environ.get("MOVEBETA_SMOKE_URL", "http://127.0.0.1:8082")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        page.goto(base_url)
        page.wait_for_load_state("networkidle")

        expect(page.get_by_text("On-device climbing coach")).to_be_visible()
        page.get_by_text("Vertical sequence repeat").click()
        page.wait_for_load_state("networkidle")
        seed_repeat_outcome(page)

        for file_name, tab_name, expected_text in SCREENSHOTS:
            if tab_name != "Analyze":
                page.get_by_role("tab", name=tab_name).click()
                page.wait_for_load_state("networkidle")
            if file_name in {
                "07-release-unblock.png",
                "09-release-critical-path.png",
                "10-release-evidence-scenarios.png",
                "11-release-freshness.png",
            }:
                page.get_by_text(expected_text).first.scroll_into_view_if_needed()
            elif file_name == "08-data-portability.png":
                page.get_by_text(expected_text).scroll_into_view_if_needed()
                page.get_by_text("Backup", exact=True).click()
                expect(page.get_by_label("Local backup JSON")).not_to_have_value("")
                page.get_by_text("Preview restore", exact=True).click()
                expect(page.get_by_text("Status: ready-to-restore")).to_be_visible()
                expect(page.get_by_text("Integrity verified: yes")).to_be_visible()
                expect(page.get_by_text("Existing reports:")).to_be_visible()
            expect(page.get_by_text(expected_text).first).to_be_visible()
            if file_name in {
                "07-release-unblock.png",
                "09-release-critical-path.png",
                "10-release-evidence-scenarios.png",
                "11-release-freshness.png",
                "08-data-portability.png",
            }:
                pass
            elif tab_name == "Progress":
                page.get_by_text("Pre-send guard", exact=True).scroll_into_view_if_needed()
                expect(page.get_by_text("Pre-send guard", exact=True)).to_be_visible()
            else:
                reset_scroll(page)
            page.screenshot(path=str(OUTPUT_DIR / file_name), full_page=True)

        browser.close()

    print(f"Wrote screenshots to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
