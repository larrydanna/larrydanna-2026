/**
 * Farkle — push-your-luck dice game.
 * Roll 6 dice, bank scoring combinations, race to 10,000 without farkling.
 *
 * Implements the shared GameEngine interface:
 *   static init(playerIds, players)              → initialGameState
 *   static applyAction(gs, pid, action, players) → { state, events, error?, turnEnded? }
 *   static isGameOver(gs, players)               → boolean
 *   static getFinalScores(gs, players)           → [{ playerId, name, score }] sorted desc
 *   static getValidActions(gs, pid)              → string[]
 *   static describeEvent(evt, playerName)        → string (HTML-safe)
 */

const WIN_SCORE = 10000;

export class Farkle {
  // ── init ──────────────────────────────────────────────────────────────
  static init(playerIds, players) {
    const scores  = {};
    const lastLap = {};
    for (const pid of playerIds) {
      scores[pid]  = 0;
      lastLap[pid] = false;
    }
    return {
      scores,
      lastLap,
      finalLapActive:    false,
      finalLapInitiator: null,
      turnState:         Farkle._freshTurnState(),
    };
  }

  static _freshTurnState() {
    return {
      diceCount:      6,
      currentRoll:    [],  // die values from the most recent roll
      kept:           [],  // indices into currentRoll kept THIS roll phase
      keptThisTurn:   [],  // die VALUES committed from all previous roll phases (display only)
      committedScore: 0,   // sum of scoreKept() from each committed roll phase
      turnPoints:     0,
      hotDice:        false,
    };
  }

  // ── applyAction ───────────────────────────────────────────────────────
  static applyAction(gameState, playerId, action, players) {
    const gs = structuredClone(gameState);
    const ts = gs.turnState;
    switch (action.type) {
      case 'roll':     return Farkle._roll(gs, ts, playerId);
      case 'keep_die': return Farkle._keepDie(gs, ts, playerId, action.payload);
      case 'bank':     return Farkle._bank(gs, ts, playerId, players);
      default:         return { state: gs, events: [], error: `Unknown action: ${action.type}` };
    }
  }

  // ── Roll ──────────────────────────────────────────────────────────────
  static _roll(gs, ts, playerId) {
    let rollCount;

    if (ts.hotDice) {
      // Hot dice: commit all current kept dice, score them, then re-roll all 6
      const vals = ts.kept.map(i => ts.currentRoll[i]);
      ts.committedScore += Farkle.scoreKept(vals);
      ts.keptThisTurn  = [...ts.keptThisTurn, ...vals];
      ts.hotDice   = false;
      ts.diceCount = 6;
      ts.kept      = [];
      rollCount    = 6;
    } else if (!ts.currentRoll.length) {
      // First roll of the turn
      rollCount = ts.diceCount; // always 6 on a fresh turn
    } else {
      // Subsequent roll — must have kept at least one die this phase
      if (ts.kept.length === 0) {
        return { state: gs, events: [], error: 'Keep at least one scoring die before rolling again.' };
      }
      // Commit kept dice from this roll phase, score them independently, then roll the remainder
      const vals = ts.kept.map(i => ts.currentRoll[i]);
      ts.committedScore += Farkle.scoreKept(vals);
      ts.keptThisTurn  = [...ts.keptThisTurn, ...vals];
      rollCount    = ts.diceCount - ts.kept.length;
      ts.diceCount = rollCount;
      ts.kept      = [];
    }

    if (rollCount <= 0) {
      return { state: gs, events: [], error: 'No dice to roll.' };
    }

    const newDice = Array.from({ length: rollCount }, () => Math.floor(Math.random() * 6) + 1);
    ts.currentRoll = newDice;
    // ts.kept already reset above

    // Farkle check
    if (!Farkle._hasScoringDie(newDice)) {
      const events = [{ event: 'farkled', data: { dice: newDice } }];
      if (gs.finalLapActive && playerId !== gs.finalLapInitiator) {
        gs.lastLap[playerId] = true;
      }
      gs.turnState = Farkle._freshTurnState();
      return { state: gs, events, turnEnded: true };
    }

    // No new dice kept yet this phase — turn points = committed phases only
    ts.turnPoints = ts.committedScore;

    return {
      state: gs,
      events: [{ event: 'rolled', data: { dice: newDice } }],
    };
  }

  // ── Keep die ──────────────────────────────────────────────────────────
  static _keepDie(gs, ts, playerId, payload) {
    const idx = payload?.index;
    if (idx === undefined || idx < 0 || idx >= ts.currentRoll.length) {
      return { state: gs, events: [], error: 'Invalid die index.' };
    }

    let nowKept;
    if (ts.kept.includes(idx)) {
      // Toggle off — un-keep the die
      ts.kept  = ts.kept.filter(i => i !== idx);
      nowKept  = false;
    } else {
      if (!Farkle._dieScores(ts.currentRoll, ts.kept, idx)) {
        return { state: gs, events: [], error: 'That die does not score. Keep a 1, a 5, or three-of-a-kind.' };
      }
      ts.kept.push(idx);
      nowKept = true;
    }

    // Score only the current roll phase's kept dice, add to committed phases
    const keptVals = ts.kept.map(i => ts.currentRoll[i]);
    ts.turnPoints  = ts.committedScore + Farkle.scoreKept(keptVals);

    // Hot-dice: all dice in this roll phase are now kept
    const remaining = ts.diceCount - ts.kept.length;
    ts.hotDice = remaining === 0 && ts.kept.length > 0;

    return {
      state: gs,
      events: [{ event: 'kept_die', data: { index: idx, value: ts.currentRoll[idx], kept: nowKept, turnPoints: ts.turnPoints } }],
    };
  }

  // ── Bank ──────────────────────────────────────────────────────────────
  static _bank(gs, ts, playerId, players) {
    if (ts.turnPoints === 0) {
      return { state: gs, events: [], error: 'No points to bank. Keep some scoring dice first.' };
    }

    const banked = ts.turnPoints;
    gs.scores[playerId] = (gs.scores[playerId] || 0) + banked;
    const total = gs.scores[playerId];

    // Trigger final lap when first player exceeds WIN_SCORE
    if (total >= WIN_SCORE && !gs.finalLapActive) {
      gs.finalLapActive    = true;
      gs.finalLapInitiator = playerId;
    }

    // FIX: mark this player's final-lap turn complete so isGameOver can resolve
    if (gs.finalLapActive && playerId !== gs.finalLapInitiator) {
      gs.lastLap[playerId] = true;
    }

    gs.turnState = Farkle._freshTurnState();
    return {
      state: gs,
      events: [{ event: 'banked', data: { points: banked, total } }],
      turnEnded: true,
    };
  }

  // ── isGameOver ────────────────────────────────────────────────────────
  // Game ends once every non-initiator player has had their final-lap turn.
  static isGameOver(gs, players) {
    if (!gs.finalLapActive) return false;
    return players.every(p => p.id === gs.finalLapInitiator || gs.lastLap[p.id] === true);
  }

  // ── getFinalScores ────────────────────────────────────────────────────
  static getFinalScores(gs, players) {
    return players
      .map(p => ({ playerId: p.id, name: p.name, score: gs.scores[p.id] || 0 }))
      .sort((a, b) => b.score - a.score);
  }

  // ── getValidActions ───────────────────────────────────────────────────
  static getValidActions(gs, playerId) {
    const ts = gs.turnState;
    const actions = ['roll'];
    if (ts.turnPoints > 0) actions.push('bank');
    return actions;
  }

  // ── describeEvent ─────────────────────────────────────────────────────
  static describeEvent(evt, playerName) {
    const name = `<span class="log-name">${_esc(playerName)}</span>`;
    switch (evt.event) {
      case 'rolled': {
        const d = (evt.data?.dice || []).join(', ');
        return `${name} rolled [${d}]`;
      }
      case 'farkled':
        return `${name} <strong style="color:var(--danger)">Farkled!</strong> — lost ${evt.data?.lost ?? 0} pts`;
      case 'banked':
        return `${name} banked ${evt.data?.points} pts (total: ${evt.data?.total})`;
      case 'kept_die':
        return `${name} ${evt.data?.kept ? 'kept' : 'released'} a ${evt.data?.value}`;
      case 'turn_skipped':
        return `${name}'s turn was skipped by the table`;
      case 'game_started':
        return 'Game started';
      case 'game_finished':
        return 'Game over';
      default:
        return `${name}: ${_esc(evt.event)}`;
    }
  }

  // ── Scoring helpers ───────────────────────────────────────────────────

  // True if the dice roll contains at least one scoring die/combination.
  static _hasScoringDie(dice) {
    // Special 6-dice combos are always scoring
    if (dice.length === 6 && Farkle._specialComboScore(dice) > 0) return true;
    // Singles
    if (dice.some(d => d === 1 || d === 5)) return true;
    // Three-of-a-kind
    return _countFaces(dice).some(c => c >= 3);
  }

  // Returns the score if all 6 dice form a special combo, else 0.
  static _specialComboScore(dice) {
    if (dice.length !== 6) return 0;
    const counts = _countFaces(dice);
    if (counts.every(c => c === 1)) return 1500;                          // 1-2-3-4-5-6 straight
    if (counts.filter(c => c === 3).length === 2) return 2500;            // two triplets
    if (counts.filter(c => c === 2).length === 3) return 1500;            // three pairs
    return 0;
  }

  // True if keeping die at newIdx adds to the score given already-kept indices.
  static _dieScores(currentRoll, keptIndices, newIdx) {
    // If the roll is a special 6-dice combo, any die is valid to keep
    if (currentRoll.length === 6 && Farkle._specialComboScore(currentRoll) > 0) return true;
    const val = currentRoll[newIdx];
    if (val === 1 || val === 5) return true;
    // Check if it completes or extends a three-of-a-kind with already-kept dice
    const allVals = [...keptIndices.map(i => currentRoll[i]), val];
    if (_countFaces(allVals)[val - 1] >= 3) return true;
    // Allow keeping if the full roll has 3+ of this face (player is building a set)
    return _countFaces(currentRoll)[val - 1] >= 3;
  }

  // Score a set of die values (accumulated from the full turn).
  static scoreKept(dice) {
    if (!dice.length) return 0;
    const counts = _countFaces(dice);

    // Special 6-dice combos (must be exactly 6 dice)
    if (dice.length === 6) {
      if (counts.every(c => c === 1)) return 1500;
      if (counts.filter(c => c === 3).length === 2) return 2500;
      if (counts.filter(c => c === 2).length === 3) return 1500;
    }

    let score = 0;
    for (let face = 1; face <= 6; face++) {
      const c = counts[face - 1];
      if (c === 0) continue;
      if (c >= 3) {
        const base = face === 1 ? 1000 : face * 100;
        score += base * Math.pow(2, c - 3); // 3=base, 4=2x, 5=4x, 6=8x
      } else {
        if (face === 1) score += c * 100;
        if (face === 5) score += c * 50;
      }
    }
    return score;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _countFaces(dice) {
  const counts = [0, 0, 0, 0, 0, 0];
  for (const d of dice) { if (d >= 1 && d <= 6) counts[d - 1]++; }
  return counts;
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
