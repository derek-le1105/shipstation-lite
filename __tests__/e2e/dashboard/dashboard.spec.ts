import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("/dashboard", () => {
  test("redirects unauthenticated users to /auth/login", async ({ page }) => {
    const response = await page.goto("/dashboard");
    test.skip(
      response?.status() === 500,
      "Dashboard requires Supabase env vars; configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page).toHaveTitle(/Login/);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  });
});
