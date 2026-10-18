import { expect, test } from "@playwright/test";

test("workspace search, file details, and explicit empty state", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/files");
  await expect(page.getByRole("heading", { name: "All files" })).toBeVisible();
  await page.getByRole("textbox", { name: "Search files" }).fill("Brand");
  await expect(page.getByRole("button", { name: "Brand guidelines.pdf" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Q4 planning.xlsx" })).toHaveCount(0);
  await page.getByRole("button", { name: "Brand guidelines.pdf" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search files" }).fill("no-such-file");
  await expect(page.getByText("No matching files")).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: "Exit preview", exact: true }).click();
  await expect(page.getByText("A fresh start for your files")).toBeVisible();
  expect(errors).toEqual([]);
});

test("auth routes expose the real Google flow and cross navigation", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "A little more room." })).toBeVisible();
  // Accept either a signed-out OAuth action or an existing live session.
  await expect(
    page.locator(
      'a[href$="/api/auth/google"]:visible, a:has-text("Open workspace"):visible',
    ),
  ).toBeVisible();
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("all routes fit a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/",
    "/files",
    "/drives",
    "/settings",
    "/help",
    "/login",
    "/signup",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, `${route} must not scroll horizontally`).toBe(false);
  }
});

test("overview and auth screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your space, in one place." }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/overview-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: "test-results/overview-dark.png", fullPage: true });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await page.screenshot({ path: "test-results/login-desktop.png", fullPage: true });
});
