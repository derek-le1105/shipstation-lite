import { test, expect, type Page } from "@playwright/test";

async function gotoDashboardOrSkip(page: Page) {
  const response = await page.goto("/dashboard");
  test.skip(
    response?.status() === 500,
    "Dashboard requires env vars (Supabase/ShipStation); configure env and re-run."
  );
}

function shouldSkipCreateLabel(): string | null {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return "Missing Supabase client env vars.";
  }
  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SECRET_KEY
  ) {
    return "Missing Supabase service role env var.";
  }
  if (!process.env.SHIPSTATION_API_KEY || !process.env.SHIPSTATION_API_SECRET) {
    return "Missing ShipStation API env vars.";
  }
  return null;
}

async function selectOptionByComboboxIndex(
  page: Page,
  index: number,
  optionName: string
) {
  await page.getByRole("combobox").nth(index).click();
  await page.getByRole("option", { name: optionName }).click();
}

async function fillNewAddress(page: Page) {
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Create New Address" }).click();

  await page.getByLabel(/Contact Name/i).fill("Jane Doe");
  await page.getByLabel(/Phone/i).fill("6265551212");
  await page.getByLabel(/Address Line 1/i).fill("123 Market St");
  await page.getByLabel(/City/i).fill("Rosemead");
  await selectOptionByComboboxIndex(page, 1, "California");
  await page.getByLabel(/Postal Code/i).fill("91770");
}

async function fillPackageDetails(page: Page) {
  await page.getByLabel("Length").fill("5");
  await page.getByLabel("Width").fill("5");
  await page.getByLabel("Height").fill("5");
  await page.getByLabel(/^Weight$/).fill("2");
}

async function selectCarrierAndService(page: Page) {
  await page.getByLabel(/Carrier/i).click();
  await page.getByRole("option").first().click();
  await page.getByLabel(/Service/i).click();
  await page.getByRole("option").first().click();
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
        await expect(page.getByTestId("wizard-next")).toHaveText(
          /Create label/
        );
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
    await expect(
      page.getByRole("heading", { name: "Carrier & service" })
    ).toBeVisible();

    await page.getByTestId("wizard-step-card-1").click();
    await expect(page.getByTestId("wizard-step-indicator")).toHaveText(
      "Step 1 of 4"
    );
    await expect(
      page.getByRole("heading", { name: "Shipping details" })
    ).toBeVisible();
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

  test("creates a shipping label and shows success feedback", async ({
    page,
  }) => {
    const skipReason = shouldSkipCreateLabel();
    test.skip(!!skipReason, skipReason ?? "");

    await gotoDashboardOrSkip(page);
    await fillNewAddress(page);

    await page.getByTestId("wizard-next").click();
    await fillPackageDetails(page);

    await page.getByTestId("wizard-next").click();
    await selectCarrierAndService(page);

    await page.getByTestId("wizard-next").click();
    await expect(page.getByTestId("wizard-step-indicator")).toHaveText(
      "Step 4 of 4"
    );

    await page.getByTestId("wizard-next").click();

    await expect(
      page.getByText("Label created successfully.", { exact: false })
    ).toBeVisible({ timeout: 60_000 });
  });

  test("shows an error when package weight is invalid", async ({ page }) => {
    const skipReason = shouldSkipCreateLabel();
    test.skip(!!skipReason, skipReason ?? "");

    await gotoDashboardOrSkip(page);
    await fillNewAddress(page);

    await page.getByTestId("wizard-next").click();
    await page.getByLabel("Length").fill("5");
    await page.getByLabel("Width").fill("5");
    await page.getByLabel("Height").fill("5");
    await page.getByLabel(/^Weight$/).fill("0");

    await page.getByTestId("wizard-next").click();

    await selectCarrierAndService(page);

    await page.getByTestId("wizard-next").click();
    await page.getByTestId("wizard-next").click();

    await expect(page.getByText(/Unable to create label/i)).toBeVisible({
      timeout: 30_000,
    });
  });
});
