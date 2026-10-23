import { createDesignDocument, createEditorSession, productConfigSchema } from "@react-fabrio/core";
import type { DesignResult, GeometryPatch, TextPatch } from "@react-fabrio/core";
import { mugProduct } from "@react-fabrio/core/examples";
import { exportDesign, mountDocumentCanvas } from "@react-fabrio/fabric";
import { EditorProvider, EditorCanvas, useEditor, useAssetUploads } from "@react-fabrio/react";
import { ProductEditor, ElementList, PropertiesPanel, PositionControls } from "@react-fabrio/ui";
import { FabrioI18nProvider, useFabrioTranslation, fabrioTranslations } from "@react-fabrio/ui";
import type { FabrioTranslations } from "@react-fabrio/ui";
import type { ProductEditorProps } from "@react-fabrio/ui";

const config = productConfigSchema.parse(mugProduct);
const session = createEditorSession(config, createDesignDocument(config));
// @ts-expect-error Geometry cannot change identity.
const identity: GeometryPatch = { id: "new" };
// @ts-expect-error Text changes cannot change lock state.
const locked: TextPatch = { locked: true };
const props: ProductEditorProps = {
  product: config,
  onConfirm: (result: DesignResult) => {
    const blob: Blob | undefined = result.files[0]?.blob;
    void blob;
  },
};
void [
  session,
  identity,
  locked,
  props,
  exportDesign,
  mountDocumentCanvas,
  EditorProvider,
  EditorCanvas,
  useEditor,
  useAssetUploads,
  ProductEditor,
  ElementList,
  PropertiesPanel,
  PositionControls,
];

// A consumer may specialize its own i18next types without constraining Fabrio.
import "i18next";
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "host";
    resources: { host: { hostOnly: "Host message" } };
  }
}
const overrides: Partial<FabrioTranslations> = { confirm: "Save" };
const translatedProvider = { locale: "en-GB", resources: { en: overrides } };
function ConsumerTranslation() {
  const { t } = useFabrioTranslation();
  const label: string = t("confirm");
  // @ts-expect-error Unknown Fabrio key must be rejected even with host augmentation.
  t("hostOnly");
  return label;
}
void [FabrioI18nProvider, fabrioTranslations, translatedProvider, ConsumerTranslation];
