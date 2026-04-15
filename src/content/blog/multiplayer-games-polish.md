---
title: "Multiplayer Games: Bug Fixes, Chat, and Help"
date: "2026-04-14"
description: "A second pass on the Yacht/Farkle multiplayer system — fixing Farkle's scoring engine completely, adding player chat, game rules help, and a table-controlled early game over."
tags: ["JavaScript", "Multiplayer", "Games", "Debugging"]
draft: false
---

After getting the multiplayer dice game system working end-to-end, I spent a session fixing a batch of issues that surfaced during real play and adding a few quality-of-life features.

## Farkle engine rewrite

Three bugs made Farkle largely unplayable:

**Double-counting kept dice.** `_computeTurnPoints` was mutating `keptThisTurn` every time it was called — once per die tap. So keeping two dice in sequence would add each die's value to an ever-growing accumulator instead of just tracking the current state. The fix was simple: stop mutating `keptThisTurn` during point calculation. It now only gets written when a roll phase actually ends (player rolls again or hot dice trigger).

**`isGameOver` never returning true.** The engine tracked a `lastLap` flag per player to know when everyone had taken their final turn after someone hit 10,000 points — but nothing ever set that flag to `true`. The fix: set `lastLap[playerId] = true` in `_bank` (when banking while the final lap is active) and in `_roll` when a farkle ends the turn during the final lap.

**`diceCount` not updating between rolls.** After the first roll you might keep 2 dice and roll the remaining 4. But `diceCount` was still 6, so the next roll would compute `6 - kept.length` instead of `4 - kept.length`, giving you too many dice. One line added: `ts.diceCount = rollCount` after computing how many dice to roll.

I also added the missing special 6-dice combinations to the scoring: straight (1–2–3–4–5–6 = 1,500), three pairs (1,500), and two triplets (2,500). These weren't in the original implementation at all.

## Chat

Players can now type messages from the player view that appear on the game table screen in real time. The server appends each message to `session.chat[]` (capped at 50) and broadcasts state as usual — no separate message type needed for rendering, just another field in the state tree. The table shows the last 15 messages in the right-hand log column below the activity feed.

## Rules help

A "Rules" button appears in the status bar of both the player view and the table view. It opens a modal with the full scoring reference for whichever game is active — kept concise enough to read in 30 seconds.

## Early game over

The skip turn feature already let the table advance past a disconnected player. But if you kept skipping, the game would never end because `isGameOver` was waiting for normal turn completion. Two fixes:

1. When the table skips a player, the server now checks `isGameOver` immediately after advancing the turn — so skipping the last player in Farkle's final lap correctly ends the game.

2. A new "Call Game Over" button lets the table explicitly end the game at any time, regardless of whose turn it is. The final scores screen shows "Game over — called by the table" so players understand it wasn't a natural finish.

## Yacht scored categories

A minor UX issue: once a Yacht category was scored, the number displayed next to it went muted and light. During play you want to quickly scan what you've already scored, not hunt for faded text. Scored category values are now rendered at full text brightness — only the row background fades back.
