---
title: "Save and reopen designs"
description: "Persist editable documents and reopen them without replacing an active session accidentally."
---

Use `onChange` to persist customer work and `initialDesign` to start a session from saved work. The [saved document reference](../design-document.md) defines the JSON format and compatibility rules.

## 1. Store document changes

Connect `onChange` to your storage layer. It receives a cloned `DesignDocument` after content changes, including undo and redo. The initial document is not emitted automatically. Selection, active area and zoom do not trigger saving.

Store `JSON.stringify(document)` together with the matching product configuration revision. Asset bytes and font files are separate resources: retain them while saved designs refer to them. Your application handles save debouncing, failures and conflicts between browser sessions.

## 2. Validate loaded JSON

Parse storage data as `unknown` and call `validateDesignDocument(value, product)` before mounting. Reject unsupported schemas and mismatched products or revisions explicitly. Schema version 1 has no automatic migration guarantee.

The editor permits two correctable errors on open: `outside-safe-area` and `asset-limit-exceeded`. Preserve those documents for correction; confirmation remains blocked until the errors are resolved. Other errors prevent opening. The [playground import](../../../playground/src/app.tsx) uses this validation policy.

## 3. Start a new session

Pass the validated document as `initialDesign`. The prop initializes the session. Updating it does not replace in-progress edits. Use a new key when opening another design for the same product:

```tsx
<ProductEditor
  key={openedDesignId}
  product={product}
  initialDesign={savedDocument}
  onChange={saveDocument}
/>
```

Change `openedDesignId` when the user opens another design. Do not change it on every save. Changing the product ID or revision also starts a new session.

## 4. Check a round trip

Edit content on each side, save, unmount, load and reopen. Check geometry, stacking order, text, crops, slots and asset references. Reopening local object URLs is unsupported; [connect durable uploads](uploads.md) before relying on persisted images.

The default Save action downloads JSON. File selection and reopening belong to the host; the playground adds them through `headerActions`.
