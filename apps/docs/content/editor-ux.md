---
title: "Editor interactions"
description: "Editor layout, keyboard access, localization and interaction behavior."
---

The default `ProductEditor` has the interactions described here. For mounting and host callbacks, use [Embed the React editor](integration.md). For release targets and outstanding audits, see [release acceptance](release.md).

## Layout

The editor has area navigation and a flat workspace. One asset or tool panel is active at a time, with properties for the selected element.

Desktop uses a 64 px header, an 80 px tool rail and a closable 320 px resource panel. Below 900 px of editor width, a 56 px header, bottom tool navigation and a collapsible panel share the available height. Below 600 px, the header uses two rows (104 px): brand, project menu and confirmation above the host controls. Host controls retain 44 px touch targets. In compact hosts at least 600 px wide and below 500 px high, the panel sits beside the workspace, with tools along the bottom. The panel scrolls independently and stays below 55% of editor height. It reserves space for a classic scrollbar so expanding Advanced does not change control widths.

Only one resource panel is open; Escape closes it and returns focus to its tool. The workspace fits the physical decoration area to both dimensions.

### Contextual toolbar

A toolbar follows the selected object, prefers space below it, and stays inside the workspace without covering the rotation handle. Actions have small captions and explanatory tooltips on hover or keyboard focus; the Rotate action reveals a numeric angle field.

### Measurements and position controls

Detailed measurements and ordering are under Advanced. Measurement fields separate position (X/Y), dimensions and rotation. Millimeters and degrees appear inside the controls; accessible names retain their units. Values display up to three decimal places without rounding the stored document on open. Position actions are grouped into a four-arrow movement pad (1 mm per press), two rows of alignment icons (horizontal then vertical) and two labeled layer-order buttons. Icon actions have translated accessible labels and tooltips on hover or keyboard focus; each target is at least 44 × 44 CSS pixels. [Release acceptance](release.md) defines the target criteria.

## Guided and freeform

Guided areas start with the first template and list its labeled slots. Selecting a slot selects its element and exposes its properties. Freeform areas allow adding configured text, raster images and vector artwork, and applying configured templates. Locked elements and operation permissions constrain interaction. Switching areas retains each area's document content.

### Element properties

The contextual controls include text/font selection, physical size, colors, text alignment, line and letter spacing; physical x/y, dimensions and rotation; duplication, deletion, stacking and horizontal alignment. Images can be replaced and flipped.

### Image cropping

Crop opens a draft mode on the flat project and temporarily fits the workspace to the selected photo, restoring the previous zoom afterward: the image moves inside a fixed frame using a mouse, touch or arrow keys (Shift moves faster).

A 100% to 500% photo-zoom slider and Fit to frame preserve source proportions and prevent empty edges; an existing tighter crop can retain a higher maximum.

Apply crop commits once; Cancel or Escape discards the draft and restores selection. Opening and applying without editing creates no history or onChange. Fit explicitly applies the aspect-preserving crop even when a legacy image was stretched to fill its frame. Draft zoom and movement do not save.

Switching tools, views, areas or starting confirmation cancels the draft. Image edit permissions apply in guided and freeform areas. The document still stores normalized source x/y/width/height; physical position, size and rotation remain unchanged. Area thumbnails, the canvas and production output use the saved crop and flips.

### Text layout

Text alignment is available directly below the text field through four icon buttons: left, center, right and justify, with pressed states and translated tooltips. Text wraps inside its physical frame; justification expands spaces on wrapped lines and leaves the final line of each paragraph left aligned. Canvas and production share the same font outlines and layout. Select font weights through the configured font entries. There is no separate weight control.

### History

A canvas gesture commits its completed transformation. Text changes between textarea focus and blur form one undo entry. Numeric controls commit their individual changes. Undo/redo covers document content across areas. Zoom changes the viewport; Fit resets zoom.

### Snapping and transform handles

Canvas movement snaps element edges and centers to area boundaries, area centers and other elements. Alignment places the selected element against horizontal or vertical edges and centers. Matched horizontal and vertical guides appear while moving, using a six-CSS-pixel snap distance independent of zoom. Scaling shows matching guides; rotation shows the horizontal and vertical axes through the element's center. Guides disappear on release, selection changes and viewport changes, and never enter the document, history or production output. White circular corner grips scale proportionally; side grips resize one dimension. The separate circular arrow handle rotates the element and remains visible outside the decoration area. Short text hides top/bottom grips to preserve a usable drag target. Resize and rotation permissions hide unavailable handles. Multi-element alignment is outside the current selection model.

## Keyboard and assistive technology

The Elements panel lists the active area from topmost to bottommost. Selecting a row selects its element while keeping the list open; a separate Edit button opens its properties. Each row has a type icon, current name, selection indicator, visible drag handle and Bring forward/Send backward buttons. Labeled form controls edit values; movement buttons move by 1 mm and ordering buttons adjust stacking. Buttons are keyboard operable with focus indicators and selected state. The canvas directs keyboard users to the list and controls. Status is announced through a polite live region. Standard Tab/Shift+Tab and Enter/Space interactions work through native controls and React Aria buttons.

The focused mug preview supports Left/Right to rotate and plus/minus to zoom. Dedicated global shortcut bindings and a full screen-reader audit remain [release acceptance work](release.md). React Aria controls do not replace a complete accessibility audit.

## Confirmation

Confirmation validates the current document, shows issues, generates all area files and awaits the host callback. Warnings permit output; errors retain the document and show a retry status. PNG rendering and SVG outlining require available images/fonts. Resource failure must not replace the customer's document or silently lower output quality. See [integration](integration.md).

## Localization and theme

English is the default interface language; Polish is also built in. [Localize the editor](guides/localization.md) describes selecting a language, overriding messages and translating custom controls. Locale changes preserve the active session.

Product names, side/area labels, template/slot names and design content remain merchant data. Technical validation messages remain available to integrators; the UI translates stable issue codes. Display numbers follow the locale, while numeric editing and stored physical measurements retain their existing semantics. Full RTL layout auditing is outside this release.

Import `@react-fabrio/ui/styles.css`. Styles are scoped under `.rf-editor` and use `--rf-ink`, `--rf-muted`, `--rf-line`, `--rf-accent`, `--rf-workspace`, `--rf-guide`, `--rf-panel-width` and `--rf-font` CSS variables. Override those variables on an editor wrapper to match the host. Verify contrast, focus visibility, readable font sizes and touch targets after customization.

## Preview controls

Flat view remains the editing surface. Photography mappings produce a separate mockup view. The optional mug view mounts automatically when configured and the optional Three package is installed. `renderMug` allows a custom view; custom integrations must mount and dispose the view and report failures to the editor. See [previews](previews.md) for wrap conventions and fallback behavior.

## Host sizing and playground

The library fills its host: give the host an explicit height (and `min-height: 0` inside a flex/grid layout). The playground uses `100dvh`, a PL/EN language selector (initially Polish) and local Manrope UI fonts. `headerStart` hosts the product chooser; `headerActions` adds JSON import to the project menu. The initial mug document has a durable local photograph, editable Polish text and original vector artwork. Three demo templates extend the shared mug fixture only in the playground. The flat mug silhouette is a CSS decoration outside the canvas, so it cannot enter production artifacts. The built-in optional 3D view remains available.

## Production guides, gallery and workspace zoom

### Production guides

The 2D view shows the cut/print boundary, dashed safety inset and shaded bleed, with a short legend in millimeters. They scale with the artwork and are excluded from all output. Free overflow shows a cropping warning. Constrained areas stop gestures at the last allowed transform and reject numeric/alignment edits that would move valid content outside. Existing invalid elements can be corrected without automatic shrinking; protected invalid elements explain the need to correct the product configuration. Confirmation stays disabled while blocking document issues remain.

### Gallery

Add photos always adds new gallery files, with multiple selection, a document-wide photo counter and pending-upload count. An oversized batch is rejected before sending. Thumbnail clicks add another freeform element, and Replace selected photo is separate. Guided mode retains slot restrictions. Unused gallery files have a removal action; deleting an element alone does not remove its file.

### View and zoom controls

The view selectors are 2D design and 3D preview, with explicit pressed states. The 2D zoom group contains minus, percentage, slider, plus, Show whole project and Pan view. Its range is 25% to 300%, in 25% steps.

A tooltip explains that 100% means workspace fit. Show whole project resets zoom and centers scrolling; it is disabled with an explanation while already fitted and centered. During cropping, the separate photo-zoom control replaces the workspace zoom controls.

Compact layouts hide the preview heading and production legend, move undo/redo next to the view selectors and use labeled Fit/Pan icons beside the zoom slider. View controls and area selectors retain 44 px touch targets. Panel height follows the editor container, independently of the browser viewport. This reserves space for the project on short screens; panel contents, including crop actions, scroll independently. The canvas retains its interaction gutter for resize and rotation handles.

The project surface grows with zoom. Scrollbars, keyboard scrolling of the focusable viewport and drag panning provide access to enlarged content. The context toolbar stays within the visible workspace while scrolling. These view operations do not modify history or trigger saving. Zoom controls are hidden in 3D, whose camera remains independent.

## Reordering layers

Drag one row by its handle with a mouse or finger. The moving row is highlighted and a line marks an accepted insertion position; the list scrolls at its edges. With a keyboard, focus the handle and press Enter to start, use arrow keys to choose a position and Enter to drop. Escape cancels the drag and keeps the panel open. Focus returns to the moved row (or touch handle), selection is retained, and a polite announcement reports the new top-first position. Buttons provide the same reorder operation without dragging.

Locked and reorder-protected elements have disabled handles and cannot be crossed. Invalid destinations are excluded and unavailable ordering buttons are disabled, including in guided areas. Only dropping commits a single undo/redo entry; cancelling or dropping at the current position does not save. Switching decoration areas or starting confirmation cancels the active gesture. Reordering supports individual elements in one area; groups, multiple selection and cross-area moves are outside this interaction.
