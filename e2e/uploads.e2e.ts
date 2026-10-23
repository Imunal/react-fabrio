import { expect, test } from "@playwright/test";

const fixture = "/tests/uploads-browser.tsx";

test("public upload hook retains local images for undo after its controls unmount", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async (url) => {
    (await import(url)).mount();
  }, fixture);
  await expect(page.getByTestId("pending")).toHaveText("0");
  const result = await page.evaluate(async (url) => {
    const { harness, upload } = await import(url);
    await upload();
    const editor = harness.editor;
    const image = editor.getSelected();
    const assetUrl = editor.getSnapshot().document.assets[image.assetId].url;
    harness.hide();
    editor.undo();
    editor.redo();
    return {
      image: editor.getSelected(),
      assetUrl,
      changes: harness.changes,
      errors: harness.errors,
    };
  }, fixture);
  expect(result.errors).toEqual([]);
  expect(result.changes).toBe(3);
  await expect(page.getByTestId("pending")).toHaveCount(0);
  expect(await page.evaluate(async (url) => (await fetch(url)).ok, result.assetUrl)).toBe(true);
  await page.evaluate(async (url) => {
    (await import(url)).harness.unmount();
  }, fixture);
  expect(
    await page.evaluate(async (url) => {
      try {
        await fetch(url);
        return true;
      } catch {
        return false;
      }
    }, result.assetUrl),
  ).toBe(false);
});

test("area changes cancel uploads and release capacity before a durable upload resolves", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async (url) => {
    (await import(url)).mount(true);
  }, fixture);
  await expect(page.getByTestId("pending")).toHaveText("0");
  await page.evaluate(async (url) => {
    void (await import(url)).upload();
  }, fixture);
  await expect
    .poll(() => page.evaluate(async (url) => !!(await import(url)).harness.resolve, fixture))
    .toBe(true);
  const result = await page.evaluate(async (url) => {
    const { harness } = await import(url);
    harness.editor.setArea("back");
    const reservation = harness.editor.reserveUploads(10);
    harness.resolve({
      id: "late",
      url: "https://example.com/photo.png",
      mimeType: "image/png",
      width: 1,
      height: 1,
      durable: true,
    });
    await Promise.resolve();
    await Promise.resolve();
    return {
      aborted: harness.signal.aborted,
      reservation: !!reservation,
      assets: harness.editor.getSnapshot().document.assets,
      changes: harness.changes,
    };
  }, fixture);
  expect(result).toEqual({ aborted: true, reservation: true, assets: {}, changes: 0 });
  await expect(page.getByTestId("pending")).toHaveText("0");
});
