/* eslint-disable @typescript-eslint/ban-ts-comment */
// Node runs this file directly, so the project type check skips it.
// @ts-nocheck
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_TICKS, parse, solve, start, step, validate, type Level } from './sim.ts';
import { LEVELS } from './levels.ts';

// Can one player finish while the partner just waits?
function alone(l: Level, role: 'A' | 'B'): boolean {
  const key = (s: ReturnType<typeof start>) => `${s.a.x},${s.a.y},${s.b.x},${s.b.y},${+s.da}${+s.db}`;
  const first = start(l);
  const seen = new Set([key(first)]);
  let layer = [first];
  while (layer.length) {
    const next: typeof layer = [];
    for (const s of layer) {
      for (let m = 0; m < 5; m++) {
        const n = role === 'A' ? step(l, s, m, 0) : step(l, s, 0, m);
        if (seen.has(key(n))) continue;
        seen.add(key(n));
        if (role === 'A' ? n.da : n.db) return true;
        next.push(n);
      }
    }
    layer = next;
  }
  return false;
}

test('every level can be won, in both roles', () => {
  LEVELS.forEach((rows, i) => {
    const l = parse(rows);
    const s = solve(l);
    assert.ok(s, `level ${i} has no solution`);
    assert.ok(validate(l, 'A', s.a, s.b).won, `level ${i}: role A fails`);
    assert.ok(validate(l, 'B', s.b, s.a).won, `level ${i}: role B fails`);
  });
});

test('every level needs help from the partner', () => {
  LEVELS.forEach((rows, i) => {
    const l = parse(rows);
    const bothAlone = alone(l, 'A') && alone(l, 'B');
    assert.equal(bothAlone, false, `level ${i}: both players can finish without each other`);
  });
});

test('bad runs are rejected', () => {
  const l = parse(LEVELS[0]!);
  const s = solve(l)!;
  assert.equal(validate(l, 'A', 'abc', s.b).won, false);
  assert.equal(validate(l, 'A', '4'.repeat(MAX_TICKS + 1), s.b).won, false);
  assert.equal(validate(l, 'A', '444444444', '').won, false);
});