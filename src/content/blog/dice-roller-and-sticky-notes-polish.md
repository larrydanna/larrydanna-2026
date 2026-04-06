---
title: "Dice Roller + Sticky Notes Polish"
date: "2026-04-06"
description: "Two updates: a new animated dice rolling tool for tabletop RPG sessions, and a round of polish on Sticky Notes — font-size slider, reset, full screen toggle, and a reassuring one-liner."
tags: ["Web", "Tools", "Vanilla JS", "Meta", "RPG"]
draft: false
---

Two things shipped today. The first is finishing work on Sticky Notes — a list of small features that accumulated after the initial build. The second is a brand new tool: a dice roller for tabletop RPG sessions.

---

## Sticky Notes: round two

A second polish pass landed three more improvements.

### Font slider range extended

The slider previously topped out at 24px. On a large or high-DPI display that's still small. The max is now 36px — the Caveat handwriting font stays legible all the way up, and the extra range makes notes usable as a big-screen reference board.

### Auto Arrange

A new "Auto Arrange" button in the toolbar tiles all notes on the active board in a grid. Notes are sorted by their approximate reading order (top-to-bottom, left-to-right based on current position), then flowed left-to-right in rows with 16px gaps, wrapping when they'd overflow the desktop edge. Sizes are preserved — only positions change.

```js
let x = PAD, y = PAD, rowHeight = 0;
sorted.forEach(note => {
  if (x > PAD && x + note.w > dw - PAD) {
    x = PAD;
    y += rowHeight + GAP;
    rowHeight = 0;
  }
  note.x = x;
  note.y = y;
  x += note.w + GAP;
  rowHeight = Math.max(rowHeight, note.h);
});
```

### Wrangle

Notes can drift off-screen during a session — dragged too far left, too far up, or off a resized window. "Wrangle" pulls them back. It scans every note on the current board and clamps any that are out of reach back into the visible area:

```js
const GRIP = 44;
note.x = Math.max(-(note.w - GRIP), Math.min(note.x, dw - GRIP));
note.y = Math.max(0, Math.min(note.y, dh - GRIP));
```

The rule: at least 44px of the note must remain inside the desktop on every edge, and the top of the note — where the drag handle lives — must never sit above y=0. Notes already on-screen aren't touched.

---

## Sticky Notes: the first polish pass

The original Sticky Notes shipped with the core working — notes, boards, colors, drag, resize, export. A short list of improvements was left for a second pass.

### Font size slider

Note text was hardcoded at 15px (Caveat, the handwriting font). The fix: a `--note-fs` CSS custom property on `:root`, and a live `<input type="range">` in the toolbar that updates it.

```js
fontSlider.addEventListener('input', () => {
  const size = parseInt(fontSlider.value, 10);
  state.fontSize = size;
  document.documentElement.style.setProperty('--note-fs', size + 'px');
  save();
});
```

The value persists in `localStorage` with the rest of state. If you reopen the window, your preferred size is restored. The slider runs from 11px to 24px — small enough for dense boards, large enough to read from across a desk.

### Reset button

A "Reset" button that restores the board to the original welcome state — three default notes, one board. It confirms first (`confirm()`, not a custom dialog — this doesn't need ceremony), clears `localStorage`, rebuilds initial state from the `DEFAULTS` array, and re-renders. The font size slider resets to 15px as part of the same operation.

Useful when you've filled a board with scratch work and want a clean slate without hunting through tabs or deleting notes one by one.

### Subtle message

A line in the toolbar reads: *Just close the window… your notes will be here when you return.*

This solves a small anxiety. Notes autosave to `localStorage`, so closing the window is safe — but nothing told you that. The message is in muted italic, small, out of the way. It just sits there and reassures.

### Full Screen button

A "Full Screen" toggle in the toolbar using the Fullscreen API:

```js
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

document.addEventListener('fullscreenchange', () => {
  btnFullscreen.textContent = document.fullscreenElement
    ? 'Exit Full Screen'
    : 'Full Screen';
});
```

The button label flips on the `fullscreenchange` event rather than in the toggle handler, which handles the case where the user exits fullscreen via `Esc` and the button text needs to update without a click.

---

## Dice Roller

[Dice Roller](/tools/diceroller) is a new tool for tabletop RPG sessions. It lives at `/dice-roller/` as a self-contained HTML file, same as Sticky Notes.

### What it does

Seven die types: d4, d6, d8, d10, d12, d20, d100. Each has a count control — you can roll up to 20 of any type simultaneously, which covers things like a fireball (8d6) or a crit confirmation pile. A modifier input adds a flat bonus or penalty to the total. The live notation display below the dice grid shows the formula as you build it — `2d6 + 1d20 + 3` — so you can check what you're about to roll before you roll it.

### The animation

The roll animation is the fun part. When you click Roll Dice, each die card enters a `rolling` CSS state and a `setInterval` starts cycling random values in range, every 65ms for 650ms:

```js
const timer = setInterval(() => {
  if (Date.now() - start >= ROLL_DURATION) {
    clearInterval(timer);
    showDiceCards(expanded, finalValues, 'settled');
    setTimeout(onDone, 200);
    return;
  }
  const tempValues = expanded.map(d => rand(d.sides));
  showDiceCards(expanded, tempValues, 'rolling');
}, ROLL_INTERVAL);
```

The final values are calculated before the animation starts — the timer is theater. On settle, a `die-land` keyframe plays a quick scale bounce. The total number appears with its own `total-pop` animation.

```css
@keyframes die-wiggle {
  0%   { transform: rotate(-8deg) scale(0.93); }
  20%  { transform: rotate(8deg) scale(1.04); }
  40%  { transform: rotate(-5deg) scale(0.97); }
  60%  { transform: rotate(5deg) scale(1.02); }
  80%  { transform: rotate(-2deg) scale(0.99); }
  100% { transform: rotate(0deg) scale(1); }
}

.result-die.rolling { animation: die-wiggle 0.12s linear infinite; }
```

### Critical hits and fumbles

Natural 20 on a d20 gets a gold border glow, a "NAT 20" badge above the card, and the value rendered in gold. Natural 1 gets the same treatment in red. These are detected when settling:

```js
const isCrit   = die.type === 'd20' && val === 20 && state === 'settled';
const isFumble = die.type === 'd20' && val === 1  && state === 'settled';
```

The total display and history entry both inherit the color — a row with a natural 20 in it shows a gold total on the right. It's a small thing, but glancing down the history and seeing a gold number standing out feels right.

### Session history and export

Every roll adds an entry to the history panel: roll number, notation, individual values grouped by die type, and the total. Newest rolls appear at the top. The export downloads the full session as JSON in chronological order, with timestamps, so you can reference it after the session.

```json
{
  "session_start": "2026-04-06T19:00:00.000Z",
  "session_end": "2026-04-06T20:45:00.000Z",
  "total_rolls": 24,
  "rolls": [
    {
      "id": 1,
      "timestamp": "2026-04-06T19:03:12.441Z",
      "notation": "1d20 + 5",
      "dice": [{ "type": "d20", "sides": 20, "value": 17 }],
      "modifier": 5,
      "subtotal": 17,
      "total": 22
    }
  ]
}
```

### One detail about die colors

Each die type has a distinct color — d20 is amber, d6 is blue, d12 is red, and so on. The colors serve two purposes: they make the config cards visually distinct so you can find the die you want quickly, and they carry through to the result cards so you can identify at a glance which dice contributed which values to a roll. When a d6 card shows up next to a d20 card in the results area, the color is the immediate identifier — you don't have to read the label.

---

Both tools are linked from the [Tools](/tools) page. The dice roller is ready for the table.
