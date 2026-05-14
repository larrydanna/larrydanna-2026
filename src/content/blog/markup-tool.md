---
title: "Markup: Annotate Screenshots Right in the Browser"
date: "2026-05-13"
description: "A new tool: paste a screenshot, draw callout bubbles, arrows, rectangles, circles, and text labels, then download the annotated PNG — no upload, no account."
tags: ["Web", "Tools", "Vanilla JS", "Meta"]
draft: false
---

*Red arrow points here —*\
*someone will understand now.*\
*The screenshot speaks.*

---

## What shipped

[Markup](/tools/markup) is a browser-based screenshot annotator. Paste an image from the clipboard with Ctrl+V (or drag and drop a file), add markup shapes, and download the result as a full-resolution PNG. Nothing leaves the browser.

The inspiration was Skitch — an Evernote app I used heavily for years that made screenshot annotation feel effortless. The rounded callout bubble with a directional tail was the part I liked most: clear, purposeful, and visually distinct from the noise of whatever it was pointing at.

## The callout bubble

Most tools give you rectangles and arrows. Skitch had the callout — a rounded rectangle with a tapered tail that pointed at something specific. That shape is the whole personality of the tool, so it got the most attention.

Drawing it is a two-phase gesture. First drag to define the bubble body. The tail appears automatically below the center, pointing downward at a default distance. Then the cursor changes and the tail tip follows the mouse — click anywhere to lock it in, or press Enter to accept the default. The tail tip shows a small white knob so the target is obvious.

The tail itself is a filled triangle whose two base points sit on the nearest edge of the rounded rect, spaced to create a taper. The code picks the exit edge based on angle: if the tail tip is mostly below the body it exits from the bottom; if mostly to the right, from the right edge, and so on. The base points are clamped away from the corners so the tail never overlaps the rounded corner radius.

```js
if (toV <= toH) {
  // top or bottom edge
  ex = cx + Math.cos(ang) * toV;
  ey = dy >= 0 ? y + h : y;
  px = bw; py = 0;
  ex = Math.max(x + r + bw, Math.min(x + w - r - bw, ex));
} else {
  // left or right edge
  ex = dx >= 0 ? x + w : x;
  ey = cy + Math.sin(ang) * toH;
  ...
}
```

The rounded rect body and the tail triangle are drawn as separate filled shapes, same color, so they merge into one cohesive speech bubble.

## Canvas at two resolutions

The canvas displayed on screen is scaled down to fit the browser window. Working directly in screen pixels would mean the download is low-res. The fix is to track all shape coordinates in image space (original pixel dimensions), then apply the scale factor at draw time.

Every mouse position is converted to image coords on the way in:

```js
const toImg = (cx, cy) => ({ x: cx / getScale(), y: cy / getScale() });
```

And every shape is rendered by multiplying back out:

```js
const x = shape.x * scale, y = shape.y * scale;
```

Download renders a fresh offscreen canvas at the full image dimensions with scale=1, so the exported PNG is always full-res regardless of window size.

## Other shapes

**Arrow** — a shaft line plus a filled triangle arrowhead. The arrowhead angle is 0.38 radians on each side (about 22°), which produces a look that reads as deliberate without being too aggressive. A dark halo under the shaft adds contrast against any background.

**Rectangle and circle** — both use `ctx.shadowBlur` for a subtle drop shadow that lifts them off the image without needing a white outline. The rectangle uses the same rounded-rect path helper as the callout body, with a 4px corner radius per the design system.

**Text** — click anywhere to place a floating input, type, press Enter. The label is drawn with a semi-transparent dark backing so it's readable against any background.

## Undo

Every shape push saves a deep copy of the shape array to an undo stack first. Ctrl+Z pops the last snapshot back. The stack caps at 60 entries to avoid unbounded memory growth. Undo also cancels any in-progress callout tail placement, so you can't get stranded in a half-drawn state.

## Design

The toolbar follows the site's Warm Dark / Studio Amber system: `--surface` background, `--border` separators, `--accent` for the active tool highlight and the download button. The seven color swatches are circles with a white ring on the active one. No animations.

The layout is a flex column: toolbar on top, canvas area flex-grows to fill the rest, a one-line status bar at the bottom that shows the current image dimensions and a hint for the active tool.

## One file

Like the other tools here, the whole thing is `public/markup/index.html` — no build step, no bundler, no runtime dependencies. The Astro page at `/tools/markup` describes it and opens it in a new tab.

---

[Open Markup](/markup/index.html) and paste your next screenshot into it.
