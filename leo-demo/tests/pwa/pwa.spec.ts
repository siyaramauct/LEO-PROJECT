import { expect, test, type Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

async function openApp(page: Page) {
  await page.goto("/login");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
          once: true,
        });
      });
    }
  });
}

test("install metadata and branded icons are valid", async ({ page, request }) => {
  await openApp(page);
  await expect(page).toHaveTitle("LEO Vocabulary App");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({
    id: "/",
    name: "LEO Vocabulary App",
    start_url: "/",
    scope: "/",
    display: "standalone",
  });
  expect(manifest.icons).toHaveLength(3);
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBeTruthy();
    const metadata = await sharp(await response.body()).metadata();
    expect(`${metadata.width}x${metadata.height}`).toBe(icon.sizes);
    expect(metadata.format).toBe("png");
  }
  const appleIcon = await request.get("/icons/apple-touch-icon.png");
  expect(await sharp(await appleIcon.body()).metadata()).toMatchObject({ width: 180, height: 180 });
});

test("offline deep links show a branded fallback and reconnect to the same URL", async ({
  page,
  context,
}, testInfo) => {
  await openApp(page);
  await context.setOffline(true);
  await page.goto("/student/classrooms");
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await expect(page).toHaveURL(/\/student\/classrooms$/);
  expect(
    await page.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("offline.png"), fullPage: true });
  await context.setOffline(false);
  await page.getByRole("button", { name: "Try again" }).click();
  // No saved session in this test, so the existing route guard sends us to login.
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "You're offline" })).toHaveCount(0);
});

test("connection changes do not erase an open form", async ({ page, context }, testInfo) => {
  await openApp(page);
  const email = page.locator('input[type="email"]');
  await email.fill("unfinished@example.com");
  await context.setOffline(true);
  await expect(page.getByText("You are offline", { exact: true })).toBeVisible();
  await expect(email).toHaveValue("unfinished@example.com");
  const status = page.getByRole("complementary", { name: "App status" });
  const bounds = await status.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: testInfo.outputPath("connection-status.png"), fullPage: true });
  await context.setOffline(false);
  await expect(status).toHaveCount(0);
  await expect(email).toHaveValue("unfinished@example.com");
});

test("service worker never stores auth URLs, API responses or private documents", async ({
  page,
}) => {
  await openApp(page);
  await page.evaluate(async () => {
    for (const path of [
      "/auth/v1/user",
      "/rest/v1/profiles",
      "/functions/v1/lesson",
      "/storage/v1/object/sign/documents/example.pdf",
    ]) {
      await fetch(path);
    }
  });
  await page.goto("/login?code=pwa-test-sensitive-code");
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const requests = await Promise.all(keys.map(async (key) => (await caches.open(key)).keys()));
    return requests.flat().map((request) => request.url);
  });
  expect(cached.length).toBeGreaterThan(0);
  for (const url of cached) {
    const parsed = new URL(url);
    expect(parsed.origin).toBe("http://127.0.0.1:4175");
    expect(parsed.pathname).toMatch(
      /^\/(assets\/[^/]+\.(js|css)|icons\/[^/]+\.png|logo-[^/]+\.svg|offline\.html|manifest\.webmanifest)$/,
    );
    expect(url).not.toContain("pwa-test-sensitive-code");
  }
});

test("a new worker waits for consent before reloading", async ({ page, context }, testInfo) => {
  await openApp(page);
  const email = page.locator('input[type="email"]');
  await email.fill("unfinished@example.com");
  const otherTab = await context.newPage();
  await openApp(otherTab);
  await otherTab.locator('input[type="email"]').fill("another-tab@example.com");
  const otherDocument = await otherTab.evaluate(() => performance.timeOrigin);
  const workerPath = new URL("../../.pwa-test-dist/sw.js", import.meta.url);
  const original = await readFile(workerPath, "utf8");
  try {
    // Simulate a deployment by changing the served worker, not by mocking the UI.
    await writeFile(workerPath, `${original}\n// update test ${Date.now()}\n`);
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await expect(page.getByText("A LEO update is ready")).toBeVisible();
    await expect(email).toHaveValue("unfinished@example.com");
    await page.screenshot({ path: testInfo.outputPath("update.png"), fullPage: true });
    const initialDocument = await page.evaluate(() => performance.timeOrigin);
    const reloaded = page.waitForEvent("domcontentloaded");
    await page.getByRole("button", { name: "Reload", exact: true }).click();
    await reloaded;
    // Browsers may restore form values after reload; verify a new document instead.
    expect(await page.evaluate(() => performance.timeOrigin)).toBeGreaterThan(initialDocument);
    await expect(page.getByText("A LEO update is ready")).toHaveCount(0);
    expect(await otherTab.evaluate(() => performance.timeOrigin)).toBe(otherDocument);
    await expect(otherTab.locator('input[type="email"]')).toHaveValue("another-tab@example.com");
  } finally {
    await writeFile(workerPath, original);
  }
});
