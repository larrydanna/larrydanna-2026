---
title: "New Tool: 6502 Debugger"
date: "2026-04-08"
tags: ["Tools", "6502", "Assembly", "C64", "Vanilla JS"]
description: "Built a browser-based 6502/6510 assembler and live debugger — all 56 opcodes, step execution, live registers and flags, and a hex memory inspector. No install needed."
---

Built a new tool tonight: a **6502 Debugger** that runs entirely in the browser. It's a complete write-assemble-step-debug workflow for 6502 assembly, no install, no emulator download required. It lives at [/6502-debugger/index.html](/6502-debugger/index.html).

This one is personal. I've been writing 6502 assembly for the C64 — a BASIC interpreter ([modbasic](https://github.com/larrydanna)), a full-screen text editor (ed64) — and debugging them means reaching for the VICE emulator, print statements to screen memory, or staring at KickAssembler's output and doing arithmetic in my head. A live in-browser debugger is something I actually want.

## What it does

Write 6502 assembly in the left panel. Click **Assemble**. Then step through it one instruction at a time or run it continuously with a speed slider that goes from 1 Hz (watch each instruction land) up to ~600,000 steps per second (roughly real-time 6502 speed).

The right side shows the CPU state after every step: A, X, Y, PC, SP registers, and all eight status flags (N V — B D I Z C) lit up in amber when set. Below that is the stack view — live $0100–$01FF contents with an arrow pointing to the current stack top.

The bottom panel is a scrollable hex dump of all 64KB of emulated memory. The byte at the current program counter is highlighted in amber. Navigation buttons let you page through or jump to the PC at any time.

## What the assembler supports

- All 56 standard 6502 opcodes (LDA, STA, ADC, SBC, JMP, JSR, RTS, BEQ, BNE, and the rest)
- All 13 addressing modes: Immediate, Zero Page, Zero Page X/Y, Absolute, Absolute X/Y, (Indirect,X), (Indirect),Y, Indirect, Implied, Accumulator, Relative
- Labels (`LOOP:`) with forward reference support — two-pass assembler
- `.ORG $xxxx` to set the load address
- `.BYTE` and `.WORD` for inline data
- Hex (`$C000`), binary (`%10110001`), and decimal literals
- Comments with `;`

The default program fills memory `$0200`–`$02FF` with values `$00`–`$FF` using indexed addressing and a branch loop — a simple but representative piece of 6502 code that exercises the indexing, arithmetic, and branching machinery.

## Architecture

Same pattern as the other tools on this site: four vanilla JS files loaded as regular scripts, no bundler, no framework.

```
public/6502-debugger/
├── index.html     — app shell, all CSS embedded
├── assembler.js   — two-pass assembler
├── cpu.js         — 6502 emulator core
└── debugger.js    — UI controller
```

The assembler (`assemble(source)`) returns `{ bytes, origin, errors, lineToAddr, addrToLine }`. The `addrToLine` map is what lets the debugger highlight the currently-executing line in the editor gutter — as the PC changes, it looks up which source line assembled to that address and marks the line number amber.

The CPU emulator (`CPU6502`) is a straightforward fetch-decode-execute loop: a big switch on the opcode, with inner helper functions for each addressing mode. The helpers advance the PC as they read operand bytes, so each case in the switch reads cleanly. Flag updates are strict — N and Z on every load and arithmetic op, V on ADC/SBC overflow, C on shifts and arithmetic.

One deliberate accuracy note: the indirect JMP page-boundary bug is implemented. `JMP ($10FF)` reads the high byte from `$1000`, not `$1100`, matching real 6502 hardware. It won't come up often, but when it does, the emulator should behave the same way real hardware does.

## What's deferred

This is an MVP. Things I left out on purpose for later sessions:

- **Breakpoints** — click a line number to set a red-dot breakpoint; run stops there automatically
- **Load .prg file** — drag a real C64 binary into the debugger and step through it
- **C64 memory annotations** — label `$D020` as "border color", `$D400` as "SID", etc.
- **Cycle-accurate timing** — each opcode has a known cycle count; a cycles counter would help timing analysis

The first three are the ones I actually want. The annotations especially — there's something satisfying about seeing `STA $D020` and having the debugger tell you "Border Color" next to the address.

## The design

Warm Dark all the way through. `--bg`, `--surface`, `--accent` (the golden amber), `--border` — all pulled from the site's CSS custom properties, embedded directly into the tool's stylesheet since it's a standalone file. JetBrains Mono for everything code-shaped: the editor, the registers, the hex dump. IBM Plex Sans for labels and controls.

The layout is a classic debugger split: editor on the left, CPU state panel on the right, memory inspector across the bottom, console below that. No animations — instant state updates only, consistent with the rest of the design system.

Landing page is at [/tools/6502debugger](/tools/6502debugger). Featured on the homepage.
