import { expect, test } from "@playwright/test";

test("outlined text keeps its physical rectangle when moved on the canvas", async ({
  page,
}, testInfo) => {
  // given
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  const canvas = page.locator("canvas.lower-canvas").first();
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const context = canvas.getContext("2d");
        return context
          ? context
              .getImageData(0, 0, canvas.width, canvas.height)
              .data.some((value, index) => index % 4 === 3 && value > 0)
          : false;
      }),
    )
    .toBe(true);
  await page.getByText("Zaawansowane", { exact: true }).click();
  const width = page.getByLabel("Szerokość (mm)", { exact: true });
  const height = page.getByLabel("Wysokość (mm)", { exact: true });
  await expect(width).toHaveValue("40");
  await expect(height).toHaveValue("8");
  const box = await page.locator(".rf-canvas").boundingBox();
  if (!box) throw new Error("Canvas is not visible");
  const start = { x: box.x + (23 / 200) * box.width, y: box.y + (7 / 80) * box.height };
  // when
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + (77.3 / 200) * box.width, start.y + (10 / 80) * box.height, {
    steps: 8,
  });
  await page.mouse.up();

  // then
  await expect(width).toHaveValue("40");
  await expect(height).toHaveValue("8");
  await expect
    .poll(async () => Number(await page.getByLabel("X (mm)", { exact: true }).inputValue()))
    .toBeCloseTo(80, 5);
  await page.screenshot({ path: testInfo.outputPath("outlined-text-canvas.png"), fullPage: true });
});
