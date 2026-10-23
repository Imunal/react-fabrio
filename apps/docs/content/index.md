---
title: "React Fabrio documentation"
description: "Build a product personalization experience in your React application."
---

React Fabrio is an MIT-licensed React 19 library for personalizing printed and engraved products. It includes an editor and React controls for building your own interface. Editing, previews and production use the same physical design document.

Run the packages from this repository's pnpm workspace to evaluate them. Start with the [Quick Start](quick-start.md) to edit, save and reopen a design locally. Read [product scope](product.md) before planning a customer release.

## Learn with a tutorial

[Quick Start](quick-start.md) walks through a complete editing session in the playground. You need Node.js and pnpm; no upload service or backend is required.

## Complete an integration task

Start with [Embed the React editor](integration.md), then choose the task you need:

| I want to…                                | Guide                                              |
| ----------------------------------------- | -------------------------------------------------- |
| Define physical areas and editing rules   | [Configure a product](guides/configure-product.md) |
| Save customer work and reopen it later    | [Save and reopen designs](guides/save-design.md)   |
| Make uploaded images survive a session    | [Connect durable uploads](guides/uploads.md)       |
| Change the interface language             | [Localize the editor](guides/localization.md)      |
| Store production files after confirmation | [Handle confirmation](guides/confirmation.md)      |
| Update an older integration               | [Migration](migration.md)                          |

## Look up a contract

Look up public exports and callbacks in the [API reference](api.md). For field definitions and behavior, see [product configuration](configuration.md), [saved documents](design-document.md), [assets and fonts](assets-and-fonts.md), [previews](previews.md), [production output](production.md) and [editor interactions](editor-ux.md). [Example products](examples.md) describe the fixtures used by the playground.

## Understand the design

[Product scope](product.md) explains guided and freeform personalization and the host application's responsibilities. [Architecture](architecture.md) explains package boundaries and why the document uses physical coordinates. The root [glossary](../../../GLOSSARY.md) defines the shared vocabulary.

## Contribute

Read [Contributing](../../../CONTRIBUTING.md) to work on the library or [Maintain the documentation](documentation.md) to edit this site. [Release acceptance](release.md) lists the remaining release checks. Agents should begin with [domain orientation](agents/domain.md).
