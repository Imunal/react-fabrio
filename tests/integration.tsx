// Compile the public integration shown in apps/docs/content/integration.md and README.md.
import type { AssetReference, DesignDocument, DesignResult } from "@react-fabrio/core";
import { mugProduct } from "@react-fabrio/core/examples";
import { FabrioI18nProvider, ProductEditor } from "@react-fabrio/ui";
import "@react-fabrio/ui/styles.css";

type IntegrationProps = {
  saved?: DesignDocument;
  upload: (file: File, signal: AbortSignal) => Promise<AssetReference>;
  save: (document: DesignDocument) => void;
  confirm: (result: DesignResult) => Promise<void>;
};

export const Personalizacja = ({ saved, upload, save, confirm }: IntegrationProps) => {
  return (
    <FabrioI18nProvider locale="pl">
      <ProductEditor
        product={mugProduct}
        initialDesign={saved}
        uploadAsset={upload}
        onChange={save}
        onConfirm={confirm}
        onError={(error) => console.error(error)}
      />
    </FabrioI18nProvider>
  );
};

export const MinimalApp = () => {
  return (
    <ProductEditor
      product={mugProduct}
      onConfirm={(result) => {
        console.log(result.document, result.files, result.warnings);
      }}
    />
  );
};

// Compile-time coverage of the discriminated public editing contract.
import type { ElementUpdate, ImagePatch, VectorPatch } from "@react-fabrio/core";
// @ts-expect-error Geometry changes cannot contain text fields.
const mismatchedUpdate: ElementUpdate = { kind: "geometry", changes: { text: "No" } };
// @ts-expect-error Image file changes use replaceImage, never a patch.
const assetPatch: ImagePatch = { assetId: "replacement" };
// @ts-expect-error Template slot identity is immutable.
const slotPatch: VectorPatch = { slotId: "other" };
void [mismatchedUpdate, assetPatch, slotPatch];

// Compile the Quick Start against the same current public exports.
export const QuickStartExample = () => (
  <div style={{ height: "100dvh" }}>
    <ProductEditor
      product={mugProduct}
      onChange={(document) => console.log(document)}
      onConfirm={(result) => console.log(result.files)}
      onError={(error) => console.error(error)}
    />
  </div>
);
