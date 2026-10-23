import { expect, test } from "@playwright/test";
import { createDemoDesign } from "../apps/playground/src/demo.js";

test("layer selection stays open and editing is a separate action", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  const rows = page.getByRole("row");
  await expect(rows).toHaveCount(3);
  await rows.nth(1).click();
  await expect(page.getByRole("grid", { name: "Elementy", exact: true })).toBeVisible();
  await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");
  await rows.nth(1).getByRole("button", { name: "Edytuj", exact: true }).click();
  await expect(page.getByLabel("Twój tekst")).toBeVisible();
});

test("buttons reorder top-first rows and one undo restores document order", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  const rows = page.getByRole("row");
  const names = await rows.allTextContents();
  await expect(
    rows.first().getByRole("button", { name: "Przenieś wyżej", exact: true }),
  ).toBeDisabled();
  await rows.first().getByRole("button", { name: "Przenieś niżej", exact: true }).click();
  await expect(rows.nth(1)).toHaveText(names[0]!);
  await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(
    rows.nth(1).getByRole("button", { name: "Przenieś wyżej", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Cofnij", exact: true }).click();
  expect(await rows.allTextContents()).toEqual(names);
});

test("keyboard drag cancels with Escape without closing the list", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  const rows = page.getByRole("row");
  const names = await rows.allTextContents();
  const handle = rows.first().getByRole("button", { name: "Przeciągnij warstwę", exact: true });
  await handle.focus();
  await page.keyboard.press("Enter");
  // React Aria installs keyboard drag listeners before focusing the initial drop target.
  await expect(page.locator(".rf-layer-drop[data-drop-target]").getByRole("button")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("grid", { name: "Elementy", exact: true })).toBeVisible();
  await expect(rows).toHaveText(names);
  await expect(handle).toBeFocused();
});

test("keyboard drag commits only at drop and retains focus", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  const rows = page.getByRole("row");
  const names = await rows.allTextContents();
  const handle = rows.first().getByRole("button", { name: "Przeciągnij warstwę", exact: true });
  await handle.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("button", { name: "Cofnij", exact: true })).toBeDisabled();
  await page.keyboard.press("Enter");
  await expect(rows.nth(1)).toHaveText(names[0]!);
  await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(rows.nth(1)).toBeFocused();
});

for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [820, 1180],
  [390, 844],
]) {
  test(`mouse drag reorders the document at ${width}x${height}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width: width!, height: height! });
    await page.goto("/");
    await page.getByRole("button", { name: "Elementy", exact: true }).click();
    const rows = page.getByRole("row");
    const names = await rows.allTextContents();
    const handle = rows.first().getByRole("button", { name: "Przeciągnij warstwę", exact: true });
    const start = (await handle.boundingBox())!;
    const list = page.locator(".rf-layer-list");
    const bounds = (await list.boundingBox())!;
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(start.x + start.width / 2 + 8, start.y + start.height / 2 + 8, {
      steps: 3,
    });
    await page.mouse.move(bounds.x + 100, bounds.y + bounds.height - 4, { steps: 12 });
    // Firefox delegates native drag autoscroll to the platform; scroll explicitly in automation.
    if (browserName === "firefox") await page.mouse.wheel(0, 500);
    await expect
      .poll(() => list.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 2))
      .toBe(true);
    const target = (await page.locator(".rf-layer-row").nth(2).boundingBox())!;
    await page.mouse.move(target.x + 100, target.y + target.height - 3, { steps: 4 });
    await page.mouse.up();
    await expect(rows.last()).toHaveText(names[0]!);
    await expect
      .poll(() =>
        page.evaluate(() =>
          JSON.parse(localStorage.getItem("fabrio-mug")!).areas.wrap.map(
            (e: { id: string }) => e.id,
          ),
        ),
      )
      .toEqual(["heart", "memory-photo", "title"]);
    const box = await page.locator(".rf-layer-list").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width!);
    await page.screenshot({ path: `test-results/layers-${width}-${height}.png` });
  });
}

for (const end of ["touchEnd", "touchCancel"] as const) {
  test(`touch handle drag ${end}`, async ({ page, context, hasTouch, browserName }) => {
    test.skip(!hasTouch || browserName !== "chromium", "Touch gestures use Chromium CDP");
    await page.goto("/");
    await page.getByRole("button", { name: "Elementy", exact: true }).tap();
    const rows = page.locator(".rf-layer-row");
    const names = await rows.allTextContents();
    const start = (await rows
      .first()
      .getByRole("button", { name: "Przeciągnij warstwę" })
      .boundingBox())!;
    const target = (await rows.nth(1).boundingBox())!;
    const cdp = await context.newCDPSession(page);
    const x = start.x + start.width / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y: start.y + start.height / 2 }],
    });
    for (let step = 1; step <= 10; step++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x,
            y:
              start.y +
              start.height / 2 +
              ((target.y + target.height - 4 - start.y - start.height / 2) * step) / 10,
          },
        ],
      });
    }
    await expect(page.getByRole("button", { name: "Cofnij", exact: true })).toBeDisabled();
    await cdp.send("Input.dispatchTouchEvent", { type: end, touchPoints: [] });
    if (end === "touchEnd") await expect(rows.nth(1)).toHaveText(names[0]!);
    else {
      expect(await rows.allTextContents()).toEqual(names);
      await expect(page.getByRole("button", { name: "Cofnij", exact: true })).toBeDisabled();
    }
  });
}

test("protected positions disable actions and exclude crossing drop targets", async ({ page }) => {
  await page.goto("/");
  const design = createDemoDesign();
  design.areas.wrap![1]!.id = "protected-text";
  design.areas.wrap![1]!.permissions = { reorder: false };
  if (design.areas.wrap![1]!.type === "text") design.areas.wrap[1].text = "Protected position";
  await page.getByText("Projekt", { exact: true }).click();
  await page.getByLabel("Wczytaj projekt JSON", { exact: true }).setInputFiles({
    name: "protected.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(design)),
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".rf-areas")).toContainText("Protected position");
  if ((await page.locator(".rf-project-menu").getAttribute("open")) !== null)
    await page.getByText("Projekt", { exact: true }).click();
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  const rows = page.locator(".rf-layer-row");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1).getByRole("button", { name: "Przeciągnij warstwę" })).toBeDisabled();
  await expect(rows.first().getByRole("button", { name: "Przenieś niżej" })).toBeDisabled();
  await expect(rows.last().getByRole("button", { name: "Przenieś wyżej" })).toBeDisabled();
  const names = await rows.allTextContents();
  await rows.first().getByRole("button", { name: "Przeciągnij warstwę" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  expect(await rows.allTextContents()).toEqual(names);
  await expect(page.getByRole("button", { name: "Cofnij", exact: true })).toBeDisabled();
});

test("starting confirmation cancels the active drag without changing history", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  const rows = page.locator(".rf-layer-row");
  const names = await rows.allTextContents();
  const handle = (await rows
    .first()
    .getByRole("button", { name: "Przeciągnij warstwę" })
    .boundingBox())!;
  await page.mouse.move(handle.x + 10, handle.y + 10);
  await page.mouse.down();
  await page.mouse.move(handle.x + 20, handle.y + 30, { steps: 5 });
  // Simulate confirmation initiated while the pointer gesture is still active.
  await page
    .locator(".rf-header .rf-primary")
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByRole("status")).toContainText("Projekt gotowy");
  await page.mouse.up();
  expect(await rows.allTextContents()).toEqual(names);
  await expect(page.getByRole("button", { name: "Cofnij", exact: true })).toBeDisabled();
});

test("switching decoration areas cancels the drag", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Produkt", { exact: true }).selectOption("shirt");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  const handle = (await page
    .locator(".rf-layer-row")
    .first()
    .getByRole("button", { name: "Przeciągnij warstwę" })
    .boundingBox())!;
  await page.mouse.move(handle.x + 10, handle.y + 10);
  await page.mouse.down();
  await page.mouse.move(handle.x + 20, handle.y + 30, { steps: 5 });
  await page
    .locator(".rf-areas button")
    .filter({ hasText: "Tył" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator(".rf-layer-row")).toHaveCount(0);
  await page.mouse.up();
  // WebKit suppresses pointer clicks after the native drag source is unmounted.
  const front = page.locator(".rf-areas button").filter({ hasText: "Przód" });
  await front.press("Enter");
  await expect(front).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Elementy", exact: true }).press("Enter");
  await expect(page.locator(".rf-layer-row")).toHaveCount(2);
});

test("advanced ordering also announces the final position", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  await page
    .locator(".rf-layer-row")
    .nth(1)
    .getByRole("button", { name: "Edytuj", exact: true })
    .click();
  await page.getByText("Zaawansowane", { exact: true }).click();
  await page.getByRole("button", { name: "Przenieś wyżej", exact: true }).click();
  await expect(page.locator(".rf-sr-only")).toContainText("Pozycja warstwy 1 z 3.");
});
