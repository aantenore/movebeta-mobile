import os
from pathlib import Path

from playwright.sync_api import Page, expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "store" / "screenshots"
DEFAULT_FIXTURE = Path("/tmp/movebeta-pexels-climbing-5382881.mp4")
FIXTURE_SOURCE = "https://www.pexels.com/video/woman-in-activewear-climbing-up-the-wall-5382881/"


def capture(page: Page, file_name: str, focus=None) -> None:
    if focus is None:
        page.evaluate(
            """() => {
                window.scrollTo(0, 0);
                for (const element of document.querySelectorAll('*')) element.scrollTop = 0;
            }"""
        )
    else:
        focus.evaluate("element => element.scrollIntoView({ block: 'start' })")
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUTPUT_DIR / file_name), full_page=False)


def import_video(page: Page, video_path: Path) -> None:
    with page.expect_file_chooser() as chooser_info:
        page.get_by_role("button", name="Import a climbing video", exact=True).click()
    chooser_info.value.set_files(str(video_path))
    expect(page.locator("video")).to_be_visible(timeout=20_000)


def wait_for_video_frame(page: Page) -> None:
    page.wait_for_function("() => document.querySelector('video')?.readyState >= 2")
    page.wait_for_timeout(750)
    assert page.locator("video").evaluate("video => video.readyState") >= 2


def open_tab(page: Page, name: str, heading: str) -> None:
    page.get_by_role("tab", name=name, exact=True).click()
    expect(page.get_by_role("heading", name=heading, exact=True)).to_be_visible()
    if name != "Coach":
        expect(page.locator("video")).to_have_count(0)
        page.wait_for_timeout(750)


def main() -> None:
    base_url = os.environ.get("MOVEBETA_SMOKE_URL", "http://127.0.0.1:8082")
    video_path = Path(os.environ.get("MOVEBETA_TEST_VIDEO", str(DEFAULT_FIXTURE)))
    if not video_path.is_file():
        raise RuntimeError(
            f"Set MOVEBETA_TEST_VIDEO to a local climbing MP4 or download the documented fixture from {FIXTURE_SOURCE}."
        )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for old_screenshot in OUTPUT_DIR.glob("*.png"):
        old_screenshot.unlink()

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        page = context.new_page()
        page.goto(base_url, wait_until="networkidle")

        expect(page.get_by_role("heading", name="Analyze a climb", exact=True)).to_be_visible()
        capture(page, "01-coach.png")

        import_video(page, video_path)
        page.get_by_label("Attempt title").fill("Training wall project")
        page.get_by_label("Gym or wall").fill("Local bouldering gym")
        page.get_by_label("Grade or focus").fill("Technique repeat")
        analyze_button = page.get_by_role("button", name="Analyze selected attempt on this device", exact=True)
        expect(analyze_button).to_be_enabled(timeout=60_000)
        analyze_button.click()
        expect(page.get_by_text("Analysis complete", exact=True)).to_be_visible(timeout=120_000)
        expect(page.get_by_test_id("pose-overlay")).to_be_visible()
        wait_for_video_frame(page)
        capture(page, "02-analysis.png")

        page.get_by_role("button", name="Film a focused repeat", exact=True).click()
        import_video(page, video_path)
        repeat_analyze_button = page.get_by_role("button", name="Analyze selected attempt on this device", exact=True)
        expect(repeat_analyze_button).to_be_enabled(timeout=60_000)
        repeat_analyze_button.click()
        expect(page.get_by_role("heading", name="Repeat result", exact=True)).to_be_visible(timeout=120_000)
        wait_for_video_frame(page)
        capture(page, "03-repeat.png", page.get_by_role("heading", name="Repeat result", exact=True))

        open_tab(page, "Attempts", "Your local history")
        review_buttons = page.get_by_role("button", name="Review Training wall project", exact=True)
        assert review_buttons.count() >= 1
        expect(review_buttons.first).to_be_visible()
        capture(page, "04-attempts.png")

        open_tab(page, "Progress", "What changed")
        expect(page.get_by_role("heading", name="Latest repeat", exact=True)).to_be_visible()
        capture(page, "05-progress.png")

        open_tab(page, "Settings", "Privacy & data")
        expect(page.get_by_role("heading", name="Privacy boundary", exact=True)).to_be_visible()
        capture(page, "06-settings.png")

        browser.close()

    print(f"Wrote consumer screenshots to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
