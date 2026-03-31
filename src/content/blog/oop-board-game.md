---
title: "OOP Patterns: A Board Game Demo"
date: "2016-04-15"
description: "A JavaScript demonstration of object-oriented design patterns inspired by Kevin Berridge's talk — players, dice, and a Monopoly game built from composable objects."
tags: ["JavaScript", "OOP", "Patterns"]
draft: false
---

This demo is inspired by Kevin Berridge's talk [OOP: You're Doing It Completely Wrong](https://vimeo.com/91672848). If you haven't watched it, it's worth an hour of your time.

The idea: model a board game using proper object-oriented design. Objects that know their own responsibilities. No god objects. No procedural code dressed up in classes.

## The pieces

**Player** — knows how to play a game. Rolls dice, reads the result, announces what happened. Doesn't know what game it's playing or how dice work internally.

**Die / DieFactory** — a die knows how to roll itself. The factory builds dice with a given number of sides. The random number generator is injected, so tests can use a fake that always returns max or min.

**Game** — manages turn order. Tells each player when it's their turn and hands them the dice.

**Monopoly** — a specific game. Has a name, owns two six-sided dice. Could be Yahtzee or anything else with the same interface.

**UserInterface / UserView** — decoupled output. The same `say()` call goes to both the browser's `<ul>` and the console. Swap out either without touching game logic.

## What makes it interesting

The `RandomNumberGenerator` is injected into `Die`. That single seam makes the whole thing testable without mocking globals. `FakeMath_RandomReturnsMax` and `FakeMath_RandomReturnsMin` are two-line objects that let you assert exact outcomes in tests.

The `Flag` object is a small thing worth noticing — a boolean with named methods (`isTrue()`, `isFalse()`, `toggle()`). Reads like intent, not implementation. Better than `if (readyToExecute === true)` scattered everywhere.

## Try it

```javascript
// The entry point — wires everything together
var fred = new Player("Fred", userInterface);
var barney = new Player("Barney", userInterface);

fred.playGame(game);
barney.playGame(game);
```

Fred and Barney each take a turn. They roll two dice, read the total, announce the result. The game logs every step to the console and appends it to the page.

The patterns here — constructor injection, interface-based design, single responsibility — are the same ones I use in C# every day. JavaScript just makes the seams more visible because there's no compiler enforcing the contracts.
