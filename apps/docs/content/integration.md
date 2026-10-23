---
title: "Embed the React editor"
description: "Mount ProductEditor and connect the callbacks owned by your application."
---

Use this guide after the [Quick Start](quick-start.md). You need a React 19 client application in the local pnpm workspace and a product configuration. Add `@react-fabrio/core` and `@react-fabrio/ui` as `workspace:*` dependencies to that application's package manifest, then run `pnpm install`.

## 1. Mount ProductEditor

Import the component and its stylesheet. Give the containing element an explicit height; use `min-height: 0` when nesting it inside a flex or grid layout. Interactive canvas, fonts and output generation require browser APIs, so use a client boundary in frameworks that render on the server.

Pass your storage, upload and order-confirmation callbacks to this component:

```tsx
import type { AssetReference, DesignDocument, DesignResult } from "@react-fabrio/core";
import { mugProduct } from "@react-fabrio/core/examples";
import { FabrioI18nProvider, ProductEditor } from "@react-fabrio/ui";
import "@react-fabrio/ui/styles.css";

type IntegrationProps = {
  saved?: DesignDocument;
  upload: (file: File, signal: AbortSignal) => Promise<AssetReference>;
  save: (document: DesignDocument) => void;
  confirm: (result: DesignResult) => Promise<void>;
};

export const Personalization = ({ saved, upload, save, confirm }: IntegrationProps) => {
  return (
    <div style={{ height: "100dvh" }}>
      <FabrioI18nProvider locale="pl">
        <ProductEditor
          product={mugProduct}
          initialDesign={saved}
          uploadAsset={upload}
          onChange={save}
          onConfirm={confirm}
          onError={(error) => console.error(error)}
        />
      </FabrioI18nProvider>
    </div>
  );
};
```

The fixture uses `/fonts/FabrioSans.ttf`. Your application must serve that font or replace it with a licensed URL; package imports do not copy playground public files. The [playground source](../../playground/src/app.tsx) is a working integration.

## 2. Connect host services

| Callback or prop               | Host implementation                                                            |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `initialDesign` and `onChange` | [Load, validate and save the design document](guides/save-design.md)           |
| `uploadAsset`                  | [Store images and return durable references](guides/uploads.md)                |
| `onConfirm`                    | [Store generated files and complete the host workflow](guides/confirmation.md) |
| `onError`                      | Report resource, output and host callback failures                             |

Wrap the editor in your application's error boundary to catch invalid configuration or incompatible initial documents during rendering. Use `onError` for failures during runtime operations.

Keep product and callback references stable during a session. Changing product ID or revision starts a new session. To reopen another design for the same product, remount with a new React `key`.

## 3. Customize the integration

Use `className` on the editor root, `headerStart` for host controls after the brand and `headerActions` for project-menu items. See [editor interactions](editor-ux.md) for layout and CSS variables, and [Localize the editor](guides/localization.md) for language catalogs.

Install the optional `@react-fabrio/three` workspace package to use the mug view configured for your product. It loads when selected. See [previews](previews.md) for configuration and failure handling.

To build your own interface, combine `EditorProvider`, `EditorCanvas` and UI panels instead of `ProductEditor`. The [React](packages/react.md) and [UI](packages/ui.md) references describe their provider requirements.

## Responsibilities at the boundary

Fabrio handles editing, document validation and production file generation. Your application handles storage, authentication, resource access and retention, product variants, pricing, checkout, production routing and configuration revisions. Validate the generated files against the actual printing or engraving workflow before accepting customer orders.
