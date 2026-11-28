# Yestermate

A daily cooperative puzzle for Reddit, built on Devvit Web.

> Yesterday, a stranger left you a path. Today, you finish what they started.

## Overview

Yestermate pairs each player with a recorded run from an earlier player, called a yestermate. Both characters advance one step each time the player acts, so the player coordinates with a fixed recording to bring both characters to their goals. A completed run becomes the next player's yestermate, forming a daily chain of people who cooperate without ever needing to meet.

## Core mechanics

- **Turn-based movement.** Every action moves both characters one step. Waiting is a valid action. There is no timer.
- **Cooperative doors.** A door opens only while the other character occupies its matching ring, so each player holds doors open for their partner.
- **Timed gates.** Silver gates open for two steps and close for two, on a fixed beat.
- **Word challenge.** Each level hides a word. Its letters are placed on the board and are collected by either character. A riddle gives the clue, two hints are available per level, and collecting a wrong letter invalidates the word.
- **Scoring.** One star for completing the level, one for spelling the word, and one for completing it efficiently.

## Progression and retention

- **Daily Challenge** with a new level, riddle and environment each day.
- **Yesterday's Challenge**, played with the last participant from the previous day.
- **Journey**, a continuous progression of levels grouped into worlds. It contains 180 curated levels. Later chapters present the curated set in rotated and reflected orientations, with new riddles and environments.
- **Weekly Boss**, a single demanding level for the whole week, with a leaderboard ranked by fewest steps.
- **Bonus puzzles** after the daily level.
- **Hearts.** A pacing mechanic with a maximum of five. Restarting a Journey level uses one, one is restored every 30 minutes, and a three-star clear, a first daily completion, or a thank-you from another player restores one.
- **Badges and streaks**, with a notification when a badge is earned. Streaks appear in the player's Reddit flair, for example "Link #412 · 7 day streak".
- **Community goal.** A progress bar on the post tracks partnerships formed by the whole community.

## Community features

- A visual chain of the day's participants on the post.
- Partner selection by username.
- Thank-you messages and short preset notes between players.
- Result sharing to the post's comments, and a ranking of the most helpful partners.

## Design principles

- **Cooperation over competition.** Helpfulness is ranked, not speed.
- **Low pressure.** No timers and no public failure.
- **Safe by design.** The game accepts no free-text input. Notes are chosen from a fixed list, so there is nothing to moderate.
- **Accessible.** Light and dark themes, symbol labels for doors and rings that do not rely on colour, a calm-motion mode, support for the system reduced-motion setting, and keyboard and touch controls.

## Technical design

- **Shared deterministic engine.** The same rules module runs in the browser and on the server.
- **Server-side verification.** Every submitted run is replayed on the server before it joins the chain.
- **Solvability by construction.** Each player takes the role of the run before the previous one, so repeating that earlier run always succeeds. If a late player blocks the partner at a door, the partner retries its move, so a slow player costs steps, not the level.
- **Concurrency.** Shared counters use atomic operations, and each player has one counted result per day, so simultaneous submissions cannot overwrite one another.
- **Level pipeline.** Levels are generated offline and verified by a solver. Unit tests confirm that every daily and Journey level can be completed in both roles, cannot be completed without a partner, and keeps a valid word layout.
- **Stack.** Devvit Web, React, TypeScript, Hono, Redis and Vite.

## Project structure

- `src/shared/sim.ts`: rules, run verification, solver, scoring and letter placement
- `src/shared/levels.ts`, `journey.ts`, `words.ts`: daily levels, Journey levels and riddles
- `src/server/routes/api.ts`: chain, progression, hearts, boards, comments and weekly boss
- `src/client/game.tsx`: game screens, with `splash.tsx` for the feed card
- `tools/gen-levels.mjs`: offline level generator
- `tools/preview.mjs`: local preview with sample data

## Development

```
npm install
npm run dev
npm run test:types
npm run test:unit
```

## Roadmap

Community-authored levels, weekly themes, and additional accessibility options.