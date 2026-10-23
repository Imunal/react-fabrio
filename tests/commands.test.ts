import { describe, expect, it } from "vitest";
import {
  createEditorSession,
  createDesignDocument,
  updateElement,
} from "../packages/core/src/index.js";
import { mugProduct } from "../packages/core/src/examples.js";
describe("atomic commands", () => {
  it("rejects an entire mixed permission request and preserves session identity", () => {
    const product = structuredClone(mugProduct);
    const area = product.sides[0]!.areas[0]!;
    area.mode = "freeform";
    const document = createDesignDocument(product);
    document.areas[area.id] = [
      {
        id: "text",
        type: "text",
        text: "Hello",
        fontId: product.fonts![0]!.id,
        fontSize: 5,
        color: "#000000",
        x: 10,
        y: 10,
        width: 20,
        height: 10,
        rotation: 0,
        permissions: { resize: false },
      },
    ];
    const session = createEditorSession(product, document);
    session.select("text");
    const before = session.getSnapshot();
    let notifications = 0;
    session.subscribe(() => notifications++);
    expect(session.update({ kind: "geometry", changes: { x: 12, width: 25 } }).status).toBe(
      "rejected",
    );
    expect(session.getSnapshot()).toBe(before);
    expect(notifications).toBe(0);
    expect(
      updateElement(
        document,
        area.id,
        "text",
        { kind: "text", changes: { text: "Hello" } },
        product,
      ),
    ).toEqual({ status: "unchanged", value: document });
  });
});
it("rejects unknown fields and invalid JS values without side effects", () => {
  const session = createEditorSession(mugProduct);
  session.add({
    id: "v",
    type: "vector",
    path: "M0 0L1 1",
    color: "#000000",
    x: 1,
    y: 1,
    width: 2,
    height: 2,
    rotation: 0,
  });
  const before = session.getSnapshot();
  for (const update of [
    { kind: "geometry", changes: { x: 3, locked: true } },
    { kind: "geometry", changes: { width: -1 } },
    { kind: "text", changes: { text: "x" } },
    { kind: "vector", changes: { path: "<script>" } },
  ]) {
    expect(session.update(update as never).status).toBe("rejected");
    expect(session.getSnapshot()).toBe(before);
  }
});
it("does not notify for an empty action or create history for a round trip", () => {
  const session = createEditorSession(mugProduct);
  let calls = 0;
  session.subscribe(() => calls++);
  session.beginAction();
  session.endAction();
  expect(calls).toBe(0);
  session.add({
    id: "v",
    type: "vector",
    path: "M0 0L1 1",
    color: "#000000",
    x: 1,
    y: 1,
    width: 2,
    height: 2,
    rotation: 0,
  });
  session.beginAction();
  session.update({ kind: "geometry", changes: { x: 2 } });
  session.update({ kind: "geometry", changes: { x: 1 } });
  session.endAction();
  session.undo();
  expect(session.getSnapshot().document.areas.wrap).toEqual([]);
});
it("keeps only 100 completed actions", () => {
  const session = createEditorSession(mugProduct);
  session.add({
    id: "v",
    type: "vector",
    path: "M0 0L1 1",
    color: "#000000",
    x: 1,
    y: 1,
    width: 2,
    height: 2,
    rotation: 0,
  });
  for (let i = 2; i <= 105; i++) session.update({ kind: "geometry", changes: { x: i } });
  for (let i = 0; i < 100; i++) expect(session.undo().status).toBe("changed");
  expect(session.undo().status).toBe("unchanged");
  expect(session.getSnapshot().document.areas.wrap![0]!.x).toBe(5);
});
it("rejects unknown nested crop fields atomically", () => {
  const session = createEditorSession(mugProduct);
  session.addImage(
    { id: "a", url: "blob:photo", mimeType: "image/png", durable: false },
    {
      id: "image",
      type: "image",
      assetId: "a",
      x: 1,
      y: 1,
      width: 10,
      height: 10,
      rotation: 0,
    },
  );
  const before = session.getSnapshot();
  expect(
    session.update({
      kind: "image",
      changes: { flipX: true, crop: { x: 0, y: 0, width: 0.5, height: 0.5, unknown: true } },
    } as never).status,
  ).toBe("rejected");
  expect(session.getSnapshot()).toBe(before);
});
