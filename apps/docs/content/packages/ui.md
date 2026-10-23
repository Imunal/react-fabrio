---
title: "UI API"
description: "ProductEditor props, composable controls and localization catalogs."
---

Import from `@react-fabrio/ui` and load `@react-fabrio/ui/styles.css`.

## ProductEditor

`ProductEditor` requires only `product`; callbacks and customization props are optional. Its prop type is exported as `ProductEditorProps`.

| Prop            | Type/behavior                                                                            |
| --------------- | ---------------------------------------------------------------------------------------- |
| `className`     | Optional class added to the editor root                                                  |
| `headerStart`   | Optional React node between the brand and project menu                                   |
| `headerActions` | Optional React node inside the project menu, after JSON download                         |
| `product`       | Required `ProductConfig`                                                                 |
| `initialDesign` | Optional initial `DesignDocument`; initialization, not a controlled value                |
| `uploadAsset`   | `(file: File, signal: AbortSignal) => Promise<AssetReference>`                           |
| `onChange`      | `(document: DesignDocument) => void`                                                     |
| `onConfirm`     | `(result: DesignResult) => void \| Promise<void>`                                        |
| `onError`       | `(error: Error) => void`                                                                 |
| `renderMug`     | `({ product, document, onError }) => ReactNode`; overrides the built-in optional 3D view |

## Composable controls

`EditorToolbar`, `EditorControls`, `EditorPreview`, `ElementList`, `PropertiesPanel` and `PositionControls` are UI components for use inside an `EditorProvider`. These panels also require `FabrioI18nProvider`; `ElementList`, `PropertiesPanel` and `PositionControls` accept optional `disabled`, and `ElementList` also accepts `onEdit`. Import the stylesheet explicitly.

## Localization

`FabrioI18nProvider` accepts `locale?: string` (BCP 47, default `en`), `resources?: Record<string, Partial<FabrioTranslations>>` and `children`. It keeps a stable, separate i18next instance and loads catalogs synchronously, without Suspense or network requests. `resources` is indexed by language directly; hosts do not supply a namespace. Overrides take precedence over built-in catalogs. Regional locales fall back to their base language, then English.

`fabrioTranslations` exports complete `en` and `pl` catalogs. `FabrioTranslations` describes catalog entries. `useFabrioTranslation()` returns `locale` and a typed `t(key, params)` function, without changing the consumer's global i18next types. `ProductEditor` uses an enclosing provider, or creates an English provider when none exists. Change `locale` on the existing provider to translate the current session without remounting it. The provider also synchronizes React Aria's locale; editor roots expose `lang` and `dir`.
