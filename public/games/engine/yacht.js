/**
 * Yacht — public-domain ancestor of Yahtzee.
 * 5 dice, 12 scoring categories, each filled exactly once per player.
 * Highest total score wins. No upper-section bonus (unlike Yahtzee).
 *
 * Implements the shared GameEngine interface:
 *   static init(playerIds, players)           → initialGameState
 *   static applyAction(gs, pid, action, players) → { state, events, error?, turnEnded? }
 *   static isGameOver(gs, players)            → boolean
 *   static getFinalScores(gs, players)        → [{ playerId, name, score }] sorted desc
 *   static getValidActions(gs, pid)           → string[]
 *   static describeEvent(evt, playerName)     → string (HTML safe)
 *   static previewScore(dice, categoryId)     → number  (client-side preview, no state mutation)
 */

export class Yacht {
  // ── Category definitions ──────────────────────────────────────────────
  static CATEGORIES = [
    // Upper section
    { id: 'ones',           section: 'upper', label: 'Ones'            },
    { id: 'twos',           section: 'upper', label: 'Twos'            },
    { id: 'threes',         section: 'upper', label: 'Threes'          },
    { id: 'fours',          section: 'upper', label: 'Fours'           },
    { id: 'fives',          section: 'upper', label: 'Fives'           },
    { id: 'sixes',          section: 'upper', label: 'Sixes'           },
    // Lower section
    { id: 'full_house',     section: 'lower', label: 'Full House'      },
    { id: 'four_of_a_kind', section: 'lower', label: 'Four of a Kind'  },
    { id: 'little_straight',section: 'lower', label: 'Little Straight' },
    { id: 'big_straight',   section: 'lower', label: 'Big Straight'    },
    { id: 'choice',         section: 'lower', label: 'Choice'          },
    { id: 'yacht',          section: 'lower', label: 'Yacht'           },
  ];

  static FACE_MAP = { ones: 1, twos: 2, threes: 3, fours: 4, fives: 5, sixes: 6 };

  // ── init ──────────────────────────────────────────────────────────────
  static init(playerIds, players) {
    const playerCards = {};
    for (const pid of playerIds) {
      playerCards[pid] = {
        dice:      [0, 0, 0, 0, 0],   // 0 = not yet rolled
        kept:      [false, false, false, false, false],
        rollsLeft: 3,
        scorecard: Yacht._emptyScorecard(),
      };
    }
    return { playerCards };
  }

  static _emptyScorecard() {
    const sc = {};
    for (const cat of Yacht.CATEGORIES) sc[cat.id] = null;
    return sc;
  }

  // ── applyAction ───────────────────────────────────────────────────────
  static applyAction(gameState, playerId, action, players) {
    const gs = structuredClone(gameState);
    const pc = gs.playerCards[playerId];
    if (!pc) return { state: gs, events: [], error: 'Player card not found.' };

    switch (action.type) {
      case 'roll':        return Yacht._roll(gs, pc, playerId);
      case 'toggle_keep': return Yacht._toggleKeep(gs, pc, playerId, action.payload);
      case 'score_category': return Yacht._scoreCategory(gs, pc, playerId, action.payload, players);
      default:            return { state: gs, events: [], error: `Unknown action: ${action.type}` };
    }
  }

  static _roll(gs, pc, playerId) {
    if (pc.rollsLeft <= 0) {
      return { state: gs, events: [], error: 'No rolls remaining. Score a category.' };
    }
    for (let i = 0; i < 5; i++) {
      if (!pc.kept[i]) pc.dice[i] = Math.floor(Math.random() * 6) + 1;
    }
    pc.rollsLeft--;
    return {
      state: gs,
      events: [{ event: 'rolled', data: { dice: [...pc.dice], rollsLeft: pc.rollsLeft } }],
    };
  }

  static _toggleKeep(gs, pc, playerId, payload) {
    const idx = payload?.index;
    if (idx === undefined || idx < 0 || idx > 4) {
      return { state: gs, events: [], error: 'Invalid die index.' };
    }
    if (pc.rollsLeft === 3) {
      return { state: gs, events: [], error: 'Roll the dice first.' };
    }
    if (pc.rollsLeft === 0) {
      return { state: gs, events: [], error: 'Must score a category — no more rolls.' };
    }
    pc.kept[idx] = !pc.kept[idx];
    return { state: gs, events: [{ event: 'toggle_keep', data: { index: idx, kept: pc.kept[idx] } }] };
  }

  static _scoreCategory(gs, pc, playerId, payload, players) {
    if (pc.rollsLeft === 3) {
      return { state: gs, events: [], error: 'Roll the dice before scoring.' };
    }
    const catId = payload?.category;
    if (!catId || !(catId in pc.scorecard)) {
      return { state: gs, events: [], error: 'Invalid category.' };
    }
    if (pc.scorecard[catId] !== null) {
      return { state: gs, events: [], error: 'Category already scored.' };
    }

    const score = Yacht.previewScore(pc.dice, catId);
    pc.scorecard[catId] = score;

    // Reset for next turn
    pc.dice      = [0, 0, 0, 0, 0];
    pc.kept      = [false, false, false, false, false];
    pc.rollsLeft = 3;

    return {
      state: gs,
      events: [{ event: 'scored', data: { category: catId, score } }],
      turnEnded: true,
    };
  }

  // ── isGameOver ────────────────────────────────────────────────────────
  static isGameOver(gs, players) {
    for (const p of players) {
      const pc = gs.playerCards[p.id];
      if (!pc) return false;
      if (Object.values(pc.scorecard).some(v => v === null)) return false;
    }
    return true;
  }

  // ── getFinalScores ────────────────────────────────────────────────────
  static getFinalScores(gs, players) {
    return players
      .map(p => {
        const pc = gs.playerCards[p.id];
        const score = pc ? Object.values(pc.scorecard).reduce((a, v) => a + (v ?? 0), 0) : 0;
        return { playerId: p.id, name: p.name, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  // ── getValidActions ───────────────────────────────────────────────────
  static getValidActions(gs, playerId) {
    const pc = gs.playerCards?.[playerId];
    if (!pc) return [];
    const actions = [];
    if (pc.rollsLeft > 0) actions.push('roll');
    if (pc.rollsLeft < 3 && pc.rollsLeft > 0) actions.push('toggle_keep');
    if (pc.rollsLeft < 3) actions.push('score_category');
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
      case 'scored': {
        const cat = Yacht.CATEGORIES.find(c => c.id === evt.data?.category);
        return `${name} scored ${cat?.label || evt.data?.category} → ${evt.data?.score} pts`;
      }
      case 'toggle_keep':
        return `${name} ${evt.data?.kept ? 'kept' : 'released'} a die`;
      case 'turn_skipped': {
        const skippedName = `<span class="log-name">${_esc(playerName)}</span>`;
        return `${skippedName}'s turn was skipped by the table`;
      }
      case 'game_started':
        return `Game started`;
      case 'game_finished':
        return `Game over`;
      default:
        return `${name}: ${_esc(evt.event)}`;
    }
  }

  // ── previewScore ──────────────────────────────────────────────────────
  // Pure scoring calculation — used client-side for previewing before committing.
  static previewScore(dice, catId) {
    if (!dice || dice.some(d => d === 0)) return 0; // not yet rolled

    const counts = [0, 0, 0, 0, 0, 0, 0]; // index 1–6
    let sum = 0;
    for (const d of dice) { counts[d]++; sum += d; }

    // Upper section
    if (catId in Yacht.FACE_MAP) {
      const face = Yacht.FACE_MAP[catId];
      return counts[face] * face;
    }

    switch (catId) {
      case 'choice':
        return sum;

      case 'yacht':
        return counts.some(c => c === 5) ? 50 : 0;

      case 'four_of_a_kind': {
        for (let f = 1; f <= 6; f++) {
          if (counts[f] >= 4) return f * 4;
        }
        return 0;
      }

      case 'full_house': {
        const hasThree = counts.some(c => c === 3);
        const hasTwo   = counts.some(c => c === 2);
        return hasThree && hasTwo ? sum : 0;
      }

      case 'little_straight': {
        const sorted = [...new Set(dice)].sort((a, b) => a - b);
        return JSON.stringify(sorted) === JSON.stringify([1,2,3,4,5]) ? 30 : 0;
      }

      case 'big_straight': {
        const sorted = [...new Set(dice)].sort((a, b) => a - b);
        return JSON.stringify(sorted) === JSON.stringify([2,3,4,5,6]) ? 30 : 0;
      }

      default:
        return 0;
    }
  }
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
