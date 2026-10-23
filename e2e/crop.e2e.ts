import { expect, test } from "@playwright/test";
import { createDemoDesign } from "../apps/playground/src/demo.js";
import type { Page } from "@playwright/test";

const loadDesign = async (page: Page, design: ReturnType<typeof createDemoDesign>) => {
  const tool = page.locator(".rf-tools button").first();
  const oldId = (await tool.getAttribute("id"))!;
  await page.getByText("Projekt", { exact: true }).click();
  await page.getByLabel("Wczytaj projekt JSON", { exact: true }).setInputFiles({
    name: "crop-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(design)),
  });
  await expect(tool).not.toHaveAttribute("id", oldId);
};

const openCrop = async (page: Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  await page
    .getByRole("row", { name: "Zdjęcie memory", exact: true })
    .getByRole("button", { name: "Edytuj", exact: true })
    .click();
  await page.getByRole("button", { name: "Kadruj zdjęcie", exact: true }).first().click();
};
const photo = (page: Page) =>
  page.evaluate(() => {
    const saved = localStorage.getItem("fabrio-mug");
    return saved
      ? JSON.parse(saved).areas.wrap.find((e: { id: string }) => e.id === "memory-photo")
      : null;
  });

test("crop previews zoom and panning without saving until Apply, then one undo restores it", async ({
  page,
}) => {
  await openCrop(page);
  const frame = page.getByRole("group", { name: "Kadr zdjęcia", exact: true });
  await expect(frame).toBeVisible();
  await page.getByRole("slider", { name: "Powiększenie zdjęcia", exact: true }).fill("2");
  await expect(
    page.getByRole("button", { name: "Cofnij", exact: true, includeHidden: true }),
  ).toBeDisabled();
  expect(await photo(page)).toBeNull();
  const box = (await frame.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  const imageOffset = await frame.locator("img").evaluate((image) => image.style.left);
  await page.getByRole("button", { name: "Zastosuj kadr", exact: true }).click();
  await expect(frame).toHaveCount(0);
  const saved = await photo(page);
  expect(saved).toMatchObject({ x: 10, y: 12, width: 68, height: 45.333, rotation: 0 });
  expect(saved.crop.width).toBeCloseTo(0.5, 3);
  expect(saved.crop.x).toBeLessThan(0.25);
  expect(imageOffset).not.toBe("-50%");
  await page.getByRole("button", { name: "Cofnij", exact: true, includeHidden: true }).click();
  expect((await photo(page)).crop).toBeUndefined();
  await expect(
    page.getByRole("button", { name: "Cofnij", exact: true, includeHidden: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Ponów", exact: true }).click();
  expect((await photo(page)).crop).toEqual(saved.crop);
});

test("Escape cancels crop and applying an unchanged crop creates no history", async ({ page }) => {
  await openCrop(page);
  await page.getByRole("slider", { name: "Powiększenie zdjęcia", exact: true }).fill("2");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("group", { name: "Kadr zdjęcia", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Zdjęcia", exact: true })).toBeVisible();
  expect(await photo(page)).toBeNull();
  await page.getByRole("button", { name: "Kadruj zdjęcie", exact: true }).first().click();
  await page.getByRole("button", { name: "Zastosuj kadr", exact: true }).click();
  expect(await photo(page)).toBeNull();
  await expect(
    page.getByRole("button", { name: "Cofnij", exact: true, includeHidden: true }),
  ).toBeDisabled();
});

test("keyboard pan stays within the source and Fit resets the draft", async ({ page }) => {
  await openCrop(page);
  await page.getByRole("slider", { name: "Powiększenie zdjęcia", exact: true }).fill("2");
  const frame = page.getByRole("group", { name: "Kadr zdjęcia", exact: true });
  await frame.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press("Shift+ArrowRight");
  await expect(frame.locator("img")).toHaveCSS("left", "0px");
  await page.getByRole("button", { name: "Dopasuj do ramki", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Powiększenie zdjęcia", exact: true })).toHaveValue(
    "1",
  );
  await page.getByRole("button", { name: "Anuluj", exact: true }).click();
  expect(await photo(page)).toBeNull();
});

for (const end of ["touchEnd", "touchCancel"] as const) {
  test(`touch pan ${end} previews without saving`, async ({
    page,
    context,
    hasTouch,
    browserName,
  }) => {
    test.skip(!hasTouch || browserName !== "chromium", "Touch gestures use Chromium CDP");
    await openCrop(page);
    await page.getByRole("slider", { name: "Powiększenie zdjęcia", exact: true }).fill("2");
    const frame = page.getByRole("group", { name: "Kadr zdjęcia", exact: true });
    const box = (await frame.boundingBox())!;
    const cdp = await context.newCDPSession(page);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + (box.width * 0.2 * step) / 8, y }],
      });
    await cdp.send("Input.dispatchTouchEvent", { type: end, touchPoints: [] });
    expect(await photo(page)).toBeNull();
    await page.getByRole("button", { name: "Zastosuj kadr", exact: true }).click();
    const saved = await photo(page);
    if (end === "touchEnd") expect(saved.crop.x).toBeLessThan(0.25);
    else expect(saved.crop.x).toBeCloseTo(0.25, 3);
  });
}

test("changing tools cancels the crop draft", async ({ page }) => {
  await openCrop(page);
  await page.getByRole("slider", { name: "Powiększenie zdjęcia", exact: true }).fill("2");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await expect(page.getByRole("group", { name: "Kadr zdjęcia", exact: true })).toHaveCount(0);
  expect(await photo(page)).toBeNull();
  await page.getByRole("button", { name: "Zdjęcia", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Powiększenie zdjęcia", exact: true })).toHaveCount(
    0,
  );
});

test("confirmation discards an uncommitted crop", async ({ page }) => {
  await openCrop(page);
  await page.getByRole("slider", { name: "Powiększenie zdjęcia", exact: true }).fill("2");
  await page.getByRole("button", { name: "Zatwierdź projekt", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Projekt gotowy");
  await expect(page.getByRole("group", { name: "Kadr zdjęcia", exact: true })).toHaveCount(0);
  expect(await photo(page)).toBeNull();
});

for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [820, 1180],
  [390, 844],
  [390, 664],
]) {
  test(`crop frame and controls fit ${width}x${height}`, async ({ page, hasTouch }) => {
    test.skip(hasTouch, "Viewport coverage is independent of touch tests");
    await page.setViewportSize({ width: width!, height: height! });
    await openCrop(page);
    await page.getByRole("slider", { name: "Powiększenie zdjęcia", exact: true }).fill("2");
    await expect
      .poll(async () => {
        const frame = await page
          .getByRole("group", { name: "Kadr zdjęcia", exact: true })
          .boundingBox();
        const viewport = await page.locator(".rf-viewport").boundingBox();
        return (
          !!frame &&
          !!viewport &&
          frame.width > 0 &&
          frame.height > 0 &&
          frame.x >= viewport.x - 1 &&
          frame.y >= viewport.y - 1 &&
          frame.x + frame.width <= viewport.x + viewport.width + 1 &&
          frame.y + frame.height <= viewport.y + viewport.height + 1
        );
      })
      .toBe(true);
    const frame = (await page
      .getByRole("group", { name: "Kadr zdjęcia", exact: true })
      .boundingBox())!;
    const expectInsideViewport = (box: NonNullable<typeof frame>) => {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width!);
      expect(box.y + box.height).toBeLessThanOrEqual(height!);
    };
    expectInsideViewport(frame);
    // Compact panels scroll their crop actions independently of the workspace.
    const apply = page.getByRole("button", { name: "Zastosuj kadr", exact: true });
    await apply.scrollIntoViewIfNeeded();
    expectInsideViewport((await apply.boundingBox())!);
    await page.screenshot({ path: `test-results/crop-${width}-${height}.png` });
  });
}

test("Fit commits the displayed crop when the source and frame proportions differ", async ({
  page,
}) => {
  await page.goto("/");
  const design = createDemoDesign();
  const image = design.areas.wrap![0]!;
  image.id = "square-photo";
  image.height = image.width;
  await loadDesign(page, design);
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  await page
    .getByRole("row", { name: "Zdjęcie square", exact: true })
    .getByRole("button", { name: "Edytuj", exact: true })
    .click();
  await page.getByRole("button", { name: "Kadruj zdjęcie", exact: true }).first().click();
  await page.getByRole("button", { name: "Dopasuj do ramki", exact: true }).click();
  await page.getByRole("button", { name: "Zastosuj kadr", exact: true }).click();
  const saved = await page.evaluate(() => {
    const json = localStorage.getItem("fabrio-mug");
    return json
      ? JSON.parse(json).areas.wrap.find((e: { id: string }) => e.id === "square-photo")
      : null;
  });
  expect(saved?.crop?.x).toBeCloseTo(1 / 6, 6);
  expect(saved.crop.width).toBeCloseTo(2 / 3, 6);
  const viewBox = await page.locator(".rf-area-thumbnail svg").getAttribute("viewBox");
  expect(viewBox!.split(" ").map(Number)).toEqual([
    saved.crop.x,
    saved.crop.y,
    saved.crop.width,
    saved.crop.height,
  ]);
});

for (const restriction of ["locked", "edit"] as const) {
  test(`crop obeys ${restriction} protection`, async ({ page }) => {
    await page.goto("/");
    const design = createDemoDesign();
    if (restriction === "locked") design.areas.wrap![0]!.locked = true;
    else design.areas.wrap![0]!.permissions = { edit: false };
    await loadDesign(page, design);
    await page.getByRole("button", { name: "Elementy", exact: true }).click();
    await page
      .getByRole("row", { name: "Zdjęcie memory", exact: true })
      .getByRole("button", { name: "Edytuj", exact: true })
      .click();
    for (const button of await page
      .getByRole("button", { name: "Kadruj zdjęcie", exact: true })
      .all())
      await expect(button).toBeDisabled();
    await expect(page.getByRole("group", { name: "Kadr zdjęcia", exact: true })).toHaveCount(0);
  });
}

test("leaving crop restores workspace zoom and scrolling", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  await page
    .getByRole("row", { name: "Zdjęcie memory", exact: true })
    .getByRole("button", { name: "Edytuj", exact: true })
    .click();
  const fittedWidth = (await page.locator(".rf-product").boundingBox())!.width;
  await page.getByLabel("Zoom", { exact: true }).fill("3");
  const viewport = page.locator(".rf-viewport");
  await expect
    .poll(() =>
      viewport.evaluate((node, width) => {
        const surface = node.querySelector<HTMLElement>(".rf-product")!;
        // Zoom first resizes the project, then centers scrolling on the next animation frame.
        return (
          Math.abs(surface.getBoundingClientRect().width - width * 3) <= 1 &&
          Math.abs(node.scrollLeft - (node.scrollWidth - node.clientWidth) / 2) <= 1 &&
          Math.abs(node.scrollTop - (node.scrollHeight - node.clientHeight) / 2) <= 1
        );
      }, fittedWidth),
    )
    .toBe(true);
  const before = await viewport.evaluate((node) => {
    node.scrollLeft = 30;
    node.scrollTop = 15;
    return { left: node.scrollLeft, top: node.scrollTop };
  });
  await page.getByRole("button", { name: "Kadruj zdjęcie", exact: true }).first().click();
  await expect(page.getByRole("group", { name: "Kadr zdjęcia", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Anuluj", exact: true }).click();
  await expect(page.getByLabel("Zoom", { exact: true })).toHaveValue("3");
  await expect
    .poll(() => viewport.evaluate((node) => ({ left: node.scrollLeft, top: node.scrollTop })))
    .toEqual(before);
});

test("switching to 3D cancels crop and restores the workspace zoom", async ({ page }) => {
  await openCrop(page);
  await page.getByRole("button", { name: "Podgląd 3D", exact: true }).click();
  await expect(page.getByRole("group", { name: "Kadr zdjęcia", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Projekt 2D", exact: true }).click();
  await expect(page.getByLabel("Zoom", { exact: true })).toHaveValue("1");
  expect(await photo(page)).toBeNull();
});
