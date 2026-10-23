import { beforeEach, expect, test, vi } from "vitest";
import { createDesignDocument, type ProductConfig } from "../packages/core/src/index.js";
import { exportDesign, DesignValidationError } from "../packages/fabric/src/export-design.js";
import { exportPrintArea } from "../packages/fabric/src/png-export.js";
import { exportEngravingArea } from "../packages/fabric/src/svg-export.js";

vi.mock("../packages/fabric/src/png-export.js", () => ({ exportPrintArea: vi.fn() }));
vi.mock("../packages/fabric/src/svg-export.js", () => ({ exportEngravingArea: vi.fn() }));
const product: ProductConfig = {
  id: "sample",
  name: "Sample",
  revision: "1",
  printDpi: 600,
  sides: [
    {
      id: "front",
      name: "Front",
      areas: [
        {
          id: "print",
          name: "Print",
          width: 50,
          height: 30,
          production: "print",
          mode: "freeform",
          allowedElements: ["vector"],
        },
        {
          id: "engrave",
          name: "Engrave",
          width: 50,
          height: 30,
          production: "engraving",
          mode: "freeform",
          allowedElements: ["vector"],
        },
      ],
    },
  ],
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(exportPrintArea).mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  vi.mocked(exportEngravingArea).mockResolvedValue(new Blob(["svg"], { type: "image/svg+xml" }));
});
test("exports ordered artifacts and previews from a snapshot with configured DPI", async () => {
  const config = structuredClone(product);
  const document = createDesignDocument(config);
  const pending = exportDesign(config, document);
  config.id = "changed";
  document.areas.print.push({
    id: "late",
    type: "vector",
    x: 0,
    y: 0,
    width: 2,
    height: 2,
    rotation: 0,
    color: "black",
    path: "M0 0H2V2H0Z",
  });
  const result = await pending;
  expect(result.files.map((file) => file.filename)).toEqual([
    "sample-print.png",
    "sample-engrave.svg",
  ]);
  expect(result.previews.map((preview) => preview.areaId)).toEqual(["print", "engrave"]);
  expect(result.previews[0].blob).toBe(result.files[0].blob);
  expect(result.document.areas.print).toEqual([]);
  expect(vi.mocked(exportPrintArea).mock.calls.map((call) => call[3]?.dpi)).toEqual([600, 300]);
});
test("validation errors expose issues and export no artifacts", async () => {
  const document = createDesignDocument(product);
  document.productId = "wrong";
  await expect(exportDesign(product, document)).rejects.toBeInstanceOf(DesignValidationError);
  await expect(exportDesign(product, document)).rejects.toHaveProperty("issues", expect.any(Array));
  expect(exportPrintArea).not.toHaveBeenCalled();
});
test("aborting between areas rejects instead of returning partial results", async () => {
  const controller = new AbortController();
  vi.mocked(exportPrintArea).mockImplementationOnce(async () => {
    controller.abort();
    return new Blob();
  });
  await expect(
    exportDesign(product, createDesignDocument(product), { signal: controller.signal }),
  ).rejects.toHaveProperty("name", "AbortError");
  expect(exportEngravingArea).not.toHaveBeenCalled();
});
test("a failed resource rejects the whole operation and allows retry", async () => {
  vi.mocked(exportEngravingArea).mockRejectedValueOnce(new Error("Unavailable font"));
  await expect(exportDesign(product, createDesignDocument(product))).rejects.toThrow(
    "Unavailable font",
  );
  expect((await exportDesign(product, createDesignDocument(product))).files).toHaveLength(2);
});
