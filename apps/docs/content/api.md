---
title: "API reference"
description: "Choose a package or domain contract to look up."
---

Choose a package based on how much of the editor you want to build yourself. `ProductEditor` provides the complete interface; the other packages support custom interfaces, imperative rendering and non-React document operations.

| Package                | Reference                                                                  |
| ---------------------- | -------------------------------------------------------------------------- |
| `@react-fabrio/ui`     | [ProductEditor props, UI panels and localization](packages/ui.md)          |
| `@react-fabrio/react`  | [Providers, canvas, hooks and uploads](packages/react.md)                  |
| `@react-fabrio/core`   | [Contracts, validation, commands, sessions and geometry](packages/core.md) |
| `@react-fabrio/fabric` | [Canvas mounting and production exports](packages/fabric.md)               |
| `@react-fabrio/three`  | [Optional mug preview options and lifecycle](previews.md)                  |

## Domain contracts

- [Product configuration](configuration.md): fields, defaults, permissions and validation.
- [Saved design document](design-document.md): schema version, elements, assets and compatibility.
- [Assets and fonts](assets-and-fonts.md): resource requirements, SVG restrictions and gallery capacity.
- [Previews](previews.md): photograph mappings and mug parameters.
- [Production output](production.md): PNG dimensions and metadata, SVG geometry and resource errors.
- [Editor interactions](editor-ux.md): layout, controls, keyboard behavior and theme variables.
- [Example products](examples.md): exported fixtures and their resources.

The exported TypeScript declarations define exact parameter types. For setup instructions, use [Embed the React editor](integration.md).
