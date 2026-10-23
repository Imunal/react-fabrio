import type { ValidationIssue } from "@react-fabrio/core";
import type { FabrioTranslations } from "./i18n.js";
import type { useFabrioTranslation } from "./i18n.js";

const issueKeys = {
  "low-image-dpi": "issueLowImageDpi",
  "non-durable-asset": "issueNonDurableAsset",
  "missing-font": "issueMissingFont",
  "missing-asset": "issueMissingAsset",
  "prohibited-asset": "issueProhibitedAsset",
  "prohibited-color": "issueProhibitedColor",
  "prohibited-element": "issueProhibitedElement",
  "unsafe-vector": "issueUnsafeVector",
  "template-permission": "issueTemplatePermission",
  "guided-element": "issueGuidedElement",
  "invalid-configuration": "issueInvalidConfiguration",
  "invalid-document": "issueInvalidDocument",
  "unsupported-schema": "issueUnsupportedSchema",
  "configuration-mismatch": "issueConfigurationMismatch",
  "area-mismatch": "issueAreaMismatch",
  "duplicate-side": "issueDuplicateSide",
  "duplicate-area": "issueDuplicateArea",
  "duplicate-element": "issueDuplicateElement",
  "invalid-boundary": "issueInvalidBoundary",
  "invalid-slot": "issueInvalidSlot",
  "invalid-mug": "issueInvalidMug",
  "invalid-crop": "issueInvalidCrop",
  "asset-limit-exceeded": "galleryFull",
} as const satisfies Record<string, keyof FabrioTranslations>;

export const translateIssue = (
  issue: ValidationIssue,
  t: ReturnType<typeof useFabrioTranslation>["t"],
): string => {
  if (issue.code === "outside-safe-area")
    return t(issue.severity === "warning" ? "cropWarning" : "safeAreaError");
  if (issue.code === "required-field")
    return t("issueRequiredField", { label: String(issue.params?.label ?? "") });
  return t(issueKeys[issue.code as keyof typeof issueKeys] ?? "error");
};

export const uploadErrorKey = (code: string) => {
  const keys = {
    "invalid-replacement": "uploadInvalidReplacement",
    "gallery-capacity": "uploadGalleryCapacity",
    "upload-not-permitted": "uploadNotPermitted",
    "engraving-vector-required": "uploadEngravingVectorRequired",
    "invalid-svg": "uploadInvalidSvg",
    "unsupported-type": "uploadUnsupportedType",
    "file-too-large": "uploadTooLarge",
    "invalid-image": "uploadInvalidImage",
  } as const satisfies Record<string, keyof FabrioTranslations>;
  return keys[code as keyof typeof keys] ?? "uploadFailed";
};

/** Reads the domain issues carried by upload and export failures. */
export const errorIssues = (error: Error): ValidationIssue[] | undefined => {
  if (!("issues" in error) || !Array.isArray(error.issues) || !error.issues.length)
    return undefined;
  return error.issues.every(
    (issue): issue is ValidationIssue =>
      issue !== null &&
      typeof issue === "object" &&
      typeof issue.code === "string" &&
      typeof issue.message === "string" &&
      (issue.severity === "error" || issue.severity === "warning"),
  )
    ? error.issues
    : undefined;
};
