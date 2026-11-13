// Run before you submit: node tools/check-submission.mjs
// Checks the repo against the hackathon rules and our own style rules.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const results = [];
const check = (ok, good, bad) => results.push({ ok, text: ok ? good : bad });
const read = (f) => (existsSync(f) ? readFileSync(f, 'utf8') : '');

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const readme = read('README.md');
check(readme.length > 0, 'README.md exists in the root', 'README.md is missing');
check(/how to play/i.test(readme), 'README explains how to play', 'README needs a "How to play" section');
check(!/Devvit React Starter/i.test(readme), 'README is not the template one', 'README is still the template README');

const cfg = read('devvit.json');
check(cfg.length > 0, 'devvit.json found', 'devvit.json is missing');
check(!/Example form/i.test(cfg), 'Example form menu item removed', 'devvit.json still has the "Example form" menu item');

check(!existsSync('AGENTS.md'), 'No AGENTS.md', 'AGENTS.md is still in the repo');
check(!existsSync('public/snoo.png'), 'No template Snoo image', 'public/snoo.png is still in the repo');

const levels = read('src/shared/levels.ts');
const count = (levels.match(/^ {2}\[$/gm) || []).length;
check(count >= 28, `${count} levels in levels.ts`, `Only ${count} levels, need at least 28`);

const files = existsSync('src') ? walk('src').filter((f) => /\.(ts|tsx|css|html)$/.test(f)) : [];
const text = [['README.md', readme], ...files.map((f) => [f, read(f)])];
const dash = text.filter(([, t]) => t.includes('\u2014')).map(([f]) => f);
check(dash.length === 0, 'No long dashes', `Long dash found in: ${dash.join(', ')}`);
const words = text.filter(([, t]) => /\b(real|really|genuinely)\b/i.test(t)).map(([f]) => f);
check(words.length === 0, 'No banned words', `Banned word found in: ${words.join(', ')}`);

for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FIX '} ${r.text}`);
const bad = results.filter((r) => !r.ok).length;
console.log(bad ? `\n${bad} thing(s) to fix.` : '\nAll checks passed.');
console.log(
  '\nStill by hand: public test subreddit under 200 members, a post running the game,\n' +
    'app link (developers.reddit.com/apps/yestermate), Devpost text, video under 1 minute,\n' +
    'and do NOT run "npm run launch" (it publishes the app).'
);
process.exitCode = bad ? 1 : 0;
