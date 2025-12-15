import { test, expect } from "@playwright/test";

test.describe("/dashboard (authenticated)", () => {
  test("renders dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Create a shipping label")).toBeVisible();
  });
});

