---
title: "Built a Sudoku game — five themes, hint tracking, mobile-first"
date: "2026-04-16"
tags: ["games", "tools", "javascript"]
description: "Added a fully offline Sudoku game with five difficulty levels, five hand-crafted visual themes with textures, pencil-mark notes mode, and a hint counter that carries through to the win screen."
---

Added a Sudoku game to the tools section today. It lives at `/tools/sudoku` and runs entirely in the browser — no server, no dependencies, no account.

## What's in it

**Five difficulty levels** — Beginner through Expert, ranging from 52 givens down to 23. Each puzzle is generated fresh with a backtracking solver that guarantees a unique solution before handing it to you.

**Five visual themes**, each with its own texture layer baked in as SVG data URIs so there's nothing to fetch:

- *Ember* — warm dark brown and amber, matches the site's default look
- *Blueprint* — dark navy with repeating cyan grid lines
- *Parchment* — light sepia paper with diagonal crosshatch grain
- *Slate* — cool charcoal with violet accents and scanline texture
- *Jade Garden* — deep forest green with gold accents and stipple dots

**Hint tracking** — hints are unlimited but every one is counted. The hint counter shows live in the header, and the win screen reports the final tally. Hints prefer fixing wrong entries before revealing empty cells, and the hint-revealed cell stays styled in green so you know it wasn't your answer.

**Notes mode** — toggle pencil marks to track candidates in any cell. Notes clear automatically when you place a value.

**Mobile-first layout** — grid and numpad are sized for one-handed use on an iPhone XR. Minimum 44px touch targets throughout, no horizontal scroll, no zoom required.

The theme choice persists in localStorage so the game opens in your last-used skin.
