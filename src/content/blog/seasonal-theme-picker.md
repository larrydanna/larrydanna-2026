---
title: "Sixteen Skies: A Seasonal Theme Picker"
date: "2026-03-31"
description: "The site now ships with 16 themes—four seasons, four each—auto-selected by month and week of year. A small poem explains why discipline is overrated."
tags: ["Web", "Design", "Meta"]
draft: false
---

*I built this site with one dark theme and called it discipline.*
*One amber palette, clean and still — no fraying at the brim.*
*A week elapsed; there's sixteen now, in four-per-season rows.*
*A function reads the month and week and tells the CSS where it goes.*
*Turns out that "one" was not a vow so much as a first whim.*

*In spring the site goes dusty rose, or clover-copper green.*
*Come summer: firefly yellow-green, or heron-cove marine.*
*Fall holds the amber studio warm; come winter, pine and gray.*
*A small dot in the header lets you pick, or let the date hold sway.*
*It's late March now: Peach Blossom Dawn. Come fall: a different scene.*

---

## What actually shipped

There are now 16 themes distributed across the four seasons — four per season, rotating roughly every three weeks as the calendar advances. The dot in the top-right corner of the header opens the picker. Every theme is available all year; the calendar just decides where you start.

The themes run three brightness tiers — **dark**, **mid**, and **light** — spread across each season so no season is stuck at one extreme. Spring has two light themes and one dark. Winter has two dark, one mid, and one light. The full roster:

### Spring
| Theme | Tier |
|-------|------|
| Peach Blossom Dawn | Light |
| April Rain Studio | Mid |
| Clover & Copper | Dark |
| Wildflower Afternoon | Light |

### Summer
| Theme | Tier |
|-------|------|
| Heron Cove Dusk | Mid |
| Firefly Hollow | Dark |
| Salt & Sunburn | Light |
| Thunderhead Indigo | Dark |

### Fall
| Theme | Tier |
|-------|------|
| Ember & Birch | Dark |
| Harvest Moon | Mid |
| Ciderhouse Dusk | Mid |
| Frost Before Frost | Light |

### Winter
| Theme | Tier |
|-------|------|
| Midnight Hearthside | Dark |
| Frozen Pines | Dark |
| Candlelit Library | Mid |
| Ironclad Overcast | Light |

## How the auto-selector works

```js
function computeAutoTheme() {
  const now  = new Date();
  const week = weekOfYear(now);  // 1–53
  // ... map to season, then bucket week-within-season into 0–3
  const idx = Math.min(3, Math.max(0, Math.floor(weekWithin / 3.5)));
  return SEASON_THEMES[season][idx];
}
```

Each season gets a `weekWithin` offset (spring starts around week 12, summer week 26, fall week 39, winter wraps the year boundary). Dividing by 3.5 gives four roughly equal buckets — themes 0–3 — covering the season's ~13-week span. The result is stored in `localStorage` only when you pick manually; the auto-selection recalculates on every visit.

## The implementation

All 16 themes live in `src/styles/themes.css` as `html[data-theme="..."]` blocks that override the CSS custom properties from `:root`. Every color on the site uses those properties — `--bg`, `--surface`, `--accent`, etc. — so switching themes is a single attribute change on `<html>`.

A tiny inline `<script>` in `<head>` sets the attribute synchronously before first paint, so there's never a flash of the wrong theme even on first load. The picker component handles the interactive layer on top.

The design system rule — *never hardcode hex values* — meant updating three `rgba()` calls in `global.css` to use `color-mix()` so card hover states and tag backgrounds scale correctly across all 16 palettes.

Total change: three files added or modified, about 300 lines of CSS, 150 lines of TypeScript. The function that picks your theme is twelve lines.
