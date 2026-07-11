// Pure game-state logic — no DOM access. Safe to unit test in isolation.
import { shuffle } from './utils.js';

export function buildGameData(mode, players, entry, count) {
  const n = players.length;
  if (mode === 'imposter') {
    const impCount = count || 1;
    const idxs = shuffle([...Array(n).keys()]);
    const impSet = new Set(idxs.slice(0, impCount));
    return {
      mode: 'imposter',
      entry,
      impCount,
      maxCycles: n - 2 * impCount,
      players: players.map((name, i) => ({
        name,
        isImposter: impSet.has(i),
        eliminated: false,
        word: impSet.has(i) ? null : entry.w[0],
      })),
      cycle: 1,
      phase: 'play',
      _endResult: null,
    };
  }

  const ckCount = count || Math.max(1, Math.floor(n / 3));
  const idxs = shuffle([...Array(n).keys()]);
  const ckSet = new Set(idxs.slice(0, ckCount));
  return {
    mode: 'cuckoo',
    entry,
    numCk: ckCount,
    maxCycles: n - 2 * ckCount,
    players: players.map((name, i) => ({
      name,
      isCuckoo: ckSet.has(i),
      eliminated: false,
      word: ckSet.has(i) ? entry.w[1] : entry.w[0],
    })),
    cycle: 1,
    phase: 'play',
    _endResult: null,
  };
}

export function checkEnd(G) {
  if (G.mode === 'imposter') {
    const impLeft = G.players.filter(p => p.isImposter && !p.eliminated).length;
    const nonImpLeft = G.players.filter(p => !p.isImposter && !p.eliminated).length;
    if (impLeft === 0) return 'players_win';
    if (impLeft >= nonImpLeft) return 'imposter_wins';
    return 'continue';
  }
  const ckLeft = G.players.filter(p => p.isCuckoo && !p.eliminated).length;
  const plLeft = G.players.filter(p => !p.isCuckoo && !p.eliminated).length;
  if (ckLeft === 0) return 'players_win';
  if (ckLeft >= plLeft) return 'cuckoo_wins';
  return 'continue';
}
