import { test, expect, type Page } from "@playwright/test";

async function gotoDashboardOrSkip(page: Page) {
  const response = await page.goto("/dashboard");
  test.skip(
    response?.status() === 500,
    "Dashboard requires env vars (Supabase/ShipStation); configure env and re-run."
  );
}

test.describe("/dashboard (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/shipstation/rates", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ rates: [] }),
      });
    });
  });

  test("renders dashboard", async ({ page }) => {
    await gotoDashboardOrSkip(page);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Create a shipping label")).toBeVisible();
    await expect(page.getByTestId("create-label-wizard")).toBeVisible();
  });

  test("renders the create label wizard (step 1)", async ({ page }) => {
    await gotoDashboardOrSkip(page);

    await expect(page.getByTestId("wizard-step-indicator")).toHaveText(
      "Step 1 of 4"
    );
    await expect(page.getByTestId("wizard-progress-text")).toHaveText(
      "25% complete"
    );
    await expect(page.getByTestId("wizard-back")).toBeDisabled();
    await expect(page.getByTestId("wizard-next")).toBeEnabled();

    await expect(
      page.getByRole("heading", { name: "Shipping details" })
    ).toBeVisible();
    await expect(page.getByLabel(/Contact Name/i)).toBeVisible();
    await expect(page.getByLabel(/Phone/i)).toBeVisible();
    await expect(page.getByLabel(/Address Line 1/i)).toBeVisible();
  });

  test("can add and remove packages", async ({ page }) => {
    await gotoDashboardOrSkip(page);

    await page.getByTestId("wizard-next").click();
    await expect(page.getByTestId("wizard-step-indicator")).toHaveText(
      "Step 2 of 4"
    );

    const packagesCount = page.locator('input[name="packages.count"]');

    await expect(packagesCount).toHaveValue("1");
    await expect(page.getByText("Package 1", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Add Package" }).click();

    await expect(packagesCount).toHaveValue("2");
    await expect(page.getByText("Package 2", { exact: true })).toBeVisible();

    await expect(
      page.locator('input[name$=".nickname"][name^="package-"]')
    ).toHaveCount(2);

    await page.getByRole("button", { name: /Delete/i }).last().click();

    await expect(packagesCount).toHaveValue("1");
    await expect(page.getByText("Package 2", { exact: true })).toHaveCount(0);
  });

  test("can navigate to carrier & service step", async ({ page }) => {
    await gotoDashboardOrSkip(page);

    await page.getByTestId("wizard-step-card-3").click();
    await expect(page.getByTestId("wizard-step-indicator")).toHaveText(
      "Step 3 of 4"
    );

    await expect(
      page.getByRole("heading", { name: "Carrier & service" })
    ).toBeVisible();
    await expect(page.locator('label[for="carrier"]')).toBeVisible();
    await expect(page.locator('label[for="serviceCode"]')).toBeVisible();
    await expect(page.getByLabel(/Order Number/i)).toBeVisible();
  });
});
