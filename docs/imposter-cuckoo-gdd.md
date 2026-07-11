# IMPOSTER / CUCKOO
## Game Design Document — v1.0

---

## Overview

**Genre:** Social deduction / Party game
**Players:** 3–12
**Medium:** Single shared smartphone (passed around the table)
**Session length:** 5–20 minutes per game
**Modes:** Two — *Imposter* and *Cuckoo*

This is a word-association social deduction game played physically around a table. One phone is passed between all players. The core loop is: players receive a secret word, give associations out loud in a circle, then vote to identify the odd one out. The two modes differ in how much information the odd-one-out has, and how the win condition is structured.

---

## Core Concept

Every round, all players receive the same word — except one (or more) who receive a slightly different but related word, or no word at all. Players take turns giving verbal associations to their word. The group must figure out who doesn't belong based on how their associations differ — while the infiltrator tries to blend in using vague or borrowed cues.

The game is inspired by the biological concept of **mimicry** — an organism that imitates another species to survive inside a group it doesn't belong to.

---

## Mode 1 — IMPOSTER

### Concept
One player is the Imposter. They receive **no word** — only their role label, and optionally the word's category (e.g. "Food", "Animal"). They must bluff their way through the round using associations that could plausibly fit many things in that category.

### Setup
- Minimum 3 players, no upper limit
- Always exactly **1 Imposter** per game
- Word pairs not used — Imposter has no word at all

### Pre-Game (Peek Phase)
1. The phone is passed one player at a time
2. Each player taps "I'm ready" to unlock their card
3. They see their word (or "IMPOSTER" if they are the Imposter)
4. They tap "Done" to lock it and pass to the next player
5. After the last player, the game begins immediately with a **randomly chosen starting player**

### Gameplay Loop
1. Starting from the randomly selected player, everyone gives **one verbal association** to their word going around the circle
2. After one full cycle, the group decides whether to vote

### Voting — Vote to Vote
- One person physically raises hands and calls a count — "Who wants to vote?"
- The phone controller selects **Yes, Vote** or **Skip** and taps **Confirm**
- A **strict majority** is required to trigger a vote — ties always result in a Skip
  - Example: 5 players → need 3+ to vote. 4 players → need 3+ to vote
- If skipped, cycle count increases and a new association round begins

### Voting — Elimination
- Once voting is triggered, all players tap the name they suspect
- Any player can change their selection before confirming
- A **Tied Vote** button is available — if the group agrees votes are equal, no elimination happens
- The phone controller taps **Confirm Elimination** when the group agrees
- **The game ends immediately after any vote**, regardless of outcome

### End of Game
- A neutral "End of Game" screen appears with a **See Results** button
- The results screen reveals: who the Imposter was, what the word was, and each player's role

### Win Conditions
- **Players win** — the Imposter is correctly eliminated
- **Imposter wins** — a regular player is eliminated instead
- **Tied vote** — no elimination; game ends, results revealed (considered a draw)

### Optional Settings
- **Show Category to Imposter** — gives the Imposter the word's category (e.g. "Food") as a hint. Makes bluffing easier and games longer. Recommended ON for larger groups.

---

## Mode 2 — CUCKOO

### Concept
Named after the cuckoo bird, which lays its eggs in other birds' nests — blending in without the host knowing. In this mode, **everyone gets a word**, but Cuckoos get a slightly different but related word (e.g. players get "Lion", Cuckoos get "Tiger"). Cuckoos may not know they are Cuckoos unless the option is enabled.

The goal for regular players is to identify and eliminate all Cuckoos before they are outnumbered. The goal for Cuckoos is to survive long enough.

### Cuckoo Ratio
Cuckoos are assigned at a **1:3 ratio**, using `floor(n / 3)`:

| Players | Cuckoos |
|---------|---------|
| 3–5 | 1 |
| 6–8 | 2 |
| 9–11 | 3 |
| 12–14 | 4 |

### Setup
- Minimum 3 players
- Cuckoo count determined automatically from player count
- Stop condition: game ends when **cuckoos ≥ remaining regular players** (Cuckoos win) or **all cuckoos eliminated** (Players win)
- Maximum cycles = `total players − ceil(total players / 2)`
  - Example: 6 players → 3 stop point → max 3 cycles

### Pre-Game (Peek Phase)
Same as Imposter mode — phone passed one at a time, each player unlocks and locks their card individually before passing on.

### Gameplay Loop
1. Starting player gives one verbal association
2. Continue around the circle — one association per player per cycle
3. At end of cycle, **Vote Now** is pressed — voting is mandatory, no skip option
4. Person with most votes is eliminated
5. Check win condition — if game continues, increment cycle and repeat

### Voting — Elimination
- Each player taps the name they suspect — one selection per round
- Selection can be changed freely before confirming
- **Confirm button activates only once a name is selected**
- Player with the most votes is eliminated — no reveal of whether they were a Cuckoo or not until game end
- **Tie rule:** if multiple players share the highest vote count equally, no elimination occurs — cycle advances

### End of Game
- Triggered when: all cuckoos eliminated, or cuckoos ≥ regular players remaining
- "End of Game" screen appears with **See Results** button
- Results screen reveals everyone's words, roles, and who the Cuckoos were

### Win Conditions
- **Players win** — all Cuckoos eliminated before being outnumbered
- **Cuckoos win** — number of remaining Cuckoos equals or exceeds remaining regular players

### Optional Settings
- **Tell Cuckoos they are Cuckoos** — OFF by default (blind mode). When ON, Cuckoos know their role and can actively try to mislead. Changes the game from accidental infiltration to deliberate deception.
- **Show Category on Cards** — shows the word's category (e.g. "Animal") on each player's peek card. Recommended ON as a baseline orientation.

---

## Shared Systems

### Word Database
- ~100 word pairs across 7 categories: Animal, Food, Object, Nature, Vehicle, Place, Clothing
- Each pair is two closely related but distinct words (e.g. "Shark / Dolphin", "Bread / Toast")
- Players' word is always `pair[0]`; Cuckoo/Imposter word is always `pair[1]`

### Category Filter
- Before each game, players can toggle which categories are included
- At least one category must always remain active
- Allows theming rounds (e.g. food-only round, animals-only round)

### Peek Phase (Anti-Cheat)
- Cards are locked by default — word hidden behind a lock icon
- Player must tap "I'm ready" to unlock — confirming no one else is watching
- After reading, "Done" locks the card again immediately
- The two-step process gives the next player visible confirmation they couldn't have peeked
- Progress dots show how many players have completed their peek

### Cuckoo Count Display (Frozen)
- The cuckoo count shown in the status bar is **fixed at game start** and never updates
- This prevents players from deducing whether a Cuckoo was correctly eliminated based on the number changing

---

## Player Experience Flow

```
Home Screen
    │
    ├── Select Mode (Imposter / Cuckoo)
    │
    ├── Setup Screen
    │     ├── Add / rename players (default: Player 1, 2, 3...)
    │     ├── Toggle word categories
    │     └── Toggle mode-specific options
    │
    ├── Peek Phase (per player)
    │     ├── Phone passed to each player
    │     ├── Player unlocks → reads word → locks → passes on
    │     └── Last player triggers game start
    │
    ├── Game Screen (cycles)
    │     ├── Cards visible (locked, no word shown during game)
    │     ├── Verbal association round (physical, not tracked by app)
    │     └── Vote phase → elimination → check win condition
    │
    ├── End of Game Screen
    │     └── "See Results" button
    │
    └── Results Screen
          ├── Win/loss title
          ├── Stats (mode, category, word, cuckoos, cycles)
          ├── Per-player reveal (name, word, role badge)
          └── Main Menu / Play Again
```

---

## Potential Improvements

### Gameplay
- **Role cards for 3+ cuckoos** — with many cuckoos, they could benefit from knowing each other. An optional "Cuckoos know each other" toggle could add a cooperative vs. detective dynamic.
- **Skip association** — allow a player to pass once per game if they are completely stuck, to prevent the Imposter from being exposed too easily in early cycles.
- **Custom word pairs** — let players add their own word pairs before the game, stored locally. Especially useful for themed nights (movies, sports, etc.).
- **Difficulty tiers** — Easy (category shown, common word pairs), Medium (category hidden), Hard (no category, obscure pairs like "Miso / Dashi").
- **Timer per association** — optional countdown per player's turn to prevent overthinking and keep energy high.
- **Starting player display** — currently chosen randomly and shown only implicitly. Could show a "Player X starts!" splash screen before the game loop.

### Social / Meta
- **Score tracking across rounds** — a simple win counter per player name stored across sessions, shown on the home screen. Adds long-session competitive stakes.
- **Cuckoo reveal animation** — a brief dramatic animation when the Cuckoos are revealed at end of game instead of a plain list.
- **Round history** — a log of past rounds (who was Cuckoo, what the word was, who got kicked) viewable after the game ends, useful for post-game discussion.
- **House rules screen** — a dedicated screen where players can configure custom rules (e.g. "Cuckoo can lie about their word openly", "Two associations per cycle") and save them as a preset.

### Technical
- **Offline-first PWA** — package as an installable web app so it works without internet, eliminating the need to re-download.
- **QR code sharing** — generate a QR code for the HTML file so it can be shared instantly between phones at a table without needing a link.
- **Accessibility** — larger tap targets, high-contrast mode, and screen-reader support for the peek cards.
- **Haptic feedback** — subtle vibration on card tap, vote confirm, and game-over reveal for mobile browsers that support it.

---

## Design Notes

The core tension of the game comes from **information asymmetry played out verbally**, not digitally. The app deliberately does as little as possible during gameplay — it handles the secret word distribution and voting mechanics, but the actual game happens physically around a table. This keeps the app invisible and the social experience central.

The two-step peek system is the most important UX decision in the app — it creates social trust without requiring the app to enforce anything technically. The physical act of passing the phone is the trust mechanism.

The frozen cuckoo counter is a subtle but important detail — it prevents a common deduction shortcut that would undermine the game in later cycles.

---

*Document covers app version as of June 2026.*
