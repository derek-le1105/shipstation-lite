import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const authFile = path.join(process.cwd(), "playwright/.auth/user.json");

function loadDotEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const key = match[1]!;
    let value = match[2] ?? "";
    value = value.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

setup("authenticate", async ({ page }) => {
  loadDotEnv(path.join(process.cwd(), ".env"));

  const email = process.env.E2E_EMAIL ?? process.env.TEST_USERNAME!;
  const password = process.env.E2E_PASSWORD ?? process.env.TEST_PASSWORD!;

  setup.skip(
    !email || !password,
    "Set E2E_EMAIL/E2E_PASSWORD (or TEST_USERNAME/TEST_PASSWORD) for login."
  );

  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Login" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByText("Create a shipping label")).toBeVisible();

  await page.context().storageState({ path: authFile });
});
