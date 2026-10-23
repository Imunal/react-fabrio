import { expect, test } from "@playwright/test";

for (const [width, height] of [
  [1440, 900],
  [390, 844],
]) {
  test(`measurement groups remain precise at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width: width!, height: height! });
    await page.goto("/");
    await page.getByRole("button", { name: "Elementy", exact: true }).click();
    await page
      .getByRole("row", { name: "Zdjęcie memory", exact: true })
      .getByRole("button", { name: "Edytuj", exact: true })
      .click();
    await page.getByText("Zaawansowane", { exact: true }).click();
    const position = page.getByRole("group", { name: "Pozycja", exact: true });
    const size = page.getByRole("group", { name: "Rozmiar", exact: true });
    await expect(position.getByLabel("X (mm)", { exact: true })).toHaveValue("10");
    await expect(size.getByLabel("Wysokość (mm)", { exact: true })).toHaveValue("45.333");
    await size.getByLabel("Szerokość (mm)", { exact: true }).fill("68.125");
    await page.getByLabel("Obrót (stopnie)", { exact: true }).fill("15.5");
    await expect
      .poll(() =>
        page.evaluate(() =>
          JSON.parse(localStorage.getItem("fabrio-mug")!).areas.wrap.find(
            (e: { id: string }) => e.id === "memory-photo",
          ),
        ),
      )
      .toMatchObject({ width: 68.125, height: 45.333, rotation: 15.5 });
    for (const field of await page.locator(".rf-measurement-input").all()) {
      const box = (await field.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width!);
    }
    await page
      .locator(".rf-measurements")
      .screenshot({ path: `test-results/measurements-${width}.png` });
  });
}
