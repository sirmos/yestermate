// Makes src/shared/levels.ts. Run: node --experimental-strip-types tools/gen-levels.mjs
// Keeps only levels that can be solved AND that neither player can finish alone.
import { parse, solve, step, start } from '../src/shared/sim.ts';
import { writeFileSync } from 'node:fs';

let seed = 20261111;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (a) => a[Math.floor(rnd() * a.length)];

function build() {
  const w = 9;
  const h = pick([5, 6]);
  const g = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#' : '.'))
  );
  const walls = rnd() < 0.6 ? [3, 6] : [4];
  const letters = ['X', 'Y'];
  walls.forEach((cx, i) => {
    const door = 1 + Math.floor(rnd() * (h - 2));
    for (let y = 1; y < h - 1; y++) g[y][cx] = y === door ? letters[i] : '#';
  });
  const put = (ch, pred) => {
    const c = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (g[y][x] === '.' && pred(x)) c.push([x, y]);
    if (!c.length) return false;
    const [x, y] = pick(c);
    g[y][x] = ch;
    return true;
  };
  const blocks = pick([0, 1, 2, 3]);
  for (let i = 0; i < blocks; i++) put('#', () => true);
  const last = walls[walls.length - 1];
  const ok =
    put('A', (x) => x < walls[0]) &&
    put('B', (x) => x < walls[0]) &&
    put('g', (x) => x > last) &&
    put('h', (x) => x > last) &&
    walls.every((_, i) => put(letters[i].toLowerCase(), () => true));
  return ok ? g.map((r) => r.join('')) : null;
}

// Can one player finish while the other just waits?
function solo(l, role) {
  const key = (s) => `${s.a.x},${s.a.y},${s.b.x},${s.b.y},${+s.da}${+s.db}`;
  const first = start(l);
  const seen = new Set([key(first)]);
  let layer = [first];
  while (layer.length) {
    const next = [];
    for (const s of layer) {
      for (let m = 0; m < 5; m++) {
        const n = role === 'A' ? step(l, s, m, 0) : step(l, s, 0, m);
        const k = key(n);
        if (seen.has(k)) continue;
        seen.add(k);
        if (role === 'A' ? n.da : n.db) return true;
        next.push(n);
      }
    }
    layer = next;
  }
  return false;
}

const found = new Map();
for (let i = 0; i < 300000; i++) {
  const rows = build();
  if (!rows) continue;
  const id = rows.join('|');
  if (found.has(id)) continue;
  const l = parse(rows);
  const sol = solve(l);
  if (!sol) continue;
  const ticks = sol.a.length;
  if (ticks < 8 || ticks > 34) continue;
  if (solo(l, 'A') || solo(l, 'B')) continue;
  found.set(id, { rows, ticks });
}

const all = [...found.values()].sort((a, b) => a.ticks - b.ticks);
const want = 35;
const chosen = [];
const pool = all.slice(Math.floor(all.length * 0.55));
for (let i = 0; i < want && pool.length; i++) chosen.push(pool[Math.floor((i * pool.length) / want)]);

const tutorial = ['#########', '#A..X..g#', '#Bxh#...#', '#########'];
const levels = [tutorial, ...chosen.map((c) => c.rows)];

for (const rows of levels) {
  const l = parse(rows);
  if (!solve(l)) throw new Error('unsolvable level slipped in');
}

const body = levels.map((r) => '  [\n' + r.map((x) => `    '${x}',`).join('\n') + '\n  ],').join('\n');
writeFileSync(
  new URL('../src/shared/levels.ts', import.meta.url),
  `// Made by tools/gen-levels.mjs. Level 0 is the tutorial. Do not edit by hand.\n// A, B = spawns. g = goal for A. h = goal for B. x, y = plates. X, Y = doors.\nexport const LEVELS: string[][] = [\n${body}\n];\n`
);
console.log('candidates', all.length, 'written', levels.length, 'ticks', levels.slice(1).map((r) => solve(parse(r)).a.length).join(','));
