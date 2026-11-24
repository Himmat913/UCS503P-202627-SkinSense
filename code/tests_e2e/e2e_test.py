"""Browser end-to-end checks for SkinSense.

Runs against a live backend (port 8000) and frontend (port 5173). See README.md.
"""
import json
import os
import sys
import tempfile
import time

from PIL import Image
from playwright.sync_api import sync_playwright

BASE = os.environ.get("SKINSENSE_E2E_URL", "http://localhost:5173")
SHOTS = os.environ.get("SKINSENSE_E2E_SCREENSHOTS", os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots"))
FACE = os.environ.get("SKINSENSE_E2E_FACE")
TMP = tempfile.gettempdir()
os.makedirs(SHOTS, exist_ok=True)
results = []
console_errors = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)


def make_images():
    face = Image.open(FACE).convert("RGB")
    face.save(TMP + "/face_portrait.jpg", quality=92)
    land = Image.new("RGB", (1600, 900), (244, 222, 210))
    land.paste(face.resize((int(512 * 900 / 600), 900)), (500, 0))
    land.save(TMP + "/face_landscape_with_a_really_long_file_name_to_check_wrapping_behaviour_2026.jpg", quality=92)
    sq = Image.new("RGB", (1000, 1000), (230, 220, 240))
    sq.paste(face.resize((int(512 * 1000 / 600), 1000)), (80, 0))
    sq.save(TMP + "/face_square.png")
    Image.new("RGB", (800, 600), (200, 170, 150)).save(TMP + "/blank.jpg", quality=90)
    with open(TMP + "/notes.txt", "w") as fh:
        fh.write("not an image")


def shot(pg, path):
    pg.evaluate("window.scrollTo(0, 0)")
    pg.wait_for_timeout(250)
    pg.screenshot(path=path, full_page=True)


def no_h_overflow(page):
    return page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")


def img_fits(page, selector):
    return page.evaluate(
        """(sel) => {
          const img = document.querySelector(sel);
          if (!img || !img.complete) return null;
          const r = img.getBoundingClientRect();
          const stage = img.parentElement.getBoundingClientRect();
          const natural = img.naturalWidth / img.naturalHeight;
          const shown = r.width / r.height;
          return {
            ratioError: Math.abs(natural - shown) / natural,
            inside: r.left >= stage.left - 1 && r.right <= stage.right + 1 && r.top >= stage.top - 1 && r.bottom <= stage.bottom + 1,
            fit: getComputedStyle(img).objectFit,
            w: Math.round(r.width), h: Math.round(r.height)
          };
        }""",
        selector,
    )


def run():
    if not FACE or not os.path.exists(FACE):
        print("Set SKINSENSE_E2E_FACE to a clear, front-facing face photo (JPG or PNG).")
        return 2
    make_images()
    email = f"e2e{int(time.time())}@example.com"
    password = "skincare2026"

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        # Landing
        page.goto(BASE + "/")
        page.wait_for_selector(".hero-title")
        page.wait_for_timeout(600)
        fonts = page.evaluate("Promise.all([document.fonts.check('40px \"Gravitas One\"'), document.fonts.check('40px Lalezar'), document.fonts.check('16px Roboto')])")
        check("Figma fonts load (Gravitas One, Lalezar, Roboto)", all(fonts), str(fonts))
        shot(page, f"{SHOTS}/01-landing-1440.png")
        check("Landing: no horizontal overflow", no_h_overflow(page))
        page.click("text=What happens to my photo?")
        check("FAQ opens", page.is_visible("text=It isn't shown to other users"))

        # Protected route redirects to login
        page.goto(BASE + "/analyze")
        page.wait_for_url("**/login")
        check("Protected route redirects to login when signed out", "/login" in page.url)

        # Register
        page.goto(BASE + "/register")
        page.fill("#register-email", email)
        page.fill("#register-password", "short")
        page.fill("#register-confirm", "short")
        page.click("button[type=submit]")
        check("Weak password rejected with message", page.is_visible("text=Choose a stronger password"))
        page.fill("#register-password", password)
        page.fill("#register-confirm", password)
        page.screenshot(path=f"{SHOTS}/02-register.png")
        page.click("button[type=submit]")
        page.wait_for_url("**/analyze", timeout=15000)
        check("Registration signs in and opens skin check", "/analyze" in page.url)
        page.wait_for_timeout(400)
        shot(page, f"{SHOTS}/03-analyze-empty.png")

        # Unsupported file type
        page.set_input_files("input[type=file]", TMP + "/notes.txt")
        check("Unsupported file type rejected client-side", page.is_visible("text=That file type isn't supported"))

        # Blank image -> real MediaPipe rejection
        page.set_input_files("input[type=file]", TMP + "/blank.jpg")
        page.click("label:has-text('Oily')")
        page.click("button:has-text('Analyse my skin')")
        page.wait_for_selector("text=This photo can't be analysed", timeout=60000)
        check("Real MediaPipe rejects a photo with no face", page.is_visible("text=No face detected"))
        shot(page, f"{SHOTS}/04-analyze-rejected.png")

        # Aspect ratio checks in the preview stage
        for path, label in [
            (TMP + "/face_portrait.jpg", "portrait"),
            (TMP + "/face_landscape_with_a_really_long_file_name_to_check_wrapping_behaviour_2026.jpg", "landscape"),
            (TMP + "/face_square.png", "square"),
        ]:
            page.set_input_files("input[type=file]", path)
            page.wait_for_function("document.querySelector('.photo-stage img')?.complete")
            page.wait_for_timeout(300)
            info = img_fits(page, ".photo-stage img")
            check(f"Preview keeps {label} aspect ratio, uncropped", info and info["ratioError"] < 0.02 and info["inside"] and info["fit"] == "contain", json.dumps(info))
            if label == "landscape":
                check("Long filename wraps without overflow", no_h_overflow(page))
                shot(page, f"{SHOTS}/05-analyze-landscape-longname.png")
                dims = page.inner_text(".photo-details")
                check("Image details show real dimensions", "1600 × 900" in dims, dims)

        # Real analysis with a real face
        page.set_input_files("input[type=file]", TMP + "/face_portrait.jpg")
        page.fill("#avoid", "fragrance")
        page.keyboard.press("Enter")
        shot(page, f"{SHOTS}/06-analyze-ready.png")
        with page.expect_response(lambda r: "/api/predict" in r.url, timeout=120000) as resp_info:
            page.click("button:has-text('Analyse my skin')")
        predict = resp_info.value.json()
        check("Real model prediction returned", predict.get("source") == "model", json.dumps({k: predict[k] for k in ("acne_severity", "acne_severity_confidence", "source")}))
        page.wait_for_url("**/report")
        page.wait_for_selector(".product-card", timeout=30000)
        page.wait_for_timeout(700)
        shown_sev = page.inner_text(".result-stats .stat:nth-child(2) .stat-value")
        check("Report shows the model's severity", shown_sev.lower() == predict["acne_severity"], shown_sev)
        pct = round(predict["acne_severity_confidence"] * 100)
        check("Report shows the model's confidence", page.is_visible(f"text=Model confidence {pct}%"))
        if predict.get("referral", {}).get("needed"):
            check("Referral notice shown when backend flags it", page.is_visible("text=Consider seeing a dermatologist"))
        info = img_fits(page, ".result-arch img")
        check("Analysed photo shown whole in result arch", info and info["ratioError"] < 0.02 and info["inside"], json.dumps(info))
        shot(page, f"{SHOTS}/07-report-1440.png")

        cards = page.locator(".product-card")
        n_cards = cards.count()
        check("Recommendations rendered from API", n_cards > 0, f"{n_cards} cards")
        ingredient_text = " ".join(page.locator(".product-ingredients").all_inner_texts()).lower()
        check("Avoided ingredient (fragrance) absent from shown key ingredients", "fragrance" not in ingredient_text)

        page.locator(".why-toggle").first.click()
        page.wait_for_timeout(300)
        check("Why this pick reveals reasons", page.locator(".why-panel").first.is_visible())
        page.locator(".product-card").first.screenshot(path=f"{SHOTS}/08-product-why.png")

        # Budget filter
        page.fill("#report-budget", "800")
        with page.expect_response(lambda r: "/api/recommendations" in r.url) as r2:
            page.click("button:has-text('Update picks')")
        data = r2.value.json()
        prices = [pp["price"] for pp in data["products"]]
        check("Budget filter applied by real engine", all(pr <= 800 for pr in prices), f"{len(prices)} products, max {max(prices) if prices else None}")
        page.wait_for_timeout(500)
        shown_prices = page.locator(".product-price").all_inner_texts()
        check("Grid re-rendered with filtered products", len(shown_prices) == len(prices), f"{len(shown_prices)} shown")
        check("Every product has step_time from API", all(pp.get("step_time") in ("am", "pm", "both") for pp in data["products"]))

        # Category sidebar
        cats = page.locator(".rec-cat")
        if cats.count() > 2:
            cats.nth(1).click()
            page.wait_for_timeout(200)
            active = page.inner_text(".rec-cat.is-active")
            check("Category sidebar filters grid", page.locator(".product-card").count() <= len(prices), active.replace("\n", " "))
        sticky = page.evaluate("getComputedStyle(document.querySelector('.rec-sidebar')).position")
        check("Sidebar is sticky on desktop", sticky == "sticky", sticky)
        page.evaluate("window.scrollTo(0, document.querySelector('.rec-band').offsetTop + 400)")
        page.wait_for_timeout(300)
        top = page.evaluate("document.querySelector('.rec-sidebar').getBoundingClientRect().top")
        check("Sidebar stays below the sticky header while scrolling", top >= 72, f"top={top}")
        page.screenshot(path=f"{SHOTS}/09-report-scrolled-sidebar.png")

        # Feedback (real endpoint)
        page.click(".star >> nth=3")
        page.fill("#feedback-comment", "Reasons were clear.")
        with page.expect_response(lambda r: "/api/feedback" in r.url) as fb:
            page.click("button:has-text('Send rating')")
        check("Feedback stored by real endpoint", fb.value.status == 201)
        check("Feedback confirmation shown", page.is_visible("text=Thanks, your rating was sent"))

        # Routine builder
        page.click("a:has-text('Build my routine')")
        page.wait_for_url("**/routine")
        page.wait_for_selector(".routine-card")
        am = page.locator(".routine-card").nth(0).locator(".routine-steps li").count()
        pm = page.locator(".routine-card").nth(1).locator(".routine-steps li").count()
        basics_offered = page.locator(".picker").count()
        if basics_offered == 0:
            check("No matching basics: builder explains and offers next steps", page.is_visible("text=No basic steps matched") and am == 0 and pm == 0)
            page.click("button.link-button:has-text('Add extra steps')")
            page.wait_for_timeout(200)
            check("Next-step link switches to extra steps", page.locator(".switch").count() > 0)
        else:
            check("Routine builder fills morning and evening", am > 0 and pm > 0, f"am={am} pm={pm}")
            page.click("button[role=radio]:has-text('Add extra steps')")
        switches = page.locator(".switch")
        if switches.count():
            before = am + pm
            switches.first.click()
            page.wait_for_timeout(200)
            after = page.locator(".routine-steps li").count()
            check("Turning on an extra step updates the routine live", after > before, f"{before}->{after}")
        page.click("button[role=radio]:has-text('Morning')")
        check("Morning-only view hides evening card", page.locator(".routine-card").count() == 1)
        page.click("button[role=radio]:has-text('Both')")
        shot(page, f"{SHOTS}/10-routine.png")
        page.click("button:has-text('Save this routine')")
        check("Routine saves", page.is_visible("text=Saved to your profile"))

        # Manual check
        page.goto(BASE + "/analyze")
        page.click("button[role=radio]:has-text('Without a photo')")
        page.click("label:has-text('Moderate')")
        page.click("label:has-text('Dry')")
        with page.expect_response(lambda r: "/api/predict" in r.url) as m:
            page.click("button:has-text('See my recommendations')")
        check("Manual check uses real API", m.value.json().get("source") == "manual")
        page.wait_for_selector(".product-card", timeout=30000)
        check("Manual result has no photo shown", page.locator(".result-arch img").count() == 0)
        check("Manual result shows no confidence meter", page.locator(".meter").count() == 0)

        page.fill("#report-budget", "")
        page.locator("#report-avoid").focus()
        page.keyboard.press("Backspace")
        with page.expect_response(lambda r: "/api/recommendations" in r.url):
            page.click("button:has-text('Update picks')")
        page.wait_for_timeout(500)
        page.click("a:has-text('Build my routine')")
        page.wait_for_url("**/routine")
        page.wait_for_selector(".routine-card")
        am2 = page.locator(".routine-card").nth(0).locator(".routine-steps li").count()
        pm2 = page.locator(".routine-card").nth(1).locator(".routine-steps li").count()
        check("Basics routine fills morning and evening (dry, moderate)", am2 > 0 and pm2 > 0 and page.locator(".picker").count() > 0, f"am={am2} pm={pm2}")
        shot(page, f"{SHOTS}/10b-routine-basics.png")

        # Profile with real history
        page.goto(BASE + "/profile")
        page.wait_for_selector(".history-item", timeout=15000)
        n_hist = page.locator(".history-item").count()
        check("Profile lists real saved checks", n_hist == 2, f"{n_hist} items")
        check("Severity trend drawn", page.locator(".trend svg").count() == 1)
        check("Saved routine shown on profile", page.locator(".saved-routine").count() == 1)
        shot(page, f"{SHOTS}/11-profile.png")

        # Zoom-equivalent widths and overflow
        for width, label in [(1800, "80%"), (1440, "100%"), (1152, "125%"), (960, "150%")]:
            page.set_viewport_size({"width": width, "height": 900})
            for route in ["/analyze", "/profile"]:
                page.goto(BASE + route)
                page.wait_for_timeout(500)
                check(f"No horizontal overflow {route} at {label} zoom ({width}px)", no_h_overflow(page))
        page.set_viewport_size({"width": 960, "height": 900})
        page.goto(BASE + "/analyze")
        shot(page, f"{SHOTS}/12-analyze-150zoom.png")

        # Logout clears session and in-memory results
        page.set_viewport_size({"width": 1440, "height": 900})
        page.click("button[aria-label='Log out']")
        page.wait_for_url("**/login")
        stored = page.evaluate("localStorage.getItem('skinsense-auth')")
        check("Logout clears stored session", stored is None)

        # Second account sees no data from the first
        other = f"other{int(time.time())}@example.com"
        page.goto(BASE + "/register")
        page.fill("#register-email", other)
        page.fill("#register-password", password)
        page.fill("#register-confirm", password)
        page.click("button[type=submit]")
        page.wait_for_url("**/analyze")
        avoid_chips = page.locator(".chip").count()
        check("New account doesn't inherit previous user's avoid list", avoid_chips == 0, f"{avoid_chips} chips")
        page.goto(BASE + "/profile")
        page.wait_for_selector("text=You haven't run a skin check yet", timeout=15000)
        check("New account sees no other user's history", True)
        check("New account has no saved routine from previous user", page.is_visible("text=No routine saved yet"))
        page.goto(BASE + "/report")
        check("Results page explains when nothing is loaded", page.is_visible("text=No results to show yet"))
        page.goto(BASE + "/routine")
        check("Routine page explains when nothing is loaded", page.is_visible("text=Run a skin check first"))
        page.click("button[aria-label='Log out']")
        page.wait_for_url("**/login")

        # Login with first account
        page.fill("#login-email", email)
        page.fill("#login-password", "wrongpass1")
        page.click("button[type=submit]")
        page.wait_for_selector("text=don't match an account")
        check("Wrong password message", True)
        page.fill("#login-password", password)
        page.click("button[type=submit]")
        page.wait_for_url("**/analyze")
        check("Login works", True)
        page.goto(BASE + "/profile")
        page.wait_for_selector(".saved-routine", timeout=10000)
        check("First user's saved routine restored after logging back in", True)

        # Mobile
        mobile = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        mp = mobile.new_page()
        mp.on("pageerror", lambda e: console_errors.append(str(e)))
        mp.goto(BASE + "/")
        mp.wait_for_selector(".hero-title")
        mp.wait_for_timeout(400)
        check("Mobile landing: no horizontal overflow", no_h_overflow(mp))
        shot(mp, f"{SHOTS}/13-mobile-landing.png")
        mp.click(".menu-toggle")
        check("Mobile menu opens with navigation", mp.is_visible(".primary-nav.is-open"))
        mp.screenshot(path=f"{SHOTS}/14-mobile-menu.png")
        mp.click(".menu-toggle")
        mp.goto(BASE + "/login")
        mp.fill("#login-email", email)
        mp.fill("#login-password", password)
        mp.click("button[type=submit]")
        mp.wait_for_url("**/analyze")
        mp.set_input_files("input[type=file]", TMP + "/face_landscape_with_a_really_long_file_name_to_check_wrapping_behaviour_2026.jpg")
        mp.wait_for_function("document.querySelector('.photo-stage img')?.complete")
        info = img_fits(mp, ".photo-stage img")
        check("Mobile preview keeps aspect ratio, uncropped", info and info["ratioError"] < 0.02 and info["inside"], json.dumps(info))
        check("Mobile analyze: no horizontal overflow", no_h_overflow(mp))
        shot(mp, f"{SHOTS}/15-mobile-analyze.png")
        mp.set_input_files("input[type=file]", TMP + "/face_portrait.jpg")
        mp.click("label:has-text('Normal')")
        mp.click("button:has-text('Analyse my skin')")
        mp.wait_for_url("**/report", timeout=120000)
        mp.wait_for_selector(".product-card", timeout=30000)
        mp.wait_for_timeout(500)
        check("Mobile report: no horizontal overflow", no_h_overflow(mp))
        shot(mp, f"{SHOTS}/16-mobile-report.png")
        mp.click("a:has-text('Build my routine')")
        mp.wait_for_url("**/routine")
        mp.wait_for_selector(".routine-card")
        check("Mobile routine: no horizontal overflow", no_h_overflow(mp))
        shot(mp, f"{SHOTS}/17-mobile-routine.png")

        browser.close()

    real_errors = [e for e in console_errors if "Failed to load resource" not in e]
    check("No JavaScript errors in console", not real_errors, "; ".join(real_errors[:3]))
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(run())
