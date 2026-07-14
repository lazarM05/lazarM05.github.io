# Ruse — Architectural Guide

A phone-passing, in-person party game of word-association social deduction ("Standard" and "Cuckoo" modes) for hangouts and groups — teenagers through all ages. Built solo, for friends first, with an eye toward publishing on the Google Play Store.

## Maintaining this file

This file is read by Claude at the start of every session. Keep it accurate.

**When to update:**
- A new file or directory is added
- A file's responsibility changes significantly
- A new architectural pattern or convention is introduced
- An existing pattern described here is removed or reworked

**When NOT to update:**
- Bug fixes, small refactors, or new content within existing patterns
- Line-level changes — this file describes roles, not contents

**How to update:**
- Edit the relevant section in place; don't append a changelog
- Keep each file description to one line
- If a section no longer reflects reality, rewrite it — don't patch around it

---

## File Map

### Root

| File | Role |
|---|---|
| `index.html` | Entry HTML — the six game screens (home/setup/peek/game/reveal/game-over), inline `onclick`/`oninput` attributes call handlers exposed on `window` by `src/main.js` |
| `package.json` | npm scripts (`dev`, `build`, `preview`, `test`) and dependencies (Vite, Vitest, vite-plugin-pwa) |
| `vitest.config.js` | Vitest config — points at `src/**/*.test.js`, `environment: 'node'` |
| `README.md` | Minimal project blurb |
| `docs/` | Design docs (GDD, mode specs) — see below |
| `public/` | Static assets served as-is (PWA icons go here once real art exists — currently empty) |

### `src/`

| File | Role |
|---|---|
| `main.js` | Entry point — imports `style.css`, attaches `ui.js`'s exported handlers to `window` (needed because `index.html` still uses inline `onclick` attributes, which run in global scope), boots the app |
| `style.css` | All app styling, extracted verbatim from the original single-file prototype |
| `words.js` | `ALL_WORDS` (99 word pairs across 7 categories) and `ALL_CATS`, derived data — pure, no DOM |
| `utils.js` | `rnd`, `shuffle` — pure math helpers |
| `game.js` | `buildGameData`, `checkEnd` — pure win/setup rules (cuckoo ratio table, max-cycles formula, win conditions). No DOM access — this is the one module with full TDD unit-test coverage, since it encodes the actual game rules |
| `ui.js` | All DOM rendering/orchestration — screen navigation, player list, setup toggles, peek flow, voting, reveal, game-over. Exported functions are the public API (attached to `window` by `main.js`); everything else is module-private |
| `*.test.js` | Vitest unit tests, one per pure-logic module (`words`, `utils`, `game`) |

---

## Key Patterns

### Inline `onclick` handlers require the `window.*` bridge in `main.js`
`index.html` was ported from a single-file prototype that used inline `onclick="selectMode('imposter')"`-style attributes directly in the HTML. Those attributes execute in global scope, not module scope, so they can't see `ui.js`'s exports directly. `main.js` explicitly does `Object.assign(window, { selectMode: ui.selectMode, ... })` to bridge this. If you add a new exported `ui.js` function that needs to be called from an inline attribute in `index.html`, it must also be added to that `Object.assign` block in `main.js`, or the click will silently fail with a "not defined" console error.

### `ui.js` has no automated tests by design
`game.js`/`utils.js`/`words.js` are pure functions and get real Vitest unit tests. `ui.js` is DOM-coupled orchestration with no jsdom harness set up (YAGNI — not worth the overhead for a solo, fast-iteration project). Verification for `ui.js` changes is manual: run `npm run dev`, click through the flow in a browser. This is a deliberate, permanent split, not a gap to fill in later.

### Word bank is 99 pairs, not 100
The GDD says "~100 word pairs" but the actual `ALL_WORDS` array in `words.js` has 99 — verified directly against the original prototype source. The `words.test.js` assertion was written to match the real count. If you add or remove word pairs, update that test's expected count too.

### "Standard" mode's display name diverges from its internal key
The mode originally called "Imposter" was renamed to "Standard" in the UI (home screen, screen-topbar badges, results screen), but the internal `mode` string is still `'imposter'` everywhere — `game.js`'s `mode` param/`G.mode`, CSS classes (`.mi`, `.wi`, `.gml.imposter`), and all test fixtures. Only the *display* label changed, deliberately, to avoid unrelated churn. The in-game **Imposter role** (the character a player can draw) is a separate concept from the mode's branding name and was never renamed — "IMPOSTER" badges, "WHO IS THE IMPOSTER?", "IMPOSTER WINS!" etc. all still say Imposter on purpose. Cuckoo mode's key and display name still match.

### Imposter/Cuckoo count is configurable via a shared Auto-or-manual pattern
Both modes let the player set how many Imposters/Cuckoos are in play from the Setup screen: an "Auto" checkbox (default on) fills a number input with the 1:3 ratio (`Math.max(1, Math.floor(n/3))`, computed once in `ui.js`'s `impCountCap()` and reused by both modes' render/handler functions — don't duplicate this math), or unchecking it allows manual entry capped at that same ratio as a ceiling. Focusing the input while Auto is on turns Auto off and selects the field's contents (`onImpCountFocus`/`onCkCountFocus`); typing above the cap clamps the value and flashes a red overflow message (`flashCountError()`, 2s auto-hide). `game.js`'s `buildGameData(mode, players, entry, count)` takes this as a single shared 4th param (meaning differs by `mode`), and both mode branches of `checkEnd` are intentionally symmetric (`impLeft`/`nonImpLeft` vs `ckLeft`/`plLeft`) so the parity win condition and `maxCycles = n - 2*count` formula are identical in shape. If you add a similar configurable-count feature elsewhere, follow this same pattern rather than inventing a new one.

### Options-panel toggles persist across Setup rebuilds via `toggleState`
`buildSetup()` fully destroys and rebuilds `#options-list` (`innerHTML = ''`) every time it runs — on mode select, the Setup button, "✕ End Game", and returning from Peek. To survive that, `addToggle()` reads/writes a module-level `toggleState` object in `ui.js` keyed by each toggle's DOM id, seeding it with the default only the first time that id is built; every toggle fires `onchange="onToggleChange(id, checked)"` to write back into it. `toggleState` is a plain in-memory variable, so it resets on a full page reload by default — that's deliberate, session-scoped persistence, not saved settings. The Imposter/Cuckoo count inputs and their Auto checkboxes persist too, but via a different mechanism: they're static elements in `index.html` that are never destroyed, so nothing needs to restore them as long as `buildSetup()` doesn't force-reset them (it used to unconditionally set the Auto checkbox to `checked = true` — that line was removed because it fought this persistence).

### Disabled toggle rows block the click and flash a reason, instead of using the `disabled` attribute
`addToggle(parent, id, label, desc, defaultChecked, disabled)`'s `disabled` param doesn't set the native `disabled` attribute — it adds a `.toggle-row.disabled` class (dims only the label/switch, not the row) and wires `onclick="return onToggleBlocked(event, id)"` on the checkbox, which calls `preventDefault()` so the switch can't flip and flashes a red `#${id}-err` span for 2s. This mirrors the count inputs' overflow message (`flashCountError()` / `.count-err`) — both use an `{id}-err` span, a 2s `setTimeout` clear, and the brighter `var(--err)` red (distinct from `var(--accent)`). Currently only "Imposters know each other" (blocked in Cuckoo mode) uses the disabled-toggle path. Reuse these two functions for any future constrained input rather than writing a third variant.

### Setup, Play Again, and End Game are three distinct re-entry points, not one
`goSetup()` (rebuild + show Setup for the current `mode`) is shared by mode-select, the Setup screen's own back-navigation, the in-game "✕ End Game" button, and the game-over screen's "🔧 Setup" button — all of them mean "go tweak settings, keep everything else." `playAgain()` is deliberately separate: it skips Setup, re-picks a word from the same `activeCats` pool, reuses the existing `players`/`mode`/count, and calls `buildGameData()` again (which also reshuffles roles) before dropping straight into Peek. Don't merge these — Setup exists to let you *change* settings, Play Again exists to *repeat* them.

---

## Conventions

- **Language/stack:** JavaScript (ES modules), Vite (vanilla template, no framework), Vitest for unit tests, `vite-plugin-pwa` installed but not yet wired up (manifest/service-worker config is a follow-up, not done).
- **Naming:** `camelCase` for JS functions/variables; CSS classes and DOM ids are `kebab-case` (e.g. `gp-card`, `pk-name`); files are lowercase, single-word or `camelCase` (`words.js`, `game.js`).
- **Formatting/lint tool:** None configured yet — no ESLint/Prettier in the project. Match existing style by eye until/unless this changes.
- **Private/internal members:** Within `ui.js`, only functions actually called from `index.html` or `main.js` are `export`ed; everything else (rendering helpers like `renderPlayers`, `refreshInfo`) stays module-private.

---

## Design Docs (`docs/`)

Design docs, mockups, and specs live in `docs/`. Not read at runtime.

- **Durable** design rationale (should survive after implementation) goes in `docs/` directly, or `docs/superpowers/specs/` if using the superpowers brainstorming/writing-plans workflow — tracked in git.
- **Ephemeral** task-breakdown plans go in `docs/superpowers/plans/` — gitignored, since they go stale the moment the work lands.
- Use dated filenames (`YYYY-MM-DD-topic.md`) for anything that might later be superseded. When a design changes, mark the old doc as superseded in its own header instead of deleting it, and note the supersession in the new one.
- `docs/_templates/` holds a copy of the project-setup template this file was generated from — reference only, not read at runtime.

**Before implementation work**, grep `docs/` for relevant docs first — they're the source of truth for decisions already made. Existing docs: `imposter-cuckoo-gdd.md` (core GDD), `Imposter-Cuckoo_HintTrail_GameMode.md` (spec for an unbuilt third mode).

**New-feature workflow:** tell me the requirements → I write a design doc in `docs/` → I turn it into an implementation plan (via `superpowers:writing-plans`, landing in `docs/superpowers/plans/`) → you review the plan → I execute it (via `superpowers:executing-plans`). Don't skip straight to code on anything beyond a trivial one-liner.

---

## TODO.md Structure

The task tracker (`TODO.md`) has three sections:

- **Ongoing Tasks** — open work, grouped by area and priority.
- **Completed Tasks** — collapsed by session, one-line summary per item.
- **Discussion Topics** — non-code items to talk through later.

Use `Grep` to find tasks by keyword rather than reading the whole file.

---

## Running / Build Protocol

- **Run:** `npm run dev` (Vite dev server, default `http://localhost:5173/`). `npm test` runs the Vitest suite (`words`/`utils`/`game` — 28 tests). `npm run build` produces the production bundle in `dist/`.
- **Session start check:** Node.js/npm must be on `PATH`. If a shell tool reports `node`/`npm` not found, prepend `C:\Program Files\nodejs` to `PATH` for that shell invocation (this environment did not have Node preinstalled — it was added via `winget` mid-session and doesn't always propagate to already-running shells).
- **After changes:** Don't re-verify automatically after every edit — see Iteration Mode below. `game.js`/`utils.js`/`words.js` changes should get `npm test` run before committing, since those are the tested modules.

---

## Iteration Mode

**Default: fast, low-overhead loop.** One small task at a time — I make the change, hand it back, you test manually in the browser (`npm run dev`), give feedback, we loop. Don't run the full test suite or spawn review subagents between every tweak. The baseline bar for any change is simply "the app still runs without crashing" — I don't need to ask permission to check that; it's assumed.

**Always applies regardless of default** (no fixed list yet — add here as things come up):
- Changes to `game.js` (win conditions, cuckoo ratio, cycle math) should get `npm test` run before committing, since that's the one module with real unit-test coverage protecting the actual game rules.
- Anything touching Play Store signing/publishing (keystores, Bubblewrap/TWA config) gets extra care and explicit confirmation before proceeding — real-world consequences (irreversible signing keys, public release) if done wrong.

**Switching modes:** if you ask to "review this," "run the tests," or similar, I'll do that for the request, then return to the fast default afterward.

---

## Git & GitHub

- **Remote:** `origin` → `https://github.com/lazarM05/ruse.git` (public repo, deployed via Cloudflare Pages at `https://lazarm05-github-io.pages.dev/` — not GitHub Pages, so the account's `lazarM05.github.io` root slot stays free for other use)
- **Branch:** `master` — normal day-to-day work happens directly here
- **Commit granularity:** One commit per logical step (e.g. each task in an implementation plan gets its own commit)
- **Branching strategy:** Solo project, mostly sequential work — stay on `master` by default. I'll propose a separate branch/worktree only for large, risky, or hard-to-reverse changes (the clearest example: the eventual Play Store packaging/signing step) so `master` stays in a known-good state.
- **Don't commit:** `node_modules/`, `dist/`, `.env`, `.DS_Store`, `.claude/`, `android/`, `*.keystore`, `*.jks`, `docs/superpowers/plans/` — all already mirrored in `.gitignore`.
