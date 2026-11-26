# Yestermate

A daily cooperative puzzle on Reddit. Your partner is a recording of the last stranger who played, and together you spell a secret word. When you win, your run becomes the next stranger's partner.

Built with Devvit Web for Reddit's Game of the Day hackathon.

> Yesterday, a stranger left you a path. Today, you finish what they started.

## How to play

1. Tap **Play today's level**. New players start with three short lessons.
2. You are the amber character. Your **yestermate** is the teal one. It replays a stranger's fixed moves.
3. Move with the arrow keys, WASD or the buttons. Every move is one step for both of you. The middle button waits a step. There is no timer.
4. A door opens only while your yestermate stands on its matching ring. You can never open your own door, so you hold doors open for them in the same way.
5. Silver gates need no ring. They open for two steps and close for two, on a steady beat.
6. Each daily level hides a **secret word**. A riddle gives the clue, and its letters lie on the board. You and your yestermate both pick up letters by walking over them. Amber letters are yours, teal ones came from your partner.
7. Reach your dashed goal square while your yestermate reaches theirs.

If your yestermate is stuck at a door, the door and the ring it needs glow. It waits and tries again, so being slow costs steps, not the level.

## Reasons to come back

- **Daily level** with a new riddle every day, plus a difficulty label from Easy to Expert.
- **Yesterday's puzzle**, played with yesterday's last stranger.
- **Journey**: 90 levels, unlocked in order, with a bot partner and 1 to 3 stars saved to your account.
- **Weekly Boss**: one hard level for the whole week, with a fewest steps leaderboard.
- **Bonus puzzles** with a bot after your daily level.
- **Stars** from par: finish in the fewest steps for three.
- **Streaks and badges** for streaks, stars, levels cleared, and helping others.
- **Flair** that shows in comments, like "Link #412 · 7 day streak".
- **Community goal**: a bar on the post that fills as strangers partner up, plus a community streak.

## Made for Reddit

- The post shows the day's **chain** of strangers as linked dots, with your yestermate's name and avatar.
- **Choose a yestermate by name**: search a username and play a friend's run.
- **Say thanks** to your partner, and see who played with your runs.
- **Post my result in the comments** adds your result to the post's thread. **Copy result to share** gives a Wordle style line.
- A **Best partners** board ranks players by how many strangers used their runs.

## Why every level can be won

Each new player takes the role of the run before the last one, so copying that older run always works. The server replays every submitted run before it joins the chain, so bad or cheating runs are rejected. The first yestermate each day is a bot built by a solver, so nobody plays alone.

## Content

- 36 daily levels, each with its own secret word and riddle.
- 90 Journey levels, plus a new Weekly Boss every 7 days.
- All levels were made by a generator and checked by a solver. Tests confirm each one can be won in both roles and cannot be finished without help.

## Reliability

Shared counters use atomic operations, so players who finish at the same moment cannot overwrite each other. One counted win per player per day, even if they submit twice.

## Project layout

- `src/shared/sim.ts` the rules, the run checker, the solver, par, and letter placement
- `src/shared/levels.ts`, `journey.ts`, `words.ts` the daily levels, the Journey levels, and the riddles
- `src/server/routes/api.ts` the chain, streaks, stars, boards, weekly boss and comments
- `src/client/game.tsx` the game screen, `splash.tsx` the feed card
- `tools/gen-levels.mjs` the level generator, `tools/preview.mjs` a local preview with sample data

## Run it

```
npm install
npm run dev
npm run test:types
npm run test:unit
```