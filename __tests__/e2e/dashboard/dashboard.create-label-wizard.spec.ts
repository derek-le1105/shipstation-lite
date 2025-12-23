import { test, expect, type Page } from "@playwright/test";

async function gotoDashboardOrSkip(page: Page) {
  const response = await page.goto("/dashboard");
  test.skip(
    response?.status() === 500,
    "Dashboard requires env vars (Supabase/ShipStation); configure env and re-run."
  );
}

test.describe("create-label-wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/shipstation/rates", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ rates: [] }),
      });
    });
  });

  test("renders step indicator, progress, and button states", async ({
    page,
  }) => {
    await gotoDashboardOrSkip(page);

    const wizard = page.getByTestId("create-label-wizard");
    await expect(wizard).toBeVisible();

    await expect(page.getByTestId("wizard-step-indicator")).toHaveText(
      "Step 1 of 4"
    );
    await expect(page.getByTestId("wizard-progress-text")).toHaveText(
      "25% complete"
    );
    await expect(page.getByTestId("wizard-progress-bar")).toHaveAttribute(
      "style",
      /width:\s*25%/
    );

    await expect(page.getByTestId("wizard-back")).toBeDisabled();
    await expect(page.getByTestId("wizard-next")).toBeEnabled();
    await expect(page.getByTestId("wizard-next")).toHaveText("Next");
  });

  test("navigates Next/Back through all steps", async ({ page }) => {
    await gotoDashboardOrSkip(page);

    for (let step = 1; step <= 4; step++) {
      await expect(page.getByTestId("wizard-step-indicator")).toHaveText(
        `Step ${step} of 4`
      );
      await expect(page.getByTestId("wizard-progress-text")).toHaveText(
        `${step * 25}% complete`
      );

      if (step < 4) {
        await expect(page.getByTestId("wizard-next")).toHaveText("Next");
        await page.getByTestId("wizard-next").click();
      } else {
        await expect(page.getByTestId("wizard-next")).toHaveText(/Create label/);
      }
    }

    await page.getByTestId("wizard-back").click();
    await expect(page.getByTestId("wizard-step-indicator")).toHaveText(
      "Step 3 of 4"
    );
  });

  test("can jump to a step via the step cards", async ({ page }) => {
    await gotoDashboardOrSkip(page);

    await page.getByTestId("wizard-step-card-3").click();
    await expect(page.getByTestId("wizard-step-indicator")).toHaveText(
      "Step 3 of 4"
    );
    await expect(page.getByRole("heading", { name: "Carrier & service" })).toBeVisible();

    await page.getByTestId("wizard-step-card-1").click();
    await expect(page.getByTestId("wizard-step-indicator")).toHaveText(
      "Step 1 of 4"
    );
    await expect(page.getByRole("heading", { name: "Shipping details" })).toBeVisible();
  });

  test("negative assertion: wrong step text is not shown", async ({ page }) => {
    await gotoDashboardOrSkip(page);

    await expect(page.getByText("Step 5 of 4")).toHaveCount(0);
  });

  test("expected failure example: incorrect total steps", async ({ page }) => {
    test.fail(true, "Example of an expected-failing assertion.");

    await gotoDashboardOrSkip(page);
    await expect(page.getByTestId("wizard-step-indicator")).toHaveText(
      "Step 1 of 5"
    );
  });
});
