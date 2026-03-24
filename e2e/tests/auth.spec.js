// @ts-check
import { test, expect } from "@playwright/test";
import { login, logout } from "../helpers/auth.js";

test.describe("Authentication", () => {
  test("login with valid credentials redirects to dashboard", async ({ page }) => {
    await page.goto("/login/");
    await page.locator('input[type="text"]').fill("e2e_user");
    await page.locator('input[type="password"]').fill("e2e_pass_123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(dashboard|children|quick-entry)/);
  });

  test("login with invalid credentials stays on login page", async ({ page }) => {
    await page.goto("/login/");
    await page.locator('input[type="text"]').fill("e2e_user");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.locator('button[type="submit"]').click();
    // Should stay on login page with an error
    await expect(page).toHaveURL(/\/login\//, { timeout: 5000 });
    // Page should still show the login form
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("logout redirects to login page", async ({ page }) => {
    await login(page);
    await logout(page);
    await expect(page).toHaveURL(/\/login\//);
  });

  test("accessing protected page while logged out redirects to login", async ({ page }) => {
    await page.goto("/dashboard/");
    await expect(page).toHaveURL(/\/login\//);
  });

  test("after logout, protected pages are inaccessible", async ({ page }) => {
    await login(page);
    await logout(page);
    await page.goto("/dashboard/");
    await expect(page).toHaveURL(/\/login\//);
  });
});
