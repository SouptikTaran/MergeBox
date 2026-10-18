import { expect, test, type Page } from "@playwright/test";

const account = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "connected@example.com",
  status: "active",
};
async function backend(
  page: Page,
  options: {
    anonymous?: boolean;
    empty?: boolean;
    reconnect?: boolean;
    unavailable?: boolean;
  } = {},
) {
  let signedIn = !options.anonymous;
  let connected = !options.empty;
  const writes: { path: string; csrf: string | undefined }[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      "access-control-allow-origin": "http://localhost:3000",
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "X-CSRF-Token, Content-Type",
      "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    };
    const send = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        headers,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (options.unavailable)
      return send({ error: { message: "Service unavailable" } }, 503);
    if (!signedIn) return send({ error: { message: "Sign in to continue." } }, 401);
    if (url.pathname === "/api/auth/me")
      return send({
        user: {
          id: "user",
          email: "owner@example.com",
          name: "Test Owner",
          plan: "free",
        },
        csrfToken: "test-csrf",
      });
    if (request.method() !== "GET")
      writes.push({ path: url.pathname, csrf: request.headers()["x-csrf-token"] });
    if (url.pathname === "/api/auth/logout") {
      signedIn = false;
      return route.fulfill({ status: 204, headers });
    }
    if (url.pathname.endsWith("/connect") || url.pathname.endsWith("/reconnect"))
      return send({
        authorizationUrl:
          "https://accounts.google.com/o/oauth2/v2/auth?scope=openid%20https://www.googleapis.com/auth/drive.metadata.readonly&access_type=offline&prompt=consent",
      });
    if (request.method() === "DELETE") {
      connected = false;
      return route.fulfill({ status: 204, headers });
    }
    const activeAccount = {
      ...account,
      status: options.reconnect ? "reconnect" : "active",
    };
    if (url.pathname === "/api/drive/accounts")
      return send({ accounts: connected ? [activeAccount] : [] });
    if (url.pathname === "/api/drive/storage")
      return send({
        accounts: connected
          ? [
              {
                ...activeAccount,
                quota: options.reconnect
                  ? null
                  : {
                      used: "4000000000",
                      total: "15000000000",
                      free: "11000000000",
                      driveUsed: "1000000000",
                      trashUsed: "0",
                      capacityKind: "personal",
                      includedInTotal: true,
                    },
                error: options.reconnect ? "reconnect_required" : null,
              },
            ]
          : [],
        combined: {
          used: connected ? "4000000000" : "0",
          total: connected ? "15000000000" : "0",
          free: connected ? "11000000000" : "0",
          complete: true,
          excludedAccountIds: [],
        },
        partial: false,
      });
    if (url.pathname === "/api/drive/files")
      return send({
        files: connected
          ? [
              {
                id: "live-file",
                name: url.searchParams.has("pageToken")
                  ? "Next page.pdf"
                  : "Connected file.pdf",
                mimeType: "application/pdf",
                size: "2048",
                modifiedTime: "2026-10-18T10:00:00Z",
                accountId: account.id,
                accountEmail: account.email,
                webViewLink: "https://drive.google.com/file/d/live-file/view",
              },
            ]
          : [],
        total: connected ? 51 : 0,
        nextPageToken: url.searchParams.has("pageToken") ? null : "next",
        partial: false,
        errors: [],
        fetchedAt: "2026-10-18T10:00:00Z",
      });
    return send({ error: { message: "Unmodeled endpoint" } }, 501);
  });
  return {
    writes,
    expire: () => {
      signedIn = false;
    },
  };
}

test("signed-out visitors cannot render any workspace route", async ({ page }) => {
  await backend(page, { anonymous: true });
  for (const path of ["/", "/files", "/drives", "/settings", "/help"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
    await expect(page.locator("#main-content")).toHaveCount(0);
  }
});
test("session outages show retry without exposing the dashboard", async ({ page }) => {
  await backend(page, { unavailable: true });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Retry connection" })).toBeVisible();
  await expect(page.locator("#main-content")).toHaveCount(0);
});
test("dashboard displays API quotas and empty accounts never show sample data", async ({
  page,
}) => {
  await backend(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: account.email })).toBeVisible();
  await expect(page.getByText("11 GB", { exact: true })).toBeVisible();
  await expect(page.getByText(/sample|preview workspace/i)).toHaveCount(0);
});
test("empty accounts show a real consent action", async ({ page }) => {
  const api = await backend(page, { empty: true });
  await page.route("https://accounts.google.com/**", (route) =>
    route.fulfill({ body: "Google consent" }),
  );
  await page.goto("/");
  await expect(page.getByText("A fresh start for your files")).toBeVisible();
  await page.getByRole("button", { name: "Connect drive", exact: true }).first().click();
  await expect(page).toHaveURL(/accounts.google.com/);
  expect(new URL(page.url()).searchParams.get("scope")).toContain(
    "drive.metadata.readonly",
  );
  expect(api.writes).toEqual([
    { path: "/api/drive/accounts/connect", csrf: "test-csrf" },
  ]);
});
test("files use API data, pagination, sorting, account filter and Google links", async ({
  page,
}) => {
  await backend(page);
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/drive/files")) requests.push(r.url());
  });
  await page.goto("/files");
  await page.getByRole("button", { name: "Connected file.pdf" }).click();
  await expect(page.getByRole("link", { name: "Open in Google Drive" })).toHaveAttribute(
    "href",
    "https://drive.google.com/file/d/live-file/view",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next page.pdf" })).toBeVisible();
  await page.getByLabel("Sort files", { exact: true }).selectOption("size");
  await expect(page.getByRole("button", { name: "Connected file.pdf" })).toBeVisible();
  await page.getByLabel("Filter by account").selectOption(account.id);
  await expect.poll(() => requests.at(-1)).toContain(`accountId=${account.id}`);
  expect(requests.some((r) => r.includes("pageToken=next"))).toBe(true);
  expect(requests.some((r) => r.includes("sort=size"))).toBe(true);
});
test("disconnect requires confirmation and removes real account data", async ({
  page,
}) => {
  const api = await backend(page);
  await page.goto("/drives");
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  expect(api.writes).toEqual([]);
  await page.getByRole("button", { name: "Confirm disconnect" }).click();
  await expect(page.getByText("A fresh start for your files")).toBeVisible();
  expect(api.writes[0]).toEqual({
    path: `/api/drive/accounts/${account.id}`,
    csrf: "test-csrf",
  });
});
test("reconnect requests a fresh Google grant", async ({ page }) => {
  const api = await backend(page, { reconnect: true });
  await page.route("https://accounts.google.com/**", (route) =>
    route.fulfill({ body: "Google consent" }),
  );
  await page.goto("/drives");
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(page).toHaveURL(/accounts.google.com/);
  expect(api.writes[0].path).toBe(`/api/drive/accounts/${account.id}/reconnect`);
});
test("expired sessions and logout remove the workspace", async ({ page }) => {
  const api = await backend(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: account.email })).toBeVisible();
  api.expire();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("#main-content")).toHaveCount(0);
});
test("logout invalidates the session and redirects to login", async ({ page }) => {
  const api = await backend(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(api.writes[0]).toEqual({ path: "/api/auth/logout", csrf: "test-csrf" });
});
test("connected workspace fits mobile and renders without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await backend(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/files", "/drives", "/settings", "/help"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      path,
    ).toBe(false);
  }
  expect(errors).toEqual([]);
});
