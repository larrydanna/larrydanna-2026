---
title: "Markup: Four More Fixes"
date: "2026-05-16"
description: "Clipboard toast, floating emoji panel, stamps with shadow, and a spotlight tool that focuses rather than redacts."
tags: ["Web", "Tools", "Vanilla JS", "Meta"]
draft: false
---

*Four bugs walk into a bar.*\
*Two are wrong, one is just ugly,*\
*one was never a bug at all.*

---

The day after [gold-plating](/blog/markup-gold-plate), four things came back wrong.

## Clipboard toast said "failed" — but it worked

`navigator.clipboard.write()` takes a `ClipboardItem`, and `ClipboardItem` can take either a `Blob` or a `Promise<Blob>`. The difference matters: when you pass a `Blob`, the write has to happen synchronously inside the click handler, which means waiting for `toBlob` (async) first — and by the time it resolves, the browser has already exited the user-gesture context and rejects the whole call.

The fix is the lazy `ClipboardItem` pattern: wrap the blob in a `Promise` and pass *that* to `ClipboardItem`. The clipboard write is initiated synchronously (within the gesture window), then resolves the blob when it's ready. One line change. No more false failures.

## Emoji stamp panel clogged the toolbar

Putting a 24-emoji grid directly in the toolbar caused it to reflow and wrap. Moving it to a `position: fixed` floating panel that appears just below the stamp button fixed the layout. The toolbar stays single-row; the panel follows the button.

## Emoji stamps now respect shadow and outline

Other shapes bake shadow and outline at draw time. Stamps didn't. Now they do — the outline is applied as a spread shadow in the outline color (canvas renders emoji strokes inconsistently across platforms, but shadow always works), and the drop shadow is the standard `setShadow` pass.

## The mask tool became a spotlight tool

The original mask drew a solid filled rectangle — useful for redacting. What was actually wanted was the opposite: dim the whole image, cut a clear window where you drag. That's a spotlight, not a mask.

Canvas `evenodd` fill rule handles this cleanly. Draw the full canvas rect and the drag rect in a single path, fill with `evenodd` — the intersection area (the clear window) is excluded from the fill. The overlay fades to 55% opacity; the palette color controls the tone.

The button icon changed from ▮ to ◎.

---

[Open Markup](/markup/) and try them.
