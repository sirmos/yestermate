import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import { LEVELS } from '../../shared/levels';
import { JOURNEY } from '../../shared/journey';
import { minSteps, parse, replay, solve, validate, wordStars, type Role } from '../../shared/sim';
import { WORDS } from '../../shared/words';

export const api = new Hono();

const DAY0 = Date.UTC(2026, 10, 11);
const today = () => Math.floor((Date.now() - DAY0) / 86400000);
const levelForDay = (d: number) => parse(LEVELS[d % LEVELS.length]!);
const weeklyIndex = (week: number) => Math.max(0, JOURNEY.length - 30) + (week % Math.min(30, JOURNEY.length));
const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500];

type Link = { id: string; role: Role; moves: string; user: string; at?: number };
type Stats = { dailyStars: number; dailyThree: number; journey: number[] };

async function getJson<T>(key: string): Promise<T | null> {
  const v = await redis.get(key);
  return v ? (JSON.parse(v) as T) : null;
}
const num = async (key: string) => Number((await redis.get(key)) ?? 0);
const who = async () => (await reddit.getCurrentUsername()) ?? 'anon';
const getStats = async (user: string): Promise<Stats> =>
  (await getJson<Stats>(`stats:${user}`)) ?? { dailyStars: 0, dailyThree: 0, journey: [] };

// Each day keeps: link:<id> (a run), idz:<day> (sorted list of run ids),
// count:<day> (an atomic counter) and head:<day> (the newest run).
// Every write is a single atomic call, so simultaneous players cannot overwrite each other.
// Hearts: 5 at most, one comes back every 15 minutes. Restarting a Journey level spends one.
const MAX_HEARTS = 5;
const REGEN = 15 * 60 * 1000;
async function readHearts(user: string) {
  const h = (await getJson<{ n: number; at: number }>(`hearts:${user}`)) ?? { n: MAX_HEARTS, at: Date.now() };
  const now = Date.now();
  let n = h.n;
  let at = h.at;
  if (n < MAX_HEARTS) {
    const gained = Math.floor((now - at) / REGEN);
    if (gained > 0) {
      n = Math.min(MAX_HEARTS, n + gained);
      at = n >= MAX_HEARTS ? now : at + gained * REGEN;
    }
  }
  return { n, at, nextIn: n >= MAX_HEARTS ? 0 : Math.max(0, Math.ceil((at + REGEN - now) / 1000)) };
}
async function giveHeart(user: string, by: number) {
  const h = await readHearts(user);
  const n = Math.max(0, Math.min(MAX_HEARTS, h.n + by));
  await redis.set(`hearts:${user}`, JSON.stringify({ n, at: h.n >= MAX_HEARTS ? Date.now() : h.at }));
}

async function ensureDay(day: number): Promise<void> {
  if (await redis.get(`head:${day}`)) return;
  const s = solve(levelForDay(day));
  if (!s) throw new Error('level has no solution');
  const bot: Link = { id: `${day}-0`, role: 'B', moves: s.b, user: 'bot', at: 0 };
  await redis.set(`link:${bot.id}`, JSON.stringify(bot));
  await redis.zAdd(`idz:${day}`, { member: bot.id, score: 0 });
  await redis.set(`head:${day}`, bot.id);
}

async function dayInfo(day: number) {
  await ensureDay(day);
  const headId = (await redis.get(`head:${day}`)) ?? `${day}-0`;
  const head = await getJson<Link>(`link:${headId}`);
  if (!head) throw new Error('missing head');
  return { head, humans: await num(`count:${day}`) };
}

api.get('/state', async (c) => {
  const day = today();
  const user = await who();
  const { head, humans } = await dayInfo(day);
  const streak = await getJson<{ last: number; count: number }>(`streak:${user}`);
  const members = await redis.zRange(`idz:${day}`, 0, -1, { by: 'rank' });
  const found = await Promise.all(members.slice(-13).map((m) => getJson<Link>(`link:${m.member}`)));
  const partners = found
    .filter((l): l is Link => !!l)
    .map((l) => ({ id: l.id, role: l.role, moves: l.moves, user: l.user, at: l.at ?? 0 }));

  const y = day > 0 ? await dayInfo(day - 1) : null;
  const yesterday = y
    ? {
        rows: LEVELS[(day - 1) % LEVELS.length]!,
        role: (y.head.role === 'A' ? 'B' : 'A') as Role,
        ghost: { id: y.head.id, moves: y.head.moves, user: y.head.user, at: y.head.at ?? 0 },
      }
    : null;

  let avatar: string | null = null;
  if (head.user !== 'bot') {
    try {
      avatar = (await reddit.getSnoovatarUrl(head.user)) ?? null;
    } catch {
      avatar = null;
    }
  }

  const week = Math.floor(day / 7);
  const wbest = await redis.get(`weeklybest:${week}:${user}`);
  const weekly = {
    level: weeklyIndex(week),
    best: wbest ? Number(wbest) : null,
    top: await redis.zRange(`weekly:${week}`, 0, 4, { by: 'rank' }),
  };
  const links = await num('community:links');
  const lastActive = await num('community:last');
  const community = {
    wins: await num('community:wins'),
    links,
    streak: lastActive >= day - 1 ? await num('community:streak') : 0,
    goal: MILESTONES.find((m) => m > links) ?? links,
  };

  return c.json({
    day,
    rows: LEVELS[day % LEVELS.length]!,
    role: (head.role === 'A' ? 'B' : 'A') as Role,
    ghost: { id: head.id, moves: head.moves, user: head.user, at: head.at ?? 0 },
    humans,
    played: !!(await redis.get(`played:${day}:${user}`)),
    streak: streak && streak.last >= day - 1 ? streak.count : 0,
    uses: await num(`uses:${user}`),
    top: await redis.zRange('board:uses', 0, 9, { by: 'rank', reverse: true }),
    tutorialDone: !!(await redis.get(`tutorial:${user}`)),
    recent: (await getJson<string[]>(`recent:${user}`)) ?? [],
    partners,
    thanks: await num(`thanks:${user}`),
    yesterday,
    stats: await getStats(user),
    community,
    avatar,
    weekly,
    hearts: await readHearts(user).then((h) => ({ n: h.n, nextIn: h.nextIn })),
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
  const level = levelForDay(day);
  const result = validate(level, role, moves, ghost.moves);
  if (!result.won) return c.json({ ok: false }, 400);

  const streak0 = await getJson<{ last: number; count: number }>(`streak:${user}`);
  // One counted win per player per day. incrBy is atomic, so a repeat or a
  // simultaneous submit from the same player can never be counted twice.
  const first = (await redis.incrBy(`lock:${day}:${user}`, 1)) === 1;
  if (!first) return c.json({ ok: true, humans: await num(`count:${day}`), streak: streak0?.count ?? 1, practice: true });

  const n = await redis.incrBy(`count:${day}`, 1);
  const clean = replay(level, role, moves, ghost.moves).eff.replace(/0+$/, '');
  const link: Link = { id: `${day}-${n}`, role, moves: clean, user, at: Date.now() };
  await redis.set(`link:${link.id}`, JSON.stringify(link));
  await redis.zAdd(`idz:${day}`, { member: link.id, score: n });
  await redis.set(`head:${day}`, link.id);
  await redis.set(`played:${day}:${user}`, link.id);

  const count = streak0 && streak0.last === day - 1 ? streak0.count + 1 : streak0 && streak0.last === day ? streak0.count : 1;
  await redis.set(`streak:${user}`, JSON.stringify({ last: day, count }));

  const dstars = wordStars(level, role, moves.padEnd(result.ticks, '0'), ghost.moves, result.ticks, minSteps(level, role, ghost.moves), WORDS[day % WORDS.length]![0], day).stars;
  await giveHeart(user, 1);
  const dstats = await getStats(user);
  await redis.set(
    `stats:${user}`,
    JSON.stringify({ ...dstats, dailyStars: dstats.dailyStars + dstars, dailyThree: dstats.dailyThree + (dstars === 3 ? 1 : 0) })
  );

  await redis.incrBy('community:wins', 1);
  const last = await num('community:last');
  if (last !== day) {
    const cs = last === day - 1 ? (await num('community:streak')) + 1 : 1;
    await redis.set('community:streak', String(cs));
    await redis.set('community:last', String(day));
  }

  if (ghost.user !== 'bot') {
    await redis.incrBy('community:links', 1);
    await redis.incrBy(`uses:${ghost.user}`, 1);
    await redis.zIncrBy('board:uses', ghost.user, 1);
    const seen = (await getJson<string[]>(`recent:${ghost.user}`)) ?? [];
    const next = [user, ...seen.filter((u) => u !== user)].slice(0, 8);
    await redis.set(`recent:${ghost.user}`, JSON.stringify(next));
  }

  const total = await redis.incrBy('links:total', 1);
  const flair = `Link #${total}${count >= 3 ? ` · ${count} day streak` : ''}`;
  try {
    await reddit.setUserFlair({ subredditName: context.subredditName, username: user, text: flair });
  } catch {
    // Flair needs permission in the subreddit. The game works without it.
  }
  return c.json({ ok: true, humans: n, streak: count, ticks: result.ticks, link: total });
});

api.post('/tutorial-done', async (c) => {
  const user = await who();
  await redis.set(`tutorial:${user}`, '1');
  return c.json({ ok: true });
});

api.post('/thanks', async (c) => {
  const user = await who();
  const { ghostId } = await c.req.json<{ ghostId: string }>();
  const ghost = await getJson<Link>(`link:${ghostId}`);
  if (!ghost || ghost.user === 'bot' || ghost.user === user) return c.json({ ok: false }, 400);
  if ((await redis.incrBy(`thanked:${ghostId}:${user}`, 1)) > 1) return c.json({ ok: true, already: true });
  await redis.incrBy(`thanks:${ghost.user}`, 1);
  await giveHeart(ghost.user, 1);
  return c.json({ ok: true });
});

api.post('/journey', async (c) => {
  const user = await who();
  const body = await c.req.json<{ level: number; moves: string }>();
  const rows = JOURNEY[body.level];
  if (!rows) return c.json({ ok: false }, 400);
  const stats = await getStats(user);
  if (body.level > 0 && !(stats.journey[body.level - 1] ?? 0)) return c.json({ ok: false }, 400);
  const l = parse(rows);
  const sol = solve(l);
  if (!sol) return c.json({ ok: false }, 400);
  const role: Role = body.level % 2 ? 'B' : 'A';
  const ghost = role === 'A' ? sol.b : sol.a;
  const res = validate(l, role, String(body.moves ?? ''), ghost);
  if (!res.won) return c.json({ ok: false }, 400);
  const par = minSteps(l, role, ghost) ?? res.ticks;
  const stars = wordStars(l, role, String(body.moves ?? '').padEnd(res.ticks, '0'), ghost, res.ticks, par, WORDS[body.level % WORDS.length]![0], body.level).stars;
  const journey = [...stats.journey];
  for (let i = 0; i < body.level; i++) journey[i] = journey[i] ?? 0;
  journey[body.level] = Math.max(journey[body.level] ?? 0, stars);
  await redis.set(`stats:${user}`, JSON.stringify({ ...stats, journey }));
  if (stars === 3) await giveHeart(user, 1);
  const hh = await readHearts(user);
  return c.json({ ok: true, stars, journey, hearts: { n: hh.n, nextIn: hh.nextIn } });
});

api.post('/weekly', async (c) => {
  const user = await who();
  const week = Math.floor(today() / 7);
  const body = await c.req.json<{ moves: string }>();
  const rows = JOURNEY[weeklyIndex(week)];
  if (!rows) return c.json({ ok: false }, 400);
  const l = parse(rows);
  const sol = solve(l);
  if (!sol) return c.json({ ok: false }, 400);
  const res = validate(l, 'A', String(body.moves ?? ''), sol.b);
  if (!res.won) return c.json({ ok: false }, 400);
  const key = `weeklybest:${week}:${user}`;
  const prev = await redis.get(key);
  if (!prev || res.ticks < Number(prev)) {
    await redis.set(key, String(res.ticks));
    await redis.zAdd(`weekly:${week}`, { member: user, score: res.ticks });
  }
  return c.json({ ok: true, steps: res.ticks });
});

api.post('/share', async (c) => {
  const user = await who();
  const { text } = await c.req.json<{ text: string }>();
  const postId = context.postId;
  if (!postId) return c.json({ ok: false }, 400);
  if ((await redis.incrBy(`shared:${today()}:${user}`, 1)) > 1) return c.json({ ok: true, already: true });
  const lines = String(text ?? '').slice(0, 300).split('\n').join('\n\n');
  try {
    await reddit.submitComment({ id: postId, text: `u/${user}\n\n${lines}` });
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false }, 500);
  }
});

api.post('/hearts/spend', async (c) => {
  const user = await who();
  const h = await readHearts(user);
  if (h.n < 1) return c.json({ ok: false, hearts: { n: h.n, nextIn: h.nextIn } });
  await redis.set(`hearts:${user}`, JSON.stringify({ n: h.n - 1, at: h.n >= MAX_HEARTS ? Date.now() : h.at }));
  const after = await readHearts(user);
  return c.json({ ok: true, hearts: { n: after.n, nextIn: after.nextIn } });
});