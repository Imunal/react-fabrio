import { test, expect } from "@playwright/test";
for (const size of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
]) {
  test(`zoom expands the project and fit restores viewport without saving at ${size.width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size);
    await page.goto("/");
    const project = page.locator(".rf-product");
    await expect(project).toBeVisible();
    const before = (await project.boundingBox())!.width;
    const saved = await page.evaluate(() => localStorage.getItem("fabrio-mug"));
    await expect(
      page.getByRole("button", { name: "Pokaż cały projekt", exact: true }),
    ).toBeDisabled();
    await page.getByLabel("Zoom", { exact: true }).fill("2");
    await expect
      .poll(async () => (await project.boundingBox())!.width)
      .toBeGreaterThan(before * 1.9);
    await expect(page.getByText("200%", { exact: true })).toBeVisible();
    await expect(page.locator(".rf-production-guides")).toBeVisible();
    await page.getByRole("button", { name: "Pokaż cały projekt", exact: true }).click();
    await expect.poll(async () => (await project.boundingBox())!.width).toBeLessThan(before + 2);
    expect(await page.evaluate(() => localStorage.getItem("fabrio-mug"))).toBe(saved);
    await expect(page.getByRole("button", { name: "Projekt 2D", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.screenshot({ path: testInfo.outputPath(`workspace-${size.width}.png`) });
  });
}
test("gallery clicks add another instance even with an image selected", async ({ page }) => {
  await page.goto("/");
  const photo = page.getByRole("button", { name: "Zdjęcie little-moments", exact: true });
  await photo.click();
  await photo.click();
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  await expect(page.locator(".rf-layer-row")).toHaveCount(5);
});

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
  "base64",
);
test("multiple uploads add files and elements despite selection, with atomic undo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Zdjęcie little-moments", exact: true }).click();
  await page.getByLabel("Dodaj zdjęcia", { exact: true }).setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer: png },
    { name: "two.png", mimeType: "image/png", buffer: png },
  ]);
  await expect(page.getByText("3 zdjęcia z 10", { exact: true })).toBeVisible();
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem("fabrio-mug")!));
  expect((await read()).areas.wrap).toHaveLength(6);
  await page.getByRole("button", { name: "Cofnij", exact: true }).click();
  await expect(page.getByText("2 zdjęcia z 10", { exact: true })).toBeVisible();
  expect((await read()).areas.wrap).toHaveLength(5);
  await page.getByRole("button", { name: "Ponów", exact: true }).click();
  await expect(page.getByText("3 zdjęcia z 10", { exact: true })).toBeVisible();
});

test("failed decoding frees the gallery reservation", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Dodaj zdjęcia", { exact: true }).setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.locator(".rf-status")).toContainText("Nie udało się odczytać zdjęcia");
  await expect(page.locator(".rf-editor")).toHaveAttribute("aria-busy", "false");
  await page
    .getByLabel("Dodaj zdjęcia", { exact: true })
    .setInputFiles({ name: "good.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText("2 zdjęcia z 10", { exact: true })).toBeVisible();
});

test("legacy over-limit gallery opens intact and can remove unused files", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Zdjęcie little-moments", exact: true }).click();
  const saved = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("fabrio-mug")!);
    for (let i = 0; i < 10; i++)
      d.assets[`unused-${i}`] = { ...d.assets["little-moments"], id: `unused-${i}` };
    return JSON.stringify(d);
  });
  await page.getByText("Projekt", { exact: true }).click();
  await page.getByLabel("Wczytaj projekt JSON", { exact: true }).setInputFiles({
    name: "legacy.json",
    mimeType: "application/json",
    buffer: Buffer.from(saved),
  });
  await expect(page.getByText("11 zdjęć z 10", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zatwierdź projekt", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Usuń zdjęcie unused-0 z galerii", exact: true }).click();
  await expect(page.getByText("10 zdjęć z 10", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zatwierdź projekt", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Cofnij", exact: true }).click();
  await expect(page.getByText("11 zdjęć z 10", { exact: true })).toBeVisible();
});

test("constrained canvas stops movement at the last allowed transform", async ({ page }) => {
  await page.route("**/src/demo.ts*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        "area.constrainToSafeArea = false",
        "area.constrainToSafeArea = true",
      ),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await page.getByText("Zaawansowane", { exact: true }).click();
  const x = page.getByLabel("X (mm)", { exact: true });
  await x.fill("-20");
  await expect(x).toHaveValue("3");
  await x.fill("20");
  await expect(x).toHaveValue("20");
  const box = (await page.locator(".rf-canvas").boundingBox())!;
  const scale = box.width / 200;
  await page.mouse.move(box.x + 40 * scale, box.y + 7 * scale);
  await page.mouse.down();
  await page.mouse.move(box.x + 35 * scale, box.y + 7 * scale, { steps: 5 });
  await page.mouse.move(box.x - 40 * scale, box.y + 7 * scale, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => Number(await x.inputValue())).toBeGreaterThanOrEqual(3);
  const doc = await page.evaluate(() => JSON.parse(localStorage.getItem("fabrio-mug")!));
  expect(doc.areas.wrap.at(-1).x).toBeLessThan(20);
});

test("enlarged viewport pans and fit recenters without saving", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Zoom", { exact: true }).fill("3");
  const viewport = page.locator(".rf-viewport");
  await expect
    .poll(() => viewport.evaluate((node) => node.scrollWidth > node.clientWidth))
    .toBe(true);
  const before = await viewport.evaluate((node) => node.scrollLeft);
  const saved = await page.evaluate(() => localStorage.getItem("fabrio-mug"));
  await page.getByRole("button", { name: "Przesuń widok", exact: true }).click();
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeLessThan(before - 20);
  await page.getByRole("button", { name: "Pokaż cały projekt", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pokaż cały projekt", exact: true }),
  ).toBeDisabled();
  await expect
    .poll(() =>
      viewport.evaluate(
        (node) =>
          Math.abs(node.scrollLeft - (node.scrollWidth - node.clientWidth) / 2) <= 2 &&
          Math.abs(node.scrollTop - (node.scrollHeight - node.clientHeight) / 2) <= 2,
      ),
    )
    .toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("fabrio-mug"))).toBe(saved);
});
