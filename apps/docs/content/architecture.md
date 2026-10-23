---
title: "Architecture"
description: "Package responsibilities and the renderer-independent document model."
---

The design document stores customer content. Editing, preview and production derive from it; viewport state and renderer internals do not become the persistence format.

| Package                | Responsibility                                                                                             | Dependencies                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `@react-fabrio/core`   | Contracts, validation, schemas, immutable commands, history, session, physical geometry and quality checks | No React or DOM                      |
| `@react-fabrio/fabric` | Interactive flat rendering, browser production output, PNG metadata and restricted SVG handling            | Core, Fabric.js, Fontkit             |
| `@react-fabrio/react`  | Providers, canvas mounting, lifecycle, subscriptions and hooks                                             | Core, Fabric adapter, React 19       |
| `@react-fabrio/ui`     | Default editor, accessible controls and scoped CSS                                                         | React package, React Aria Components |
| `@react-fabrio/three`  | Optional straight-sided mug visualization                                                                  | Three.js; see [status](previews.md)  |

## From product configuration to production

A product configuration defines sides, decoration areas, editing rules and resources. A design document stores the customer's elements for those areas. A session adds transient selection, active-area state and history. Renderers project that state into the flat editor or a mockup; production export resolves the same document into one artifact per decoration area.

This separation lets the host reopen a design independently of the browser size or renderer internals. Physical coordinates make output dimensions measurable without deriving them from screen pixels.

## State and interaction

Core commands transform documents without touching the DOM. History groups a completed user action into one snapshot. Core owns the subscribable editor session. The React integration manages its lifecycle and propagates document changes through callbacks. Canvas objects display document elements for interaction; update the document before save or export. React's `useAssetUploads` aborts pending uploads and retains local URLs for the session lifetime so undo/redo can restore images. The canvas lifecycle disposes renderer listeners.

`initialDesign` initializes a session; changing product identity or revision creates a new one. Hosts save through `onChange` and receive production results through `onConfirm`. See [integration](integration.md) for callback behavior and retry handling.

## Rendering and output

Editing uses physical-to-viewport conversion. Export uses physical-to-output-pixel conversion, independent of screen size. Production never includes handles, guides, selection indicators or mockup photography. Resource resolution completes before output; errors propagate rather than silently lowering DPI.

Browser resource loading belongs outside core. Durable URLs and source dimensions are represented in the document; decoded image/font objects are transient. Hosts own resource retention and CORS.

The decisions on [document ownership](adr/0001-renderer-independent-document.md), [physical output](adr/0002-physical-coordinates-and-output.md) and [optional mug architecture](adr/0003-optional-mug-preview.md) explain these choices. [Product scope](product.md) describes current capabilities; [release acceptance](release.md) tracks remaining checks and future targets.

Core uses Zod for schema construction and runtime shape validation, `z.infer` for JSON contract types, and `z.toJSONSchema` for external schemas. Product-dependent checks keep their stable validation issue codes.
