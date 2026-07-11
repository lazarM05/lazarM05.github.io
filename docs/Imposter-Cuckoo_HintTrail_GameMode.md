# Imposter/Cuckoo — "Hint Trail" Game Mode
### Design Document

## Concept Summary
A cooperative-charades twist on the core Imposter/Cuckoo formula. Instead of impostors trying to blend in with a word they were given, the **secret word is never revealed to anyone** — including the impostors. Players collectively deduce it from hints, while impostors quietly try to steer the group toward a fake word instead.

---

## Core Setup

- **Secret Word**: Chosen at game start. Never shown to any player, including impostors.
- **Hint Words**: Each non-impostor player receives one hint word per cycle, related to the secret word.
  - Example: Secret word = *Boat* → Hints = *Water, Sail, Radar, Wood*
- **Fake Word**: All impostors are given the same fake word, closely related to the secret word but distinct from it.
  - Example: Fake word = *Submarine*
- **Impostor Task**: Each impostor independently invents their own hint word that plausibly points toward the fake word, while trying to pass it off as a genuine hint for the (unknown-to-them) secret word.

---

## Impostor Ratio

Roughly 1:3 — one impostor per 3 players.

| Player Count | Impostors |
|---|---|
| 5 | 1 |
| 6 | 2 |
| 9 | 3 |

---

## Round Structure (Cycles)

1. **Start of Cycle**: All non-impostor players receive a new hint word related to the secret word. All impostors receive the same fake word and privately devise a new hint for it.
2. **Hint Sharing**: All players (impostors included) share their hint word with the group.
3. **Discussion**: Group discusses which hints feel "off" and who might be an impostor.
4. **End of Cycle Vote**: Team gets a vote on the secret word. Voting to unmask an impostor is **optional** each cycle.

## Vote Budget

- The player team collectively has **3 guesses** at the secret word across the whole game (not per cycle — a shared pool).
- Impostor unmasking votes are optional and can happen any cycle without using a word-guess.

---

## Win Conditions

Wins are split into **Easy Wins** and **Hard Wins** for both sides.

**Player Easy Win:**
- Vote out all impostors before the cycle limit is reached

**Player Hard Win:**
- Correctly guess the exact secret word

**Impostor Easy Win:**
- Survive to the cycle limit without being voted out

**Impostor Hard Win:**
- Bait the players into guessing the fake word

---

## Vote-Kick Limit

To stop players from simply voting out everyone until they stumble onto the impostor(s), the number of kick-votes allowed across the whole game is capped by the starting impostor count:

- **Total kicks allowed = number of impostors present at game start**
- Example: If the game starts with 2 impostors, the team can only vote someone out a maximum of 2 times total, across the entire game (not per cycle).
- This applies regardless of whether the person voted out was actually an impostor.

---

## Cycle Limit

- **Default hard cycle limit: 3 cycles.**
- Can be configured to a different number in game setup, before the game begins.
- If impostors survive to the cycle limit without being kicked, this triggers the Impostor Easy Win.

---

## Guessing Rules (Secret Word)

- Guesses must match the secret word **exactly** — no "very similar" guesses count.
- Each secret word has a small, pre-defined list of acceptable answers, limited strictly to close variations of the same word (e.g., "Train" / "train").
- This list does NOT include synonyms, related concepts, or the fake word — only literal variants of the exact word (capitalization, singular/plural, etc.).

---

## Design Notes / Open Questions

- **Multiple impostors always share the same fake word** — this is intentional. Each impostor invents their own hint independently, which can create natural inconsistencies between impostor hints (a feature, not a bug — gives players something to notice).
- **Balance lever**: The vote-kick cap and 3-guess word budget together prevent players from brute-forcing a win, while the Easy/Hard win split gives both sides a lower-effort and higher-effort path to victory.
- **Scoring**: A win is a win — Easy and Hard wins count equally for game outcome. A scoring difference (Hard Win worth more points) only comes into play in multi-round formats where score is being tracked, e.g. a tournament or series.
- **Fake word matching**: No fixed rule — it depends on the word itself. Some concepts have many synonyms, others have essentially only one word for them. This makes word selection a game-design responsibility: it's on the word-list creator to pick balanced fake words with an appropriate matching tolerance per word, rather than applying one blanket matching rule across all words.

---

*Part of the Imposter/Cuckoo game mode family. Companion to the existing "Similar Word" mode (impostor gets a closely related word instead of no word).*
