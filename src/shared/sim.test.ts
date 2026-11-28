/* eslint-disable @typescript-eslint/ban-ts-comment */
// Node runs this file directly, so the project type check skips it.
// @ts-nocheck
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_TICKS, minSteps, parse, pickWord, placeLetters, solve, start, step, trail, validate, type Level } from './sim.ts';
import { LEVELS } from './levels.ts';
import { JOURNEY } from './journey.ts';
import { WORDS } from './words.ts';

// Can one player finish while the partner just waits?
function alone(l: Level, role: 'A' | 'B'): boolean {
  const key = (s: ReturnType<typeof start>) => `${s.a.x},${s.a.y},${s.b.x},${s.b.y},${+s.da}${+s.db},${s.t % 4}`;
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

test('par matches the solver when the partner follows the solution', () => {
  LEVELS.forEach((rows, i) => {
    const l = parse(rows);
    const s = solve(l);
    assert.equal(minSteps(l, 'A', s.b), s.a.length, `level ${i}: par for A`);
    assert.equal(minSteps(l, 'B', s.a), s.a.length, `level ${i}: par for B`);
  });
});

test('some levels use silver gates', () => {
  const gated = LEVELS.filter((rows) => rows.join('').includes('T')).length;
  assert.ok(gated >= 8, `only ${gated} gated levels`);
});

test('every journey level can be won in both roles, and none repeat', () => {
  assert.equal(new Set(JOURNEY.map((r) => r.join('|'))).size, JOURNEY.length);
  JOURNEY.forEach((rows, i) => {
    const l = parse(rows);
    const s = solve(l);
    assert.ok(s, `journey ${i} has no solution`);
    assert.ok(validate(l, 'A', s.a, s.b).won, `journey ${i}: role A fails`);
    assert.ok(validate(l, 'B', s.b, s.a).won, `journey ${i}: role B fails`);
  });
});

test('every daily word fits on its level and can be partly collected on the solver route', () => {
  for (let day = 0; day < LEVELS.length; day++) {
    const l = parse(LEVELS[day % LEVELS.length]!);
    const [word] = pickWord(l, WORDS, day);
    const everything = placeLetters(l, word, day);
    const letters = everything.filter((x) => !x.decoy);
    assert.equal(new Set(everything.map((x) => `${x.x},${x.y}`)).size, everything.length, `day ${day}: a decoy shares a cell`);
    assert.ok(everything.filter((x) => x.decoy).every((x) => !word.includes(x.ch) && x.d >= 1), `day ${day}: bad decoy`);
    assert.ok(everything.some((x) => x.decoy), `day ${day}: no decoy letter`);
    assert.equal(letters.length, word.length, `day ${day}: wrong letter count`);
    assert.equal(new Set(letters.map((x) => `${x.x},${x.y}`)).size, word.length, `day ${day}: letters share a cell`);
    assert.equal(letters.map((x) => x.ch).sort().join(''), [...word].sort().join(''), `day ${day}: letters do not spell the word`);
    const sol = solve(l)!;
    const t = trail(l, 'A', sol.a, sol.b);
    const got = letters.filter((x) => [...t.a, ...t.b].some((p) => p.x === x.x && p.y === x.y)).length;
    assert.ok(got >= 1, `day ${day}: no letter on the route`);
    assert.ok(letters.every((q) => q.d <= 3), `day ${day}: a letter is too far from the route`);
  }
});