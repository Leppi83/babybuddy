// @ts-check
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

function sleepCount() {
  return parseInt(
    django(`
from core.models import Sleep, Child
c = Child.objects.get(first_name="E2E", last_name="Baby")
print(Sleep.objects.filter(child=c).count())
`)
  );
}

function cleanSleep() {
  django(`
from core.models import Sleep, Child
c = Child.objects.filter(first_name="E2E", last_name="Baby").first()
if c:
    Sleep.objects.filter(child=c).delete()
`);
}

test.beforeEach(async ({ page }) => {
  cleanTimer();
  cleanSleep();
  await login(page);
  await gotoQuickEntry(page);
});

test.afterEach(() => {
  cleanTimer();
  cleanSleep();
});

test.describe("Sleep Timer", () => {
  test("shows Ready state before starting", async ({ page }) => {
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Ready");
    await expect(page.getByRole("button", { name: "Start Timer" })).toBeVisible();
  });

  test("start timer shows Running state and action buttons", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Sleep" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel Timer" })).toBeVisible();
  });

  test("timer counts up after starting", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });

    const timerDisplay = page.locator('[data-testid="timer-display"]');
    const firstValue = await timerDisplay.innerText();

    await page.waitForTimeout(2500);
    const secondValue = await timerDisplay.innerText();
    expect(firstValue).not.toBe(secondValue);
  });

  test("timer persists after navigating away and back", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });
    await page.waitForTimeout(1500);

    await page.goto("/dashboard/");
    await gotoQuickEntry(page);

    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });
    const elapsed = await page.locator('[data-testid="timer-display"]').innerText();
    expect(elapsed).not.toBe("00:00:00");
  });

  test("timer persists across logout and login", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });
    await page.waitForTimeout(1500);

    await logout(page);
    await login(page);
    await gotoQuickEntry(page);

    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });
    const elapsed = await page.locator('[data-testid="timer-display"]').innerText();
    expect(elapsed).not.toBe("00:00:00");
  });

  test("pause freezes the timer counter", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Paused", { timeout: 5000 });

    const valueAtPause = await page.locator('[data-testid="timer-display"]').innerText();
    await page.waitForTimeout(2000);
    const valueAfterWait = await page.locator('[data-testid="timer-display"]').innerText();
    expect(valueAtPause).toBe(valueAfterWait);
  });

  test("pause shows a pause duration counter", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Paused", { timeout: 5000 });
    await expect(page.locator('[data-testid="pause-display"]')).toBeVisible({ timeout: 3000 });
  });

  test("resume continues the timer from frozen value", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Paused", { timeout: 5000 });

    const frozenValue = await page.locator('[data-testid="timer-display"]').innerText();

    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });
    await page.waitForTimeout(1500);

    const resumedValue = await page.locator('[data-testid="timer-display"]').innerText();
    expect(resumedValue).not.toBe(frozenValue);
  });

  test("save timer creates a sleep entry and resets to Ready", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "Save Sleep" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Ready", { timeout: 8000 });

    expect(sleepCount()).toBeGreaterThan(0);
  });

  test("cancel timer shows confirmation panel", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });

    await page.getByRole("button", { name: "Cancel Timer" }).click();
    await expect(page.locator('[data-testid="cancel-confirm"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="cancel-confirm"]')).toContainText("Cancel timer?");
  });

  test("cancel timer confirmed: stops timer, no sleep entry saved", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "Cancel Timer" }).click();
    await expect(page.locator('[data-testid="cancel-confirm"]')).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="cancel-confirm-ok"]').click();

    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Ready", { timeout: 8000 });
    expect(sleepCount()).toBe(0);
  });

  test("cancel timer dismissed: timer keeps running", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });

    await page.getByRole("button", { name: "Cancel Timer" }).click();
    await expect(page.locator('[data-testid="cancel-confirm"]')).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="cancel-confirm-cancel"]').click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 3000 });
  });

  test("paused timer persists across navigation with frozen value", async ({ page }) => {
    await page.getByRole("button", { name: "Start Timer" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Running", { timeout: 5000 });
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Paused", { timeout: 5000 });

    const frozenValue = await page.locator('[data-testid="timer-display"]').innerText();

    await page.goto("/dashboard/");
    await gotoQuickEntry(page);

    await expect(page.locator('[data-testid="timer-status"]')).toHaveText("Paused", { timeout: 5000 });
    const restoredValue = await page.locator('[data-testid="timer-display"]').innerText();

    // Values should be identical — frozen seconds don't change while paused.
    // Allow ±1 second tolerance for DB roundtrip integer truncation.
    function toSeconds(hms) {
      const [h, m, s] = hms.split(":").map(Number);
      return h * 3600 + m * 60 + s;
    }
    expect(Math.abs(toSeconds(restoredValue) - toSeconds(frozenValue))).toBeLessThanOrEqual(1);
  });
});
