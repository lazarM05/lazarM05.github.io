import { describe, it, expect } from 'vitest';
import { buildGameData, checkEnd } from './game.js';

const entry = { cat: 'Animal', w: ['Lion', 'Tiger'] };
const players5 = ['A', 'B', 'C', 'D', 'E'];

describe('buildGameData — imposter mode', () => {
  it('assigns exactly one imposter with no word; everyone else gets w[0]', () => {
    const G = buildGameData('imposter', players5, entry);
    const imposters = G.players.filter(p => p.isImposter);
    expect(imposters).toHaveLength(1);
    expect(imposters[0].word).toBeNull();
    const others = G.players.filter(p => !p.isImposter);
    expect(others).toHaveLength(4);
    for (const p of others) expect(p.word).toBe('Lion');
  });

  it('starts at cycle 1, phase play, no end result', () => {
    const G = buildGameData('imposter', players5, entry);
    expect(G.cycle).toBe(1);
    expect(G.phase).toBe('play');
    expect(G._endResult).toBeNull();
  });
});

describe('buildGameData — cuckoo mode', () => {
  it('follows the 1:3 cuckoo ratio table from the GDD', () => {
    const cases = [
      { n: 5, expectedCk: 1 },
      { n: 6, expectedCk: 2 },
      { n: 9, expectedCk: 3 },
      { n: 12, expectedCk: 4 },
    ];
    for (const { n, expectedCk } of cases) {
      const players = Array.from({ length: n }, (_, i) => `P${i}`);
      const G = buildGameData('cuckoo', players, entry);
      expect(G.numCk).toBe(expectedCk);
    }
  });

  it('computes maxCycles = n - ceil(n/2)', () => {
    const players = Array.from({ length: 6 }, (_, i) => `P${i}`);
    const G = buildGameData('cuckoo', players, entry);
    expect(G.maxCycles).toBe(3);
  });

  it('gives cuckoos w[1] and everyone else w[0]', () => {
    const G = buildGameData('cuckoo', players5, entry);
    for (const p of G.players) {
      expect(p.word).toBe(p.isCuckoo ? 'Tiger' : 'Lion');
    }
  });
});

describe('checkEnd — imposter mode', () => {
  it('players_win when the eliminated player was the imposter', () => {
    const G = buildGameData('imposter', players5, entry);
    const imp = G.players.find(p => p.isImposter);
    imp.eliminated = true;
    expect(checkEnd(G)).toBe('players_win');
  });

  it('continue when a regular player is eliminated but more than 1 non-imposter remains', () => {
    const G = buildGameData('imposter', players5, entry); // 4 non-imposters
    const notImp = G.players.find(p => !p.isImposter);
    notImp.eliminated = true; // 3 non-imposters left
    expect(checkEnd(G)).toBe('continue');
  });

  it('imposter_wins when non-imposters remaining drops to the imposter count (1)', () => {
    const G = buildGameData('imposter', players5, entry); // 4 non-imposters
    G.players.filter(p => !p.isImposter).slice(0, 3).forEach(p => (p.eliminated = true)); // 1 left
    expect(checkEnd(G)).toBe('imposter_wins');
  });
});

describe('checkEnd — cuckoo mode', () => {
  it('players_win when all cuckoos are eliminated', () => {
    const G = buildGameData('cuckoo', players5, entry); // 1 cuckoo at n=5
    G.players.filter(p => p.isCuckoo).forEach(p => (p.eliminated = true));
    expect(checkEnd(G)).toBe('players_win');
  });

  it('cuckoo_wins when remaining cuckoos >= remaining regular players', () => {
    const G = buildGameData('cuckoo', players5, entry); // 1 cuckoo, 4 regular
    // eliminate 3 of the 4 regular players, leaving 1 regular vs 1 cuckoo
    G.players.filter(p => !p.isCuckoo).slice(0, 3).forEach(p => (p.eliminated = true));
    expect(checkEnd(G)).toBe('cuckoo_wins');
  });

  it('continue when neither end condition is met', () => {
    const G = buildGameData('cuckoo', players5, entry);
    expect(checkEnd(G)).toBe('continue');
  });
});
