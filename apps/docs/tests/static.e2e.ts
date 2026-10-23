import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

test("nested documentation renders and reloads without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/react-fabrio/docs/agents/domain/");
  await expect(
    page.getByRole("heading", { name: "Domain orientation", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Domain orientation", exact: true }),
  ).toBeVisible();
  await context.close();
});

test("static agent endpoints return text", async ({ request }) => {
  for (const path of [
    "llms.txt",
    "llms-full.txt",
    "docs/content.md",
    "docs/agents/domain/content.md",
  ]) {
    const response = await request.get(`/react-fabrio/${path}`);
    expect(response.ok()).toBeTruthy();
    expect(await response.text()).not.toContain("<!DOCTYPE html>");
    expect((await response.text()).length).toBeGreaterThan(100);
  }
});

test("navigation, source and keyboard search work", async ({ page }, testInfo) => {
  await page.goto("/react-fabrio/docs/");
  await page.getByRole("link", { name: "Quick Start", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Quick Start", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View source", exact: true })).toHaveAttribute(
    "href",
    /github.com\/Imunal\/react-fabrio\/blob\/main\/apps\/docs\/content\/quick-start.md/,
  );
  await page.screenshot({ path: testInfo.outputPath("desktop.png"), fullPage: true });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy Markdown", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("# Quick Start");
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").fill("durable");
  await expect(dialog.getByRole("option").first()).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Page not found");
});

test("mobile navigation opens and follows a link", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/react-fabrio/docs/");
  await page.screenshot({ path: testInfo.outputPath("mobile.png"), fullPage: true });
  await page.getByRole("button", { name: /open sidebar/i }).click();
  await page
    .locator("#nd-sidebar-mobile")
    .getByRole("link", { name: "Quick Start", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Quick Start", exact: true })).toBeVisible();
});

test("every document has static HTML and Markdown with valid site links", async ({ request }) => {
  const files = readdirSync("content", { recursive: true })
    .map(String)
    .filter((file) => /\.mdx?$/.test(file));
  for (const file of files) {
    const slug = file.replace(/\.mdx?$/, "").replace(/(?:^|\/)index$/, "");
    const url = `/react-fabrio/docs/${slug ? `${slug}/` : ""}`;
    const html = await request.get(url);
    expect(html.status(), url).toBe(200);
    const body = await html.text();
    expect(body, url).toContain("<h1");
    expect(body, url).not.toContain("/react-fabrio/react-fabrio");
    expect(body, url).not.toMatch(/href="(?:\.\.\/|\.\/)[^"]*\.md/);
    const markdown = await request.get(`${url}content.md`);
    expect(markdown.status(), url).toBe(200);
    expect(await markdown.text(), url).toMatch(/^# /);
  }
  const unknown = await request.get("/react-fabrio/docs/nonexistent/");
  expect(unknown.status()).toBe(404);
});

test("deployment smoke script succeeds against the static site", () => {
  const workflow = readFileSync("../../.github/workflows/ci.yml", "utf8");
  const script = workflow.split("node --input-type=module <<'JS'\n")[1].split("          JS")[0];
  execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    env: { ...process.env, SITE_URL: "http://localhost:3000/react-fabrio/" },
  });
});
