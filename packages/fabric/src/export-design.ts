import {
  getDesignIssues,
  type DesignDocument,
  type DesignResult,
  type ProductConfig,
  type ValidationIssue,
} from "@react-fabrio/core";
import { exportPrintArea } from "./png-export.js";
import { exportEngravingArea } from "./svg-export.js";

/** A confirmation error with the design's blocking validation issues. */
export class DesignValidationError extends Error {
  readonly issues: ValidationIssue[];
  /**
   * Creates an error whose message summarizes the blocking issues.
   *
   * @param issues - Validation errors returned before artifact generation starts.
   */
  constructor(issues: ValidationIssue[]) {
    super(issues.map((issue) => issue.message).join("; "));
    this.name = "DesignValidationError";
    this.issues = issues;
  }
}

/**
 * Exports all decoration areas from cloned configuration and document snapshots.
 *
 * @param product - Configuration defining area order, production modes, fonts and DPI.
 * @param document - Design to validate and export without mutating the caller's value.
 * @param options - Optional abort signal, checked between stages and before completion.
 * @returns A complete result with the snapshot, named production files, previews and warnings.
 * @throws DesignValidationError - When validation blocks confirmation. Inspect `issues` for the errors.
 * @throws Error - When loading resources or producing an artifact fails.
 *
 * @remarks
 * Aborting rejects with the signal's reason. Synchronous canvas work is not interrupted.
 * The promise returns all results or rejects. Area fonts and DPI override product defaults.
 */
export const exportDesign = async (
  product: ProductConfig,
  document: DesignDocument,
  options: { signal?: AbortSignal } = {},
): Promise<DesignResult> => {
  const checkAbort = () => options.signal?.throwIfAborted();
  checkAbort();
  const config = structuredClone(product);
  const snapshot = structuredClone(document);
  const issues = getDesignIssues(snapshot, config);
  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length) throw new DesignValidationError(errors);
  const files: DesignResult["files"] = [];
  const previews: DesignResult["previews"] = [];
  for (const area of config.sides.flatMap((side) => side.areas)) {
    checkAbort();
    const elements = snapshot.areas[area.id] ?? [];
    const fonts = area.fonts ?? config.fonts ?? [];
    const blob =
      area.production === "print"
        ? await exportPrintArea(area, elements, snapshot.assets, {
            dpi: area.printDpi ?? config.printDpi ?? 300,
            fonts,
          })
        : await exportEngravingArea(area, elements, fonts);
    checkAbort();
    files.push({
      areaId: area.id,
      filename: `${config.id}-${area.id}.${area.production === "print" ? "png" : "svg"}`,
      mimeType: area.production === "print" ? "image/png" : "image/svg+xml",
      blob,
    });
    const preview =
      area.production === "print"
        ? blob
        : await exportPrintArea({ ...area, production: "print" }, elements, snapshot.assets, {
            dpi: 300,
            fonts,
          });
    checkAbort();
    previews.push({ areaId: area.id, blob: preview });
  }
  checkAbort();
  return {
    document: snapshot,
    files,
    previews,
    warnings: issues.filter((issue) => issue.severity === "warning"),
  };
};
