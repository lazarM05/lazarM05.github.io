// Pure game-state logic — no DOM access. Safe to unit test in isolation.
import { rnd, shuffle } from './utils.js';

export function buildGameData(mode, players, entry) {
  const n = players.length;
  if (mode === 'imposter') {
    const impIdx = rnd(n);
    return {
      mode: 'imposter',
      entry,
      players: players.map((name, i) => ({
        name,
        isImposter: i === impIdx,
        eliminated: false,
        word: i === impIdx ? null : entry.w[0],
      })),
      cycle: 1,
      phase: 'play',
      _endResult: null,
    };
  }

  const numCk = Math.max(1, Math.floor(n / 3));
  const idxs = shuffle([...Array(n).keys()]);
  const ckSet = new Set(idxs.slice(0, numCk));
  const stopAt = Math.ceil(n / 2);
  return {
    mode: 'cuckoo',
    entry,
    numCk,
    stopAt,
    maxCycles: n - stopAt,
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
    const imp = G.players.find(p => p.isImposter && p.eliminated);
    return imp ? 'players_win' : 'imposter_wins';
  }
  const ckLeft = G.players.filter(p => p.isCuckoo && !p.eliminated).length;
  const plLeft = G.players.filter(p => !p.isCuckoo && !p.eliminated).length;
  if (ckLeft === 0) return 'players_win';
  if (ckLeft >= plLeft) return 'cuckoo_wins';
  return 'continue';
}
