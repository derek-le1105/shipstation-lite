import { test, expect } from "@playwright/test";

test.describe("/dashboard (authenticated)", () => {
  test("renders dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Create a shipping label")).toBeVisible();
  });

  test("renders create label form sections", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("group", { name: "Ship from" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Ship to" })).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Shipment Details" })
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Package Details" })
    ).toBeVisible();

    const shipFrom = page.getByRole("group", { name: "Ship from" });
    await expect(
      shipFrom.getByRole("textbox", { name: /Contact Name/i })
    ).toBeVisible();
    await expect(
      shipFrom.getByRole("textbox", { name: /Phone/i })
    ).toBeVisible();
    await expect(
      shipFrom.getByRole("textbox", { name: /Address Line 1/i })
    ).toBeVisible();
    await expect(
      shipFrom.getByRole("textbox", { name: /City/i })
    ).toBeVisible();
    await expect(
      shipFrom.getByRole("textbox", { name: /Postal Code/i })
    ).toBeVisible();

    const shipmentDetails = page.getByRole("group", {
      name: "Shipment Details",
    });
    await expect(
      shipmentDetails.getByText("Carrier", { exact: true })
    ).toBeVisible();
    await expect(
      shipmentDetails.getByText("Service", { exact: true })
    ).toBeVisible();
    await expect(
      shipmentDetails.getByRole("textbox", { name: /Order Number/i })
    ).toBeVisible();

    const packageDetails = page.getByRole("group", { name: "Package Details" });
    await expect(
      packageDetails.getByRole("button", { name: "Add Package" })
    ).toBeVisible();
    await expect(page.locator('input[name="packages.count"]')).toHaveValue("1");
  });

  test("can add and remove packages", async ({ page }) => {
    await page.goto("/dashboard");

    const packageDetails = page.getByRole("group", { name: "Package Details" });
    const packagesCount = page.locator('input[name="packages.count"]');

    await expect(packagesCount).toHaveValue("1");
    await expect(packageDetails.getByText("Package 1")).toBeVisible();

    await packageDetails.getByRole("button", { name: "Add Package" }).click();

    await expect(packagesCount).toHaveValue("2");
    await expect(packageDetails.getByText("Package 2")).toBeVisible();

    await expect(
      page.locator('input[name$=".nickname"][name^="package-"]')
    ).toHaveCount(2);

    await packageDetails
      .getByRole("button", { name: /Delete/i })
      .last()
      .click();

    await expect(packagesCount).toHaveValue("1");
    await expect(packageDetails.getByText("Package 2")).toHaveCount(0);
  });
});
