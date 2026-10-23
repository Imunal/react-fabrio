import { mugProduct, tagProduct } from "../packages/core/src/examples.js";
import { expect, test } from "vitest";
import { createEditorSession } from "../packages/core/src/session.js";

import type { TextElement, VectorElement } from "../packages/core/src/index.js";

const text: TextElement = {
  id: "text",
  type: "text",
  text: "Text",
  fontId: "sans",
  fontSize: 4,
  color: "#000000",
  x: 1,
  y: 1,
  width: 30,
  height: 8,
  rotation: 0,
};
const vector: VectorElement = {
  id: "other",
  type: "vector",
  path: "M0 0L1 1",
  color: "#000000",
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  rotation: 0,
};

test("one undo restores the text before a complete editing action", () => {
  // given
  const session = createEditorSession(mugProduct);
  session.add(text);
  session.beginAction();
  session.update({ kind: "text", changes: { text: "Hello" } });
  session.update({ kind: "text", changes: { text: "Hello world" } });
  session.endAction();

  // when
  session.undo();

  // then
  expect(session.getSnapshot().document.areas.wrap![0]).toMatchObject({ text: "Text" });
});

test("redo restores the completed text action", () => {
  // given
  const session = createEditorSession(mugProduct);
  session.add(text);
  session.update({ kind: "text", changes: { text: "Hello world" } });
  session.undo();

  // when
  session.redo();

  // then
  expect(session.getSnapshot().document.areas.wrap![0]).toMatchObject({ text: "Hello world" });
});

test("reopening JSON preserves the design document", () => {
  // given
  const session = createEditorSession(mugProduct);
  session.add(text);
  const saved = JSON.parse(JSON.stringify(session.getSnapshot().document));

  // when
  const reopened = createEditorSession(mugProduct, saved);

  // then
  expect(reopened.getSnapshot().document).toEqual(session.getSnapshot().document);
});

test("changing templates preserves slot permissions", () => {
  // given
  const product = structuredClone(tagProduct);
  product.sides[0]!.areas[0]!.templates![0]!.slots![0]!.permissions = { move: false };
  const session = createEditorSession(product);
  session.applyTemplate("name");
  session.select("name");

  // when
  session.update({ kind: "geometry", changes: { x: 100 } });
  session.update({ kind: "text", changes: { text: "Ada" } });

  // then
  expect(session.getSelected()).toMatchObject({ x: 5, text: "Ada" });
});

test("guided sessions prohibit arbitrary elements", () => {
  // given
  const session = createEditorSession(tagProduct);

  // when
  session.add(vector);

  // then
  expect(session.getSnapshot().document.areas.front).toHaveLength(1);
});

test("confirmation lock prevents document mutations", () => {
  // given
  const session = createEditorSession(mugProduct);
  const before = structuredClone(session.getSnapshot().document);
  session.setReadOnly(true);

  // when
  session.add(text);
  session.addAsset({ id: "upload", url: "/photo.png", mimeType: "image/png", durable: true });
  session.undo();

  // then
  expect(session.getSnapshot().document).toEqual(before);
});

test("releasing the confirmation lock allows editing", () => {
  // given
  const session = createEditorSession(mugProduct);
  session.setReadOnly(true);
  session.setReadOnly(false);

  // when
  session.add(text);

  // then
  expect(session.getSnapshot().document.areas.wrap).toEqual([text]);
});
