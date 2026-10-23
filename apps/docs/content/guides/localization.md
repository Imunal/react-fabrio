---
title: "Localize the editor"
description: "Select a language and override interface text while preserving the editing session."
---

Use `FabrioI18nProvider` to set the interface language. The built-in catalogs are English and Polish; omitting the provider gives English.

## 1. Wrap the editor

```tsx
import { FabrioI18nProvider, ProductEditor } from "@react-fabrio/ui";

<FabrioI18nProvider locale="pl" resources={{ pl: { confirm: "Zapisz projekt" } }}>
  <ProductEditor product={product} />
</FabrioI18nProvider>;
```

`resources` is indexed directly by language and accepts partial catalogs. Overrides take precedence over built-in text. Regional locales fall back to the base language, then English.

## 2. Switch language without remounting

Update `locale` on the existing provider. Keep both provider and editor mounted to preserve the document, selection, history, viewport, pending uploads and crop drafts.

The provider uses its own i18next instance with synchronous catalogs. It does not fetch translations, detect a language or store the user's preference. Your application controls those choices.

## 3. Translate host data and custom controls

Product names, side and area labels, template and slot labels, and customer content remain host data. Translate that data in the product configuration. The interface catalog handles controls and messages.

Custom panels require both `FabrioI18nProvider` and `EditorProvider`. Use `useFabrioTranslation()` for the typed `t(key, params)` function. For custom validation messages, translate stable issue `code` and optional `params`; retain the English `message` for technical diagnostics.

See the [UI reference](../packages/ui.md) for catalog types and fallback behavior. Full RTL layout auditing remains [release acceptance work](../release.md).
