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
  const w = rnd() < 0.5 ? 11 : 9;
  const h = pick([5, 6]);
  const g = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#' : '.'))
  );
  const walls = w === 11 ? [3, 5, 7] : rnd() < 0.6 ? [3, 6] : [4];
  const letters = ['X', 'Y', 'Z'];
  const gateWall = walls.length >= 2 && rnd() < 0.45 ? 0 : -1;
  walls.forEach((cx, i) => {
    const door = 1 + Math.floor(rnd() * (h - 2));
    for (let y = 1; y < h - 1; y++) g[y][cx] = y === door ? (i === gateWall ? 'T' : letters[i]) : '#';
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
    walls.every((cx, i) => i === gateWall || put(letters[i].toLowerCase(), (x) => x < cx));
  return ok ? g.map((r) => r.join('')) : null;
}

// Can one player finish while the other just waits?
function solo(l, role) {
  const key = (s) => `${s.a.x},${s.a.y},${s.b.x},${s.b.y},${+s.da}${+s.db},${s.t % 4}`;
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
for (let i = 0; i < 70000; i++) {
  const rows = build();
  if (!rows) continue;
  const id = rows.join('|');
  if (found.has(id)) continue;
  const l = parse(rows);
  const sol = solve(l);
  if (!sol) continue;
  const ticks = sol.a.length;
  if (ticks < 9 || ticks > 40) continue;
  if (solo(l, 'A') || solo(l, 'B')) continue;
  found.set(id, { rows, ticks });
}

const all = [...found.values()].sort((a, b) => a.ticks - b.ticks);
const want = 35;
const spread = (list, n) => Array.from({ length: Math.min(n, list.length) }, (_, i) => list[Math.floor((i * list.length) / Math.min(n, list.length))]);
const isGate = (c) => c.rows.join('').includes('T');
const gateAll = all.filter(isGate);
const wideAll = all.filter((c) => !isGate(c) && c.rows[0].length === 11);
const stdAll = all.filter((c) => !isGate(c) && c.rows[0].length === 9);
const gates = spread(gateAll, 12);
const wide = spread(wideAll, 10);
const std = spread(stdAll.slice(Math.floor(stdAll.length * 0.3)), want - gates.length - wide.length);
const chosen = [...std, ...wide, ...gates].sort((a, b) => a.ticks - b.ticks);
const firstPlain = chosen.findIndex((c) => !isGate(c) && c.rows[0].length === 9);
chosen.unshift(...chosen.splice(firstPlain, 1));

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
console.log('gated', levels.filter((r) => r.join('').includes('T')).length);
console.log('wide', levels.filter((r) => r[0].length === 11).length, 'doors3', levels.filter((r) => r.join('').includes('Z')).length);
console.log('candidates', all.length, 'written', levels.length, 'ticks', levels.slice(1).map((r) => solve(parse(r)).a.length).join(','));