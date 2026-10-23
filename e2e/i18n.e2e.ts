import { expect, test } from "@playwright/test";

test("switches PL and EN without saving, replacing the canvas or losing edits and history", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await page.getByLabel("Twój tekst").fill("Unchanged customer text");
  await page.getByLabel("Twój tekst").blur();
  await page.getByLabel("Zoom", { exact: true }).fill("1.5");
  const saved = await page.evaluate(() => localStorage.getItem("fabrio-mug"));
  await page.evaluate(() => {
    const node = document.querySelector("canvas");
    Object.assign(window, { originalFabrioCanvas: node });
  });

  await page.getByLabel("Język / Language", { exact: true }).selectOption("en");

  await expect(page.getByLabel("Your message")).toHaveValue("Unchanged customer text");
  await expect(page.locator(".rf-editor")).toHaveAttribute("lang", "en");
  await expect(page.getByLabel("Zoom", { exact: true })).toHaveValue("1.5");
  await expect(page.locator("canvas[aria-label]")).toHaveAttribute("aria-label", /Design canvas/);
  await expect(page.getByRole("button", { name: "Confirm design", exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("fabrio-mug"))).toBe(saved);
  expect(
    await page.evaluate(
      () =>
        document.querySelector("canvas") ===
        (window as unknown as { originalFabrioCanvas: HTMLCanvasElement }).originalFabrioCanvas,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("fabrio-mug"))).not.toBe(saved);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("fabrio-mug"))).toBe(saved);
  await page.getByLabel("Język / Language", { exact: true }).selectOption("pl");
  await expect(page.getByRole("button", { name: "Zatwierdź projekt", exact: true })).toBeVisible();
});

test("translates an existing required-slot warning and retains integrator labels", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Produkt", { exact: true }).selectOption("tag");
  const polish = await page.locator(".rf-issues").innerText();
  await expect(page.getByRole("button", { name: "Zatwierdź projekt", exact: true })).toBeDisabled();
  await page.getByLabel("Język / Language", { exact: true }).selectOption("en");
  await expect(page.locator(".rf-issues")).not.toHaveText(polish);
  await expect(page.locator(".rf-issues")).toContainText("Twoje imię");
  await expect(page.getByRole("button", { name: "Confirm design", exact: true })).toBeDisabled();
});

test("translates an existing resource error without revealing technical details", async ({
  page,
}) => {
  await page.route("**/fonts/FabrioSans.ttf", (route) =>
    route.fulfill({ status: 503, body: "private diagnostic" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj tekst", exact: true }).click();
  await page.getByLabel("Twój tekst").fill("Keep this design");
  await page.getByRole("button", { name: "Zatwierdź projekt", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Nie udało się ukończyć");
  await page.getByLabel("Język / Language", { exact: true }).selectOption("en");
  await expect(page.getByRole("status")).toContainText("Unable to finish");
  await expect(page.getByRole("status")).not.toContainText("private diagnostic");
  await expect(page.getByLabel("Your message")).toHaveValue("Keep this design");
});

test("retains a crop draft during a locale change", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Elementy", exact: true }).click();
  await page
    .getByRole("row", { name: "Zdjęcie memory", exact: true })
    .getByRole("button", { name: "Edytuj", exact: true })
    .click();
  await page.getByRole("button", { name: "Kadruj zdjęcie", exact: true }).first().click();
  await page.getByRole("slider", { name: "Powiększenie zdjęcia", exact: true }).fill("2");
  await page.getByLabel("Język / Language", { exact: true }).selectOption("en");
  await expect(page.getByRole("slider", { name: "Photo zoom", exact: true })).toHaveValue("2");
  await page.getByRole("button", { name: "Apply crop", exact: true }).click();
  const crop = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("fabrio-mug")!).areas.wrap.find(
        (element: { id: string }) => element.id === "memory-photo",
      ).crop,
  );
  expect(crop.width).toBeCloseTo(0.5, 3);
});

test("hydrates a Polish editor without recoverable errors", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () =>
    (await import(String("/tests/i18n-browser.tsx"))).mountHydrated(),
  );
  await expect(page.getByRole("button", { name: "Zatwierdź projekt", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tekst", exact: true }).click();
  expect(
    await page.evaluate(
      async () => (await import(String("/tests/i18n-browser.tsx"))).harness.hydrationErrors,
    ),
  ).toEqual([]);
});

test("keeps an upload pending through language changes and commits it once", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => (await import(String("/tests/i18n-browser.tsx"))).mountUpload());
  await page.getByLabel("Dodaj zdjęcia", { exact: true }).setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect
    .poll(() =>
      page.evaluate(
        async () => !!(await import(String("/tests/i18n-browser.tsx"))).harness.resolve,
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Switch language", exact: true }).click();
  await expect(page.getByLabel("Add photos", { exact: true })).toBeAttached();
  expect(
    await page.evaluate(
      async () => (await import(String("/tests/i18n-browser.tsx"))).harness.signal?.aborted,
    ),
  ).toBe(false);
  expect(
    await page.evaluate(
      async () => (await import(String("/tests/i18n-browser.tsx"))).harness.changes,
    ),
  ).toBe(0);
  await page.evaluate(async () => {
    (await import(String("/tests/i18n-browser.tsx"))).harness.resolve!({
      id: "uploaded",
      url: "/images/little-moments.png",
      mimeType: "image/png",
      width: 1536,
      height: 1024,
      durable: true,
    });
  });
  await expect
    .poll(() =>
      page.evaluate(async () => (await import(String("/tests/i18n-browser.tsx"))).harness.changes),
    )
    .toBe(1);
});

test("keeps two complete editors in independent languages", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => (await import(String("/tests/i18n-browser.tsx"))).mountPair());
  const polish = page.getByRole("region", { name: "Polish editor" });
  const english = page.getByRole("region", { name: "English editor" });
  await expect(polish.locator(".rf-editor")).toHaveAttribute("lang", "pl");
  await expect(english.locator(".rf-editor")).toHaveAttribute("lang", "en");
  await expect(
    polish.getByRole("button", { name: "Zatwierdź projekt", exact: true }),
  ).toBeAttached();
  await expect(english.getByRole("button", { name: "Confirm design", exact: true })).toBeAttached();
});
