/* oxlint-disable react/only-export-components -- Browser integration test harness. */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { EditorProvider, useEditor, useAssetUploads } from "@react-fabrio/react";
import {
  FabrioI18nProvider,
  ElementList,
  PropertiesPanel,
  PositionControls,
} from "@react-fabrio/ui";
import { tshirtProduct } from "@react-fabrio/core/examples";
import type { AssetReference } from "@react-fabrio/core";

export const harness: {
  editor?: ReturnType<typeof useEditor>["editor"];
  uploads?: ReturnType<typeof useAssetUploads>;
  changes: number;
  errors: string[];
  resolve?: (asset: AssetReference) => void;
  signal?: AbortSignal;
  hide?: () => void;
  unmount?: () => void;
} = { changes: 0, errors: [] };
const Uploads = ({ durable }: { durable: boolean }) => {
  const uploads = useAssetUploads({
    uploadAsset: durable
      ? (_file, signal) =>
          new Promise<AssetReference>((resolve) => {
            harness.resolve = resolve;
            harness.signal = signal;
          })
      : undefined,
    onError: (error) => harness.errors.push(error.message),
  });
  useEffect(() => {
    harness.uploads = uploads;
  }, [uploads]);
  return <output data-testid="pending">{uploads.pendingUploads}</output>;
};
const Controls = ({ durable }: { durable: boolean }) => {
  const { editor } = useEditor();
  const [show, setShow] = useState(true);
  useEffect(() => {
    harness.editor = editor;
    harness.hide = () => setShow(false);
  }, [editor]);
  return (
    <>
      {show && <Uploads durable={durable} />}
      <ElementList />
      <PropertiesPanel />
      <PositionControls />
    </>
  );
};
export const mount = (durable = false) => {
  const host = document.createElement("div");
  document.body.replaceChildren(host);
  const root = createRoot(host);
  root.render(
    <FabrioI18nProvider>
      <EditorProvider product={tshirtProduct} onChange={() => harness.changes++}>
        <Controls durable={durable} />
      </EditorProvider>
    </FabrioI18nProvider>,
  );
  harness.unmount = () => root.unmount();
};
export const upload = async () => {
  const bytes = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
    ),
    (c) => c.charCodeAt(0),
  );
  await harness.uploads!.upload([new File([bytes], "photo.png", { type: "image/png" })]);
};
