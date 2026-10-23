export type {
  ElementType,
  AssetReference,
  FontConfig,
  ElementPermissions,
  ElementBase,
  TextElement,
  Crop,
  ImageElement,
  VectorElement,
  DesignElement,
  TemplateSlot,
  Template,
  Artwork,
  MockupConfig,
  MugConfig,
  DecorationArea,
  ProductConfig,
  DesignDocument,
  ValidationIssue,
  ProductionArtifact,
  PreviewArtifact,
  DesignResult,
  GeometryPatch,
  TextPatch,
  ImagePatch,
  VectorPatch,
  ElementUpdate,
  CommandResult,
} from "./contracts.js";
export { getArea, createDesignDocument } from "./document.js";
export {
  addElement,
  updateElement,
  removeElement,
  reorderElement,
  applyTemplate,
} from "./commands.js";
export { effectiveImageDpi, printPixelDimensions } from "./geometry.js";
export type { History } from "./history.js";
export { createHistory, commitHistory, undoHistory, redoHistory } from "./history.js";
export { canEditElement, canReorderElement } from "./permissions.js";
export type { SessionSnapshot, EditorSession } from "./session.js";
export { createEditorSession } from "./session.js";
export { validateProductConfig, validateDesignDocument, getDesignIssues } from "./validation.js";
export {
  elementTypeSchema,
  elementPermissionsSchema,
  elementBaseSchema,
  cropSchema,
  textElementSchema,
  imageElementSchema,
  vectorElementSchema,
  designElementSchema,
  assetReferenceSchema,
  fontConfigSchema,
  artworkSchema,
  templateSlotSchema,
  templateSchema,
  mockupConfigSchema,
  mugConfigSchema,
  decorationAreaSchema,
  productConfigSchema,
  designDocumentSchema,
  productConfigJsonSchema,
  designDocumentJsonSchema,
} from "./schemas.js";
export {
  SAFE_AREA_TOLERANCE,
  elementRectangle,
  isInsideSafeArea,
  permitsSafeAreaTransform,
  placeInSafeArea,
  areaGuidePaths,
} from "./safe-area.js";
