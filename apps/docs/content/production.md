---
title: "Production output"
description: "Generate and validate per-area PNG and SVG production artifacts."
---

Import production helpers from `@react-fabrio/fabric`. They take physical area definitions, ordered document elements and resolved asset/font references. They exclude editor controls, guides and product photography. To connect host callbacks, follow [Handle confirmation](guides/confirmation.md).

## Complete design export

`exportDesign(product, document, { signal? })` returns a `Promise<DesignResult>` containing a cloned document, ordered production files, PNG previews, and validation warnings. It snapshots both inputs before asynchronous work. Area DPI and fonts take precedence over product settings; print DPI otherwise defaults to 300. Engraving previews use PNG at 300 DPI. Filenames follow `${product.id}-${area.id}.png` or `.svg`.

Validation blockers reject with `DesignValidationError`, whose `issues` property contains the blocking issues. Resource and rendering errors reject the entire operation without returning partial results. An optional `AbortSignal` is checked between exports and previews and before returning; it does not interrupt synchronous canvas work. The caller must lock editing, handle confirmation callbacks and release the lock in `finally`.

## Print PNG

`exportPrintArea(area, elements, assets, { dpi?, fonts? })` returns a PNG `Blob`. The area must use `production: 'print'`. Pass product-level DPI and fonts explicitly when calling the helper directly; the helper itself defaults to area DPI then 300 and area fonts.

Core `printPixelDimensions(width, height, dpi = 300, bleed = 0)` calculates each dimension as:

```text
ceil((area millimeters + 2 × bleed millimeters) / 25.4 × DPI)
```

For 50 × 25 mm with 2 mm bleed at 300 DPI, output is 638 × 343 pixels. Dimensions and DPI must be finite and positive; DPI below 300 is rejected. The canvas remains transparent outside artwork and is clipped to the production boundary. Rectangular and elliptical boundaries expand by bleed. A path boundary expands through the union of its filled shape and a rounded stroke of twice the bleed width, rendered as a mask at full output resolution.

`addPngResolution(bytes, dpi)` sets PNG `pHYs` metadata with `round(dpi / 0.0254)` pixels per meter and meter units, replacing existing physical-resolution chunks. The metadata contract follows the [W3C PNG physical pixel dimensions specification](https://www.w3.org/TR/png-3/#11pHYs). At 300 DPI this is 11,811 pixels per meter. Metadata rounding does not change pixel dimensions.

Browser canvas allocation, resource decoding, CORS or PNG encoding can fail at large sizes. Export rejects at the requested resolution; it never silently lowers DPI. The host may retry after correcting the resource or environment.

## Effective image DPI

Core `effectiveImageDpi(source, placed, crop?)` returns the smaller horizontal/vertical source-pixel density. Cropping reduces available pixels: multiply each source dimension by its crop fraction, then divide by the corresponding placed inches. A 1200 px image placed at 101.6 mm gives 300 DPI; a half-width crop at that width gives 150 DPI horizontally.

Quality validation reports images below 300 effective DPI as warnings. Increasing the PNG export DPI does not recover missing source detail. Warnings are included in `DesignResult`; blockers include missing assets/fonts, unsupported glyphs, required-field failures and prohibited content.

## Engraving SVG

`exportEngravingArea(area, elements, fonts?)` returns an SVG `Blob` for an engraving area. It declares physical `width`/`height` in millimeters and an area-sized `viewBox`. Images are rejected. Engraving clips to the physical area without adding print bleed. Vector paths and Fontkit-outlined text are emitted in black. No live text, raster payloads, scripts or external resources are emitted.

Both print and engraving text use configured font bytes through Fontkit. Missing files, unsupported glyphs and font collections without an individual face throw errors. Newlines, alignment, line-height multipliers and physical letter spacing are applied while outlining. `outlineTextPath(element, fonts)` exposes the same clipped physical glyph geometry for adapter rendering. Text wraps at ordinary spaces to the physical frame width; explicit newlines end paragraphs. Nonbreaking spaces keep words together. Justified alignment distributes remaining width between words on soft-wrapped lines; paragraph endings and single-word lines stay left aligned. Long unbroken words and content below the frame are clipped rather than shrunk.

SVG transforms and boundary clipping are resolved into standalone path geometry using Bézier boolean operations. Signed contour intersections preserve interior holes in glyphs, artwork and decoration boundaries. Output contains no live group transforms or clipping references. Verify the resulting contours in the downstream engraving workflow.

## Restricted SVG import

`parseRestrictedSvg(source)` validates and returns a geometry-only SVG string. Allowed elements are `svg`, `g`, `path`, `rect`, `circle`, `ellipse`, `polygon`, `polyline` and `line`; attributes cover geometry, transforms, fill/stroke and the standard SVG namespace. It rejects unknown elements/attributes, declarations, entities, non-whitespace text and resource URLs. This validation helper does not normalize geometry by itself. `importSvgPath(source)` asynchronously converts accepted filled shapes to one document path and resolves nested transforms. It rejects strokes (including inherited group/root strokes), open line/polyline artwork, even-odd fill rules and nested SVG viewports. Convert strokes to filled outlines, use nonzero filled contours and flatten nested viewports before import. Inherited `fill="none"` is respected. The editor selects colors; it does not retain multiple colors from the imported artwork. The restricted importer is not a complete XML sanitizer. The default UI's upload path is described in [editor UX](editor-ux.md).

## Verification

Check the generated artifacts themselves: PNG signature, IHDR dimensions, `pHYs`, alpha and boundary pixels; SVG physical units, absence of live text/resources and correct clipping. Test Polish glyph outlines with the configured font. Confirm production contains no mockup pixels. Preserve the editable document on all output failures.

## Safe margins and bleed guides

Safety and bleed guides exist only in the editor overlay. `constrainToSafeArea: false` preserves all overflowing geometry in JSON; PNG/SVG export continues to crop using the existing production boundary and bleed rules. Safe-area enforcement does not change output dimensions. The playground demonstrates 3 mm safe margins and 2 mm mug bleed; merchant production values must come from the actual product specification.
