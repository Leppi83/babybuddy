// @ts-check
import { test, expect } from "@playwright/test";
import { login, gotoQuickEntry } from "../helpers/auth.js";
import { django } from "../helpers/db.js";

function dbCount(model) {
  return parseInt(
    django(`
from core.models import ${model}, Child
c = Child.objects.get(first_name="E2E", last_name="Baby")
print(${model}.objects.filter(child=c).count())
`)
  );
}

function cleanEntries() {
  django(`
from core.models import Sleep, DiaperChange, Feeding, Child
c = Child.objects.filter(first_name="E2E", last_name="Baby").first()
if c:
    Sleep.objects.filter(child=c).delete()
    DiaperChange.objects.filter(child=c).delete()
    Feeding.objects.filter(child=c).delete()
`);
}

test.beforeEach(async ({ page }) => {
  cleanEntries();
  await login(page);
  await gotoQuickEntry(page);
});

test.afterEach(() => cleanEntries());

test.describe("Quick Entry — Page structure", () => {
  test("all tabs are visible", async ({ page }) => {
    // Use first() to avoid strict-mode errors where "Sleep" text appears in multiple DOM nodes
    await expect(page.getByText("Sleep").first()).toBeVisible();
    await expect(page.getByText("Diaper changes").first()).toBeVisible();
    await expect(page.getByText("Feedings").first()).toBeVisible();
    await expect(page.getByText("Breastfeeding").first()).toBeVisible();
    await expect(page.getByText("Pumpings").first()).toBeVisible();
  });

  test("sleep tab shows manual entry and timer side by side", async ({ page }) => {
    await expect(page.getByText("Start date")).toBeVisible();
    await expect(page.getByText("Sleep Timer")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start Timer" })).toBeVisible();
  });
});

test.describe("Quick Entry — Manual Sleep", () => {
  test("Save button creates a sleep entry", async ({ page }) => {
    const before = dbCount("Sleep");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator(".ant-message-notice")).toBeVisible({ timeout: 5000 });
    expect(dbCount("Sleep")).toBe(before + 1);
  });
});

test.describe("Quick Entry — Diaper", () => {
  test("switching to Diaper tab shows consistency options", async ({ page }) => {
    await page.getByText("Diaper changes").click();
    await expect(page.getByText("Liquid")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Solid")).toBeVisible();
  });

  test("Save creates a diaper change entry", async ({ page }) => {
    await page.getByText("Diaper changes").click();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible({ timeout: 3000 });

    const before = dbCount("DiaperChange");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator(".ant-message-notice")).toBeVisible({ timeout: 5000 });
    expect(dbCount("DiaperChange")).toBe(before + 1);
  });
});

test.describe("Quick Entry — Feeding", () => {
  test("Save creates a feeding entry", async ({ page }) => {
    await page.getByText("Feedings").click();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible({ timeout: 3000 });

    const before = dbCount("Feeding");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator(".ant-message-notice")).toBeVisible({ timeout: 5000 });
    expect(dbCount("Feeding")).toBe(before + 1);
  });
});

test.describe("Quick Entry — requires child", () => {
  test("without child param still loads the page (not auth redirect)", async ({ page }) => {
    await page.goto("/quick-entry/");
    await expect(page).not.toHaveURL(/login/);
  });
});
