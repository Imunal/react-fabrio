import { mugProduct, shirtProduct } from "../packages/core/src/examples.js";
import { expect, test } from "vitest";
import { createEditorSession } from "../packages/core/src/session.js";
import { createDesignDocument, reorderElement } from "../packages/core/src/index.js";
import type { DesignElement } from "../packages/core/src/index.js";

const element = (id: string): DesignElement => ({
  id,
  type: "vector",
  path: "M0 0L1 1",
  color: "#000000",
  x: 1,
  y: 1,
  width: 2,
  height: 2,
  rotation: 0,
});
const setup = (protectedIndex?: number, locked = false, guided = false) => {
  const product = structuredClone(mugProduct);
  if (guided) product.sides[0]!.areas[0]!.mode = "guided";
  const document = createDesignDocument(product);
  document.areas.wrap = ["a", "b", "c", "d"].map(element);
  if (protectedIndex !== undefined)
    Object.assign(
      document.areas.wrap[protectedIndex]!,
      locked ? { locked: true } : { permissions: { reorder: false } },
    );
  return { document, session: createEditorSession(product, document) };
};
const ids = (session: ReturnType<typeof createEditorSession>) =>
  session.getSnapshot().document.areas.wrap!.map((e) => e.id);

test.each([0, 1, 2, 3])("moves to final document index %i with one undo and redo", (index) => {
  const { session, document } = setup();
  session.select("b");
  let changes = 0;
  session.subscribe(() => {
    changes++;
  });
  expect(session.moveElement("b", index).status).toBe(index === 1 ? "unchanged" : "changed");
  const expected = ["a", "c", "d"];
  expected.splice(index, 0, "b");
  expect(ids(session)).toEqual(expected);
  expect(session.getSnapshot().selectedId).toBe("b");
  expect(changes).toBe(index === 1 ? 0 : 1);
  session.undo();
  expect(session.getSnapshot().document).toEqual(document);
  expect(session.getSnapshot().canUndo).toBe(false);
  session.redo();
  expect(ids(session)).toEqual(expected);
});

test.each([true, false])(
  "protected elements block crossings and direct moves (locked=%s)",
  (locked) => {
    const { session, document } = setup(1, locked);
    expect(session.moveElement("a", 3).status).toBe("rejected");
    expect(session.moveElement("d", 0).status).toBe("rejected");
    expect(session.moveElement("b", 2).status).toBe("rejected");
    expect(reorderElement(document, "wrap", "a", 3, mugProduct).status).toBe("rejected");
    expect(session.getSnapshot().canUndo).toBe(false);
    expect(session.moveElement("d", 2).status).toBe("changed");
    expect(ids(session)).toEqual(["a", "b", "d", "c"]);
  },
);

test("relative order uses the same rules and works in guided areas", () => {
  const { session } = setup(1, false, true);
  session.select("c");
  session.reorder(-1);
  expect(ids(session)).toEqual(["a", "b", "c", "d"]);
  session.reorder(1);
  expect(ids(session)).toEqual(["a", "b", "d", "c"]);
});

test("invalid, unchanged, read-only and other-area moves preserve history", () => {
  const { session } = setup();
  for (const index of [-1, 4, 1.5, NaN, Infinity])
    expect(session.moveElement("a", index).status).toBe("rejected");
  expect(session.moveElement("missing", 0).status).toBe("rejected");
  expect(session.moveElement("a", 0).status).toBe("unchanged");
  session.setReadOnly(true);
  expect(session.moveElement("a", 2).status).toBe("rejected");
  session.setReadOnly(false);
  session.moveElement("a", 2);
  session.undo();
  expect(session.moveElement("a", 0).status).toBe("unchanged");
  expect(session.getSnapshot().canRedo).toBe(true);
});

test("moves only within the active area and relative moves match absolute moves", () => {
  const { session } = setup();
  const { session: relative } = setup();
  session.select("a");
  relative.select("a");
  session.moveElement("a", 3);
  relative.reorder(100);
  expect(ids(relative)).toEqual(ids(session));
  session.setArea("missing");
  expect(session.getSnapshot().areaId).toBe("wrap");
});

test("an element in another decoration area cannot be moved", () => {
  const document = createDesignDocument(shirtProduct);
  document.areas.front = [element("front-element")];
  document.areas.back = [element("back-element")];
  const session = createEditorSession(shirtProduct, document);
  expect(session.moveElement("back-element", 0).status).toBe("rejected");
  session.setArea("back");
  expect(session.moveElement("front-element", 0).status).toBe("rejected");
  expect(session.getSnapshot().document).toEqual(document);
  expect(session.getSnapshot().canUndo).toBe(false);
});
