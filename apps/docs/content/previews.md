---
title: "Previews"
description: "Flat editing, photographic mockups and the optional mug preview."
---

Flat editing and production use the same physical design document. Mockups help customers visualize the design. They do not prove manufacturing accuracy: monitor color, lighting, handle shape, material and printer behavior can differ.

## Photography mappings

Configure `side.mockups` entries with `url`, `areaId`, `x`, `y`, `width`, `height`, optional `rotation`, `maskUrl` and `shadingUrl`. Position and dimensions are percentages of the displayed photograph, while rotation uses degrees. The default editor draws photography, mapped area artwork with an optional mask, then shading.

The mockup view refreshes its artwork when the active design changes. Production helpers render area artwork directly, so photographs are excluded from production files. Mappings are flat percentage placements; calibrated perspective warping is outside the current compositor.

## Optional straight-sided mug

### Mounting and options

`@react-fabrio/three` exports `mountMugPreview(container, options)`. Three.js is loaded when this function runs. Options are `diameter` and `height` in millimeters, ceramic `color`, `handleColor`, `artworkUrl`, `wrapFraction` in `(0, 1]`, `artworkHeight` in millimeters, `wrapStart` in radians, and `onUnavailable(error)`.

Defaults are diameter 82 mm, height 95 mm, white ceramic and handle, and wrap fraction 0.85. The implementation includes a cylindrical body, rim, interior, base and handle. Drag rotates the mug; wheel input zooms. Cylinder UVs follow artwork x coordinates; the wrap's gap sits beside the handle. Artwork height defaults to 85% of body height and can be set explicitly. These settings control the visualization; they do not provide a calibrated print projection.

### Lifecycle and failures

The returned handle has asynchronous `setArtwork(url)`, `setRotation(radians)` and `dispose()`. Dispose on unmount to release textures, geometry, materials, observers and listeners. Artwork URLs must be loadable by Three.js, including required CORS access. Initialization returns `null` and calls `onUnavailable` when WebGL creation or initial artwork loading fails; retain the flat preview in that case. Module import failure rejects the promise and also needs host error handling.

### Product configuration mapping

`ProductConfig.mug` stores `radius`, `height`, optional colors, `areaId`, `wrapStart` and `wrapAngle` (degrees). A custom integration can map radius to `diameter: radius * 2` and wrap angle to `wrapFraction: wrapAngle / 360`. Map configuration `wrapStart` degrees to preview `wrapStart` radians and area height to `artworkHeight`. The built-in editor performs this mapping; the playground uses that integration.

### Built-in editor integration

When `product.mug` is configured, the default editor offers the mug view and dynamically imports the optional `@react-fabrio/three` peer package after that view is selected. Install that package to use the built-in view. `ProductEditor.renderMug` overrides the default integration. Missing-package, WebGL and artwork failures report an error and return to flat view. ArrowLeft/ArrowRight rotate the focused preview; plus/minus zoom. Physical dimensions and wrap settings are configurable; the host must calibrate production against an actual mug. Arbitrary GLB models are deferred.

### Accessibility labels

Canvas handles expose `setAriaLabel(label)` to update accessibility text without loading artwork or resetting the camera. `MugPreviewOptions.ariaLabel` sets the initial label. The built-in UI updates both canvas labels when the provider locale changes.
