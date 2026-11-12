// Yestermate core: grid, tick simulation, validation, solver.
// Shared by the client (to play) and the server (to check runs).
// Moves: 0 wait, 1 up, 2 down, 3 left, 4 right. One char per tick.

export type Role = 'A' | 'B';
export type P = { x: number; y: number };
export type Level = { cells: string[]; a: P; b: P; ga: P; gb: P };
type S = { a: P; b: P; da: boolean; db: boolean };

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
  return { cells, a: f.A, b: f.B, ga: f.g, gb: f.h };
}

const at = (l: Level, p: P) => l.cells[p.y]?.[p.x] ?? '#';

function passable(l: Level, s: S, x: number, y: number, mover: 'a' | 'b'): boolean {
  const c = at(l, { x, y });
  if (c === '#') return false;
  if (c === 'X' || c === 'Y') {
    const plate = c.toLowerCase();
    return at(l, mover === 'a' ? s.b : s.a) === plate;
  }
  return true;
}

function move(l: Level, s: S, p: P, m: number, done: boolean, mover: 'a' | 'b'): P {
  if (done || m === 0) return p;
  const n = { x: p.x + DX[m], y: p.y + DY[m] };
  return passable(l, s, n.x, n.y, mover) ? n : p;
}

export function start(l: Level): S {
  return { a: l.a, b: l.b, da: false, db: false };
}

export function step(l: Level, s: S, ma: number, mb: number): S {
  const a = move(l, s, s.a, ma, s.da, 'a');
  const b = move(l, s, s.b, mb, s.db, 'b');
  return {
    a,
    b,
    da: s.da || (a.x === l.ga.x && a.y === l.ga.y),
    db: s.db || (b.x === l.gb.x && b.y === l.gb.y),
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

// Server check. The player plays `role`, the ghost plays the other role.
export function validate(l: Level, role: Role, moves: string, ghost: string) {
  if (!/^[0-4]*$/.test(moves) || moves.length > MAX_TICKS) return { won: false, ticks: 0 };
  return role === 'A' ? simulate(l, moves, ghost) : simulate(l, ghost, moves);
}

// Breadth first search over joint states. Used to build the bot seed chain.
export function solve(l: Level): { a: string; b: string } | null {
  const key = (s: S) => `${s.a.x},${s.a.y},${s.b.x},${s.b.y},${+s.da}${+s.db}`;
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