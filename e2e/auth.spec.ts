import { expect, test } from "@playwright/test";

const ownerPassword = process.env.E2E_OWNER_PASSWORD || "admin";
const staffPassword = process.env.E2E_STAFF_PASSWORD || "staff";

async function signIn(page: import("@playwright/test").Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("owner can open agreement administration", async ({ page }) => {
  await signIn(page, "admin", ownerPassword);
  await expect(page.getByRole("link", { name: "Agreements" })).toBeVisible();
  await page.goto("/admin/agreements");
  await expect(page.getByRole("heading", { name: "Agreement templates" })).toBeVisible();
});

test("staff is denied owner-only agreement administration", async ({ page }) => {
  await signIn(page, "staff", staffPassword);
  await expect(page.getByRole("link", { name: "Agreements" })).toHaveCount(0);
  await page.goto("/admin/agreements");
  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await expect(page.getByRole("heading", { name: "Owner access is required" })).toBeVisible();
});

test("invalid credentials do not create a session", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("The username or password is incorrect.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
});
