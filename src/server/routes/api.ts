import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import { parse, solve, validate, type Role } from '../../shared/sim';
import { LEVELS } from '../../shared/levels';

const levelForDay = (d: number) => parse(LEVELS[d % LEVELS.length]!);

export const api = new Hono();

const DAY0 = Date.UTC(2026, 10, 11);
const today = () => Math.floor((Date.now() - DAY0) / 86400000);

type Link = { id: string; role: Role; moves: string; user: string };
type Chain = { head: Link; humans: number };

async function getJson<T>(key: string): Promise<T | null> {
  const v = await redis.get(key);
  return v ? (JSON.parse(v) as T) : null;
}

const who = async () => (await reddit.getCurrentUsername()) ?? 'anon';

// First visit of the day builds the bot pair. Humans play against the bot B run.
async function chainFor(day: number): Promise<Chain> {
  const found = await getJson<Chain>(`chain:${day}`);
  if (found) return found;
  const s = solve(levelForDay(day));
  if (!s) throw new Error('level has no solution');
  const head: Link = { id: `${day}-0`, role: 'B', moves: s.b, user: 'bot' };
  const fresh: Chain = { head, humans: 0 };
  await redis.set(`link:${head.id}`, JSON.stringify(head));
  await redis.set(`chain:${day}`, JSON.stringify(fresh));
  return fresh;
}

api.get('/state', async (c) => {
  const day = today();
  const user = await who();
  const chain = await chainFor(day);
  const role: Role = chain.head.role === 'A' ? 'B' : 'A';
  const played = await getJson<{ link: string }>(`played:${day}:${user}`);
  const streak = await getJson<{ last: number; count: number }>(`streak:${user}`);
  const uses = Number((await redis.get(`uses:${user}`)) ?? 0);
  const top = await redis.zRange('board:uses', 0, 9, { by: 'rank', reverse: true });
  return c.json({
    day,
    rows: LEVELS[day % LEVELS.length]!,
    role,
    ghost: { id: chain.head.id, moves: chain.head.moves, user: chain.head.user },
    humans: chain.humans,
    played: !!played,
    streak: streak && streak.last >= day - 1 ? streak.count : 0,
    uses,
    top,
  });
});

api.post('/submit', async (c) => {
  const day = today();
  const user = await who();
  const body = await c.req.json<{ moves: string; ghostId: string }>();
  const moves = (body.moves ?? '').replace(/0+$/, '');

  const ghost = await getJson<Link>(`link:${body.ghostId}`);
  if (!ghost || !body.ghostId.startsWith(`${day}-`)) return c.json({ ok: false }, 400);

  const role: Role = ghost.role === 'A' ? 'B' : 'A';
  const result = validate(levelForDay(day), role, moves, ghost.moves);
  if (!result.won) return c.json({ ok: false }, 400);

  const chain = await chainFor(day);
  const prior = await getJson<{ link: string }>(`played:${day}:${user}`);
  const streakNow = await getJson<{ last: number; count: number }>(`streak:${user}`);
  if (prior) {
    return c.json({ ok: true, humans: chain.humans, streak: streakNow?.count ?? 1, practice: true });
  }

  const link: Link = { id: `${day}-${chain.humans + 1}`, role, moves, user };
  await redis.set(`link:${link.id}`, JSON.stringify(link));
  await redis.set(`chain:${day}`, JSON.stringify({ head: link, humans: chain.humans + 1 }));
  await redis.set(`played:${day}:${user}`, JSON.stringify({ link: link.id }));

  const count = streakNow && streakNow.last === day - 1 ? streakNow.count + 1 : 1;
  await redis.set(`streak:${user}`, JSON.stringify({ last: day, count }));

  if (ghost.user !== 'bot') {
    await redis.incrBy(`uses:${ghost.user}`, 1);
    await redis.zIncrBy('board:uses', ghost.user, 1);
  }
  const n = await redis.incrBy('links:total', 1);
  const flair = `Link #${n}`;
  try {
    await reddit.setUserFlair({ subredditName: context.subredditName, username: user, text: flair });
  } catch {
    // Flair needs permission in the subreddit. The game works without it.
  }
  return c.json({ ok: true, humans: chain.humans + 1, streak: count, ticks: result.ticks, link: n });
});