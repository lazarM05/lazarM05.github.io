import { describe, it, expect } from 'vitest';
import { buildGameData, checkEnd } from './game.js';

const entry = { cat: 'Animal', w: ['Lion', 'Tiger'] };
const players5 = ['A', 'B', 'C', 'D', 'E'];
const players7 = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

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

  it('computes maxCycles = n - 2 (eliminations needed for non-imposters to reach parity with 1 imposter)', () => {
    const G = buildGameData('imposter', players5, entry); // n=5
    expect(G.maxCycles).toBe(3);
  });
});

describe('buildGameData — imposter mode (multi-imposter)', () => {
  it('assigns exactly impCount imposters with no word; everyone else gets w[0]', () => {
    const G = buildGameData('imposter', players7, entry, 2); // n=7
    const imposters = G.players.filter(p => p.isImposter);
    expect(imposters).toHaveLength(2);
    for (const p of imposters) expect(p.word).toBeNull();
    const others = G.players.filter(p => !p.isImposter);
    expect(others).toHaveLength(5);
    for (const p of others) expect(p.word).toBe('Lion');
  });

  it('stores impCount on the game data', () => {
    const G = buildGameData('imposter', players7, entry, 2);
    expect(G.impCount).toBe(2);
  });

  it('computes maxCycles = n - 2*impCount', () => {
    const G = buildGameData('imposter', players7, entry, 2); // n=7
    expect(G.maxCycles).toBe(3); // 7 - 2*2 = 3
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

  it('computes maxCycles = n - 2*ckCount (eliminations needed for non-cuckoos to reach parity with the cuckoos)', () => {
    const players = Array.from({ length: 6 }, (_, i) => `P${i}`); // n=6, default ckCount=2
    const G = buildGameData('cuckoo', players, entry);
    expect(G.maxCycles).toBe(2); // 6 - 2*2 = 2
  });

  it('gives cuckoos w[1] and everyone else w[0]', () => {
    const G = buildGameData('cuckoo', players5, entry);
    for (const p of G.players) {
      expect(p.word).toBe(p.isCuckoo ? 'Tiger' : 'Lion');
    }
  });
});

describe('buildGameData — cuckoo mode (explicit count)', () => {
  it('assigns exactly count cuckoos with w[1]; everyone else gets w[0]', () => {
    const G = buildGameData('cuckoo', players7, entry, 3); // n=7
    const cuckoos = G.players.filter(p => p.isCuckoo);
    expect(cuckoos).toHaveLength(3);
    for (const p of cuckoos) expect(p.word).toBe('Tiger');
    const others = G.players.filter(p => !p.isCuckoo);
    expect(others).toHaveLength(4);
    for (const p of others) expect(p.word).toBe('Lion');
  });

  it('stores numCk on the game data', () => {
    const G = buildGameData('cuckoo', players7, entry, 3);
    expect(G.numCk).toBe(3);
  });

  it('computes maxCycles = n - 2*ckCount', () => {
    const G = buildGameData('cuckoo', players7, entry, 3); // n=7
    expect(G.maxCycles).toBe(1); // 7 - 2*3 = 1
  });

  it('falls back to the 1:3 ratio default when no count is given', () => {
    const G = buildGameData('cuckoo', players7, entry); // n=7, no count arg
    expect(G.numCk).toBe(2); // Math.max(1, Math.floor(7/3)) = 2
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

describe('checkEnd — imposter mode (multi-imposter)', () => {
  it('continue when eliminations so far leave impLeft < nonImpLeft', () => {
    const G = buildGameData('imposter', players7, entry, 2); // 5 non-imposters, 2 imposters
    G.players.filter(p => !p.isImposter).slice(0, 1).forEach(p => (p.eliminated = true)); // 4 non-imp left
    expect(checkEnd(G)).toBe('continue');
  });

  it('imposter_wins when impLeft >= nonImpLeft', () => {
    const G = buildGameData('imposter', players7, entry, 2); // 5 non-imposters, 2 imposters
    G.players.filter(p => !p.isImposter).slice(0, 3).forEach(p => (p.eliminated = true)); // 2 non-imp left, 2 imp left
    expect(checkEnd(G)).toBe('imposter_wins');
  });

  it('players_win when all imposters are eliminated', () => {
    const G = buildGameData('imposter', players7, entry, 2);
    G.players.filter(p => p.isImposter).forEach(p => (p.eliminated = true));
    expect(checkEnd(G)).toBe('players_win');
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
