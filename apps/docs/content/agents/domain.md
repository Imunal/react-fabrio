---
title: "Domain orientation"
description: "Domain vocabulary and task-specific reading paths."
---

This repository has one domain context. Before exploring code, read the root [glossary](../../../../GLOSSARY.md) and the relevant [document](../adr/0001-renderer-independent-document.md), [physical output](../adr/0002-physical-coordinates-and-output.md), or [optional mug](../adr/0003-optional-mug-preview.md) decision.

Use the glossary's vocabulary in code, tests, issues and documentation. Record domain terms there; keep implementation details in reference documents.

| Task                                  | Read before changing                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| Configuration, permissions, templates | [Configuration](../configuration.md), [product status](../product.md)        |
| Persistence, migration, history       | [Design document](../design-document.md), [architecture](../architecture.md) |
| React integration, callbacks          | [Integration](../integration.md), [API](../api.md)                           |
| UI, keyboard access, localization     | [Editor UX](../editor-ux.md)                                                 |
| Uploads, text, SVG import             | [Assets and fonts](../assets-and-fonts.md)                                   |
| Previews or production                | [Previews](../previews.md), [production](../production.md)                   |

Update the authoritative reference when its contract changes. Check the actual exported types before copying an API example. Explicitly distinguish available behavior from planned behavior. If a proposal contradicts an accepted ADR, identify that decision and explain the trade-off before replacing it.
