import { mugProduct } from "../packages/core/src/examples.js";
import { test, expect } from "vitest";
import { createEditorSession } from "../packages/core/src/session.js";
import { createDesignDocument, getDesignIssues } from "../packages/core/src/index.js";
const asset = (id: string) => ({ id, url: `/${id}.png`, mimeType: "image/png", durable: true });
const image = (id: string, assetId = id) => ({
  id,
  type: "image" as const,
  assetId,
  x: 5,
  y: 5,
  width: 20,
  height: 20,
  rotation: 0,
});
const product = () => ({ ...mugProduct, upload: { maxFiles: 1 } });
test("session enforces gallery limit and preserves undo/redo for atomic photo additions", () => {
  const s = createEditorSession(product());
  expect(s.addImage(asset("a"), image("a")).status).toBe("changed");
  expect(s.addImage(asset("b"), image("b")).status).toBe("rejected");
  s.undo();
  expect(s.getSnapshot().document.assets).toEqual({});
  expect(s.getSnapshot().document.areas.wrap).toEqual([]);
  s.redo();
  expect(s.getSnapshot().document.assets.a).toEqual(asset("a"));
});
test("upload reservations reject an oversized batch and release failed uploads", () => {
  const s = createEditorSession(product());
  const token = s.reserveUploads(1);
  expect(token).toBeTruthy();
  expect(s.reserveUploads(1)).toBeNull();
  expect(s.addAsset(asset("b")).status).toBe("rejected");
  s.releaseUpload(token!);
  expect(s.reserveUploads(2)).toBeNull();
  expect(s.reserveUploads(1)).toBeTruthy();
});
test("full galleries allow atomic replacement only for a uniquely used old asset", () => {
  const s = createEditorSession(product());
  s.addImage(asset("a"), image("a"));
  expect(s.replaceImage("a", asset("b")).status).toBe("changed");
  expect(Object.keys(s.getSnapshot().document.assets)).toEqual(["b"]);
  s.undo();
  expect(Object.keys(s.getSnapshot().document.assets)).toEqual(["a"]);
  s.add(image("other", "a"));
  expect(s.replaceImage("other", asset("c")).status).toBe("rejected");
});
test("unused assets can be removed and restored, used assets are protected", () => {
  const s = createEditorSession(product());
  s.addImage(asset("a"), image("a"));
  expect(s.removeAsset("a").status).toBe("rejected");
  s.remove();
  expect(s.getSnapshot().document.assets.a).toBeDefined();
  expect(s.removeAsset("a").status).toBe("changed");
  s.undo();
  expect(s.getSnapshot().document.assets.a).toBeDefined();
});
test("over-limit legacy documents open intact and block confirmation", () => {
  const p = product(),
    d = createDesignDocument(p);
  d.assets = { a: asset("a"), b: asset("b") };
  expect(createEditorSession(p, d).getSnapshot().document).toEqual(d);
  expect(getDesignIssues(d, p)).toContainEqual(
    expect.objectContaining({ code: "asset-limit-exceeded", severity: "error" }),
  );
});
test("batch reservations are consumed one file at a time and cannot be bypassed", () => {
  const s = createEditorSession({ ...mugProduct, upload: { maxFiles: 3 } });
  const token = s.reserveUploads(3)!;
  expect(s.addImage(asset("a"), image("a"), token).status).toBe("changed");
  expect(s.addAsset(asset("unreserved")).status).toBe("rejected");
  s.releaseUpload(token, 1);
  expect(s.addImage(asset("b"), image("b"), token).status).toBe("changed");
  expect(s.addAsset(asset("c")).status).toBe("changed");
  expect(s.addAsset(asset("d")).status).toBe("rejected");
});
test("the default gallery limit counts unused raster files across the document", () => {
  const s = createEditorSession(mugProduct);
  for (let i = 0; i < 10; i++) expect(s.addAsset(asset(String(i))).status).toBe("changed");
  expect(s.addAsset(asset("eleventh")).status).toBe("rejected");
});
