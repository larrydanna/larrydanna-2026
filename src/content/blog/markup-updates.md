---
title: "Markup: What's Been Added Since Launch"
date: "2026-05-16"
description: "Three sessions of improvements: toast notifications, emoji stamps, a pixelator, a spotlight tool, and now a select-and-drag layer for editing placed shapes."
tags: ["Web", "Tools", "Vanilla JS", "Meta"]
draft: false
---

*Draw the arrow. Move it.*\
*Delete the one that wasn't right.*\
*The image cooperates now.*

---

[Markup](/tools/markup) launched on May 13 as a single HTML file with five annotation shapes and an undo stack. Three sessions later, it's a more complete tool. Here's everything that's been added.

## Polish and quality-of-life

**Toast on copy.** The ⎘ Copy button now shows a centered toast — `Copied ✓` or `Copy failed` — so you know the result without hunting the status bar. The fix required the lazy `ClipboardItem` pattern: pass a `Promise<Blob>` rather than a resolved `Blob` directly, so the write is initiated within the user gesture window even though the blob resolves asynchronously.

**Help screen.** A `?` button opens a keyboard shortcut overlay. Every shortcut that existed has always been there; now they're documented.

**Per-shape sliders.** Text outline thickness (0–5) and shadow blur (0–5) are now adjustable. Both are baked into the shape at draw time — the fire-and-forget model means changing them later doesn't disturb shapes already placed.

**localStorage persistence.** The toolbar remembers active tool, color, stroke thickness, text size, font, outline style, shadow style, and shadow blur across reloads.

**Light and dark themes.** A ☀ button in the toolbar toggles between warm dark and light modes. The choice persists via localStorage.

**Timestamp on download.** The PNG filename is `markup-YYMMDDHHMMSS.png` — no more overwriting the previous file.

## New tools

**Emoji stamp (`S`).** Click anywhere to drop an emoji. A floating panel with 64 common annotation emojis appears below the toolbar button; clicking one selects it and closes the panel. A size slider controls scale from 16 to 128px. Stamps respect the same shadow and outline settings as other shapes.

**Pixelator (`P`).** Drag to pixelate a region. A Grain slider controls block size from 4 to 48px. The technique is the scale-down/scale-up trick: draw the source region at low resolution onto an offscreen canvas, then scale back up with `imageSmoothingEnabled = false`. Clean blocky pixelation, no per-pixel math.

**Spotlight (`M`).** Drag to reveal a focus area — the rest of the image dims to 55% opacity. Canvas `evenodd` fill rule handles the punch-out: draw the full canvas rect and the drag rect in a single path, fill with `evenodd`, and the intersection becomes the clear window. The palette color controls the overlay tone.

## Select, delete, and reorder

The most recent addition is a selection model for editing placed shapes.

**Select tool (`V`).** A cursor icon in the toolbar (or the `V` key) enters select mode. Click any shape to select it — a dashed bounding box with a faint fill confirms what's selected. Click empty space to deselect. Switching to any drawing tool clears the selection automatically.

Hit testing covers every shape type: point-in-rect for callouts, rectangles, masks, and pixelated regions; point-in-ellipse for circles; distance-to-line-segment for arrows; radial distance for stamps; and `ctx.measureText` for text (so the bounding box wraps the actual rendered width rather than a hardcoded estimate).

**Delete.** With a shape selected, `Delete` or `Backspace` removes it. Fully undoable.

**Z-order.** `[` sends the selected shape backward one step; `]` brings it forward. The selection index tracks the shape through the swap so the dashed box stays on it.

**Drag to move.** In select mode, dragging a selected shape repositions it live. The original shape position is snapshotted on mousedown; each pointermove applies the delta from the start point. Undo is saved on the first real movement (>3px), so a click-to-select doesn't pollute the undo stack. Callouts move body and tail together. The cursor flips to `grab` when a shape is selected and `grabbing` during the drag.

## Touch and iPad support

All mouse events were replaced with pointer events (`pointerdown`, `pointermove`, `pointerup`) and `canvas.setPointerCapture()`, so drag tracking works on touch screens even when a finger leaves the canvas boundary. `touch-action: none` on the canvas prevents the browser from intercepting drag gestures for scrolling.

## PWA install

Markup has a web app manifest and service worker. Chrome and Edge offer an Install button. Once installed it runs standalone, offline, with the amber toolbar as the theme color.

---

[Open Markup](/markup/) — paste a screenshot, draw on it, move things around.
