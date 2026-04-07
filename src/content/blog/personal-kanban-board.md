---
title: "New Tool: Personal Kanban Board"
date: "2026-04-06"
tags: ["Tools", "Productivity", "Vanilla JS"]
description: "Added a drag-and-drop Personal Kanban board with multiple boards, editable columns, and JSON export/import — all in a single vanilla JS file."
---

Added a new tool tonight: a **Personal Kanban** board. It lives at [/kanban/index.html](/kanban/index.html) and is a fully self-contained HTML/CSS/JS app with no dependencies.

## What it does

Three columns per board — **To Do**, **WIP**, and **Done** — with full drag-and-drop between them. Cards can be reordered within a column too, with a live amber drop-indicator line showing exactly where a card will land.

Everything is editable: click a column header to rename it, double-click a board tab to rename the board. Multiple boards are supported as tabs (same pattern as Sticky Notes), and you can drag tabs to reorder them.

## The details

- Cards are `contenteditable` divs — click to edit, Enter to save, Shift+Enter for a new line inside the card, Esc to cancel
- New empty cards that are abandoned without typing are automatically discarded
- The last board can't be deleted — closing it clears its cards instead
- Auto-saves to `localStorage` on every action with a brief "Saved." flash
- Full JSON export and import — the entire state (all boards, columns, cards) in one file
- Keyboard shortcuts: `N` for new card, `Ctrl+T` for new board, `Ctrl+E/I` for export/import, `?` for help

## Design

Follows the site's Warm Dark / Studio Amber system: IBM Plex Sans throughout, CSS custom properties for all colors, no animations. Each column gets a colored top accent stripe — amber for To Do, neutral for WIP, sage green for Done — so they're visually distinct at a glance without being loud.

The landing page is at [/tools/kanban](/tools/kanban) and the board is featured on the homepage.
