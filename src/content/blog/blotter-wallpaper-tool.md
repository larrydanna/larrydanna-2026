---
title: "Blotter: Wallpapers from Your Theme"
date: "2026-04-02"
description: "A new tool that renders your active site theme as a desktop or phone wallpaper — with an optional calendar overlay baked right in."
tags: ["Web", "Tools", "Canvas", "Meta"]
draft: false
---

*Pick amber or pine,*\
*the canvas fills with your fall —*\
*save it. Frame the screen.*

---

## What shipped

[Blotter](/tools/blotter) is a new tool that generates a wallpaper image from whatever theme you currently have active on the site. Pick a canvas size, optionally drop a Month or Year at a Glance calendar on top, choose where it sits, and download a full-resolution PNG.

It lives entirely in the browser. No server, no upload, no external library. The HTML Canvas API does all the work.

## The idea

The site has sixteen themes — one for every mood the year cycles through. They live in CSS custom properties and switch with a single attribute change on `<html>`. It seemed obvious that those same colors should be able to dress your desktop. The theme picker already knows your `--bg` and `--accent`; Blotter just reads them at render time and hands them to a canvas.

The calendar overlay came from the same thought. The Month and Year at a Glance tools already existed. Putting one on your wallpaper means the thing you glance at first every morning already has the date context you need.

## How it renders

The core is a single `drawWallpaper()` function that accepts a canvas element and writes to it at whatever resolution was requested. The preview is the same function, just with the result scaled down to fit the preview box via `ctx.drawImage()`:

```js
function renderPreview() {
  drawWallpaper();   // renders into fullCanvas at e.g. 1920×1080
  const scale = Math.min(560 / state.w, 420 / state.h);
  previewCanvas.width  = Math.round(state.w * scale);
  previewCanvas.height = Math.round(state.h * scale);
  ctx.drawImage(fullCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
}
```

When you hit Download, the same `fullCanvas` — already at full resolution — goes straight to `toBlob()` and triggers a save. No re-render, no quality loss.

## Reading live CSS vars

The theme colors come straight from `getComputedStyle`:

```js
function getColors() {
  const s = getComputedStyle(document.documentElement);
  return {
    bg:      s.getPropertyValue('--bg').trim(),
    text:    s.getPropertyValue('--text').trim(),
    accent:  s.getPropertyValue('--accent').trim(),
    muted:   s.getPropertyValue('--muted').trim(),
    surface: s.getPropertyValue('--surface').trim(),
  };
}
```

The `.trim()` matters — `getPropertyValue` includes leading whitespace. The returned values are six-digit hex strings, which the canvas `fillStyle` accepts directly.

A `MutationObserver` watches `html[data-theme]` for changes. When you switch themes in the header, the preview re-renders immediately with the new palette — no reload, no button press.

```js
new MutationObserver(() => {
  if (state.colorSource === 'theme') renderPreview();
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme'],
});
```

## Drawing the calendar overlay

The month calendar is drawn entirely with canvas 2D primitives — no DOM, no HTML-to-canvas library. Cell sizes derive from the calendar width as a fraction of the canvas: 30% for landscape, 78% for portrait. Everything else — font sizes, row heights, spacing — scales from the cell width:

```js
const cw     = calW / 7;          // one day-column width
const titleH = cw * 1.2;          // heading row
const hdrH   = cw * 0.8;          // day-name row
const ch     = cw * 1.1;          // date cell height
```

Today's date gets an accent-colored circle, with the number reversed to `--bg`. Every other date renders in `--text`. Month names and "today" circles both use `--accent`. The day-name headers use `--muted`. The panel behind the whole calendar is the `--surface` color at 92% opacity so the background still breathes through.

The year view puts twelve mini-months in a four-column grid (landscape) or three-column grid (portrait), following the same color rules at a smaller type size.

## Sizes offered

| Group | Size |
|-------|------|
| Desktop | 1920 × 1080 — Full HD |
| Desktop | 2560 × 1440 — QHD |
| Desktop | 3840 × 2160 — 4K UHD |
| Desktop | 1366 × 768 — Laptop HD |
| Desktop | 1280 × 800 — Laptop |
| Mobile Portrait | 1080 × 1920 — Android HD |
| Mobile Portrait | 1170 × 2532 — iPhone 12/13/14 |
| Mobile Portrait | 1290 × 2796 — iPhone Pro Max |
| Mobile Portrait | 1440 × 3120 — Android QHD+ |

## One file

The whole tool is a single `.astro` file — frontmatter import, markup, TypeScript `<script>`, and `<style>`. No framework component, no build-time data, no dependencies beyond what the page already loads. About 350 lines from top to bottom.

The custom color mode pre-fills its four pickers from the active theme's CSS vars when you switch to it, so you always start from something coherent before you start deviating.

---

Try it: open the theme picker, cycle through a few seasons, watch the preview update in real time. Then pick a size that fits your monitor, add the month if you like, and download it.
