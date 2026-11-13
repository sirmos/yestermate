# Yestermate

A daily two player puzzle on Reddit. You solve it with a partner who is a recording of the stranger who played before you. When you finish, your run becomes the partner for the next person.

Built with Devvit Web for Reddit's Game of the Day hackathon.

## How to play

1. Tap **Play today's level** on the post.
2. You are the amber dot. Your partner is the teal dot. Both of you must reach your own dashed goal square.
3. Every move you make is one step for both of you. Use the arrow keys, WASD, or the buttons. The middle button waits one step.
4. Your partner's moves are fixed. You choose when to move and when to wait.
5. A door opens only while your partner stands on its matching plate. You can never open your own door, so you must hold the doors for them in the same way.
6. Reach your goal while your partner reaches theirs.

There is no timer. Take your time.

## The daily loop

- Every day has a new level and a new chain.
- Your first win each day adds your run to the chain as the next link.
- The next player takes the opposite role and plays with your run.
- Come back the next day to see how many strangers played with your runs.
- Your streak counts days in a row. The **Best partners** tab ranks the players whose runs helped the most strangers.
- On a win the game tries to set a flair like "Link #412". This needs flair permission in the subreddit.

## Why it always works

Each new player takes the role of the run before the last one, so a copy of that older run always solves the level. The server also replays every submitted run before it joins the chain. Bad or cheating runs are rejected. The first partner each day is a bot, built by a solver, so nobody plays alone.

## Levels

There are 36 levels. Level 0 is a one door tutorial. The rest were made by `tools/gen-levels.mjs`. It builds random grids and keeps only the ones a solver can win and that nobody can finish alone.

## Project layout

- `src/shared/sim.ts` the game rules, the checker and the solver
- `src/shared/levels.ts` the level list
- `src/server/routes/api.ts` today's state, run checking, streaks and the board
- `src/client/splash.tsx` the feed card
- `src/client/game.tsx` the game screen

## Run it

```
npm install
npm run dev
npm run test:types
npm run test:unit
```

The unit tests check that every level can be won in both roles and that no level can be finished without help.