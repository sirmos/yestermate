// Local preview of the game screen with sample data. No Reddit needed.
// 1) npm run build
// 2) node --experimental-strip-types --no-warnings=ExperimentalWarning tools/preview.mjs
// 3) open http://localhost:5173/game.html (use the phone view in browser dev tools)
// Extra: /set-day?day=7 jumps to a level. /reset clears the sample chain.
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, replay, solve, validate } from '../src/shared/sim.ts';
import { LEVELS } from '../src/shared/levels.ts';

const PORT = 5173;
const ROOT = fileURLToPath(new URL('../dist/client/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };

let day = 0;
let streak = 3;
let tutorialDone = false;
let journey = [3, 2, 3];
let linkCount = 411;
let chains = new Map();
let links = new Map();
const top = [
  { member: 'mara_k', score: 12 },
  { member: 'tolu_b', score: 9 },
  { member: 'nightbus', score: 7 },
];

const rowsFor = () => LEVELS[day % LEVELS.length];

function chain() {
  if (!chains.has(day)) {
    const sol = solve(parse(rowsFor()));
    const head = { id: `${day}-0`, role: 'B', moves: sol.b, user: 'bot' };
    links.set(head.id, head);
    chains.set(day, { head, humans: 0, played: false });
  }
  return chains.get(day);
}

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === '/api/state') {
    const c = chain();
    return send(res, 200, {
      day,
      rows: rowsFor(),
      role: c.head.role === 'A' ? 'B' : 'A',
      ghost: { id: c.head.id, moves: c.head.moves, user: c.head.user, at: c.head.at ?? 0 },
      humans: c.humans,
      played: c.played,
      streak,
      uses: 4,
      top,
      tutorialDone,
      recent: ['mara_k', 'tolu_b'],
      thanks: 2,
      stats: { dailyStars: 12, dailyThree: 3, journey },
      partners: [...links.values()].filter((l) => l.id.startsWith(`${day}-`)).map((l) => ({ ...l, at: l.at ?? 0 })),
    });
  }

  if (path === '/api/submit' && req.method === 'POST') {
    let raw = '';
    req.on('data', (d) => (raw += d));
    req.on('end', () => {
      const c = chain();
      const body = JSON.parse(raw || '{}');
      const ghost = links.get(body.ghostId);
      if (!ghost) return send(res, 400, { ok: false });
      const role = ghost.role === 'A' ? 'B' : 'A';
      const moves = String(body.moves ?? '').replace(/0+$/, '');
      if (!validate(parse(rowsFor()), role, moves, ghost.moves).won) return send(res, 400, { ok: false });
      if (c.played) return send(res, 200, { ok: true, humans: c.humans, streak, practice: true });
      const clean = replay(parse(rowsFor()), role, moves, ghost.moves).eff.replace(/0+$/, '');
      const link = { id: `${day}-${c.humans + 1}`, role, moves: clean, user: 'you', at: Date.now() };
      links.set(link.id, link);
      c.head = link;
      c.humans += 1;
      c.played = true;
      streak += 1;
      linkCount += 1;
      return send(res, 200, { ok: true, humans: c.humans, streak, link: linkCount });
    });
    return;
  }

  if (path === '/api/journey' && req.method === 'POST') {
    let raw = '';
    req.on('data', (d) => (raw += d));
    req.on('end', () => {
      const { level } = JSON.parse(raw || '{}');
      for (let i = 0; i < level; i++) journey[i] = journey[i] ?? 1;
      journey[level] = Math.max(journey[level] ?? 0, 3);
      send(res, 200, { ok: true, stars: 3, journey });
    });
    return;
  }
  if (path === '/api/thanks') return send(res, 200, { ok: true });
  if (path === '/api/tutorial-done') {
    tutorialDone = true;
    return send(res, 200, { ok: true });
  }
  if (path === '/set-day') {
    day = Number(url.searchParams.get('day') ?? 0);
    return send(res, 200, `Day set to ${day}. Reload the page.`, 'text/plain');
  }
  if (path === '/reset') {
    chains = new Map();
    links = new Map();
    streak = 3;
    tutorialDone = false;
    return send(res, 200, 'Sample chain cleared. Reload the page.', 'text/plain');
  }

  const file = join(ROOT, path === '/' ? 'game.html' : decodeURIComponent(path));
  if (!file.startsWith(ROOT) || !existsSync(file)) return send(res, 404, 'Not found. Did you run npm run build?', 'text/plain');
  send(res, 200, readFileSync(file), TYPES[extname(file)] ?? 'application/octet-stream');
}).listen(PORT, () => console.log(`Preview: http://localhost:${PORT}/game.html`));