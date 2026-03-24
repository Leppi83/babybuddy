// @ts-check
/**
 * Mobile layout and functionality tests.
 * Runs under Pixel 7 (mobile-chrome) and iPhone 15 (mobile-safari) emulation.
 * These test mobile-specific UI differences vs desktop:
 *  - Segmented → Select dropdown for tab switching
 *  - Save Sleep + Cancel Timer stacked vertically (not side-by-side)
 *  - Bottom nav bar with "More" ellipsis button opening a drawer
 *  - Drawer contains Settings and Logout
 *  - All core timer and quick-entry flows work under touch emulation
 */
import { test, expect } from "@playwright/test";
import { login, logout, gotoQuickEntry } from "../helpers/auth.js";
import { django } from "../helpers/db.js";

function cleanTimer() {
  django(`
from core.models import SleepTimer, Child
c = Child.objects.filter(first_name="E2E", last_name="Baby").first()
if c:
    SleepTimer.objects.filter(child=c).delete()
`);
}

function cleanEntries() {
  django(`
from core.models import Sleep, DiaperChange, Child
c = Child.objects.filter(first_name="E2E", last_name="Baby").first()
if c:
    Sleep.objects.filter(child=c).delete()
    DiaperChange.objects.filter(child=c).delete()
`);
}

// ─── Layout ──────────────────────────────────────────────────────────────────

test.describe("Mobile layout — Quick Entry tabs", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await gotoQuickEntry(page);
  });

  test("tab switcher renders as a Select dropdown, not Segmented", async ({ page }) => {
    // On mobile the Segmented control is replaced by an Ant Select
    await expect(page.locator(".ant-select")).toBeVisible();
    await expect(page.locator(".ant-segmented")).not.toBeVisible();
  });

  test("all categories are reachable via the Select dropdown", async ({ page }) => {
    await page.locator(".ant-select").first().click();
    const dropdown = page.locator(".ant-select-dropdown");
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Check dropdown text content in one pass — no per-item clicks that close it
    const content = await dropdown.textContent();
    for (const label of ["Sleep", "Diaper changes", "Feedings", "Breastfeeding", "Pumpings"]) {
      expect(content).toContain(label);
    }
    await page.keyboard.press("Escape");
  });

  test("switching to Diaper via dropdown shows diaper form", async ({ page }) => {
    await page.locator(".ant-select").first().click();
    await page.locator(".ant-select-dropdown").getByText("Diaper changes").click();
    await expect(page.getByText("Liquid")).toBeVisible({ timeout: 3000 });
  });
});

// ─── Sleep timer button layout on mobile ─────────────────────────────────────

test.describe("Mobile layout — Sleep timer buttons", () => {
  test.beforeEach(async ({ page }) => {
    cleanTimer();
    await login(page);
    await gotoQuickEntry(page);
  });

  test.afterEach(() => cleanTimer());

  test("Save Sleep and Cancel Timer are stacked vertically on mobile", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.getByText("Running")).toBeVisible({ timeout: 5000 });

    const saveSleep = page.getByRole("button", { name: "Save Sleep" });
    const cancelTimer = page.getByRole("button", { name: "Cancel Timer" });

    await expect(saveSleep).toBeVisible();
    await expect(cancelTimer).toBeVisible();

    const saveBox = await saveSleep.boundingBox();
    const cancelBox = await cancelTimer.boundingBox();

    // On mobile both buttons are full-width (xs=24), so Cancel is BELOW Save
    expect(cancelBox.y).toBeGreaterThan(saveBox.y + saveBox.height - 2);
    // And they should both be close to full viewport width
    expect(saveBox.width).toBeGreaterThan(200);
    expect(cancelBox.width).toBeGreaterThan(200);
  });

  test("Start Timer button spans full width on mobile", async ({ page }) => {
    const btn = page.getByRole("button", { name: "Start Timer" });
    const box = await btn.boundingBox();
    expect(box.width).toBeGreaterThan(200);
  });
});

// ─── Mobile nav drawer ────────────────────────────────────────────────────────

test.describe("Mobile nav — More drawer", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await gotoQuickEntry(page);
  });

  test("bottom nav shows More (ellipsis) button, not a sidebar", async ({ page }) => {
    // No desktop sidebar on mobile
    await expect(page.locator(".ant-layout-sider")).not.toBeVisible();
    // Bottom tab bar or More button should be present
    await expect(page.locator('[aria-label="ellipsis"], .anticon-ellipsis').first()).toBeVisible();
  });

  test("tapping More opens the bottom drawer", async ({ page }) => {
    await page.locator('[aria-label="ellipsis"], .anticon-ellipsis').first().click();
    await expect(page.locator(".ant-drawer")).toBeVisible({ timeout: 3000 });
  });

  test("drawer contains Settings link", async ({ page }) => {
    await page.locator('[aria-label="ellipsis"], .anticon-ellipsis').first().click();
    await expect(page.locator(".ant-drawer")).toBeVisible({ timeout: 3000 });
    await expect(page.locator(".ant-drawer").getByText("Settings")).toBeVisible();
  });

  test("drawer contains Logout button", async ({ page }) => {
    await page.locator('[aria-label="ellipsis"], .anticon-ellipsis').first().click();
    await expect(page.locator(".ant-drawer")).toBeVisible({ timeout: 3000 });
    await expect(page.locator(".ant-drawer").getByText("Logout")).toBeVisible();
  });

  test("drawer closes after tapping outside", async ({ page }) => {
    await page.locator('[aria-label="ellipsis"], .anticon-ellipsis').first().click();
    await expect(page.locator(".ant-drawer")).toBeVisible({ timeout: 3000 });
    // Tap outside the drawer panel (top-left corner of the page, outside the panel)
    await page.mouse.click(10, 10);
    await expect(page.locator(".ant-drawer-content")).not.toBeVisible({ timeout: 3000 });
  });
});

// ─── Core functionality under mobile emulation ───────────────────────────────

test.describe("Mobile functionality — Sleep timer", () => {
  test.beforeEach(async ({ page }) => {
    cleanTimer();
    cleanEntries();
    await login(page);
    await gotoQuickEntry(page);
  });

  test.afterEach(() => {
    cleanTimer();
    cleanEntries();
  });

  test("start → pause → resume → save works on mobile", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.getByText("Running")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByText("Paused")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByText("Running")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Save Sleep" }).click();
    await expect(page.getByText("Ready")).toBeVisible({ timeout: 8000 });

    const count = parseInt(django(`
from core.models import Sleep, Child
c = Child.objects.get(first_name="E2E", last_name="Baby")
print(Sleep.objects.filter(child=c).count())
`));
    expect(count).toBeGreaterThan(0);
  });

  test("cancel timer works on mobile with confirmation dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.getByText("Running")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Cancel Timer" }).click();
    await expect(page.locator(".ant-modal-confirm")).toBeVisible({ timeout: 5000 });

    await page.locator(".ant-modal-confirm-btns .ant-btn-dangerous").click();
    await expect(page.getByText("Ready")).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Mobile functionality — Quick entry", () => {
  test.beforeEach(async ({ page }) => {
    cleanEntries();
    await login(page);
    await gotoQuickEntry(page);
  });

  test.afterEach(() => cleanEntries());

  test("manual sleep save works on mobile", async ({ page }) => {
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator(".ant-message-notice")).toBeVisible({ timeout: 5000 });
  });

  test("diaper entry works on mobile", async ({ page }) => {
    await page.locator(".ant-select").first().click();
    await page.locator(".ant-select-dropdown").getByText("Diaper changes").click();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible({ timeout: 3000 });

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator(".ant-message-notice")).toBeVisible({ timeout: 5000 });
  });
});

// ─── Visual regression baselines ─────────────────────────────────────────────

test.describe("Mobile visual regression", () => {
  test.beforeEach(async ({ page }) => {
    cleanTimer();
    await login(page);
    await gotoQuickEntry(page);
  });

  test.afterEach(() => cleanTimer());

  test("quick entry page — ready state", async ({ page }) => {
    await expect(page.locator(".ant-sleep-timer-card")).toBeVisible();
    await expect(page).toHaveScreenshot("quick-entry-ready.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("quick entry page — timer running", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.getByText("Running")).toBeVisible({ timeout: 5000 });
    // Freeze the clock-dependent stat so it doesn't change between runs
    await page.locator(".ant-sleep-timer-card .ant-statistic-content").first().waitFor();
    await expect(page).toHaveScreenshot("quick-entry-timer-running.png", {
      maxDiffPixelRatio: 0.05, // allow slight timer digit differences
      mask: [page.locator(".ant-sleep-timer-card .ant-statistic-content").first()],
    });
  });

  test("quick entry page — timer paused", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.getByText("Running")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByText("Paused")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveScreenshot("quick-entry-timer-paused.png", {
      maxDiffPixelRatio: 0.05,
      mask: [page.locator(".ant-sleep-timer-card .ant-statistic-content").first(),
             page.locator(".ant-sleep-timer-card .ant-statistic-content").last()],
    });
  });

  test("More drawer open", async ({ page }) => {
    await page.locator('[aria-label="ellipsis"], .anticon-ellipsis').first().click();
    await expect(page.locator(".ant-drawer")).toBeVisible({ timeout: 3000 });
    await expect(page).toHaveScreenshot("more-drawer-open.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
