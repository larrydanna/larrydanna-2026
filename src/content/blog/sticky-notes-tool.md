---
title: "Sticky Notes: A Desktop You Can Fill With Clutter"
date: "2026-04-03"
description: "A new tool: a virtual desktop of draggable, resizable sticky notes with multiple boards, six colors, JSON export, and keyboard shortcuts — all in one self-contained HTML file."
tags: ["Web", "Tools", "Vanilla JS", "Meta"]
draft: false
---

*Drag the yellow square —*\
*it lands wherever it lands.*\
*The desk is yours now.*

---

## What shipped

[Sticky Notes](/tools/stickynotes) is a virtual desktop of draggable, resizable notes. It opens in its own window so you can go full-screen and actually use it. Each note has a header you can grab, a corner grip for resizing, a row of color dots to change its color, and a textarea you can type into.

Notes persist automatically to `localStorage`. If you close the window and come back, everything is where you left it.

## Boards

The biggest quality-of-life call was adding tabs. A single flat canvas fills up quickly. Boards let you keep, say, a project, a grocery list, and a scratch pad without them fighting for space.

Tabs support rename (double-click), reorder (drag), and close. Close on the last board clears its notes instead of deleting the board itself — because closing the only remaining tab and ending up with a blank app is disorienting.

## Note colors

Six colors: yellow, blue, green, pink, purple, orange. The dots in the note header are just small colored circles. Clicking one swaps the color class on the note element in-place — no re-render, no flicker:

```js
dot.addEventListener('mousedown', e => {
  e.stopPropagation();
  note.color = c;
  save();
  el.className = `note ${c}`;
  dots.querySelectorAll('.note-dot').forEach(d => d.classList.remove('active'));
  dot.classList.add('active');
});
```

Each color has its own CSS rule for background and a slightly darker header. The header shade matters — it gives the drag target a visual separation from the writing area and makes the note read as a physical object with a top edge.

## Drag and resize

Both work the same way: `mousedown` on the handle records an offset, then a `mousemove` listener on `document` (not the element) updates position or size until `mouseup`. Using `document` instead of the element means you can move the mouse faster than the note without dropping it.

```js
function makeDraggable(el, handle, note) {
  handle.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const ox = e.clientX - note.x;
    const oy = e.clientY - note.y;

    function onMove(e) {
      note.x = e.clientX - ox;
      note.y = e.clientY - oy;
      el.style.left = note.x + 'px';
      el.style.top  = note.y + 'px';
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      save();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}
```

The resize grip is a 16×16 corner element with a CSS repeating-gradient pattern that suggests the traditional resize corner without using an image. Same listener pattern, with `Math.max(160, ...)` and `Math.max(120, ...)` as floor values so notes can't be made unusably small.

## Z-ordering

Every note has a `z` value. Clicking any part of a note increments a global `highZ` counter and assigns it to that note — so whatever you last touched is always on top. This is simpler than re-sorting the entire stack on every click, and it produces the right result in practice.

The `highZ` seed on load is:

```js
highZ = Math.max(1, ...state.tabs.flatMap(t => t.notes.map(n => n.z || 1)));
```

Without that, the counter would reset to 1 on reload and newly created notes would immediately slip behind old ones.

## Help

The help panel is a full-screen overlay that lists every keyboard shortcut and mouse action. It appears and disappears on `?`, on the toolbar button, or on `Esc`. The transition is a single `opacity` change at 80ms — the maximum the design system allows before "still" stops being the right word for it.

The help text is comprehensive because discoverability matters: color dots, tab drag, double-click to rename — none of these announce themselves, so they need to live somewhere a curious user will look.

## Export and import

Export serializes the full state object to JSON and triggers a download via `URL.createObjectURL`. Import reads the file back through a hidden `<input type="file">`, validates that `tabs` is a present array, and replaces state. The validation is minimal on purpose — if the JSON looks like the right shape, accept it. If it doesn't, show one error message and stop.

## Three default notes

On the first visit, three notes appear with short prompts: one explaining drag, one listing the keyboard shortcut to open help, one pointing at the resize corner. The intent is that a new user can orient themselves without opening the help panel, and those notes are easy to delete once you have the lay of the land.

## One self-contained file

The whole app is `public/sticky-notes/index.html`. No build step, no bundler, no dependencies at runtime beyond the two Google Fonts. The Astro page at `/tools/stickynotes` just describes it and opens it — the actual work happens entirely in that one file.

---

[Open Sticky Notes](/sticky-notes/) in a new window, go full-screen, and fill it up.
