import { ALL_WORDS, ALL_CATS } from './words.js';
import { rnd } from './utils.js';
import { buildGameData, checkEnd } from './game.js';

// ==================== STATE ====================
let mode = null;
let players = [];
let opts = {};
let activeCats = new Set(ALL_CATS); // all on by default
let G = {};
let peekIdx = 0, peekUnlocked = false;
let selectedVoteIdx = null;

// ==================== NAV ====================
export function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}
export function goHome() { show('home-screen'); }
export function goSetup() { buildSetup(); show('setup-screen'); }
export function selectMode(m) {
  mode = m;
  if (!players.length) initPlayers();
  buildSetup();
  show('setup-screen');
}
export function restartSame() { buildSetup(); show('setup-screen'); }

// ==================== PLAYERS ====================
export function initPlayers() { players = ['Player 1', 'Player 2', 'Player 3']; }

function renderPlayers() {
  const list = document.getElementById('player-list');
  list.innerHTML = '';
  players.forEach((name, i) => {
    const row = document.createElement('div');
    row.className = 'player-row';
    const init = name.trim() ? name.trim()[0].toUpperCase() : '?';
    row.innerHTML = `<div class="p-av" id="pav-${i}">${init}</div>
      <input class="p-ni" value="${name}" placeholder="Player name"
        onfocus="this.select()" oninput="updatePlayerName(${i}, this.value)">
      <button class="rm-btn" onclick="removePlayer(${i})">✕</button>`;
    list.appendChild(row);
  });
  renderImpCountBlock();
  renderCkCountBlock();
  refreshInfo();
}

// 1:3 imposter/cuckoo-to-player ratio cap — shared by both modes' count controls.
function impCountCap(n) { return Math.max(1, Math.floor(n / 3)); }

function renderImpCountBlock() {
  const block = document.getElementById('imp-count-block');
  if (mode !== 'imposter') {
    block.style.display = 'none';
    return;
  }
  block.style.display = 'block';
  const n = players.length;
  const cap = impCountCap(n);
  const input = document.getElementById('opt-imp-count');
  const auto = document.getElementById('opt-imp-auto');
  input.min = 1;
  input.max = cap;
  if (auto.checked) {
    input.value = cap;
    input.disabled = true;
  } else {
    input.disabled = false;
    let v = parseInt(input.value, 10);
    if (isNaN(v)) v = 1;
    input.value = Math.min(Math.max(1, v), cap);
  }
}

export function onImpAutoToggle() { renderImpCountBlock(); refreshInfo(); }
export function onImpCountInput(value) {
  const cap = impCountCap(players.length);
  let v = parseInt(value, 10);
  if (isNaN(v)) v = 1;
  document.getElementById('opt-imp-count').value = Math.min(Math.max(1, v), cap);
  refreshInfo();
}

function renderCkCountBlock() {
  const block = document.getElementById('ck-count-block');
  if (mode !== 'cuckoo') {
    block.style.display = 'none';
    return;
  }
  block.style.display = 'block';
  const n = players.length;
  const cap = impCountCap(n);
  const input = document.getElementById('opt-ck-count');
  const auto = document.getElementById('opt-ck-auto');
  input.min = 1;
  input.max = cap;
  if (auto.checked) {
    input.value = cap;
    input.disabled = true;
  } else {
    input.disabled = false;
    let v = parseInt(input.value, 10);
    if (isNaN(v)) v = 1;
    input.value = Math.min(Math.max(1, v), cap);
  }
}

export function onCkAutoToggle() { renderCkCountBlock(); refreshInfo(); }
export function onCkCountInput(value) {
  const cap = impCountCap(players.length);
  let v = parseInt(value, 10);
  if (isNaN(v)) v = 1;
  document.getElementById('opt-ck-count').value = Math.min(Math.max(1, v), cap);
  refreshInfo();
}

export function addPlayer() {
  players.push('Player ' + (players.length + 1));
  renderPlayers();
}
export function removePlayer(i) {
  if (players.length <= 2) return;
  players.splice(i, 1);
  renderPlayers();
}

// Extracted from the original inline `oninput` string — that string runs in
// global scope and can't close over this module's `players` variable, so the
// name-edit + avatar-refresh logic moves into an exported function instead.
export function updatePlayerName(i, value) {
  players[i] = value;
  const av = document.getElementById(`pav-${i}`);
  if (av) av.textContent = value.trim() ? value.trim()[0].toUpperCase() : '?';
  refreshInfo();
}

function refreshInfo() {
  const n = players.length;
  if (mode === 'imposter') {
    const impCountEl = document.getElementById('opt-imp-count');
    const impCount = impCountEl ? (parseInt(impCountEl.value, 10) || 1) : 1;
    const maxCycles = n - 2 * impCount;
    document.getElementById('setup-info').innerHTML =
      `<strong>How it works:</strong> ${impCount > 1 ? `${impCount} players are Imposters` : 'One player is the Imposter'} — they get no word, just the category (if enabled). Everyone gives associations each cycle. Each cycle, vote to eliminate someone or skip. Players win by eliminating all Imposters. Imposters win if their count equals or exceeds the remaining regular (non-Imposter) players, or if they correctly guess the word out loud. With ${n} players and ${impCount} imposter${impCount > 1 ? 's' : ''}: up to <strong>${maxCycles} cycle${maxCycles !== 1 ? 's' : ''}</strong>.`;
  } else {
    const ckCountEl = document.getElementById('opt-ck-count');
    const c = ckCountEl ? (parseInt(ckCountEl.value, 10) || 1) : Math.max(1, Math.floor(n / 3));
    const maxCycles = n - 2 * c;
    document.getElementById('setup-info').innerHTML =
      `<strong>How it works:</strong> Everyone gets a word. <strong>${c} cuckoo${c > 1 ? 's' : ''}</strong> get a similar-but-different word and may not know it. Vote each cycle — person with most votes is out. Players win by eliminating all cuckoos before they are outnumbered. Cuckoos win if their count equals or exceeds remaining regular players. With ${n} players: up to <strong>${maxCycles} cycle${maxCycles !== 1 ? 's' : ''}</strong>.`;
  }
}

// ==================== CAT FILTER ====================
function renderCatFilter() {
  const cf = document.getElementById('cat-filter');
  cf.innerHTML = '';
  const isCk = mode === 'cuckoo';
  ALL_CATS.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'cat-chip' + (activeCats.has(cat) ? ' active' : '') + (isCk ? ' teal' : '');
    chip.textContent = cat;
    chip.onclick = () => {
      if (activeCats.has(cat)) {
        if (activeCats.size > 1) activeCats.delete(cat);
      } else activeCats.add(cat);
      renderCatFilter();
    };
    cf.appendChild(chip);
  });
}

// ==================== SETUP ====================
function buildSetup() {
  const isI = mode === 'imposter';
  document.getElementById('setup-mode-lbl').textContent = isI ? 'STANDARD' : 'CUCKOO';
  document.getElementById('setup-mode-lbl').className = 'gml ' + mode;
  document.getElementById('start-btn').className = 'btn-p' + (isI ? '' : ' teal');
  renderCatFilter();
  const ol = document.getElementById('options-list');
  ol.innerHTML = '';
  if (isI) {
    addToggle(ol, 'opt-cat', 'Show Category to Imposter', 'e.g. "Food", "Animal" — vague, not the word', true);
    document.getElementById('opt-imp-auto').checked = true;
  } else {
    addToggle(ol, 'opt-cat-ck', 'Show Category on Cards', "Show the word category on each player's card", true);
    document.getElementById('opt-ck-auto').checked = true;
  }
  addToggle(ol, 'opt-live-stats', 'Show Live Remaining Counts', 'Off = panel shows the starting numbers all game. On = counts update live each cycle.', false);
  renderPlayers();
}

function addToggle(parent, id, label, desc, checked) {
  const r = document.createElement('div');
  r.className = 'toggle-row';
  r.innerHTML = `<div><div class="tl">${label}</div><div class="td">${desc}</div></div>
    <label class="toggle"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><div class="ttrack"></div></label>`;
  parent.appendChild(r);
}

// ==================== PEEK ====================
export function goToPeek() {
  const names = players.map(p => p.trim()).filter(Boolean);
  if (names.length < 3) {
    document.getElementById('err-msg').textContent = 'Need at least 3 players!';
    return;
  }
  document.getElementById('err-msg').textContent = '';
  players = names;
  opts = {
    showCatImp: document.getElementById('opt-cat') ? document.getElementById('opt-cat').checked : false,
    showCatCk: document.getElementById('opt-cat-ck') ? document.getElementById('opt-cat-ck').checked : true,
    liveStats: document.getElementById('opt-live-stats') ? document.getElementById('opt-live-stats').checked : false,
  };
  const pool = ALL_WORDS.filter(w => activeCats.has(w.cat));
  const entry = pool[rnd(pool.length)];
  const countInputId = mode === 'imposter' ? 'opt-imp-count' : 'opt-ck-count';
  const countEl = document.getElementById(countInputId);
  const count = countEl ? (parseInt(countEl.value, 10) || 1) : undefined;
  G = buildGameData(mode, players, entry, count);
  peekIdx = 0;
  peekUnlocked = false;
  document.getElementById('peek-mode-lbl').textContent = mode === 'imposter' ? 'STANDARD' : 'CUCKOO';
  document.getElementById('peek-mode-lbl').className = 'gml ' + mode;
  renderPeekProgress();
  renderPeekCard();
  show('peek-screen');
}

function renderPeekProgress() {
  const prog = document.getElementById('pk-prog');
  prog.innerHTML = '';
  G.players.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'pk-dot' + (i < peekIdx ? ' done' : i === peekIdx ? ' current' : '');
    prog.appendChild(d);
  });
}

function renderPeekCard() {
  const p = G.players[peekIdx];
  const isLast = peekIdx === G.players.length - 1;
  const card = document.getElementById('peek-card');
  if (!peekUnlocked) {
    card.innerHTML = `<div class="pk-name">${p.name}</div>
      <div class="pk-inst">Pass the phone to <strong>${p.name}</strong></div>
      <div class="pk-box"><div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <div class="pk-lock">🔒</div><div class="pk-lock-txt">Word hidden — tap below to reveal</div>
      </div></div>`;
    document.getElementById('pk-unlock-btn').style.display = 'block';
    document.getElementById('pk-next-btn').style.display = 'none';
  } else {
    let wordHTML = '';
    if (mode === 'imposter') {
      if (p.isImposter) {
        wordHTML = `<div class="pk-badge imp">IMPOSTER</div>`;
        if (opts.showCatImp) wordHTML += `<div class="pk-cat">${G.entry.cat}</div>`;
        wordHTML += `<div style="font-size:.75rem;color:var(--muted);margin-top:4px">You have no word. Bluff carefully.</div>`;
      } else {
        wordHTML = `<div class="pk-word">${p.word}</div><div class="pk-cat">${G.entry.cat}</div>`;
      }
    } else {
      wordHTML = `<div class="pk-word">${p.word}</div>`;
      if (opts.showCatCk) wordHTML += `<div class="pk-cat">${G.entry.cat}</div>`;
    }
    card.innerHTML = `<div class="pk-name">${p.name}</div>
      <div class="pk-inst">Memorise your word, then pass the phone.</div>
      <div class="pk-box">${wordHTML}</div>`;
    document.getElementById('pk-unlock-btn').style.display = 'none';
    const nb = document.getElementById('pk-next-btn');
    nb.style.display = 'block';
    nb.textContent = isLast ? '🎮 START GAME' : 'DONE → Pass to next player';
    nb.className = 'pk-btn-next' + (isLast ? ' last' : '');
  }
}

export function unlockPeek() { peekUnlocked = true; renderPeekCard(); }
export function peekNext() {
  peekIdx++;
  if (peekIdx >= G.players.length) {
    show('game-screen');
    renderGame();
  } else {
    peekUnlocked = false;
    renderPeekProgress();
    renderPeekCard();
  }
}

// ==================== GAME RENDER ====================
function renderGame() {
  const isI = G.mode === 'imposter';
  document.getElementById('game-mode-lbl').textContent = isI ? 'STANDARD' : 'CUCKOO';
  document.getElementById('game-mode-lbl').className = 'gml ' + G.mode;
  renderStatus();
  renderCycleBar();
  renderCards();
  renderPhaseUI();
}

function renderStatus() {
  const bar = document.getElementById('status-bar');
  const n = G.players.length;
  const noteHTML = `<div class="stat-note">${opts.liveStats ? 'LIVE' : 'AT THE START'}</div>`;
  if (G.mode === 'imposter') {
    const startingPl = n - G.impCount;
    const activePl = G.players.filter(p => !p.isImposter && !p.eliminated).length;
    const plVal = opts.liveStats ? `${activePl}/${startingPl}` : `${startingPl}`;
    const impAlive = G.players.filter(p => p.isImposter && !p.eliminated).length;
    const impVal = opts.liveStats ? `${impAlive}/${G.impCount}` : `${G.impCount}`;
    const impLbl = G.impCount > 1 ? 'Imposters' : 'Imposter';
    bar.innerHTML = `<div class="stat"><div class="stat-val sv-y">${plVal}</div><div class="stat-lbl">Players</div></div>
      <div class="sdiv"></div>
      <div class="stat"><div class="stat-val sv-r">${impVal}</div><div class="stat-lbl">${impLbl}</div></div>
      <div class="sdiv"></div>
      <div class="stat"><div class="stat-val sv-p">${G.entry.cat}</div><div class="stat-lbl">Category</div></div>
      <div class="sdiv"></div>
      <div class="stat"><div class="stat-val sv-y">${G.cycle}</div><div class="stat-lbl">Cycle</div></div>
      ${noteHTML}`;
  } else {
    const startingPl = n - G.numCk;
    const activePl = G.players.filter(p => !p.isCuckoo && !p.eliminated).length;
    const plVal = opts.liveStats ? `${activePl}/${startingPl}` : `${startingPl}`;
    const startingCk = G.numCk;
    const activeCk = G.players.filter(p => p.isCuckoo && !p.eliminated).length;
    const ckVal = opts.liveStats ? `${activeCk}/${startingCk}` : `${startingCk}`;
    bar.innerHTML = `<div class="stat"><div class="stat-val sv-y">${plVal}</div><div class="stat-lbl">Players</div></div>
      <div class="sdiv"></div>
      <div class="stat"><div class="stat-val sv-t">${ckVal}</div><div class="stat-lbl">Cuckoos</div></div>
      <div class="sdiv"></div>
      <div class="stat"><div class="stat-val sv-p">${G.entry.cat}</div><div class="stat-lbl">Category</div></div>
      <div class="sdiv"></div>
      <div class="stat"><div class="stat-val sv-y">${G.cycle}/${G.maxCycles}</div><div class="stat-lbl">Cycle</div></div>
      ${noteHTML}`;
  }
}

function renderCycleBar() {
  const bar = document.getElementById('cycle-bar');
  bar.style.display = 'flex';
  const dots = document.getElementById('cycle-dots');
  dots.innerHTML = '';
  for (let i = 1; i <= G.maxCycles; i++) {
    const d = document.createElement('div');
    d.className = 'cdot' + (i < G.cycle ? ' done' : i === G.cycle ? ' current' : '');
    dots.appendChild(d);
  }
}

function renderCards() {
  const grid = document.getElementById('cards-grid');
  grid.innerHTML = '';
  const isVoting = G.phase === 'play';
  G.players.forEach((p, i) => {
    const card = document.createElement('div');
    let cls = 'gp-card';
    if (p.eliminated) cls += ' eliminated';
    else if (isVoting) cls += ' clickable';
    if (isVoting && !p.eliminated && selectedVoteIdx === i) cls += ' selected-vote';
    card.className = cls;
    const init = p.name[0].toUpperCase();
    let content = '';
    if (p.eliminated) {
      content = `<div class="elim-x">❌</div><div class="gp-cover">OUT</div>`;
    } else if (isVoting) {
      content = `<div class="gp-cover" style="background:${selectedVoteIdx === i ? 'rgba(251,191,36,.15)' : 'var(--border)'};border-radius:8px;padding:7px 8px;font-size:.75rem;color:${selectedVoteIdx === i ? 'var(--yellow)' : 'var(--muted)'};letter-spacing:1px;display:flex;align-items:center;justify-content:center">
        ${selectedVoteIdx === i ? '✓ SELECTED' : 'TAP TO VOTE'}
      </div>`;
    } else {
      content = `<div class="gp-cover">🔒 Hidden</div>`;
    }
    card.innerHTML = `<div class="gp-av">${init}</div><div class="gp-name">${p.name}</div>${content}`;
    if (isVoting && !p.eliminated) { card.onclick = () => selectVote(i); }
    grid.appendChild(card);
  });
}

// ==================== PHASE UI ====================
function renderPhaseUI() {
  document.getElementById('vote-panel').style.display = 'none';
  document.getElementById('reveal-panel').style.display = 'none';
  selectedVoteIdx = null;

  if (G.phase === 'play') {
    document.getElementById('vote-panel').style.display = 'block';
    document.getElementById('vote-title').textContent =
      G.mode === 'imposter' ? '🗳️ WHO IS THE IMPOSTER?' : '🗳️ WHO IS THE CUCKOO?';
    document.getElementById('vote-confirm-btn').classList.remove('ready');
    document.getElementById('vote-hint').textContent = 'Tap a name to select. Tap another to change your mind.';
    document.getElementById('skip-vote-btn').style.display = G.mode === 'imposter' ? 'block' : 'none';
    document.getElementById('guess-btn').style.display = G.mode === 'imposter' ? 'block' : 'none';
  }
}

// ==================== VOTE ====================
export function skipVote() {
  G.cycle++;
  G.phase = 'play';
  renderGame();
}
function selectVote(idx) {
  selectedVoteIdx = idx;
  renderCards();
  document.getElementById('vote-confirm-btn').classList.add('ready');
  document.getElementById('vote-hint').textContent = `Selected: ${G.players[idx].name}. Tap another to change.`;
}
export function confirmElimination() {
  if (selectedVoteIdx === null) return;
  G.players[selectedVoteIdx].eliminated = true;
  G.phase = 'play';

  const result = checkEnd(G);
  if (result === 'continue') {
    G.cycle++;
    renderGame();
  } else {
    triggerFinalReveal(result);
  }
}

export function imposterGuessedWord() { triggerFinalReveal('imposter_guessed'); }

// ==================== REVEAL ====================
function triggerFinalReveal(result) {
  G._endResult = result;
  G.phase = 'reveal';
  document.getElementById('vote-panel').style.display = 'none';
  renderCards();
  renderStatus();

  const rp = document.getElementById('reveal-panel');
  rp.style.display = 'block';

  let title = '🎭 END OF GAME';
  let sub = '';
  if (result === 'players_win') sub = 'The right person was eliminated. Tap "See Results" to reveal everyone\'s words.';
  else if (result === 'imposter_wins') sub = 'The wrong person was eliminated — the imposter survived. Tap "See Results" to see the truth.';
  else if (result === 'imposter_guessed') sub = 'The Imposter correctly guessed the word! Tap "See Results" to see the truth.';
  else if (result === 'cuckoo_wins') sub = 'The cuckoos blended in long enough. Tap "See Results" to reveal who was who.';
  else if (result === 'tied') sub = 'The vote was tied — no one was eliminated. The game ends here. Tap "See Results" to reveal.';
  else sub = 'Tap "See Results" to reveal everyone\'s words.';

  document.getElementById('reveal-title').textContent = title;
  document.getElementById('reveal-sub').textContent = sub;
}

// ==================== GAME OVER ====================
export function showGameOver() {
  const result = G._endResult;
  show('go-screen');
  const icons = { players_win: '🏆', imposter_wins: '🕵️', imposter_guessed: '🎯', cuckoo_wins: '🐦', no_result: '🎭', tied: '🤝' };
  const titles = { players_win: 'PLAYERS WIN!', imposter_wins: 'IMPOSTER WINS!', imposter_guessed: 'IMPOSTER WINS!', cuckoo_wins: 'CUCKOOS WIN!', no_result: 'ROUND OVER', tied: 'TIED VOTE' };
  const colors = { players_win: 'var(--teal)', imposter_wins: 'var(--accent)', imposter_guessed: 'var(--accent)', cuckoo_wins: 'var(--teal)', no_result: 'var(--purple)', tied: 'var(--yellow)' };
  document.getElementById('go-icon').textContent = icons[result] || '🎭';
  document.getElementById('go-title').textContent = titles[result] || 'GAME OVER';
  document.getElementById('go-title').style.color = colors[result] || 'var(--text)';
  document.getElementById('go-sub').textContent = `After ${G.cycle} cycle${G.cycle !== 1 ? 's' : ''} with ${G.players.length} players.`;
  const imps = G.mode === 'imposter' ? G.players.filter(p => p.isImposter) : [];
  const cks = G.mode === 'cuckoo' ? G.players.filter(p => p.isCuckoo) : [];
  let rows = `<div class="dr"><span class="dk">Mode</span><span class="dv">${G.mode === 'imposter' ? 'Standard' : 'Cuckoo'}</span></div>
    <div class="dr"><span class="dk">Category</span><span class="dv">${G.entry.cat}</span></div>
    <div class="dr"><span class="dk">Players' word</span><span class="dv">${G.entry.w[0]}</span></div>`;
  if (G.mode === 'imposter') {
    rows += `<div class="dr"><span class="dk">${imps.length > 1 ? 'Imposters were' : 'Imposter was'}</span><span class="dv">${imps.map(p => p.name).join(', ')}</span></div>`;
  } else {
    rows += `<div class="dr"><span class="dk">Cuckoo word</span><span class="dv">${G.entry.w[1]}</span></div>
      <div class="dr"><span class="dk">Cuckoos were</span><span class="dv">${cks.map(p => p.name).join(', ')}</span></div>`;
  }
  rows += `<div class="dr"><span class="dk">Cycles played</span><span class="dv">${G.cycle}</span></div>`;
  document.getElementById('go-det').innerHTML = rows;

  const pr = document.getElementById('go-player-reveal');
  let prHTML = '';
  G.players.forEach(p => {
    const isCk = G.mode === 'cuckoo' && p.isCuckoo;
    const isImp = G.mode === 'imposter' && p.isImposter;
    const wordDisplay = isImp ? '—' : p.word;
    const badge = isCk
      ? `<span style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:2px 8px;border-radius:99px;background:rgba(45,212,191,.2);color:var(--teal);border:1px solid var(--teal)">CUCKOO</span>`
      : isImp
      ? `<span style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:2px 8px;border-radius:99px;background:rgba(232,68,90,.2);color:var(--accent);border:1px solid var(--accent)">IMPOSTER</span>`
      : `<span style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:2px 8px;border-radius:99px;background:transparent;color:var(--muted);border:1px solid var(--border)">PLAYER</span>`;
    prHTML += `<div class="dr"><span class="dk" style="font-weight:800;color:var(--text)">${p.name}${p.eliminated ? ' ❌' : ''}</span>
      <span style="display:flex;align-items:center;gap:6px"><span style="font-weight:700;color:${isCk ? 'var(--teal)' : 'var(--yellow)'}">${wordDisplay}</span>${badge}</span></div>`;
  });
  pr.innerHTML = prHTML;
}
