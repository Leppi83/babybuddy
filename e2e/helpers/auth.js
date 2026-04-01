// @ts-check

/** Login as e2e_user and wait for the dashboard. */
export async function login(page) {
  await page.goto("/login/");
  await page.locator('input[type="text"]').fill("e2e_user");
  await page.locator('input[type="password"]').fill("e2e_pass_123");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard|quick-entry|children)/);
}

/** Logout via POST (Django 5.1+ requires POST for logout). */
export async function logout(page) {
  const cookies = await page.context().cookies();
  const csrf = cookies.find((c) => c.name === "csrftoken")?.value ?? "";
  await page.evaluate(([token]) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/logout/";
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "csrfmiddlewaretoken";
    input.value = token;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  }, [csrf]);
  await page.waitForURL(/\/login\//);
}

/** Return the child slug for E2E Baby (used in URLs). */
export function childSlug() {
  return "e2e-baby";
}

/** Navigate to Quick Entry for E2E Baby. */
export async function gotoQuickEntry(page) {
  await page.goto(`/quick-entry/?child=${childSlug()}`);
  await page.waitForSelector('[data-testid="quick-entry-card"]', { timeout: 8000 });
}
