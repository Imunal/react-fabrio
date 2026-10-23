import type { z } from "zod";
import type {
  elementTypeSchema,
  assetReferenceSchema,
  fontConfigSchema,
  elementPermissionsSchema,
  elementBaseSchema,
  textElementSchema,
  cropSchema,
  imageElementSchema,
  vectorElementSchema,
  designElementSchema,
  templateSlotSchema,
  templateSchema,
  artworkSchema,
  mockupConfigSchema,
  mugConfigSchema,
  decorationAreaSchema,
  productConfigSchema,
  designDocumentSchema,
} from "./schemas.js";

export type ElementType = z.infer<typeof elementTypeSchema>;
export type AssetReference = z.infer<typeof assetReferenceSchema>;
export type FontConfig = z.infer<typeof fontConfigSchema>;
export type ElementPermissions = z.infer<typeof elementPermissionsSchema>;
export type ElementBase = z.infer<typeof elementBaseSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type Crop = z.infer<typeof cropSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type VectorElement = z.infer<typeof vectorElementSchema>;
export type DesignElement = z.infer<typeof designElementSchema>;
export type TemplateSlot = z.infer<typeof templateSlotSchema>;
export type Template = z.infer<typeof templateSchema>;
export type Artwork = z.infer<typeof artworkSchema>;
export type MockupConfig = z.infer<typeof mockupConfigSchema>;
export type MugConfig = z.infer<typeof mugConfigSchema>;
export type DecorationArea = z.infer<typeof decorationAreaSchema>;
export type ProductConfig = z.infer<typeof productConfigSchema>;
export type DesignDocument = z.infer<typeof designDocumentSchema>;
export interface ValidationIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  /** Values used to translate the issue for display. The technical message stays unchanged. */
  params?: Record<string, string | number | boolean>;
  areaId?: string;
  elementId?: string;
}
export interface ProductionArtifact {
  areaId: string;
  filename: string;
  mimeType: "image/png" | "image/svg+xml";
  blob: Blob;
}
export interface PreviewArtifact {
  areaId: string;
  blob: Blob;
}
export interface DesignResult {
  document: DesignDocument;
  previews: PreviewArtifact[];
  files: ProductionArtifact[];
  warnings: ValidationIssue[];
}

export type GeometryPatch = Partial<Pick<ElementBase, "x" | "y" | "width" | "height" | "rotation">>;
export type TextPatch = Partial<
  Pick<
    TextElement,
    "text" | "fontId" | "fontSize" | "color" | "align" | "lineHeight" | "letterSpacing"
  >
>;
export type ImagePatch = Partial<Pick<ImageElement, "crop" | "flipX" | "flipY">>;
export type VectorPatch = Partial<Pick<VectorElement, "path" | "color">>;
export type ElementUpdate =
  | { kind: "geometry"; changes: GeometryPatch }
  | { kind: "text"; changes: TextPatch }
  | { kind: "image"; changes: ImagePatch }
  | { kind: "vector"; changes: VectorPatch };
export type CommandResult<T> =
  | { status: "changed"; value: T }
  | { status: "unchanged"; value: T }
  | { status: "rejected"; issues: ValidationIssue[] };
