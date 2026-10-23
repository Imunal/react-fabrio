---
title: "Domain orientation"
description: "Domain vocabulary and task-specific reading paths."
---

This repository has one domain context. Before exploring code, read the root [glossary](../../../../GLOSSARY.md) and [architecture](../architecture.md). For document, output or preview work, also read the [design document](../design-document.md), [production](../production.md) or [previews](../previews.md) reference.

Use the glossary's vocabulary in code, tests, issues and documentation. Record domain terms there; keep implementation details in reference documents.

| Task                                  | Read before changing                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| Configuration, permissions, templates | [Configuration](../configuration.md), [product status](../product.md)        |
| Persistence, migration, history       | [Design document](../design-document.md), [architecture](../architecture.md) |
| React integration, callbacks          | [Integration](../integration.md), [API](../api.md)                           |
| UI, keyboard access, localization     | [Editor UX](../editor-ux.md)                                                 |
| Uploads, text, SVG import             | [Assets and fonts](../assets-and-fonts.md)                                   |
| Previews or production                | [Previews](../previews.md), [production](../production.md)                   |

Update the authoritative reference when its contract changes. Check the actual exported types before copying an API example. Explicitly distinguish available behavior from planned behavior. If a proposal changes a documented architectural choice, identify that choice and explain the trade-off before replacing it.
