import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 664 },
  { width: 844, height: 390 },
]) {
  test(`keeps the project usable with mobile panels at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    for (const label of ["Produkt", "Język / Language"]) {
      const control = page.getByLabel(label, { exact: true });
      await expect(control).toBeInViewport({ ratio: 1 });
      const box = await control.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(80);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole("button", { name: "Tekst", exact: true }).click();
    await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
    await expect
      .poll(async () => (await page.locator(".rf-workspace").boundingBox())!.height)
      .toBeGreaterThanOrEqual(120);
    await expect(page.locator(".rf-product")).toBeInViewport({ ratio: 1 });
    await expect(
      page.getByRole("button", { name: "Zatwierdź projekt", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: "Powiększ", exact: true })).toBeInViewport({
      ratio: 1,
    });
    await page.getByRole("button", { name: "Zamknij panel" }).click();
    await expect(page.locator(".rf-controls")).toBeHidden();
    await expect(page.locator(".rf-tools")).toBeInViewport({ ratio: 1 });
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
]) {
  test(`editor fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
    // given
    await page.setViewportSize(viewport);
    await page.goto("/");
    // when
    for (const product of ["mug", "shirt", "tag"]) {
      await page.getByLabel("Produkt", { exact: true }).selectOption(product);
      // then
      await expect(
        page.getByRole("button", { name: "Zatwierdź projekt", exact: true }),
      ).toBeInViewport();
      await expect(page.locator(".rf-product")).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
        true,
      );
    }
  });
}

test("switches one panel and restores focus on close", async ({ page }) => {
  // given
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Zdjęcie", exact: true })).toBeVisible();
  // when
  await page.getByRole("button", { name: "Szablony", exact: true }).click();
  // then
  await expect(page.locator(".rf-template")).toHaveCount(3);
  await expect(page.getByRole("img", { name: "Zdjęcie", exact: true })).toHaveCount(0);
  // when
  await page.getByRole("button", { name: "Zamknij panel" }).click();
  // then
  await expect(page.getByRole("button", { name: "Szablony", exact: true })).toBeFocused();
  await expect(page.locator(".rf-controls")).toBeHidden();
});

test("selection toolbar follows zoom and stays within the workspace", async ({ page }) => {
  // given
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await page.getByText("Zaawansowane", { exact: true }).click();
  // when
  for (const [x, y] of [
    [0, 0],
    [160, 72],
    [-20, -20],
    [230, 100],
  ]) {
    await page.getByLabel("X (mm)", { exact: true }).fill(String(x));
    await page.getByLabel("Y (mm)", { exact: true }).fill(String(y));
    for (const zoom of [1, 2]) {
      await page.getByLabel("Zoom", { exact: true }).fill(String(zoom));
      // then
      await expect
        .poll(async () => {
          const bar = await page.locator(".rf-context-toolbar").boundingBox();
          const workspace = await page.locator(".rf-workspace").boundingBox();
          return (
            !!bar &&
            !!workspace &&
            bar.x >= workspace.x &&
            bar.y >= workspace.y &&
            bar.x + bar.width <= workspace.x + workspace.width &&
            bar.y + bar.height <= workspace.y + workspace.height
          );
        })
        .toBe(true);
    }
  }
});

test("photo gallery adds an editable image and templates replace content", async ({ page }) => {
  // given
  await page.goto("/");
  // when
  await page.getByRole("button", { name: "Zdjęcie little-moments" }).click();
  // then
  await expect(page.getByRole("toolbar", { name: "Edytuj element" })).toBeVisible();
  await expect(
    page.getByRole("toolbar", { name: "Edytuj element" }).getByLabel("Odbij poziomo"),
  ).toBeVisible();
  // when
  await page.getByRole("button", { name: "Szablony", exact: true }).click();
  await page.getByRole("button", { name: "Razem najlepiej", exact: true }).click();
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  // then
  await expect(page.getByRole("row", { name: "Razem najlepiej", exact: true })).toBeVisible();
  await expect(page.locator(".rf-layer-row")).toHaveCount(2);
});

test("the initial design renders text in the right half of its decoration area", async ({
  page,
}) => {
  // given
  await page.goto("/");
  // when
  const canvas = page.locator("canvas.lower-canvas").first();
  // then
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const pixels = canvas
          .getContext("2d")!
          .getImageData(
            Math.floor(canvas.width * 0.55),
            Math.floor(canvas.height * 0.3),
            Math.floor(canvas.width * 0.35),
            Math.floor(canvas.height * 0.45),
          ).data;
        return pixels.some((value, index) => index % 4 === 3 && value > 0);
      }),
    )
    .toBe(true);
});

test("uses bottom navigation for a narrow host on a desktop screen", async ({ page }) => {
  // given
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  // when
  await page.locator("main").evaluate((host) => {
    host.style.width = "820px";
    host.style.height = "800px";
  });
  // then
  const tools = await page.locator(".rf-tools").boundingBox();
  const workspace = await page.locator(".rf-workspace").boundingBox();
  expect(tools!.y).toBeGreaterThan(workspace!.y + workspace!.height);
  await page.getByRole("button", { name: "Szablony", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Szablony", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Szablony", exact: true })).toBeFocused();
});

test("zoom and selection do not change the saved document", async ({ page }) => {
  // given
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  const saved = await page.evaluate(() => localStorage.getItem("fabrio-mug"));
  // when
  await page.getByLabel("Zoom", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Pokaż cały projekt", exact: true }).click();
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  await page.getByRole("row", { name: "Małe chwile, wielkie wspomnienia", exact: true }).click();
  // then
  expect(await page.evaluate(() => localStorage.getItem("fabrio-mug"))).toBe(saved);
});

test("gallery allows adding while replacement of a protected image is disabled", async ({
  page,
}) => {
  // given
  await page.goto("/");
  await page.getByRole("button", { name: "Zdjęcie little-moments" }).click();
  const saved = await page.evaluate(() => {
    const design = JSON.parse(localStorage.getItem("fabrio-mug")!);
    design.areas.wrap.find((element: { id: string }) => element.id === "memory-photo").permissions =
      { edit: false };
    return JSON.stringify(design);
  });
  await page.getByText("Projekt", { exact: true }).click();
  await page.getByLabel("Wczytaj projekt JSON", { exact: true }).setInputFiles({
    name: "protected.json",
    mimeType: "application/json",
    buffer: Buffer.from(saved),
  });
  // when
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  await page
    .getByRole("row", { name: "Zdjęcie memory", exact: true })
    .getByRole("button", { name: "Edytuj", exact: true })
    .click();
  // then
  await expect(page.getByRole("button", { name: "Zdjęcie little-moments" })).toBeEnabled();
  await expect(page.getByLabel("Zastąp zaznaczone zdjęcie", { exact: true })).toBeDisabled();
});
