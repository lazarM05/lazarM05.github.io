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
  document.body.dataset.mode = m;
  if (!players.length) initPlayers();
  buildSetup();
  show('setup-screen');
}
// Re-picks a word from the same active category pool and reshuffles roles,
// skipping Setup entirely — players go straight back to Peek for the new round.
export function playAgain() {
  const pool = ALL_WORDS.filter(w => activeCats.has(w.cat));
  const entry = pool[rnd(pool.length)];
  const count = mode === 'cuckoo' ? G.numCk : G.impCount;
  G = buildGameData(mode, players, entry, count);
  peekIdx = 0;
  peekUnlocked = false;
  document.getElementById('peek-mode-lbl').textContent = { imposter: 'STANDARD', cuckoo: 'CUCKOO', reverse: 'REVERSE' }[mode];
  renderPeekProgress();
  renderPeekCard();
  show('peek-screen');
}

// ==================== PLAYERS ====================
export function initPlayers() { players = ['Player 3', 'Player 2', 'Player 1']; }

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

// Briefly flashes a "N players max" message next to a count input's Auto toggle.
// Keyed by the error span's id so each mode's timer is tracked independently.
const countErrTimers = {};
function flashCountError(errId, cap) {
  const el = document.getElementById(errId);
  el.textContent = `${cap} players max`;
  el.classList.add('show');
  clearTimeout(countErrTimers[errId]);
  countErrTimers[errId] = setTimeout(() => el.classList.remove('show'), 2000);
}

function renderImpCountBlock() {
  const block = document.getElementById('imp-count-block');
  if (mode !== 'imposter' && mode !== 'reverse') {
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
  } else {
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
  if (v > cap) flashCountError('opt-imp-count-err', cap);
  document.getElementById('opt-imp-count').value = Math.min(Math.max(1, v), cap);
  refreshInfo();
}
export function onImpCountFocus(el) {
  const auto = document.getElementById('opt-imp-auto');
  if (auto.checked) {
    auto.checked = false;
    renderImpCountBlock();
  }
  el.select();
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
  } else {
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
  if (v > cap) flashCountError('opt-ck-count-err', cap);
  document.getElementById('opt-ck-count').value = Math.min(Math.max(1, v), cap);
  refreshInfo();
}
export function onCkCountFocus(el) {
  const auto = document.getElementById('opt-ck-auto');
  if (auto.checked) {
    auto.checked = false;
    renderCkCountBlock();
  }
  el.select();
}

export function addPlayer() {
  players.unshift('Player ' + (players.length + 1));
  renderPlayers();
}
export function removePlayer(i) {
  if (players.length <= 3) return;
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
  } else if (mode === 'reverse') {
    const impCountEl = document.getElementById('opt-imp-count');
    const impCount = impCountEl ? (parseInt(impCountEl.value, 10) || 1) : 1;
    document.getElementById('setup-info').innerHTML =
      `<strong>How it works:</strong> ${impCount > 1 ? `${impCount} players are Imposters` : 'One player is the Imposter'} and know the secret word — everyone else only gets a hint. Imposters invent misleading hints to steer the group away. The team shares <strong>3 word guesses</strong> and <strong>${impCount} vote-out attempt${impCount > 1 ? 's' : ''}</strong> for the whole game, usable any time. Players win by guessing the word or voting out all Imposters. Imposters win by surviving <strong>${n} cycles</strong> or making the team run out of guesses.`;
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
  ALL_CATS.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'cat-chip' + (activeCats.has(cat) ? ' active' : '');
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
// Options-panel toggles get destroyed and rebuilt from scratch on every buildSetup()
// call (mode switch, End Game, Play Again). toggleState persists their checked value
// across those rebuilds for the lifetime of the session — a page reload clears it,
// since it's just an in-memory module var, which is the reset-on-leave behavior we want.
const toggleState = {};

function buildSetup() {
  const isI = mode === 'imposter';
  const isR = mode === 'reverse';
  const labelMap = { imposter: 'STANDARD', cuckoo: 'CUCKOO', reverse: 'REVERSE' };
  document.getElementById('setup-mode-lbl').textContent = labelMap[mode];
  renderCatFilter();
  const ol = document.getElementById('options-list');
  ol.innerHTML = '';
  if (isI) {
    addToggle(ol, 'opt-cat', 'Show Category to Imposter', 'e.g. "Food", "Animal" — vague, not the word', true);
  } else if (!isR) {
    addToggle(ol, 'opt-cat-ck', 'Show Category on Cards', "Show the word category on each player's card", true);
  }
  addToggle(ol, 'opt-live-stats', 'Show Live Remaining Counts', 'Off = panel shows the starting numbers all game. On = counts update live each cycle.', false);
  if (isR) {
    addToggle(ol, 'opt-imp-know-r', 'Imposters know each other',
      'Upon hint reveal, imposters are also told who their teammates are (if more than 1), so they can coordinate their fake hints.', true);
  } else {
    addToggle(ol, 'opt-imp-know', 'Imposters know each other',
      'Upon word reveal, imposters are also told who their teammates are (if more than 1 imposter)', false, !isI);
  }
  renderPlayers();
}

function addToggle(parent, id, label, desc, defaultChecked, disabled) {
  if (!(id in toggleState)) toggleState[id] = defaultChecked;
  const checked = toggleState[id];
  const r = document.createElement('div');
  r.className = 'toggle-row' + (disabled ? ' disabled' : '');
  const errHtml = disabled ? `<div class="toggle-err" id="${id}-err"></div>` : '';
  const blockAttr = disabled ? ` onclick="return onToggleBlocked(event, '${id}')"` : '';
  r.innerHTML = `<div><div class="tl">${label}</div><div class="td">${desc}</div>${errHtml}</div>
    <label class="toggle"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}${blockAttr} onchange="onToggleChange('${id}', this.checked)"><div class="ttrack"></div></label>`;
  parent.appendChild(r);
}

export function onToggleChange(id, checked) { toggleState[id] = checked; }

// Prevents a disabled toggle from flipping and flashes a "why not" message beside it.
const toggleErrTimers = {};
export function onToggleBlocked(event, id) {
  event.preventDefault();
  const err = document.getElementById(id + '-err');
  if (err) {
    err.textContent = 'Unavailable in this gamemode';
    err.classList.add('show');
    clearTimeout(toggleErrTimers[id]);
    toggleErrTimers[id] = setTimeout(() => err.classList.remove('show'), 2000);
  }
  return false;
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
    impKnow: mode === 'reverse'
      ? (document.getElementById('opt-imp-know-r') ? document.getElementById('opt-imp-know-r').checked : true)
      : (document.getElementById('opt-imp-know') ? document.getElementById('opt-imp-know').checked : false),
  };
  const pool = ALL_WORDS.filter(w => activeCats.has(w.cat));
  const entry = pool[rnd(pool.length)];
  const countInputId = mode === 'cuckoo' ? 'opt-ck-count' : 'opt-imp-count';
  const countEl = document.getElementById(countInputId);
  const count = countEl ? (parseInt(countEl.value, 10) || 1) : undefined;
  G = buildGameData(mode, players, entry, count);
  peekIdx = 0;
  peekUnlocked = false;
  document.getElementById('peek-mode-lbl').textContent = { imposter: 'STANDARD', cuckoo: 'CUCKOO', reverse: 'REVERSE' }[mode];
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
        if (opts.impKnow && G.impCount > 1) {
          const teammates = G.players.filter(o => o.isImposter && o !== p).map(o => o.name);
          wordHTML += `<div class="pk-imp-plus">+</div>
            <div class="pk-imp-team">${teammates.map(nm => `<div>${nm}</div>`).join('')}</div>`;
        }
        if (opts.showCatImp) wordHTML += `<div class="pk-cat">${G.entry.cat}</div>`;
        wordHTML += `<div style="font-size:.75rem;color:var(--muted);margin-top:4px">You have no word. Bluff carefully.</div>`;
      } else {
        wordHTML = `<div class="pk-word">${p.word}</div><div class="pk-cat">${G.entry.cat}</div>`;
      }
    } else if (mode === 'reverse') {
      if (p.isImposter) {
        wordHTML = `<div class="pk-badge imp">IMPOSTER</div>
          <div class="pk-word" style="margin-top:8px">${G.secretWord}</div>`;
        if (opts.impKnow && G.impCount > 1) {
          const teammates = G.players.filter(o => o.isImposter && o !== p).map(o => o.name);
          wordHTML += `<div class="pk-imp-plus">+</div>
            <div class="pk-imp-team">${teammates.map(nm => `<div>${nm}</div>`).join('')}</div>`;
        }
        wordHTML += `<div style="font-size:.75rem;color:var(--muted);margin-top:4px">Invent a misleading hint toward this word.</div>`;
      } else {
        wordHTML = `<div class="pk-word">Hint ${G.cycle}${p.hintGroup}</div>`;
      }
    } else {
      wordHTML = `<div class="pk-word">${p.word}</div>`;
      if (opts.showCatCk) wordHTML += `<div class="pk-cat">${G.entry.cat}</div>`;
    }
    card.innerHTML = `<div class="pk-name">${p.name}</div>
      <div class="pk-inst">Memorise your ${mode === 'reverse' ? 'hint' : 'word'}, then pass the phone.</div>
      <div class="pk-box">${wordHTML}</div>`;
    document.getElementById('pk-unlock-btn').style.display = 'none';
    const nb = document.getElementById('pk-next-btn');
    nb.style.display = 'block';
    nb.textContent = isLast ? (mode === 'reverse' && G.cycle > 1 ? '▶ CONTINUE' : '🎮 START GAME') : 'DONE → Pass to next player';
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
  document.getElementById('game-mode-lbl').textContent = { imposter: 'STANDARD', cuckoo: 'CUCKOO', reverse: 'REVERSE' }[G.mode];
  renderStatus();
  renderCycleBar();
  renderCards();
  renderPhaseUI();
}

function renderStatus() {
  const bar = document.getElementById('status-bar');
  const n = G.players.length;
  const liveCls = opts.liveStats ? ' live' : '';
  const noteHTML = `<div class="stat-note${liveCls}">${opts.liveStats ? 'LIVE' : 'AT THE START'}<span class="stat-note-arrow"></span></div>`;
  if (G.mode === 'imposter') {
    const startingPl = n - G.impCount;
    const activePl = G.players.filter(p => !p.isImposter && !p.eliminated).length;
    const plVal = opts.liveStats ? `${activePl}/${startingPl}` : `${startingPl}`;
    const impAlive = G.players.filter(p => p.isImposter && !p.eliminated).length;
    const impVal = opts.liveStats ? `${impAlive}/${G.impCount}` : `${G.impCount}`;
    const impLbl = G.impCount > 1 ? 'Imposters' : 'Imposter';
    bar.innerHTML = `<div class="status-left">
        ${noteHTML}
        <div class="stat-pair-box${liveCls}">
          <div class="stat"><div class="stat-val sv-y">${plVal}</div><div class="stat-lbl">Players</div></div>
          <div class="stat"><div class="stat-val sv-mode">${impVal}</div><div class="stat-lbl">${impLbl}</div></div>
        </div>
      </div>
      <div class="sdiv"></div>
      <div class="status-right">
        <div class="stat"><div class="stat-val sv-p">${G.entry.cat}</div><div class="stat-lbl">Category</div></div>
        <div class="sdiv"></div>
        <div class="stat"><div class="stat-val sv-y">${G.cycle}</div><div class="stat-lbl">Cycle</div></div>
      </div>`;
  } else if (G.mode === 'reverse') {
    const startingPl = n - G.impCount;
    const activePl = G.players.filter(p => !p.isImposter && !p.eliminated).length;
    const plVal = opts.liveStats ? `${activePl}/${startingPl}` : `${startingPl}`;
    const impAlive = G.players.filter(p => p.isImposter && !p.eliminated).length;
    const impVal = opts.liveStats ? `${impAlive}/${G.impCount}` : `${G.impCount}`;
    const impLbl = G.impCount > 1 ? 'Imposters' : 'Imposter';
    bar.innerHTML = `<div class="status-left">
        ${noteHTML}
        <div class="stat-pair-box${liveCls}">
          <div class="stat"><div class="stat-val sv-y">${plVal}</div><div class="stat-lbl">Players</div></div>
          <div class="stat"><div class="stat-val sv-mode">${impVal}</div><div class="stat-lbl">${impLbl}</div></div>
        </div>
      </div>
      <div class="sdiv"></div>
      <div class="status-right">
        <div class="stat"><div class="stat-val sv-y">${G.cycle}/${G.maxCycles}</div><div class="stat-lbl">Cycle</div></div>
      </div>`;
  } else {
    const startingPl = n - G.numCk;
    const activePl = G.players.filter(p => !p.isCuckoo && !p.eliminated).length;
    const plVal = opts.liveStats ? `${activePl}/${startingPl}` : `${startingPl}`;
    const startingCk = G.numCk;
    const activeCk = G.players.filter(p => p.isCuckoo && !p.eliminated).length;
    const ckVal = opts.liveStats ? `${activeCk}/${startingCk}` : `${startingCk}`;
    bar.innerHTML = `<div class="status-left">
        ${noteHTML}
        <div class="stat-pair-box${liveCls}">
          <div class="stat"><div class="stat-val sv-y">${plVal}</div><div class="stat-lbl">Players</div></div>
          <div class="stat"><div class="stat-val sv-mode">${ckVal}</div><div class="stat-lbl">Cuckoos</div></div>
        </div>
      </div>
      <div class="sdiv"></div>
      <div class="status-right">
        <div class="stat"><div class="stat-val sv-p">${G.entry.cat}</div><div class="stat-lbl">Category</div></div>
        <div class="sdiv"></div>
        <div class="stat"><div class="stat-val sv-y">${G.cycle}/${G.maxCycles}</div><div class="stat-lbl">Cycle</div></div>
      </div>`;
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
  const isVoting = G.mode === 'reverse'
    ? (G.phase === 'play' && G.votesLeft > 0)
    : G.phase === 'play';
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
      content = `<div class="gp-cover${selectedVoteIdx === i ? ' selected' : ''}">
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
  document.getElementById('guess-section').style.display = 'none';
  document.getElementById('vote-count').style.display = 'none';
  document.getElementById('next-cycle-btn').style.display = 'none';
  selectedVoteIdx = null;

  if (G.phase === 'play') {
    document.getElementById('vote-panel').style.display = 'block';
    document.getElementById('vote-title').textContent =
      G.mode === 'cuckoo' ? '🗳️ WHO IS THE CUCKOO?' : '🗳️ WHO IS THE IMPOSTER?';
    document.getElementById('vote-confirm-btn').classList.remove('ready');
    document.getElementById('vote-hint').textContent = 'Tap a name to select. Tap another to change your mind.';
    document.getElementById('skip-vote-btn').style.display = G.mode === 'imposter' ? 'block' : 'none';
    document.getElementById('guess-btn').style.display = G.mode === 'imposter' ? 'block' : 'none';

    if (G.mode === 'reverse') {
      document.getElementById('guess-section').style.display = 'block';
      document.getElementById('guess-input').value = '';
      document.getElementById('guess-err').classList.remove('show');
      document.getElementById('guess-count').textContent = `${G.guessesLeft}/3 guesses left`;
      document.getElementById('vote-count').style.display = 'block';
      document.getElementById('vote-count').textContent = `${G.votesLeft} vote${G.votesLeft !== 1 ? 's' : ''} left`;
      document.getElementById('next-cycle-btn').style.display = 'block';
      document.getElementById('next-cycle-btn').textContent =
        G.cycle >= G.maxCycles ? 'FINAL CYCLE — NEXT ▶' : 'NEXT CYCLE ▶';
      if (G.votesLeft <= 0) {
        document.getElementById('vote-title').style.display = 'none';
        document.getElementById('vote-hint').style.display = 'none';
        document.getElementById('vote-confirm-btn').style.display = 'none';
      } else {
        document.getElementById('vote-title').style.display = 'block';
        document.getElementById('vote-hint').style.display = 'block';
        document.getElementById('vote-confirm-btn').style.display = 'block';
      }
    }
  }
}

// ==================== CYCLE (reverse mode) ====================
// Cycle advancement is decoupled from voting/guessing in reverse mode — it's
// its own action, triggered by the "NEXT CYCLE" button. Reuses the peek-screen
// flow to distribute the new cycle's hints, but must NOT call buildGameData()
// again (that would reshuffle roles) — only G.cycle changes here, everything
// else (eliminations, guesses/votes left) carries over untouched.
export function nextCycle() {
  if (G.cycle >= G.maxCycles) {
    triggerFinalReveal('imposter_win_cycle');
    return;
  }
  G.cycle++;
  peekIdx = 0;
  peekUnlocked = false;
  renderPeekProgress();
  renderPeekCard();
  show('peek-screen');
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

  if (G.mode === 'reverse') {
    G.votesLeft--;
    const result = checkEnd(G);
    if (result === 'continue') {
      renderGame();
    } else {
      triggerFinalReveal(result);
    }
    return;
  }

  const result = checkEnd(G);
  if (result === 'continue') {
    G.cycle++;
    renderGame();
  } else {
    triggerFinalReveal(result);
  }
}

export function imposterGuessedWord() { triggerFinalReveal('imposter_guessed'); }

// ==================== GUESS (reverse mode) ====================
let guessErrTimer = null;
export function submitGuess() {
  const input = document.getElementById('guess-input');
  const guess = input.value.trim().toLowerCase();
  if (!guess) return;
  G.guessesLeft--;
  if (guess === G.secretWord.trim().toLowerCase()) {
    triggerFinalReveal('players_win_guess');
    return;
  }
  if (G.guessesLeft <= 0) {
    triggerFinalReveal('imposter_win_guesses');
    return;
  }
  input.value = '';
  document.getElementById('guess-count').textContent = `${G.guessesLeft}/3 guesses left`;
  const err = document.getElementById('guess-err');
  err.textContent = `Wrong word, ${G.guessesLeft} guess${G.guessesLeft !== 1 ? 'es' : ''} remain`;
  err.classList.add('show');
  clearTimeout(guessErrTimer);
  guessErrTimer = setTimeout(() => err.classList.remove('show'), 3000);
}

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
  else if (result === 'players_win_vote') sub = 'Every Imposter was voted out! Tap "See Results" to reveal everyone\'s roles.';
  else if (result === 'players_win_guess') sub = 'The team guessed the secret word! Tap "See Results" to reveal everyone\'s roles.';
  else if (result === 'imposter_win_cycle') sub = 'The Imposters survived to the cycle limit. Tap "See Results" to reveal everyone\'s roles.';
  else if (result === 'imposter_win_guesses') sub = 'The team ran out of guesses. Tap "See Results" to reveal everyone\'s roles.';
  else sub = 'Tap "See Results" to reveal everyone\'s words.';

  const endLabels = {
    players_win_vote: 'END 2 — Players voted out all imposters',
    players_win_guess: 'END 1 — Players guessed the word',
    imposter_win_cycle: 'END 3 — Imposters survived to the cycle limit',
    imposter_win_guesses: 'END 4 — Players ran out of guesses',
  };
  const endLabelEl = document.getElementById('reveal-end-label');
  if (endLabels[result]) {
    endLabelEl.textContent = endLabels[result];
    endLabelEl.style.display = 'block';
  } else {
    endLabelEl.style.display = 'none';
  }

  document.getElementById('reveal-title').textContent = title;
  document.getElementById('reveal-sub').textContent = sub;
}

// ==================== GAME OVER ====================
export function showGameOver() {
  const result = G._endResult;
  show('go-screen');
  const icons = { players_win: '🏆', imposter_wins: '🕵️', imposter_guessed: '🎯', cuckoo_wins: '🐦', no_result: '🎭', tied: '🤝',
    players_win_vote: '🏆', players_win_guess: '🎯', imposter_win_cycle: '🕵️', imposter_win_guesses: '🕵️' };
  const titles = { players_win: 'PLAYERS WIN!', imposter_wins: 'IMPOSTER WINS!', imposter_guessed: 'IMPOSTER WINS!', cuckoo_wins: 'CUCKOOS WIN!', no_result: 'ROUND OVER', tied: 'TIED VOTE',
    players_win_vote: 'PLAYERS WIN!', players_win_guess: 'PLAYERS WIN!', imposter_win_cycle: 'IMPOSTERS WIN!', imposter_win_guesses: 'IMPOSTERS WIN!' };
  // Win-screen color rule (see docs/color-system.md): players winning always
  // shows the current mode's theme color; antagonists (imposter/cuckoo)
  // winning is always red, regardless of mode — red = imposter, fixed.
  const NEUTRAL_COLORS = { no_result: 'var(--purple)', tied: 'var(--yellow)' };
  const ANTAGONIST_WIN = new Set(['imposter_wins', 'imposter_guessed', 'cuckoo_wins', 'imposter_win_cycle', 'imposter_win_guesses']);
  document.getElementById('go-icon').textContent = icons[result] || '🎭';
  document.getElementById('go-title').textContent = titles[result] || 'GAME OVER';
  document.getElementById('go-title').style.color = ANTAGONIST_WIN.has(result)
    ? 'var(--accent)'
    : (NEUTRAL_COLORS[result] || 'var(--mode-color)');
  document.getElementById('go-sub').textContent = `After ${G.cycle} cycle${G.cycle !== 1 ? 's' : ''} with ${G.players.length} players.`;
  const imps = G.mode !== 'cuckoo' ? G.players.filter(p => p.isImposter) : [];
  const cks = G.mode === 'cuckoo' ? G.players.filter(p => p.isCuckoo) : [];
  const modeLabel = { imposter: 'Standard', cuckoo: 'Cuckoo', reverse: 'Reverse' }[G.mode];
  let rows = `<div class="dr"><span class="dk">Mode</span><span class="dv">${modeLabel}</span></div>
    <div class="dr"><span class="dk">Category</span><span class="dv">${G.entry.cat}</span></div>
    <div class="dr"><span class="dk">${G.mode === 'reverse' ? 'Secret word' : "Players' word"}</span><span class="dv">${G.mode === 'reverse' ? G.secretWord : G.entry.w[0]}</span></div>`;
  if (G.mode === 'reverse') {
    rows += `<div class="dr"><span class="dk">${imps.length > 1 ? 'Imposters were' : 'Imposter was'}</span><span class="dv">${imps.map(p => p.name).join(', ')}</span></div>
      <div class="dr"><span class="dk">Guesses used</span><span class="dv">${3 - G.guessesLeft}/3</span></div>
      <div class="dr"><span class="dk">Votes used</span><span class="dv">${G.impCount - G.votesLeft}/${G.impCount}</span></div>`;
  } else if (G.mode === 'imposter') {
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
    const isImp = (G.mode === 'imposter' || G.mode === 'reverse') && p.isImposter;
    const wordDisplay = G.mode === 'reverse' ? (isImp ? G.secretWord : `Hint ${p.hintGroup}`) : (isImp ? '—' : p.word);
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
