import { test, expect } from "@playwright/test";

test.describe("/dashboard create label", () => {
  test("creates a shipping label and shows success feedback", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const packageDetails = page.getByRole("group", { name: "Package Details" });
    await packageDetails.getByLabel("Weight").fill("2");

    await packageDetails.getByLabel("Length").fill("5");
    await packageDetails.getByLabel("Width").fill("5");
    await packageDetails.getByLabel("Height").fill("5");

    await page.getByRole("button", { name: /Create label/i }).click();

    await expect(
      page.getByText("Label created successfully.", { exact: false })
    ).toBeVisible({ timeout: 15000 });
  });

  test("resets the form fields after creating a label", async ({ page }) => {
    await page.goto("/dashboard");

    const packageDetails = page.getByRole("group", { name: "Package Details" });
    await packageDetails.getByLabel("Weight").fill("2");

    await packageDetails.getByLabel("Length").fill("5");
    await packageDetails.getByLabel("Width").fill("5");
    await packageDetails.getByLabel("Height").fill("5");

    await page.getByRole("button", { name: /Create label/i }).click();

    await expect(
      page.getByText("Label created successfully.", { exact: false })
    ).toBeVisible({ timeout: 15000 });

    await expect(packageDetails.getByLabel("Weight")).toHaveValue("");
    await expect(packageDetails.getByLabel("Length")).toHaveValue("");
    await expect(packageDetails.getByLabel("Width")).toHaveValue("");
    await expect(packageDetails.getByLabel("Height")).toHaveValue("");
  });
});
