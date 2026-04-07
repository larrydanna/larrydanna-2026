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

---

## Post-Mortem: AI-Assisted Development with gstack

This tool was built entirely with [Claude Code](https://claude.ai/code) and [gstack](https://garryslist.org) — an open-source AI builder framework by Garry Tan. I'm sharing the full session below because the process itself is instructive, especially the part where the AI found ten bugs in its own code before it shipped.

If you're a developer curious about AI-assisted workflows, or if you're evaluating how much to trust AI-generated code, this is worth reading.

<details>
<summary><strong>The Implementation Plan</strong> — what was designed before a line was written</summary>

Before writing any code, Claude explored the existing codebase (Sticky Notes tool, Dice Roller tool, Astro page patterns, the design system) and produced this implementation plan. It was reviewed and approved before execution began.

---

**Context:** Adding a new standalone "Personal Kanban" tool. The tool provides a multi-board Kanban experience with three columns (To Do, WIP, Done), drag-and-drop cards, board/column renaming, and JSON import/export — following the exact same patterns established by the Sticky Notes and Dice Roller tools.

**Data schema** stored at `kanban-v1` in localStorage:
```javascript
{
  boards: [{
    id: string,       // uid()
    name: string,
    columns: [{
      id: string,
      name: string,   // "To Do" | "WIP" | "Done" (user-renameable)
      cards: [{ id: string, text: string }]
    }]               // always exactly 3 columns
  }],
  activeBoard: string
}
```

**Layout:** flex column, full height, overflow hidden
- `#toolbar` — New Card button, Export/Import buttons, hidden file input
- `#tabbar` — Board tabs (same pattern as sticky-notes: contenteditable name, × close, drag-to-reorder, `+` button)
- `#board-area` — flex row, `overflow-x: auto`, `padding: 20px 24px`

**JS architecture:**
```
uid()
load() / save() / initDefaults()
activeBoard() helper

render() → renderTabs() + renderBoard()
buildColumnEl(col) → buildCardEl(card, col)

addBoard() / removeBoard(id) / switchBoard(id) / reorderBoard(srcId, tgtId)
addCard(colId) / deleteCard(colId, cardId) / updateCardText(...)
moveCard(srcColId, srcCardId, tgtColId, insertBeforeCardId)

exportJSON() / importJSON()
toggleHelp() / hideHelp()
```

**Drag-and-drop strategy (HTML5 Drag API):**
- Module-level `dragSrcColId` / `dragSrcCardId` track the active drag
- `dragstart` on card: set src vars, mark card with `.dragging` CSS class
- `dragover` on `.col-cards`: insert a `.drop-indicator` div at the calculated insertion point using `getDragAfterElement(container, y)` — a reduce over all non-dragging cards finding the one whose midpoint is just below the cursor
- `drop`: call `moveCard()` with the insertBefore card id
- `dragend`: clear all state, remove indicators

**Files to create/modify:**
1. `public/kanban/index.html` — the full standalone app
2. `src/pages/tools/kanban.astro` — landing page with 6 feature cards
3. `src/pages/tools/index.astro` — add kanban as first tool entry
4. `src/pages/index.astro` — add featured card at top (trim to 3 total)

**Verification checklist from the plan:**
1. Persistence — add cards, reload, verify cards survive
2. Column rename — rename "To Do" → "Backlog", reload, confirm persists per-board
3. Board tabs — add 3 boards, drag-reorder, rename, close; last board clears instead of deletes
4. Drag within column — reorder 4 cards, reload, verify new order in state
5. Drag across columns — drag card to WIP mid-list, reload, verify position
6. Drop indicator — amber line tracks mouse during drag, disappears on drop/dragend
7. Card editing — click text → editable; blur saves; `N` key blocked while editing
8. Export/Import — export, modify state, import file, confirm full restore
9. Build — `npm run build` passes; all pages render

</details>

<details>
<summary><strong>The Adversarial Review</strong> — ten bugs found in the AI's own code, before shipping</summary>

After the code was written and the build passed, gstack's `/ship` workflow ran an adversarial code review — a separate Claude subagent tasked with thinking like an attacker and chaos engineer, explicitly told to find failure modes with no compliments allowed.

It found **ten real issues**. All ten were fixed before the push.

---

### What was found

**HIGH — `uid()` collision risk**

The original `uid()` function used only 4 base-36 random characters: `36^4 = 1,679,616` possible values. Cards created within the same millisecond share a timestamp prefix, making collisions realistic under rapid-fire operations (adding many cards, importing a large file). A collision means two cards share an ID. `moveCard` uses `findIndex` which returns the first match — the wrong card gets moved silently. `deleteCard` uses `filter` which deletes both cards silently.

*Fix: use `crypto.randomUUID()` with a longer fallback.*

---

**HIGH — `localStorage` quota silently swallowed**

`localStorage.setItem()` throws `QuotaExceededError` when storage is full. The original `save()` had no try/catch. The exception propagated up to nothing. The UI showed "Auto-saved." while the data was not actually saved. On next load, the user gets the previous state back silently — with no indication anything went wrong.

*Fix: wrap `setItem` in try/catch, show "⚠ Storage full — not saved!" on failure.*

---

**HIGH — import validation too shallow**

The import validator only checked `data.boards` was a non-empty array. After that, `state = data` replaced everything with untrusted data. Multiple crash paths post-import:
- A board with 0 columns: `board.columns[0].id` is accessed without a length guard when pressing `N` or clicking "+ New Card" — `Cannot read properties of undefined`
- A column without a `cards` array: `col.cards.forEach` throws immediately
- A card with no `text` property: renders as the string `"undefined"` silently
- An empty `board.name` from an imported file: the rename fallback `newName || board.name` is `'' || ''` = `''`, and the board gets stuck with no visible name permanently

*Fix: deep-validate and repair each board, column, and card on import — sanitize rather than reject.*

---

**MEDIUM — `deleteCard` called during `blur` event (re-entrant DOM teardown)**

When an empty card loses focus, the `blur` handler calls `deleteCard()`, which calls `renderBoard()`, which does `area.innerHTML = ''` — destroying the DOM node that is currently the target of the in-flight `blur` event. Chrome handles this fine, but on Safari the event continues dispatching on the detached node and can fire follow-on `focusout` events on ancestor elements, which can trigger the column rename handler unexpectedly.

*Fix: defer with `setTimeout(() => deleteCard(...), 0)` so the blur event fully resolves before the DOM is torn down.*

---

**MEDIUM — tab drag doesn't clear card drag globals**

Tab drag and card drag both use the HTML5 Drag API and share the global `dragSrcCardId` variable. When a tab drag starts, `dragSrcCardId` is not cleared. If the browser loses focus mid-drag (alt-tab, mobile background) and `dragend` never fires, `dragSrcCardId` remains set. The next tab drag then has `dragSrcCardId !== null`, which causes the column `drop` handler to not early-return for tab drops — calling `moveCard()` with stale IDs while also reordering the tab.

*Fix: explicitly clear `dragSrcColId` and `dragSrcCardId` at the start of every tab `dragstart`.*

---

**MEDIUM — drag opacity set via `setTimeout` (race condition)**

The original code set card opacity with `setTimeout(() => { cardEl.style.opacity = '0.4'; }, 0)`. Between `dragstart` firing and the callback running, opacity is not yet set. Any `dragover` event during that zero-delay window sees the dragging card with no opacity set. `getDragAfterElement` was filtering by `parseFloat(el.style.opacity) !== 0.4` — but `parseFloat('')` is `NaN`, and `NaN !== 0.4` is `true`, so the dragging card is included in position calculations for that first event. The drop indicator lands one position off.

*Fix: use a CSS class `.dragging { opacity: 0.4 }` added synchronously in `dragstart`, and filter by `classList.contains('dragging')` instead.*

---

**MEDIUM — `revokeObjectURL` races with blob fetch on Firefox**

In `exportJSON()`, `URL.revokeObjectURL(url)` was called immediately after `a.click()`. Chrome completes the blob fetch synchronously before revocation, so it works. Firefox does not — the blob URL is revoked before the fetch completes, producing an empty or failed download.

*Fix: `setTimeout(() => URL.revokeObjectURL(url), 100)`.*

---

**MEDIUM — `addCard` focuses new card by DOM position, not ID**

The `addCard` function used a `setTimeout` that queried the last `.card` in the column to focus it. If the user double-clicks "+ Add card" quickly, `renderBoard()` runs twice — adding two empty cards — and when the first `setTimeout` fires, `lastEl` is now the second empty card. The first empty card has no text, blurs, triggers `deleteCard`, and two interleaved deletions are in flight.

*Fix: capture `card.id` before `renderBoard()`, then query `[data-card-id="${newCardId}"]` in the timeout — target by identity, not position.*

---

**LOW — board/column name stuck as empty string**

If an imported board has `name: ""`, the rename blur handler does `board.name = newName || board.name`. Both sides are falsy, so the empty name is preserved. Every subsequent rename attempt is a no-op. The board is stuck with no visible name.

*Fix: `board.name = newName || board.name || 'Board'` — and same for column names.*

---

**MEDIUM — `removeBoard` didn't verify ID before wiping last board**

The last-board protection wiped `state.boards[0].columns.forEach(col => { col.cards = [] })` without verifying that `id === state.boards[0].id`. A stale close-button closure (from a re-rendered tab) calling `removeBoard` with an old ID would silently wipe all cards from the wrong board.

*Fix: `if (state.boards[0].id !== id) return;` before clearing.*

---

### Takeaway

The first pass of code — written by AI, with a clean build and a passing structural review — had three HIGH-severity bugs and five MEDIUM-severity bugs. None of them would have caused visible test failures. All of them would have surprised a real user in a real scenario.

The adversarial review found them in one pass. All ten were fixed in about ten minutes of targeted edits. The code that shipped is meaningfully better than the code that was written.

</details>

<details>
<summary><strong>Lessons Learned</strong> — what this session demonstrates about AI-assisted development</summary>

This was a complete AI-assisted development session: planning, exploration, implementation, review, and deployment. A few things worth noting for developers who are thinking about adopting similar workflows.

---

**1. The plan phase is not optional**

Before writing a line of code, the AI explored the existing codebase — reading the Sticky Notes tool, the Dice Roller, the Astro layouts, the design system — and produced a concrete plan: data schema, function signatures, drag strategy, CSS architecture, files to modify. The plan was reviewed and approved before execution.

This matters because AI code without a plan tends to invent patterns instead of continuing existing ones. The plan forced the new tool to follow the same localStorage schema, tab management pattern, import/export convention, and design tokens as every other tool on the site. The result is code that looks like it belongs.

---

**2. The adversarial review found bugs the structural review missed**

The `/ship` workflow ran two reviews: a structured pre-landing review (checking for SQL injection, N+1 queries, trust boundary violations, dead code) and then a separate adversarial review. The structural review came back clean. The adversarial review found ten bugs.

The difference is framing. The structural review asks "is this code correct?" The adversarial review asks "how will this code fail?" Those are different questions, and they produce different results. An empty-string board name isn't incorrect — it's just an edge case nobody thought to test. A `QuotaExceededError` silently swallowed isn't a logic bug — it's a failure mode that only appears when your storage is full. The adversarial mindset surfaces these.

---

**3. AI finds its own bugs better than humans find AI bugs**

This is counterintuitive but I think it's true. The adversarial subagent had full context on how the code worked — it understood the drag state machine, the closure structure, the event dispatch order — and was able to reason about interactions that a human reviewer scanning the same code would likely miss. The `revokeObjectURL` race condition on Firefox, the `setTimeout` opacity race in `getDragAfterElement`, the stale `dragSrcCardId` across tab drags — these require deep understanding of the specific code paths to find. The AI found all of them in a single pass.

Human code review is still valuable. But "have a human read the AI-generated code" is not the right mental model. "Have a different AI adversarially review the first AI's work" is more effective.

---

**4. Workflow rules compound over time**

Two permanent rules were added to the project's `CLAUDE.md` during this session:
- Always write a blog post at the end of every working session
- Featured Tools on the homepage must always show exactly 3 cards (newest in, oldest out)

These aren't reminders — they're constraints encoded into the AI's instructions. Every future session inherits them automatically. The AI doesn't ask, it doesn't forget, it just does it. This is the right way to think about workflow automation: not "automate the task" but "encode the rule so the task never needs to be remembered."

---

**5. The tool that shipped is better than the tool that was written**

The first version of the kanban tool was complete, functional, and built-clean. It also had three HIGH-severity bugs. The shipped version has none. The difference is entirely attributable to the adversarial review step — a step that adds maybe five minutes to the total workflow time.

The lesson isn't "AI code is buggy." The lesson is: all first-pass code has bugs, human or AI. The workflow that catches and fixes them before shipping is what matters.

---

*This session used [Claude Code](https://claude.ai/code) for development and [gstack](https://github.com/garryslist/gstack) by Garry Tan for the review and ship workflow. gstack is open source and available to anyone building with Claude Code.*

</details>
