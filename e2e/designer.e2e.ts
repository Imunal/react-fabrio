import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("duplicates the selected text", async ({ page }) => {
  // given
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await page.getByLabel("Twój tekst").fill("Zażółć gęślą");

  // when
  await page.getByRole("button", { name: "Powiel", exact: true }).click();

  // then
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  await expect(page.getByRole("row", { name: "Zażółć gęślą", exact: true })).toHaveCount(2);
});

test("undo removes the duplicated element", async ({ page }) => {
  // given
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await page.getByLabel("Twój tekst").fill("Zażółć gęślą");
  await page.getByRole("button", { name: "Powiel", exact: true }).click();

  // when
  await page.getByRole("button", { name: "Cofnij", exact: true }).click();

  // then
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  await expect(page.getByRole("row", { name: "Zażółć gęślą", exact: true })).toHaveCount(1);
});

test("confirmation exports physical-size PNG with 300 DPI metadata", async ({ page }) => {
  // given
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await page.getByLabel("Twój tekst").fill("Zażółć gęślą");

  // when
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Zatwierdź projekt", exact: true }).click();
  const file = await download;
  const png = await readFile((await file.path())!);
  const resolution = png.indexOf(Buffer.from("pHYs"));

  // then
  await expect(page.getByRole("status")).toContainText("Projekt gotowy");
  expect(png.readUInt32BE(16)).toBe(Math.ceil((204 / 25.4) * 300));
  expect(png.readUInt32BE(20)).toBe(Math.ceil((84 / 25.4) * 300));
  expect(resolution).toBeGreaterThan(0);
  expect(png.readUInt32BE(resolution + 4)).toBe(11811);
  expect(png.readUInt32BE(resolution + 8)).toBe(11811);
  expect(png[resolution + 12]).toBe(1);
});

test("switching areas preserves independent content", async ({ page }) => {
  // given
  await page.goto("/");
  await page.getByLabel("Produkt", { exact: true }).selectOption("shirt");
  await page.getByRole("button", { name: /Tył/ }).click();
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await page.getByLabel("Twój tekst").fill("Back text");

  // when
  await page.getByRole("button", { name: /Przód/ }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("fabrio-tshirt")!));

  // then
  await expect(page.getByRole("button", { name: "Back text", exact: true })).toHaveCount(0);
  expect(saved.areas.front).toEqual([]);
  expect(saved.areas.back).toEqual([expect.objectContaining({ text: "Back text" })]);
});

test("guided engraving requires personalization", async ({ page }) => {
  // given
  await page.goto("/");
  await page.getByLabel("Produkt", { exact: true }).selectOption("tag");

  // when
  await expect(page.getByRole("button", { name: "Zatwierdź projekt", exact: true })).toBeDisabled();

  // then
  await expect(page.locator(".rf-issues")).toContainText("wymagane");
});

test("guided engraving exports outlined Polish text", async ({ page }) => {
  // given
  await page.goto("/");
  await page.getByLabel("Produkt", { exact: true }).selectOption("tag");
  await page.getByRole("button", { name: "Twoje imię *", exact: true }).click();
  await page.getByLabel("Twój tekst").fill("Zażółć gęślą");

  // when
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Zatwierdź projekt", exact: true }).click();
  const file = await download;
  const svg = await readFile((await file.path())!, "utf8");

  // then
  expect(svg).toContain("<path");
  expect(svg).not.toMatch(/<text|<image|transform=|clipPath/);
  await expect(page.getByRole("status")).toContainText("Projekt gotowy");
});

test("font export failure preserves the design", async ({ page }) => {
  // given
  await page.route("**/fonts/FabrioSans.ttf", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await page.getByLabel("Twój tekst").fill("Remember me");

  // when
  await page.getByRole("button", { name: "Zatwierdź projekt", exact: true }).click();

  // then
  await expect(page.getByRole("status")).toContainText("Nie udało się ukończyć");
  await expect(page.getByLabel("Twój tekst")).toHaveValue("Remember me");
});

test("confirmation can be retried after a font becomes available", async ({ page }) => {
  // given
  await page.route("**/fonts/FabrioSans.ttf", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await page.getByLabel("Twój tekst").fill("Remember me");
  await page.getByRole("button", { name: "Zatwierdź projekt", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Nie udało się ukończyć");

  // when
  await page.unroute("**/fonts/FabrioSans.ttf");
  await page.getByRole("button", { name: "Zatwierdź projekt", exact: true }).click();

  // then
  await expect(page.getByRole("status")).toContainText("Projekt gotowy");
  await expect(page.getByLabel("Twój tekst")).toHaveValue("Remember me");
});

test("reopens saved design JSON", async ({ page }) => {
  // given
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await page.getByLabel("Twój tekst").fill("Remember me");
  const design = await page.evaluate(() => localStorage.getItem("fabrio-mug"));

  // when
  await page.getByText("Projekt", { exact: true }).click();
  await page.getByLabel("Wczytaj projekt JSON", { exact: true }).setInputFiles({
    name: "design.json",
    mimeType: "application/json",
    buffer: Buffer.from(design!),
  });
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  await page
    .getByRole("row", { name: "Remember me", exact: true })
    .getByRole("button", { name: "Edytuj", exact: true })
    .click();

  // then
  await expect(page.getByLabel("Twój tekst")).toHaveValue("Remember me");
});

test("temporary images remain editable and block confirmation", async ({ page }) => {
  // given
  await page.goto("/");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
    "base64",
  );

  // when
  await page
    .getByLabel("Dodaj zdjęcia", { exact: true })
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("button", { name: "Zatwierdź projekt", exact: true })).toBeDisabled();

  // then
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  await expect(page.getByRole("row", { name: /^Zdjęcie / })).toHaveCount(2);
  await expect(page.locator(".rf-issues")).toContainText(
    "Prześlij zdjęcie przed zatwierdzeniem projektu",
  );
  await expect(page.getByText(/Rozdzielczość zdjęcia jest niższa niż 300/)).toBeVisible();
});

test("Three.js remains unloaded while editing the flat design", async ({ page }) => {
  // given
  const threeRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("three.module")) threeRequests.push(request.url());
  });

  // when
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();

  // then
  expect(threeRequests).toEqual([]);
});

test("unavailable WebGL returns the editor to its flat preview", async ({ page }) => {
  // given
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
      apply: (getContext, canvas, args: [string, ...unknown[]]) => {
        if (args[0].startsWith("webgl") || args[0] === "experimental-webgl") return null;
        return Reflect.apply(getContext, canvas, args);
      },
    });
  });
  await page.goto("/");

  // when
  await page.getByRole("button", { name: "Podgląd 3D", exact: true }).click();

  // then
  await expect(page.getByRole("status")).toContainText("Nie udało się ukończyć");
  await expect(page.getByRole("img", { name: /Projekt\./ })).toBeVisible();
});
