import { expect, test } from "@playwright/test";

for (const [width, height] of [
  [1440, 900],
  [390, 844],
]) {
  test(`compact position controls at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width: width!, height: height! });
    await page.goto("/");
    await page.getByRole("button", { name: "Elementy", exact: true }).click();
    await page
      .locator(".rf-layer-row")
      .nth(1)
      .getByRole("button", { name: "Edytuj", exact: true })
      .click();
    await page.getByText("Zaawansowane", { exact: true }).click();
    const move = page.getByRole("group", { name: "Przesuwanie Krok: 1 mm", exact: true });
    const align = page.getByRole("group", { name: "Wyrównanie", exact: true });
    const order = page.getByRole("group", { name: "Kolejność warstw", exact: true });
    await expect(move).toBeVisible();
    await expect(align.getByRole("button")).toHaveCount(6);
    await expect(order.getByRole("button", { name: "Przenieś wyżej", exact: true })).toHaveText(
      "Wyżej",
    );
    await move.getByRole("button", { name: "Przesuń w prawo" }).click();
    await expect(page.getByLabel("X (mm)", { exact: true })).toHaveValue("81");
    await align.getByRole("button", { name: "Wyrównaj do lewej" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tooltip")).toContainText("Wyśrodkuj poziomo");
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("X (mm)", { exact: true })).toHaveValue("45");
    await order.getByRole("button", { name: "Przenieś wyżej", exact: true }).click();
    await expect(order.getByRole("button", { name: "Przenieś wyżej", exact: true })).toBeDisabled();
    for (const button of await page.locator(".rf-position-controls button").all()) {
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width!);
    }
    await page
      .locator(".rf-position-controls")
      .screenshot({ path: `test-results/position-${width}.png` });
  });
}
