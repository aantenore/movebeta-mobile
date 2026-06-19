import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "store" / "screenshots"


SCREENSHOTS = [
    ("01-analyze.png", "Analyze", "On-device climbing coach"),
    ("02-drills.png", "Drills", "Weekly drill plan"),
    ("03-progress.png", "Progress", "Technique trends"),
    ("04-sessions.png", "Sessions", "Local attempts"),
    ("05-privacy.png", "Privacy", "No upload by default"),
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

        for file_name, tab_name, expected_text in SCREENSHOTS:
            if tab_name != "Analyze":
                page.get_by_role("tab", name=tab_name).click()
                page.wait_for_load_state("networkidle")
            expect(page.get_by_text(expected_text).first).to_be_visible()
            reset_scroll(page)
            page.screenshot(path=str(OUTPUT_DIR / file_name), full_page=True)

        browser.close()

    print(f"Wrote screenshots to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
