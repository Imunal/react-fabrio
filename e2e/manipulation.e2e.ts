import { expect, test } from "@playwright/test";

test("context actions have captions, explanations and direct rotation", async ({
  page,
  hasTouch,
}) => {
  // given
  await page.goto("/");
  await page.getByRole("button", { name: "Zdjęcie little-moments" }).click();
  const toolbar = page.getByRole("toolbar", { name: "Edytuj element" });
  // when
  if (hasTouch) {
    await toolbar.getByRole("button", { name: "Powiel", exact: true }).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(toolbar.getByRole("button", { name: "Powiel", exact: true })).toBeFocused();
  } else await toolbar.getByRole("button", { name: "Powiel", exact: true }).hover();
  // then
  await expect(page.getByRole("tooltip")).toContainText("kopię");
  expect(
    await page.locator(".rf-workspace").evaluate((workspace) => ({
      left: workspace.scrollLeft,
      top: workspace.scrollTop,
    })),
  ).toEqual({ left: 0, top: 0 });
  await expect(toolbar.getByRole("button", { name: "Powiel", exact: true })).toContainText(
    "Powiel",
  );
  // when
  await toolbar.getByRole("button", { name: "Obróć", exact: true }).click();
  await toolbar.getByLabel("Obrót (stopnie)").fill("30");
  // then
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("fabrio-mug")!).areas.wrap.at(-1).rotation,
      ),
    )
    .toBe(30);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("fabrio-mug")!));
  expect(saved.areas.wrap.at(-1).rotation).toBe(30);
});

test("snap guides appear during movement and disappear after release", async ({ page }) => {
  // given
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await expect(page.getByRole("toolbar", { name: "Edytuj element" })).toBeVisible();
  const host = page.locator(".rf-canvas");
  const box = (await host.boundingBox())!;
  const start = { x: box.x + (box.width * 23) / 200, y: box.y + (box.height * 7) / 80 };
  // when
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + (box.width * 77) / 200, start.y + (box.height * 33) / 80, {
    steps: 12,
  });
  // then
  await expect(page.locator(".rf-alignment-guides line[data-axis=x]")).toHaveCount(1);
  await expect(page.locator(".rf-alignment-guides line[data-axis=y]")).toHaveCount(1);
  // when
  await page.mouse.up();
  // then
  await expect(page.locator(".rf-alignment-guides line")).toHaveCount(0);
});

test("side grips resize and the round handle rotates the selected image", async ({
  page,
}, testInfo) => {
  // given
  await page.goto("/");
  await page.getByRole("button", { name: "Zdjęcie little-moments" }).click();
  await expect(page.getByRole("toolbar", { name: "Edytuj element" })).toBeVisible();
  await page.getByText("Zaawansowane", { exact: true }).click();
  await page.getByLabel("X (mm)", { exact: true }).fill("70");
  await page.getByLabel("Y (mm)", { exact: true }).fill("25");
  // Give the handles room on short screens and clear hover from the moved toolbar.
  await page.getByRole("button", { name: "Zamknij panel", exact: true }).click();
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect
    .poll(async () => {
      const box = (await page.locator(".rf-canvas").boundingBox())!;
      const pixels = box.width / 200;
      await page.mouse.move(box.x + 110 * pixels, box.y + (25 + 40 / 3) * pixels);
      return page
        .locator("canvas.upper-canvas")
        .evaluate((canvas) => getComputedStyle(canvas).cursor);
    })
    .toBe("e-resize");
  const box = (await page.locator(".rf-canvas").boundingBox())!;
  const pixels = box.width / 200;
  const centerY = box.y + (25 + 40 / 3) * pixels;
  // when
  await page.mouse.move(box.x + 110 * pixels, centerY);
  await page.mouse.down();
  // Browser mouse coordinates use whole CSS pixels; round instead of truncating the target.
  await page.mouse.move(Math.round(box.x + 130 * pixels), centerY, { steps: 10 });
  await page.mouse.up();
  // then
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("fabrio-mug")!).areas.wrap.at(-1).width),
    )
    .toBeCloseTo(60, 0);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("fabrio-mug")!).areas.wrap.at(-1).x),
  ).toBe(70);
  // when
  const centerX = box.x + 100 * pixels;
  const rotationY = box.y + 25 * pixels - 36;
  await expect
    .poll(async () => {
      await page.mouse.move(centerX, rotationY);
      return page
        .locator("canvas.upper-canvas")
        .evaluate((canvas) => getComputedStyle(canvas).cursor);
    })
    .toBe("crosshair");
  await page.mouse.down();
  await page.mouse.move(centerX + centerY - rotationY, centerY, { steps: 14 });
  // then
  await page.screenshot({ path: testInfo.outputPath("rotating-manipulator.png") });
  await expect(page.locator(".rf-alignment-guides line")).toHaveCount(2);
  // when
  await page.mouse.up();
  await page.getByRole("button", { name: "Zdjęcia", exact: true }).click();
  // then
  await expect
    .poll(async () =>
      Number(await page.getByLabel("Obrót (stopnie)", { exact: true }).inputValue()),
    )
    .toBeGreaterThan(88);
  expect(
    Number(await page.getByLabel("Obrót (stopnie)", { exact: true }).inputValue()),
  ).toBeLessThan(92);
  await page.screenshot({ path: testInfo.outputPath("styled-manipulator.png") });
  await expect(page.locator(".rf-alignment-guides line")).toHaveCount(0);
});
