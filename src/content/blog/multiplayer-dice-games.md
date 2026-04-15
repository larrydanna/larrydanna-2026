---
title: "Building a Multiplayer Game System: Yacht and Farkle"
date: "2026-04-14"
description: "How I built a real-time multiplayer game platform in the browser — QR-code lobby, shared game table, mobile player views, and PartyKit for live sync. Starting with Yacht and Farkle."
tags: ["JavaScript", "Multiplayer", "PartyKit", "Games"]
draft: false
---

This session I built something I've wanted for a while: a multiplayer dice game system that runs entirely in the browser with no app install, no account, and no backend to manage. Host a session on any screen, share a QR code, and everyone joins from their phone.

## The problem with "just use localStorage"

Every other tool on this site stores its state in localStorage. That works great for single-player tools — the data lives on the device, everything is instant, nothing can go wrong on a server you don't control.

Multiplayer breaks that model. You need a shared source of truth that updates in real time across devices that have never talked to each other.

## PartyKit

The solution was [PartyKit](https://partykit.dev/) — a platform built on Cloudflare Durable Objects that gives you a persistent WebSocket room with a single TypeScript file as the backend. One room per game session. The mental model is perfect:

- Host connects → room creates the session
- Players connect → room validates passcode and adds them
- Someone takes an action → room validates it, updates state, broadcasts to everyone
- Room hibernates when empty → no cleanup needed

The whole server is about 200 lines of TypeScript. No database, no auth service, no deployment pipeline beyond `npx partykit deploy`.

## The three views

I built three separate HTML files that open on different devices simultaneously:

**Lobby** (`/games/index.html`) — where the host creates a session and players join. Pick a game, set a passcode, and a QR code appears immediately. Late joiners type the session ID and passcode manually.

**Game Table** (`/games/table/`) — the shared screen. Think of it as the TV at the bar: scoreboard on the left, current player's dice in the center, activity log on the right, QR code always visible in the header for stragglers. Read-only — no input.

**Player View** (`/games/player/`) — mobile-optimized. Shows your dice, your scoring options with live previews, and a "not your turn" lock when waiting. For Farkle, the bank button shows your current turn points. Tapping a die toggles whether it's kept.

## Two games, one interface

Both Yacht and Farkle implement the same static interface:

```js
class GameEngine {
  static init(playerIds, players)               // → initial game state
  static applyAction(gs, pid, action, players)  // → { state, events, error?, turnEnded? }
  static isGameOver(gs, players)                // → boolean
  static getFinalScores(gs, players)            // → sorted [{ name, score }]
  static getValidActions(gs, playerId)          // → string[]
  static describeEvent(evt, playerName)         // → HTML string for activity log
}
```

The server imports both engines and routes `PLAYER_ACTION` messages through `applyAction`. If the engine returns an error, only the offending player sees it. Valid actions broadcast the full updated state to everyone.

This means the rules are enforced on the server — clients can't cheat by sending invalid actions. The browser just renders state and sends intents.

## Yacht scoring

Yacht is the original — Yahtzee is a licensed variant. The differences: no upper-section bonus, and the scoring categories are slightly different. Twelve categories total (six upper, six lower). You fill each exactly once, even if you score zero. Three rolls per turn, toggle kept dice between rolls.

The `previewScore` static method computes what a category would yield for the current dice without mutating state — used by the player view to show live previews next to each unscored category.

## Farkle's push-your-luck

Farkle is trickier. After each roll, if no dice score, you farkle and lose all turn points. You keep going as long as you want, but the longer you push, the more you risk. Hot dice (all 6 dice score) let you re-roll all 6.

The must-keep rule took some thought: in Farkle you can't un-keep a die once you've committed it. Each `keep_die` action permanently locks that die. The roll counter is based on un-kept dice. Getting this right in the server-side `applyAction` took a couple iterations.

## What's next

The engine interface is designed to be extended. Any turn-based game — board game, card game, whatever — can implement the same six methods and drop into the lobby with a new entry in the game picker. I'm thinking about adding a simple card game next, which will mean building a deck-management abstraction into the engine layer.

The QR code system works well in practice. You open the table view on a laptop, the QR code shows up, everyone scans, and you're playing in under a minute.
