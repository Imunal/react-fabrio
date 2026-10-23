---
title: "Release acceptance"
description: "Outstanding verification, first-release criteria and deferred work."
---

The release targets below include unfinished work. For current behavior, read [product scope](product.md) and the subject references.

## Remaining release acceptance work

Remaining verification includes a full accessibility/localization audit and production calibration against actual merchant photographs and mugs. The mockup compositor uses flat percentage mappings; perspective warping is outside its current scope. See [editor UX](editor-ux.md), [previews](previews.md) and [production](production.md) for exact behavior.

## First-release acceptance criteria

Features marked as planned in the linked references still need implementation before they meet these criteria.

- Guided and freeform sessions retain content on all sides and areas through save/reopen.
- Text, images, vectors and templates obey area capabilities, locks and property permissions.
- Selection has contextual controls for movement, dimensions, rotation, duplication, deletion, ordering and alignment; snapping, undo/redo, zoom and fit-to-view work consistently.
- Text exposes configured font/weight, size, color, alignment, line and letter spacing. Images support replacement, normalized crop and flipping.
- Customers can select, edit, move and reorder elements without operating the canvas. Mobile panels collapse; labels and messages can be translated.
- Mockups exclude photography from production files. Optional mug preview rotates and zooms while flat editing stays available.
- Each print area produces transparent PNG at configured DPI of at least 300, with bleed, clipping and matching physical metadata. Low-resolution sources warn without preventing confirmation.
- Each engraving area produces physical-size monochrome SVG with outlined configured text, clipped geometry and no raster images, external references, scripts or live text.
- Unsupported schema versions and configuration revisions fail explicitly. Asset/font/glyph failures block confirmation without losing work.

## Deferred work

PDF/CMYK prepress, laser machine instructions, arbitrary GLB models, photobooks, AI effects, curved text and a merchant configuration dashboard are outside this release scope.
