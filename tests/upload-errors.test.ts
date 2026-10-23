import { afterEach, expect, test, vi } from "vitest";
import { createEditorSession, type ProductConfig } from "../packages/core/src/index.js";
import { mugProduct, tagProduct } from "../packages/core/src/examples.js";
import { useAssetUploads } from "../packages/react/src/use-asset-uploads.js";
import { useEditorContext } from "../packages/react/src/context.js";

vi.mock("../packages/react/node_modules/react/index.js", () => ({
  useEffect: () => {},
  useRef: (current: unknown) => ({ current }),
  useState: (value: unknown) => [value, () => {}],
  createContext: () => ({}),
}));
vi.mock("../packages/react/src/context.js", () => ({ useEditorContext: vi.fn() }));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test.each([
  { code: "invalid-replacement", product: mugProduct, files: [], replace: true },
  {
    code: "gallery-capacity",
    product: { ...mugProduct, upload: { maxFiles: 1 } },
    files: ["image/png", "image/png"],
  },
  { code: "unsupported-type", product: mugProduct, files: ["application/pdf"] },
  {
    code: "file-too-large",
    product: { ...mugProduct, upload: { maxBytes: 1 } },
    files: ["image/png"],
  },
  {
    code: "engraving-vector-required",
    product: { ...tagProduct, upload: { mimeTypes: ["image/png"] } },
    files: ["image/png"],
  },
])("reports stable $code upload errors", async ({ code, product, files, replace }) => {
  const editor = createEditorSession(product as ProductConfig);
  vi.mocked(useEditorContext).mockReturnValue(editor);
  const onError = vi.fn();
  const { upload } = useAssetUploads({ onError });
  await upload(
    (files.length ? files : ["image/svg+xml"]).map(
      (type) => new File(["content"], "file", { type }),
    ),
    replace ? { replaceElementId: "image" } : {},
  );
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({ name: "AssetUploadError", code }));
  expect(editor.getSnapshot().document.assets).toEqual({});
});

test("reports empty SVG with a stable code and retains the parser cause", async () => {
  const editor = createEditorSession({ ...mugProduct, upload: { mimeTypes: ["image/svg+xml"] } });
  vi.mocked(useEditorContext).mockReturnValue(editor);
  const onError = vi.fn();
  await useAssetUploads({ onError }).upload([
    new File(["<svg/>"], "file.svg", { type: "image/svg+xml" }),
  ]);
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({
      code: "invalid-svg",
      cause: expect.objectContaining({ message: "SVG must contain filled geometry." }),
    }),
  );
  expect(editor.getSnapshot().document.areas.wrap).toEqual([]);
});

test("reports image decoding failure with a stable code and retains its cause", async () => {
  const cause = new Error("Invalid image bytes");
  vi.stubGlobal(
    "Image",
    class {
      decode() {
        return Promise.reject(cause);
      }
    },
  );
  const editor = createEditorSession(mugProduct);
  vi.mocked(useEditorContext).mockReturnValue(editor);
  const onError = vi.fn();
  await useAssetUploads({ onError }).upload([
    new File(["invalid"], "file.png", { type: "image/png" }),
  ]);
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "invalid-image", cause }));
  expect(editor.getSnapshot().document.assets).toEqual({});
  expect(editor.reserveUploads(10)).not.toBeNull();
});

test("passes unexpected host upload errors through unchanged", async () => {
  const cause = new Error("Host service unavailable");
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 100;
      naturalHeight = 100;
      decode() {
        return Promise.resolve();
      }
    },
  );
  const editor = createEditorSession(mugProduct);
  vi.mocked(useEditorContext).mockReturnValue(editor);
  const onError = vi.fn();
  await useAssetUploads({
    onError,
    uploadAsset: async () => {
      throw cause;
    },
  }).upload([new File(["image bytes"], "file.png", { type: "image/png" })]);
  expect(onError).toHaveBeenCalledExactlyOnceWith(cause);
  expect(editor.getSnapshot().document.assets).toEqual({});
});
