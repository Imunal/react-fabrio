import { useEffect, useRef, useState } from "react";
import type { AssetReference, CommandResult, DesignDocument } from "@react-fabrio/core";
import { importSvgPath } from "@react-fabrio/fabric";
import { useEditorContext } from "./context.js";
import { retainAssetUrl } from "./asset-urls.js";

/** Expected file-validation errors with stable codes. Unexpected host errors pass through unchanged. */
export type AssetUploadErrorCode =
  | "invalid-replacement"
  | "gallery-capacity"
  | "unsupported-type"
  | "file-too-large"
  | "invalid-image"
  | "invalid-svg"
  | "engraving-vector-required";

export class AssetUploadError extends Error {
  readonly code: AssetUploadErrorCode;

  constructor(code: AssetUploadErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AssetUploadError";
    this.code = code;
  }
}

/**
 * Uploads one file to storage controlled by the host application.
 *
 * @param file - Validated source file.
 * @param signal - Cancellation signal for pending browser work.
 * @returns An immutable asset reference; use a stable URL and `durable: true` for confirmation.
 */
export type UploadAsset = (file: File, signal: AbortSignal) => Promise<AssetReference>;
export interface AssetUploadOptions {
  /** Image to replace. If omitted, inserts a new element. */
  replaceElementId?: string;
}
export interface UseAssetUploadsOptions {
  uploadAsset?: UploadAsset;
  onError?: (error: Error) => void;
}

/**
 * Manages file validation, SVG import and raster uploads for the provider session.
 *
 * @param options - Optional durable upload callback and error reporter.
 * @returns File upload and cancellation functions plus the pending-file count.
 * @throws Error - If called outside `EditorProvider`.
 *
 * @remarks
 * Area changes, session replacement and unmount cancel pending work. Local image URLs
 * remain valid for the provider session so undo/redo can restore them. Temporary URLs
 * for durable uploads are released when work finishes. Document insertions/replacements are atomic.
 */
export const useAssetUploads = ({ uploadAsset, onError }: UseAssetUploadsOptions = {}) => {
  "use no memo";
  const editor = useEditorContext();
  const [pendingUploads, setPendingUploads] = useState(0);
  const state = useRef({ active: true, jobs: new Map<AbortController, () => void>() });
  const cancelAll = () => {
    for (const [controller, release] of state.current.jobs) {
      controller.abort();
      release();
    }
    state.current.jobs.clear();
    if (state.current.active) setPendingUploads(0);
  };
  useEffect(() => {
    const current = state.current;
    current.active = true;
    let areaId = editor.getSnapshot().areaId;
    const unsubscribe = editor.subscribe(() => {
      const next = editor.getSnapshot().areaId;
      if (areaId !== next) {
        areaId = next;
        for (const [controller, release] of current.jobs) {
          controller.abort();
          release();
        }
        current.jobs.clear();
        setPendingUploads(0);
      }
    });
    return () => {
      current.active = false;
      unsubscribe();
      for (const [controller, release] of current.jobs) {
        controller.abort();
        release();
      }
      current.jobs.clear();
    };
  }, [editor]);
  const upload = async (files: File[], options: AssetUploadOptions = {}) => {
    if (!state.current.active || !files.length) return;
    const { product } = editor;
    const area = editor.getArea();
    const selected = editor.getSelected();
    const areaId = editor.getSnapshot().areaId;
    const report = (error: unknown) =>
      onError?.(error instanceof Error ? error : new Error(String(error)));
    const raster = files.filter((file) => file.type !== "image/svg+xml");
    if (options.replaceElementId && (files.length !== 1 || raster.length !== 1)) {
      report(
        new AssetUploadError("invalid-replacement", "Image replacement requires one raster file."),
      );
      return;
    }
    const token = raster.length
      ? editor.reserveUploads(raster.length, options.replaceElementId)
      : undefined;
    if (raster.length && !token) {
      report(
        new AssetUploadError("gallery-capacity", "The gallery has no capacity for this upload."),
      );
      return;
    }
    const check = (result: CommandResult<DesignDocument>) => {
      if (result.status === "rejected")
        throw Object.assign(new Error(result.issues.map((issue) => issue.message).join("; ")), {
          issues: result.issues,
        });
    };
    await Promise.all(
      files.map(async (file) => {
        const controller = new AbortController();
        let reserved = file.type !== "image/svg+xml" ? token : undefined;
        let localUrl: string | undefined;
        let retained = false;
        const release = () => {
          if (reserved) editor.releaseUpload(reserved, 1);
          reserved = undefined;
        };
        state.current.jobs.set(controller, release);
        setPendingUploads(state.current.jobs.size);
        const cancelled = () =>
          controller.signal.aborted ||
          !state.current.active ||
          editor.getSnapshot().areaId !== areaId;
        try {
          const allowed = product.upload?.mimeTypes ?? ["image/png", "image/jpeg", "image/webp"];
          if (!allowed.includes(file.type))
            throw new AssetUploadError("unsupported-type", "Upload format is not permitted.");
          if (file.size > (product.upload?.maxBytes ?? 10_000_000))
            throw new AssetUploadError("file-too-large", "Upload file size is not permitted.");
          if (area.production === "engraving" && file.type !== "image/svg+xml")
            throw new AssetUploadError(
              "engraving-vector-required",
              "Engraving requires vector artwork.",
            );
          if (file.type === "image/svg+xml") {
            const source = await file.text();
            let path: string;
            try {
              path = await importSvgPath(source);
            } catch (cause) {
              throw new AssetUploadError("invalid-svg", "SVG artwork could not be imported.", {
                cause,
              });
            }
            if (cancelled()) return;
            if (selected?.type === "vector" && area.mode === "guided") {
              editor.select(selected.id);
              check(editor.update({ kind: "vector", changes: { path } }));
            } else
              check(
                editor.add({
                  id: crypto.randomUUID(),
                  type: "vector",
                  path,
                  color: area.colors?.[0] ?? "#263c32",
                  x: 3,
                  y: 3,
                  width: 20,
                  height: 20,
                  rotation: 0,
                }),
              );
            return;
          }
          localUrl = URL.createObjectURL(file);
          const image = new Image();
          image.src = localUrl;
          try {
            await image.decode();
          } catch (cause) {
            throw new AssetUploadError("invalid-image", "Image file could not be decoded.", {
              cause,
            });
          }
          if (cancelled()) return;
          const asset: AssetReference = uploadAsset
            ? await uploadAsset(file, controller.signal)
            : {
                id: crypto.randomUUID(),
                url: localUrl,
                mimeType: file.type,
                width: image.naturalWidth,
                height: image.naturalHeight,
                durable: false,
              };
          if (cancelled()) return;
          const resolved = {
            ...asset,
            width: asset.width ?? image.naturalWidth,
            height: asset.height ?? image.naturalHeight,
          };
          const result = options.replaceElementId
            ? editor.replaceImage(options.replaceElementId, resolved, reserved ?? undefined)
            : area.mode === "guided"
              ? editor.addAsset(resolved, reserved ?? undefined)
              : editor.addImage(
                  resolved,
                  {
                    id: crypto.randomUUID(),
                    type: "image",
                    assetId: asset.id,
                    x: 3,
                    y: 3,
                    width: Math.min(30, area.width * 0.8),
                    height:
                      (Math.min(30, area.width * 0.8) * image.naturalHeight) / image.naturalWidth,
                    rotation: 0,
                  },
                  reserved ?? undefined,
                );
          check(result);
          reserved = undefined;
          if (resolved.url === localUrl) {
            retainAssetUrl(editor, localUrl);
            retained = true;
          }
        } catch (error) {
          if (!cancelled()) report(error);
        } finally {
          release();
          if (localUrl && !retained) URL.revokeObjectURL(localUrl);
          state.current.jobs.delete(controller);
          if (state.current.active) setPendingUploads(state.current.jobs.size);
        }
      }),
    );
  };
  return {
    /**
     * Processes a batch of files, reserving raster gallery capacity before starting.
     *
     * @param files - Files to import; MIME type and byte limits come from the product.
     * @param options - Optional replacement target; replacement requires one raster file.
     * @returns Completion of all files. Reports failures through `onError` and discards late
     * results after cancellation. Files that succeeded remain committed.
     */
    upload,
    pendingUploads,
    /** Cancels pending files and releases their gallery reservations without removing committed assets. */
    cancelAll,
  };
};
