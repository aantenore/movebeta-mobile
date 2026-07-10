import json
import os
import re
from pathlib import Path

from playwright.sync_api import Page, expect, sync_playwright


def assert_responsive_scene(page: Page) -> None:
    state = page.evaluate(
        """() => ({
          h1Count: [...document.querySelectorAll('h1')]
            .filter((element) => element.getBoundingClientRect().width > 0).length,
          innerWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          visibleHiddenFocusables: [...document.querySelectorAll('[aria-hidden="true"] [tabindex="0"]')]
            .filter((element) => element.getBoundingClientRect().width > 0).length,
        })"""
    )
    assert state["h1Count"] == 1, state
    assert state["scrollWidth"] <= state["innerWidth"] + 1, state
    assert state["visibleHiddenFocusables"] == 0, state


def open_tab(page: Page, tab_name: str, heading: str) -> None:
    tab = page.get_by_role("tab", name=tab_name, exact=True)
    expect(tab).to_have_count(1)
    tab.click()
    expect(page.get_by_role("heading", name=heading, exact=True)).to_be_visible()
    assert_responsive_scene(page)


def verify_pwa(page: Page, base_url: str) -> None:
    expect(page.locator('link[rel="manifest"]')).to_have_attribute("href", "/manifest.json")
    expect(page.locator('link[rel="stylesheet"][href="/pwa.css"]')).to_have_count(1)
    manifest = page.evaluate("async () => fetch('/manifest.json').then((response) => response.json())")
    assert manifest["name"] == "MoveBeta On-Device Climbing Coach"
    assert manifest["display"] == "standalone"

    model_manifest = page.evaluate("async () => fetch('/model-assets.json').then((response) => response.json())")
    assert model_manifest["schemaVersion"] == "movebeta.static-model-assets.v1"
    assert model_manifest["modelUrl"] in model_manifest["assets"]
    assert all(file.get("sha256") for file in model_manifest["files"])
    assert page.evaluate(
        "async (path) => fetch(path).then((response) => response.status)", model_manifest["modelUrl"]
    ) == 200

    service_worker = page.evaluate("async () => fetch('/sw.js').then((response) => response.text())")
    assert re.search(r"const CACHE_VERSION = ['\"]v-[a-f0-9]{16}['\"];", service_worker)
    assert "/model-assets.json" in service_worker
    assert "/pwa.css" in service_worker

    page.evaluate(
        """async () => {
          await navigator.serviceWorker.ready;
          if (navigator.serviceWorker.controller) return;
          await new Promise((resolve) => {
            const timeout = setTimeout(resolve, 5000);
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              clearTimeout(timeout);
              resolve();
            }, { once: true });
          });
        }"""
    )
    cached_paths = page.evaluate(
        """async () => {
          const paths = new Set();
          for (const key of await caches.keys()) {
            const cache = await caches.open(key);
            for (const request of await cache.keys()) paths.add(new URL(request.url).pathname);
          }
          return [...paths];
        }"""
    )
    for required_path in ["/index.html", "/model-assets.json", "/pwa.css", *model_manifest["assets"]]:
        assert required_path in cached_paths, required_path

    page.context.set_offline(True)
    try:
        page.reload(wait_until="domcontentloaded")
        expect(page.get_by_role("heading", name="On-device climbing coach", exact=True)).to_be_visible()
        assert page.evaluate(
            "async (path) => fetch(path).then((response) => response.status)", model_manifest["modelUrl"]
        ) == 200
    finally:
        page.context.set_offline(False)
    page.goto(base_url, wait_until="networkidle")


def verify_core_routes(page: Page) -> None:
    expect(page.get_by_role("heading", name="On-device climbing coach", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name="Import", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name="Record", exact=True)).to_have_count(0)
    expect(page.get_by_text("Model cache ready", exact=True)).to_be_visible()
    assert_responsive_scene(page)

    open_tab(page, "Sessions", "Local attempts")
    expect(page.get_by_text("No local reports yet", exact=True)).to_be_visible()

    open_tab(page, "Drills", "Practice from evidence")
    expect(page.get_by_text("No drill plan yet", exact=True)).to_be_visible()
    expect(page.get_by_text("Advanced pack locked", exact=True)).to_be_visible()

    open_tab(page, "Progress", "Technique trends")
    expect(page.get_by_text("Attempts", exact=True)).to_be_visible()

    open_tab(page, "Plan", "Plan catalog")
    expect(page.get_by_role("heading", name="Current plan", exact=True)).to_be_visible()

    open_tab(page, "Privacy", "No upload by default")
    expect(page.get_by_role("heading", name="Airplane-mode readiness", exact=True)).to_be_visible()


def verify_real_video_analysis(page: Page, video_path: Path) -> dict:
    assert video_path.is_file(), "Configured real-video smoke fixture is missing."
    open_tab(page, "Analyze", "On-device climbing coach")
    page.get_by_label("Attempt title").fill("Browser real-video smoke")
    page.get_by_label("Gym or wall").fill("Local smoke wall")
    page.get_by_label("Grade or focus").fill("Technique check")

    with page.expect_file_chooser() as chooser_info:
        page.get_by_role("button", name="Import", exact=True).click()
    chooser_info.value.set_files(str(video_path))
    expect(page.locator("video")).to_be_visible(timeout=20_000)
    expect(page.get_by_text("Analysis quality", exact=True)).to_have_count(0)

    page.get_by_role("button", name="Analyze", exact=True).click()
    expect(page.get_by_text("Analysis quality", exact=True)).to_be_visible(timeout=120_000)
    expect(page.get_by_role("heading", name="Movement metrics", exact=True)).to_be_visible()

    persisted = page.evaluate(
        """() => {
          const envelope = JSON.parse(localStorage.getItem('movebeta.reports.v1') || '{}');
          return envelope.reports || [];
        }"""
    )
    assert len(persisted) == 1, persisted
    report = persisted[0]
    assert report["session"]["source"] == "import"
    assert report["session"]["title"] == "Browser real-video smoke"
    assert report["engine"]["provider"] == "web-tfjs-movenet"
    assert report["engine"]["model"] == "movenet-singlepose-lightning-v4"
    assert report["engine"]["cueEngineVersion"] == "movebeta-cue-engine-v2.0.0"
    assert report["engine"]["processedFrames"] >= 10
    assert all(metric["status"] in {"measured", "insufficient-data"} for metric in report["metrics"])
    assert "blob:" not in json.dumps(report)

    open_tab(page, "Sessions", "Local attempts")
    visible_report_titles = page.evaluate(
        """() => [...document.querySelectorAll('*')].filter((element) =>
          element.children.length === 0 &&
          element.textContent === 'Browser real-video smoke' &&
          element.getBoundingClientRect().width > 0
        ).length"""
    )
    assert visible_report_titles >= 1
    return {
        "processedFrames": report["engine"]["processedFrames"],
        "qualityScore": report["analysisQuality"]["score"],
        "metricStatuses": {metric["id"]: metric["status"] for metric in report["metrics"]},
    }


def main() -> None:
    base_url = os.environ.get("MOVEBETA_SMOKE_URL", "http://127.0.0.1:8083")
    video_value = os.environ.get("MOVEBETA_TEST_VIDEO")
    console_errors: list[str] = []
    page_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 320, "height": 700})
        page = context.new_page()
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.goto(base_url, wait_until="networkidle")

        verify_pwa(page, base_url)
        verify_core_routes(page)
        real_video_result = verify_real_video_analysis(page, Path(video_value)) if video_value else None

        page.set_viewport_size({"width": 1280, "height": 900})
        page.goto(base_url, wait_until="networkidle")
        expect(page.get_by_role("heading", name="On-device climbing coach", exact=True)).to_be_visible()
        assert_responsive_scene(page)

        unexpected_console_errors = [
            message for message in console_errors if "ERR_INTERNET_DISCONNECTED" not in message
        ]
        assert not page_errors, page_errors
        assert not unexpected_console_errors, unexpected_console_errors
        browser.close()

    print(
        json.dumps(
            {
                "desktop": "pass",
                "mobile": "pass",
                "pwaOffline": "pass",
                "realVideo": real_video_result or "not-requested",
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
