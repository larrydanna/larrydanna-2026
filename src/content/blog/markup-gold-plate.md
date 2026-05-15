---
title: "Gold-Plating the Markup Tool"
date: "2026-05-15"
description: "Nine new features in one session: toast notifications, a help screen, per-shape sliders, localStorage, PWA install support, a mask tool, emoji stamps, and a pixelator."
tags: ["Web", "Tools", "Vanilla JS", "Meta"]
draft: false
---

*Click to mark, click to blur,*\
*click to stamp the thing you saw.*\
*One file. Nine new tricks.*

---

## What shipped

The [Markup](/tools/markup) screenshot annotator got a serious round of gold-plating. Here's what's new, all still in one HTML file, no dependencies.

## Toast notification on copy

Clicking **⎘ Copy** now shows a centered toast that fades in and out — `Copied ✓` on success, `Copy failed` if the browser blocks it (usually HTTPS required). The status bar still updates for anyone who missed the toast.

## Help screen

A `?` button opens a keyboard shortcut overlay. Same shortcuts have always been there — `C`, `A`, `R`, `O`, `M`, `S`, `P`, `T` for tools, `Ctrl+Z` for undo, `Ctrl+C` and `Ctrl+S` for copy and download. Now they're documented. `Escape` closes it.

## Text outline and shadow sliders

Both are now adjustable per shape, baked in at draw time:

- **Text outline thickness** — 0 (none) to 5 (bold) in the Text section. The stroke width scales with font size.
- **Shadow blur** — 0 (off) to 5 (max) in the Shadow section. Applies to all tools.

Both follow the same fire-and-forget model as color and outline style: you pick the setting before drawing, it locks into the shape, and changing the slider later doesn't touch existing shapes.

## localStorage persistence

The toolbar remembers everything across reloads: active tool, active color, stroke thickness, text size, font, text outline width, outline style, shadow style, and shadow blur level. Close the tab, reopen it — same settings.

## PWA install support

Markup now has a web app manifest and service worker. Chrome and Edge will offer an "Install" button. Once installed it runs standalone, offline, with the amber toolbar as the theme color. The app icon is an SVG callout bubble.

The "Save App" button was already there for air-gapped installs. PWA is for everyone else.

## Mask tool (`M`)

Drag to draw a solid filled rectangle — useful for covering passwords, PII, or anything you don't want in the screenshot. Pick the color from the palette (black is the obvious choice, but any color works). Fully undoable.

## Emoji stamp tool (`S`)

Click anywhere to drop an emoji. A 4×6 grid of 24 common annotation emojis lives in the sidebar when the stamp tool is active. A size slider controls scale from 16 to 128px. The active emoji updates the toolbar button so you always know what you're about to drop.

## Pixelator tool (`P`)

Drag to pixelate a region. A **Grain** slider controls block size from 4 to 48px. The rendering uses the scale-down/scale-up trick with `imageSmoothingEnabled = false`: draw the source region at low resolution onto an offscreen canvas, scale it back up without interpolation. Clean blocky pixelation, no pixel-math required. Works at full resolution in the download.

---

Nine features, one file. [Open Markup](/markup/index.html) and try them.
