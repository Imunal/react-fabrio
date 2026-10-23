import { mugProduct, tagProduct, tshirtProduct } from "../packages/core/src/examples.js";
import { expect, test } from "vitest";
import {
  createDesignDocument,
  validateProductConfig,
  validateDesignDocument,
  getDesignIssues,
  addElement,
  updateElement,
  removeElement,
  reorderElement,
  createHistory,
  commitHistory,
  undoHistory,
  redoHistory,
  effectiveImageDpi,
  printPixelDimensions,
} from "../packages/core/src/index.js";
import type { CommandResult, TextElement } from "../packages/core/src/index.js";

const text: TextElement = {
  id: "greeting",
  type: "text",
  x: 10,
  y: 10,
  width: 40,
  height: 10,
  rotation: 0,
  text: "Cześć",
  fontSize: 6,
  fontId: "sans",
  color: "#000000",
};

test.each([mugProduct, tagProduct, tshirtProduct])("validates $name configuration", (product) => {
  // given
  const config = structuredClone(product);

  // when
  const issues = validateProductConfig(config);

  // then
  expect(issues).toEqual([]);
});

test.each([mugProduct, tagProduct, tshirtProduct])("round trips all areas of $name", (product) => {
  // given
  const document = createDesignDocument(product);

  // when
  const reopened = JSON.parse(JSON.stringify(document));
  const issues = validateDesignDocument(reopened, product);

  // then
  expect(reopened).toEqual(document);
  expect(issues).toEqual([]);
  expect(Object.keys(reopened.areas)).toHaveLength(
    product.sides.flatMap((side) => side.areas).length,
  );
});

test.each([
  null,
  [],
  42,
  "document",
  {},
  { schemaVersion: 1, areas: { front: null } },
  () => undefined,
])("rejects malformed input %# without throwing", (value) => {
  // given
  const product = mugProduct;

  // when
  const configIssues = validateProductConfig(value);
  const documentIssues = validateDesignDocument(value, product);

  // then
  expect(configIssues).toEqual(
    expect.arrayContaining([expect.objectContaining({ severity: "error" })]),
  );
  expect(documentIssues).toEqual(
    expect.arrayContaining([expect.objectContaining({ severity: "error" })]),
  );
});

test("rejects unsupported document versions", () => {
  // given
  const document = { ...createDesignDocument(mugProduct), schemaVersion: 2 };

  // when
  const issues = validateDesignDocument(document, mugProduct);

  // then
  expect(issues).toContainEqual(expect.objectContaining({ code: "unsupported-schema" }));
});

test("rejects stale configuration revisions", () => {
  // given
  const document = { ...createDesignDocument(mugProduct), revision: "stale" };

  // when
  const issues = validateDesignDocument(document, mugProduct);

  // then
  expect(issues).toContainEqual(expect.objectContaining({ code: "configuration-mismatch" }));
});

test("updates elements without mutating the original document", () => {
  // given
  const original = createDesignDocument(mugProduct);
  const added = value(addElement(original, "wrap", text, mugProduct));

  // when
  const changed = value(
    updateElement(added, "wrap", text.id, { kind: "geometry", changes: { x: 20 } }, mugProduct),
  );

  // then
  expect(original.areas.wrap).toEqual([]);
  expect(added.areas.wrap![0]!.x).toBe(10);
  expect(changed.areas.wrap![0]!.x).toBe(20);
});

test("undo and redo restore complete document snapshots", () => {
  // given
  const original = createDesignDocument(mugProduct);
  const added = value(addElement(original, "wrap", text, mugProduct));
  const changed = value(
    updateElement(added, "wrap", text.id, { kind: "geometry", changes: { x: 20 } }, mugProduct),
  );
  const history = commitHistory(commitHistory(createHistory(original), added), changed);

  // when
  const undone = undoHistory(history);
  const redone = redoHistory(undone);

  // then
  expect(undone.present).toEqual(added);
  expect(redone.present).toEqual(changed);
});

test("locked elements cannot be changed", () => {
  // given
  const document = value(
    addElement(createDesignDocument(mugProduct), "wrap", { ...text, locked: true }, mugProduct),
  );

  // when
  const change = () =>
    updateElement(document, "wrap", text.id, { kind: "geometry", changes: { x: 2 } }, mugProduct);

  // then
  expect(change().status).toBe("rejected");
});

test("locked elements cannot be removed", () => {
  // given
  const document = value(
    addElement(createDesignDocument(mugProduct), "wrap", { ...text, locked: true }, mugProduct),
  );

  // when
  const remove = () => removeElement(document, "wrap", text.id, mugProduct);

  // then
  expect(remove().status).toBe("rejected");
});

test("reordering to the same position preserves document content", () => {
  // given
  const document = value(addElement(createDesignDocument(mugProduct), "wrap", text, mugProduct));

  // when
  const reordered = reorderElement(document, "wrap", text.id, 0, mugProduct);

  // then
  expect(reordered).toEqual({ status: "unchanged", value: document });
});

test.each([
  { crop: undefined, dpi: 300 },
  { crop: { x: 0, y: 0, width: 0.5, height: 1 }, dpi: 150 },
])("computes $dpi effective DPI after cropping", ({ crop, dpi }) => {
  // given
  const source = { width: 1200, height: 600 };
  const placed = { width: 101.6, height: 50.8 };

  // when
  const result = effectiveImageDpi(source, placed, crop);

  // then
  expect(result).toBeCloseTo(dpi);
});

test("low image resolution warns without blocking confirmation", () => {
  // given
  const document = createDesignDocument(mugProduct);
  document.assets.photo = {
    id: "photo",
    url: "https://example.test/photo.png",
    mimeType: "image/png",
    width: 100,
    height: 100,
    durable: true,
  };
  document.areas.wrap = [
    {
      id: "image",
      type: "image",
      assetId: "photo",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
    },
  ];

  // when
  const issues = getDesignIssues(document, mugProduct);

  // then
  expect(issues).toContainEqual(
    expect.objectContaining({ code: "low-image-dpi", severity: "warning" }),
  );
  expect(issues.every((issue) => issue.severity === "warning")).toBe(true);
});

test("converts millimeters to physical print pixels", () => {
  // given
  const width = 25.4;
  const height = 50.8;

  // when
  const pixels = printPixelDimensions(width, height, 300);

  // then
  expect(pixels).toEqual({ width: 300, height: 600 });
});

test("rejects print resolution below 300 DPI", () => {
  // given
  const dpi = 299;

  // when
  const exportSize = () => printPixelDimensions(10, 10, dpi);

  // then
  expect(exportSize).toThrow();
});

test("blocks raster content and temporary assets in engraving", () => {
  // given
  const document = createDesignDocument(tagProduct);
  document.assets.photo = { id: "photo", url: "blob:session", mimeType: "image/png" };
  document.areas.front = [
    { id: "image", type: "image", assetId: "photo", x: 0, y: 0, width: 5, height: 5, rotation: 0 },
  ];

  // when
  const codes = getDesignIssues(document, tagProduct).map((issue) => issue.code);

  // then
  expect(codes).toEqual(expect.arrayContaining(["prohibited-element", "non-durable-asset"]));
});

test("guided templates enforce required text fields", () => {
  // given
  const document = createDesignDocument(tagProduct);

  // when
  const issues = getDesignIssues(document, tagProduct);

  // then
  expect(issues).toContainEqual(
    expect.objectContaining({
      code: "required-field",
      params: { label: tagProduct.sides[0]!.areas[0]!.templates![0]!.slots![0]!.label },
    }),
  );
});

test("guided slots enforce configured movement permissions", () => {
  // given
  const product = structuredClone(tagProduct);
  product.sides[0]!.areas[0]!.templates![0]!.slots![0]!.permissions = { move: false, edit: true };
  const document = createDesignDocument(product);

  // when
  const move = () =>
    updateElement(document, "front", "name", { kind: "geometry", changes: { x: 20 } }, product);

  // then
  expect(move().status).toBe("rejected");
});

test("filling a required field allows confirmation", () => {
  // given
  const document = createDesignDocument(tagProduct);

  // when
  const filled = value(
    updateElement(
      document,
      "front",
      "name",
      { kind: "text", changes: { text: "Łódź" } },
      tagProduct,
    ),
  );
  const issues = getDesignIssues(filled, tagProduct);

  // then
  expect(issues).toEqual([]);
});

test("rejects malformed mug dimensions", () => {
  // given
  const product = { ...mugProduct, mug: { ...mugProduct.mug, radius: "large" } };

  // when
  const issues = validateProductConfig(product);

  // then
  expect(issues).toContainEqual(expect.objectContaining({ code: "invalid-configuration" }));
});

test("rejects duplicate element capabilities", () => {
  // given
  const product = structuredClone(mugProduct);
  product.sides[0]!.areas[0]!.allowedElements = ["text", "text"];

  // when
  const issues = validateProductConfig(product);

  // then
  expect(issues).toContainEqual(expect.objectContaining({ code: "invalid-configuration" }));
});

test("rejects changes to protected template geometry", () => {
  // given
  const product = structuredClone(tagProduct);
  product.sides[0]!.areas[0]!.templates![0]!.elements[0]!.permissions = { move: false };
  const document = createDesignDocument(product);
  document.areas.front![0]!.x += 2;

  // when
  const issues = validateDesignDocument(document, product);

  // then
  expect(issues).toContainEqual(expect.objectContaining({ code: "template-permission" }));
});

test("rejects saved permission escalation", () => {
  // given
  const product = structuredClone(tagProduct);
  product.sides[0]!.areas[0]!.templates![0]!.elements[0]!.permissions = { move: false };
  const document = createDesignDocument(product);
  document.areas.front![0]!.permissions = { move: true };

  // when
  const issues = validateDesignDocument(document, product);

  // then
  expect(issues).toContainEqual(expect.objectContaining({ code: "template-permission" }));
});

test("enforces configured font, color, MIME and vector restrictions", () => {
  // given
  const product = structuredClone(mugProduct);
  product.sides[0]!.areas[0]!.colors = ["#000000"];
  const document = createDesignDocument(product);
  document.assets.bad = {
    id: "bad",
    url: "https://example.test/a.html",
    mimeType: "text/html",
    durable: true,
  };
  document.areas.wrap = [
    { id: "badimage", type: "image", assetId: "bad", x: 0, y: 0, width: 5, height: 5, rotation: 0 },
    {
      id: "badvector",
      type: "vector",
      path: "<script>alert(1)</script>",
      color: "#ff0000",
      x: 0,
      y: 0,
      width: 5,
      height: 5,
      rotation: 0,
    },
    { ...text, id: "badtext", fontId: "missing", color: "#ff0000" },
  ];

  // when
  const codes = getDesignIssues(document, product).map((issue) => issue.code);

  // then
  expect(codes).toEqual(
    expect.arrayContaining([
      "prohibited-asset",
      "unsafe-vector",
      "prohibited-color",
      "missing-font",
    ]),
  );
});

test("required image slots need a durable asset", () => {
  // given
  const product = structuredClone(mugProduct);
  const area = product.sides[0]!.areas[0]!;
  area.mode = "guided";
  area.templates = [
    {
      id: "photo",
      name: "Photo",
      elements: [
        {
          id: "photo",
          type: "image",
          assetId: "missing",
          x: 0,
          y: 0,
          width: 5,
          height: 5,
          rotation: 0,
        },
      ],
      slots: [{ id: "photo", elementId: "photo", label: "Photo", required: true }],
    },
  ];
  const document = createDesignDocument(product);

  // when
  const issues = getDesignIssues(document, product);

  // then
  expect(issues).toContainEqual(expect.objectContaining({ code: "required-field" }));
});

test("preserves protected template ordering", () => {
  // given
  const product = structuredClone(tagProduct);
  const template = product.sides[0]!.areas[0]!.templates![0]!;
  template.elements[0]!.permissions = { reorder: false };
  template.elements.push({
    id: "heart",
    type: "vector",
    path: "M0 0 L1 1 Z",
    color: "#000000",
    x: 0,
    y: 0,
    width: 2,
    height: 2,
    rotation: 0,
  });
  const document = createDesignDocument(product);
  document.areas.front!.reverse();

  // when
  const issues = validateDesignDocument(document, product);

  // then
  expect(issues).toContainEqual(expect.objectContaining({ code: "template-permission" }));
});

test("rejects unsafe configured artwork", () => {
  // given
  const product = {
    ...mugProduct,
    artwork: [{ id: "unsafe", name: "Unsafe", path: '<image href="https://bad.test">' }],
  };

  // when
  const issues = validateProductConfig(product);

  // then
  expect(issues).toContainEqual(expect.objectContaining({ code: "unsafe-vector" }));
});

test("guided sessions reject adding arbitrary elements", () => {
  // given
  const document = createDesignDocument(tagProduct);

  // when
  const add = () => addElement(document, "front", text, tagProduct);

  // then
  expect(add().status).toBe("rejected");
});

test("guided document validation rejects unconfigured elements", () => {
  // given
  const document = createDesignDocument(tagProduct);
  document.areas.front!.push(text);

  // when
  const issues = validateDesignDocument(document, tagProduct);

  // then
  expect(issues).toContainEqual(expect.objectContaining({ code: "guided-element" }));
});

test("movement permission is independent of content editing", () => {
  // given
  const document = value(
    addElement(
      createDesignDocument(mugProduct),
      "wrap",
      { ...text, permissions: { edit: false, move: true } },
      mugProduct,
    ),
  );

  // when
  const moved = value(
    updateElement(document, "wrap", text.id, { kind: "geometry", changes: { x: 2 } }, mugProduct),
  );
  const edit = () =>
    updateElement(
      document,
      "wrap",
      text.id,
      { kind: "text", changes: { text: "Changed" } },
      mugProduct,
    );

  // then
  expect(moved.areas.wrap![0]!.x).toBe(2);
  expect(edit().status).toBe("rejected");
});

function value<T>(result: CommandResult<T>): T {
  if (result.status === "rejected") throw new Error(JSON.stringify(result.issues));
  return result.value;
}
