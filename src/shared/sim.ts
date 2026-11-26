// Yestermate core: grid, tick simulation, validation, solver.
// Shared by the client (to play) and the server (to check runs).
// Moves: 0 wait, 1 up, 2 down, 3 left, 4 right. One char per tick.

export type Role = 'A' | 'B';
export type P = { x: number; y: number };
export type Level = { cells: string[]; a: P; b: P; ga: P; gb: P };
export type S = { a: P; b: P; da: boolean; db: boolean; t: number };

export const MAX_TICKS = 90;
const DX = [0, 0, 0, -1, 1];
const DY = [0, -1, 1, 0, 0];

export function parse(rows: string[]): Level {
  const f: Record<string, P> = {};
  const cells = rows.map((r, y) =>
    r
      .split('')
      .map((c, x) => {
        if ('ABgh'.includes(c)) {
          f[c] = { x, y };
          return '.';
        }
        return c;
      })
      .join('')
  );
  return { cells, a: f.A!, b: f.B!, ga: f.g!, gb: f.h! };
}

const at = (l: Level, p: P) => l.cells[p.y]?.[p.x] ?? '#';

function passable(l: Level, s: S, x: number, y: number, mover: 'a' | 'b'): boolean {
  const c = at(l, { x, y });
  if (c === '#') return false;
  if (c === 'T') return s.t % 4 < 2; // silver gate: open two steps, closed two
  if (c === 'X' || c === 'Y' || c === 'Z') {
    const plate = c.toLowerCase();
    return at(l, mover === 'a' ? s.b : s.a) === plate;
  }
  return true;
}

function move(l: Level, s: S, p: P, m: number, done: boolean, mover: 'a' | 'b'): P {
  if (done || m === 0) return p;
  const n = { x: p.x + DX[m]!, y: p.y + DY[m]! };
  return passable(l, s, n.x, n.y, mover) ? n : p;
}

export function start(l: Level): S {
  return { a: l.a, b: l.b, da: false, db: false, t: 0 };
}

export function step(l: Level, s: S, ma: number, mb: number): S {
  const a = move(l, s, s.a, ma, s.da, 'a');
  const b = move(l, s, s.b, mb, s.db, 'b');
  return {
    a,
    b,
    da: s.da || (a.x === l.ga.x && a.y === l.ga.y),
    db: s.db || (b.x === l.gb.x && b.y === l.gb.y),
    t: s.t + 1,
  };
}

const mv = (str: string, t: number) => Number(str[t] ?? '0');

export function simulate(l: Level, am: string, bm: string) {
  let s = start(l);
  for (let t = 0; t < MAX_TICKS; t++) {
    s = step(l, s, mv(am, t), mv(bm, t));
    if (s.da && s.db) return { won: true, ticks: t + 1 };
  }
  return { won: false, ticks: MAX_TICKS };
}

// The ghost tries its next recorded move each tick. If a door blocks it, it keeps
// that move and tries again, so a late player cannot waste its moves.
// eff is the player's moves with blocked ones turned into waits.
export function replay(l: Level, role: Role, moves: string, ghost: string) {
  let s = start(l);
  let ptr = 0;
  let blocked = false;
  let eff = '';
  for (let t = 0; t < moves.length && t < MAX_TICKS; t++) {
    const mine = Number(moves[t] ?? '0');
    const g = Number(ghost[ptr] ?? '0');
    const n = role === 'A' ? step(l, s, mine, g) : step(l, s, g, mine);
    const gOld = role === 'A' ? s.b : s.a;
    const gNew = role === 'A' ? n.b : n.a;
    const mOld = role === 'A' ? s.a : s.b;
    const mNew = role === 'A' ? n.a : n.b;
    const gDone = role === 'A' ? s.db : s.da;
    blocked = g !== 0 && !gDone && gOld.x === gNew.x && gOld.y === gNew.y;
    if (!blocked) ptr++;
    eff += mine !== 0 && (mOld.x !== mNew.x || mOld.y !== mNew.y) ? String(mine) : '0';
    s = n;
  }
  return { s, ptr, blocked, eff };
}

// Server check. The player plays `role`, the ghost plays the other role.
export function validate(l: Level, role: Role, moves: string, ghost: string) {
  if (!/^[0-4]*$/.test(moves) || moves.length > MAX_TICKS) return { won: false, ticks: 0 };
  const padded = moves.padEnd(MAX_TICKS, '0');
  for (let t = 1; t <= MAX_TICKS; t++) {
    const r = replay(l, role, padded.slice(0, t), ghost);
    if (r.s.da && r.s.db) return { won: true, ticks: t };
  }
  return { won: false, ticks: MAX_TICKS };
}

// Fewest ticks for the player to finish while the ghost keeps to its recording.
export function minSteps(l: Level, role: Role, ghost: string): number | null {
  type N = { s: S; p: number };
  let layer: N[] = [{ s: start(l), p: 0 }];
  for (let t = 0; t < MAX_TICKS; t++) {
    const seen = new Map<string, N>();
    for (const { s, p } of layer) {
      const g = Number(ghost[p] ?? '0');
      for (let m = 0; m < 5; m++) {
        const n = role === 'A' ? step(l, s, m, g) : step(l, s, g, m);
        if (n.da && n.db) return t + 1;
        const gOld = role === 'A' ? s.b : s.a;
        const gNew = role === 'A' ? n.b : n.a;
        const gDone = role === 'A' ? s.db : s.da;
        const blocked = g !== 0 && !gDone && gOld.x === gNew.x && gOld.y === gNew.y;
        const q = blocked ? p : p + 1;
        const k = `${n.a.x},${n.a.y},${n.b.x},${n.b.y},${+n.da}${+n.db},${q}`;
        if (!seen.has(k)) seen.set(k, { s: n, p: q });
      }
    }
    layer = [...seen.values()];
  }
  return null;
}

// Breadth first search over joint states. Used to build the bot seed chain.
export function solve(l: Level): { a: string; b: string } | null {
  const key = (s: S) => `${s.a.x},${s.a.y},${s.b.x},${s.b.y},${+s.da}${+s.db},${s.t % 4}`;
  const first = start(l);
  const seen = new Map<string, [string, number, number] | null>([[key(first), null]]);
  let layer: S[] = [first];
  while (layer.length) {
    const next: S[] = [];
    for (const s of layer) {
      for (let ma = 0; ma < 5; ma++) {
        for (let mb = 0; mb < 5; mb++) {
          const n = step(l, s, ma, mb);
          const k = key(n);
          if (seen.has(k)) continue;
          seen.set(k, [key(s), ma, mb]);
          if (n.da && n.db) {
            let a = '';
            let b = '';
            let cur: string = k;
            while (seen.get(cur)) {
              const [prev, pa, pb] = seen.get(cur)!;
              a = pa + a;
              b = pb + b;
              cur = prev;
            }
            return { a, b };
          }
          next.push(n);
        }
      }
    }
    layer = next;
  }
  return null;
}

// Positions of both characters after each tick (used to see which letters were collected).
export function trail(l: Level, role: Role, moves: string, ghost: string) {
  const a: P[] = [];
  const b: P[] = [];
  for (let t = 1; t <= moves.length && t <= MAX_TICKS; t++) {
    const r = replay(l, role, moves.slice(0, t), ghost);
    a.push(r.s.a);
    b.push(r.s.b);
  }
  return { a, b };
}

export type Letter = { x: number; y: number; ch: string; slot: number; d: number };

// Puts the letters of a secret word on the board. Half lie on the solver's route,
// so a partner following it picks them up. The rest sit one step off the route.
export function placeLetters(l: Level, word: string, seed: number): Letter[] {
  const key = (p: P) => `${p.x},${p.y}`;
  const onPath = new Set<string>();
  const sol = solve(l);
  if (sol) {
    let s = start(l);
    for (let t = 0; t < sol.a.length; t++) {
      s = step(l, s, Number(sol.a[t]), Number(sol.b[t]));
      onPath.add(key(s.a));
      onPath.add(key(s.b));
    }
  }
  const reserved = new Set([key(l.a), key(l.b), key(l.ga), key(l.gb)]);
  const all: P[] = [];
  for (let y = 0; y < l.cells.length; y++) {
    for (let x = 0; x < (l.cells[0]?.length ?? 0); x++) {
      const p = { x, y };
      if (at(l, p) === '.' && !reserved.has(key(p))) all.push(p);
    }
  }
  let r = seed * 7919 + 13;
  const shuffle = <T,>(list: T[]): T[] => {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      r = (r * 1103515245 + 12345) % 2147483648;
      const j = r % (i + 1);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  };
  // How many steps each cell is from the route (walls block, doors and gates do not).
  const dist = new Map<string, number>();
  let frontier: P[] = [...onPath].map((k) => {
    const [x, y] = k.split(',').map(Number);
    return { x: x!, y: y! };
  });
  frontier.forEach((p) => dist.set(key(p), 0));
  for (let d = 1; d <= 3; d++) {
    const next: P[] = [];
    for (const p of frontier) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = { x: p.x + dx!, y: p.y + dy! };
        if (at(l, q) === '#' || dist.has(key(q))) continue;
        dist.set(key(q), d);
        next.push(q);
      }
    }
    frontier = next;
  }
  const ring = (d: number) => shuffle(all.filter((p) => dist.get(key(p)) === d));
  const need = word.length;
  const r0 = ring(0);
  const chosen: P[] = [];
  const used = new Set<string>();
  const add = (p: P) => {
    if (chosen.length < need && !used.has(key(p))) {
      chosen.push(p);
      used.add(key(p));
    }
  };
  [...r0.slice(0, Math.ceil(need / 2)), ...ring(1), ...r0, ...ring(2), ...ring(3), ...shuffle(all)].forEach(add);
  const slots = shuffle(Array.from({ length: chosen.length }, (_, i) => i));
  return chosen.map((p, i) => ({ x: p.x, y: p.y, slot: slots[i]!, ch: word[slots[i]!]!, d: dist.get(key(p)) ?? 9 }));
}