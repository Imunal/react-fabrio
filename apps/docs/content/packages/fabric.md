---
title: "Fabric API"
description: "Imperative canvas mounting and browser production exports."
---

Import from `@react-fabrio/fabric`.

## mountDocumentCanvas

`mountDocumentCanvas(host, options)` mounts the physical document canvas and returns `render(options)`, `setSelection(id)`, `setZoom(value)`, `setAriaLabel(label)` and asynchronous `dispose()`. Options include product, document, area ID, selected ID and select/transform/error callbacks. `onSelectionBoundsChange?: (bounds: SelectionBounds | null) => void` receives the active object rectangle in CSS pixels relative to the canvas host (`x`, `y`, `width`, `height`). It updates on selection, movement, scaling, rotation, zoom and host resize; clearing selection emits `null`. This viewport callback never commits document/history changes. The transform callback receives only changed geometry fields; return `false` when a command is rejected to restore the committed canvas geometry. `SelectionBounds` is exported by Fabric and React.

`addPngResolution`, `parseRestrictedSvg`, `importSvgPath`, `outlineTextPath`, `exportPrintArea` and `exportEngravingArea` are documented in [production](../production.md). Helpers with asynchronous loading or rendering return promises that reject on failure. No output helper publishes or stores files.

## exportDesign

`exportDesign(product, document, { signal? })` snapshots and validates all areas, then returns a complete `DesignResult`. Validation errors expose `issues`; resource and export failures reject the promise. Cancellation is checked between stages and before completion. See [migration](../migration.md) for changed imports.
