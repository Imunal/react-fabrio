import { expect, test } from "@playwright/test";

for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [820, 1180],
  [390, 844],
]) {
  test(`text alignment is editable at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width: width!, height: height! });
    await page.goto("/");
    await page.getByRole("button", { name: "Elementy", exact: true }).click();
    await page
      .getByRole("row", { name: "Małe chwile, wielkie wspomnienia", exact: true })
      .getByRole("button", { name: "Edytuj", exact: true })
      .click();
    const group = page.getByRole("group", { name: "Wyrównanie tekstu", exact: true });
    await expect(group.getByRole("button")).toHaveCount(4);
    await expect(group.getByRole("button", { name: "Do środka", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const input = page.getByRole("textbox", { name: "Twój tekst", exact: true });
    await input.fill("Jeden dwa trzy cztery pięć sześć siedem osiem dziewięć dziesięć");
    await group.getByRole("button", { name: "Wyjustuj", exact: true }).click();
    const saved = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("fabrio-mug")!).areas.wrap.find(
            (e: { id: string }) => e.id === "title",
          ).align,
      );
    await expect.poll(saved).toBe("justify");
    await expect(group.getByRole("button", { name: "Wyjustuj", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await group.getByRole("button", { name: "Do prawej", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(saved).toBe("right");
    for (const button of await group.getByRole("button").all()) {
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width!);
    }
    await group.screenshot({ path: `test-results/text-alignment-${width}.png` });
    await page.getByRole("button", { name: "Cofnij", exact: true }).click();
    await expect.poll(saved).toBe("justify");
    await page.reload();
    await expect.poll(saved).toBe("justify");
  });
}
