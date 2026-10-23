---
title: "Migration before the first stable release"
description: "Pre-stable API changes and saved-document compatibility."
---

The persisted `DesignDocument` remains `schemaVersion: 1`, with millimetres and existing document compatibility. Public editing APIs change without compatibility adapters.

## Update package imports and commands

- Import `createEditorSession`, `EditorSession` and `SessionSnapshot` from `@react-fabrio/core`, instead of React.
- Import example products from `@react-fabrio/core/examples`. Supply the referenced font yourself or configure a licensed font URL.
- Replace legacy `Product`, `createFabricEditor` and `FabricEditor` integrations with `ProductConfig`, `DesignDocument` and `mountDocumentCanvas` or `EditorProvider`.
- Replace broad element patches with a discriminated change request. For example, `{ x: 20 }` becomes `{ kind: "geometry", changes: { x: 20 } }`. Text, image and vector properties use their matching kind. Asset IDs and element identity cannot be patched.
- Pass `ProductConfig` to document commands. Branch on the result's `status`; use `value` for changed or unchanged results and display `issues` for rejected requests. Commands reject invalid mixed changes atomically.
- Replace Fabric's `printPixelSize` with core's `printPixelDimensions(width, height, dpi = 300, bleed = 0)`.

## Replace localization props

Replace `messages`, `EditorMessages` and `defaultMessages` with `FabrioI18nProvider`, `FabrioTranslations`, `fabrioTranslations` and `useFabrioTranslation`. There is no compatibility adapter:

```tsx
import { FabrioI18nProvider, ProductEditor } from "@react-fabrio/ui";

<FabrioI18nProvider locale="pl" resources={{ pl: { confirm: "Zapisz projekt" } }}>
  <ProductEditor product={product} />
</FabrioI18nProvider>;
```

Keep the provider and editor mounted when changing locale. Composable panels require this provider alongside `EditorProvider`. For custom validation rendering, translate issue `code` with its optional `params`; retain `message` for technical diagnostics. Fabric and Three handles expose `setAriaLabel(label)` for updates without remounting; Three also accepts an initial `ariaLabel` option.

## Update custom interfaces

Custom interfaces can reuse `ElementList`, `PropertiesPanel` and `PositionControls` inside `EditorProvider`, and use `useAssetUploads` for the same uploads as `ProductEditor`. Fabric's `exportDesign` supplies the same complete production result. A custom confirmation flow should suspend editing with `setReadOnly`, await export and its host callback, and release the lock in `finally`.

See the [API reference](api.md) and [integration lifecycle](integration.md) for current contracts. Packages retain React 19 and MIT licensing; Three remains optional.
