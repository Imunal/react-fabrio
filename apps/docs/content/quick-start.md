---
title: "Quick Start"
description: "Edit a product, save its design and reopen it in the local playground."
---

Edit the mug example in the local playground, save its design as JSON and export a production PNG.

## 1. Run the playground

Use Node.js 24.11 or later and pnpm 12.14.x, as declared in the [root package manifest](../../../package.json). Run the packages through the local workspace. Installing them from npm is not yet supported.

```sh
git clone https://github.com/Imunal/react-fabrio.git
cd react-fabrio
pnpm install
pnpm dev
```

Open the URL printed by Vite. The editor starts with the mug demonstration, including editable text, a photograph and vector artwork. The initial language is Polish. Select English to use the control names shown here.

## 2. Edit the mug

Keep the mug selected in the product chooser. Open the Elements panel, select the text element and use its Edit action to change the text. Move the element or adjust its properties, then use Undo and Redo to see the change restored.

The flat workspace shows a physical decoration area. Its safety and bleed guides help position the artwork; they are excluded from production files. Keep the example's existing hosted image for this exercise: uploaded local images need a durable upload service before confirmation.

## 3. Save and reopen

Use the project menu's Save action to download the design JSON. Make another text change, then select Open design JSON in the project menu and choose the downloaded file.

The editor restores the saved content. The JSON preserves editable elements and resource references. Previews and production images flatten that content. The playground supplies JSON import; a host application implements its own reopening flow.

## 4. Generate the production file

Confirm the design. The playground downloads the production file for each decoration area; the mug has one print area. Open the PNG to inspect the artwork without the product photograph or editor guides.

If confirmation reports a blocking issue, correct the listed content and retry. Low image DPI is a warning and allows confirmation. A session-local uploaded image blocks it because that URL will not survive reopening.

## Next: embed the editor

Follow [Embed the React editor](integration.md) to mount the component in your application. Then [configure your product](guides/configure-product.md), [save designs](guides/save-design.md) and [connect durable uploads](guides/uploads.md). The [example products](examples.md) include a two-sided T-shirt and a guided engraved tag.
