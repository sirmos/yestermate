import './index.css';
import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { context, navigateTo } from '@devvit/web/client';
import { Chain, chainCss } from './chain';
import { Badges, badgeCss, metricsOf, type Metrics, type Stats } from './badges';
import { JOURNEY } from '../shared/journey';
import { setMusic as setMusicEngine, setMusicVol } from './music';
import { MAX_TICKS, minSteps, parse, replay, solve, type Role } from '../shared/sim';
import { LEVELS } from '../shared/levels';

type St = {
  rows: string[];
  role: Role;
  ghost: { id: string; moves: string; user: string; at?: number | undefined };
  humans: number;
  played: boolean;
  streak: number;
  uses: number;
  top: { member: string; score: number }[];
  tutorialDone: boolean;
  partners: Partner[];
  thanks: number;
  stats: Stats;
  yesterday: { rows: string[]; role: Role; ghost: { id: string; moves: string; user: string; at?: number | undefined } } | null;
  recent: string[];
  day: number;
};
type Result = { humans: number; streak: number; practice?: boolean; link?: number; failed?: boolean };

const KEYS: Record<string, number> = {
  ArrowUp: 1, w: 1, ArrowDown: 2, s: 2, ArrowLeft: 3, a: 3, ArrowRight: 4, d: 4, ' ': 0,
};
const COLOR: Record<string, string> = { x: '#e8735a', y: '#8b7be8', z: '#4fa3e8' };
const ME = '#f2b84b';
const PARTNER = '#4fc3b5';

const css = `
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(120% 70% at 50% 0%,#222838 0%,#14161c 62%);color:#ece8df;font-family:'Trebuchet MS',system-ui,sans-serif}
.w{max-width:420px;margin:0 auto;padding:14px;display:flex;flex-direction:column;gap:12px;min-height:100vh}
.top{display:flex;align-items:center;justify-content:space-between}
.logo{font-weight:800;font-size:21px;letter-spacing:.4px}
.logo b{color:#f2b84b}
.steps{font-size:12px;opacity:.65}
.board{position:relative;width:100%}
.grid{position:absolute;inset:0;display:grid}
.c{position:relative;border-radius:10px;background:#272c3b;box-shadow:inset 0 0 0 2px #171a22}
.c.wall{background:#0d0f14}
.gate{background:repeating-linear-gradient(45deg,#cfd6e6 0 4px,#8892aa 4px 8px)}
.ask{animation:ask .9s ease-in-out infinite}
@keyframes ask{50%{box-shadow:inset 0 0 0 3px #f2b84b}}
.plate{position:absolute;inset:27%;border-radius:50%;border:3px solid;transition:background .12s}
.door{position:absolute;inset:6% 24%;border-radius:6px;transition:opacity .15s}
.goal{position:absolute;inset:13%;border-radius:11px;border:2px dashed;animation:pulse 2.2s ease-in-out infinite}
.actor{position:absolute;display:flex;align-items:center;justify-content:center;transition:left .16s ease,top .16s ease;pointer-events:none}
.body{width:70%;height:70%;border-radius:36%;display:flex;gap:13%;align-items:center;justify-content:center;box-shadow:0 5px 12px rgba(0,0,0,.45)}
.body i{width:14%;height:24%;background:#14161c;border-radius:50%}
.pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:300px;width:100%;margin:0 auto}
button{background:#2d3345;color:#ece8df;border:0;border-radius:12px;padding:12px 0;font:inherit;font-size:17px;box-shadow:0 3px 0 #191c26;cursor:pointer}
button:active{transform:translateY(2px);box-shadow:none}
.card{background:#232837;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px;animation:rise .3s ease}
.big{font-size:26px;font-weight:800;color:#f2b84b}
.hint{font-size:13px;opacity:.8;line-height:1.45}
.tab{background:none;box-shadow:none;padding:5px 12px;font-size:13px;border-radius:999px}
.tab.on{background:#2d3345}
.vol{display:flex;gap:14px;font-size:12px;opacity:.85}
.vol label{display:flex;align-items:center;gap:6px;flex:1}
.vol input{flex:1;accent-color:#f2b84b}
.share{white-space:pre-line;background:#171a22;border-radius:10px;padding:8px 10px;font-size:13px;user-select:all}
.two{display:flex;gap:8px}
.two button{flex:1;font-size:15px}
button:disabled{opacity:.55}
.map{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.lv{padding:10px 0;font-weight:700}
.lv small{display:block;font-size:10px;color:#f2b84b;font-weight:400}
.lv.done{background:#34405a}
.rowb{display:flex;justify-content:space-between;font-size:15px}
@keyframes pulse{50%{opacity:.45}}
@keyframes hop{50%{transform:translateY(-22%)}}
.board.won .body{animation:hop .45s ease 3}
@keyframes rise{from{transform:translateY(14px);opacity:0}}
`;

let audio: AudioContext | null = null;
let soundOn = false;
let musicOn = false;
let sfxVol = 0.7;
let musicVol = 0.7;

function tone(freq: number, ms: number, vol: number, type: OscillatorType) {
  try {
    if (!audio) audio = new AudioContext();
    const t = audio.currentTime;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(g);
    g.connect(audio.destination);
    o.start(t);
    o.stop(t + ms / 1000);
  } catch {
    // Sound is optional.
  }
}
const beep = (freq: number, ms = 90) => tone(freq, ms, 0.3 * sfxVol, 'triangle');

function setMusic(on: boolean) {
  musicOn = on;
  setMusicEngine(on);
}

const ago = (t?: number) => {
  if (!t) return '';
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} hours ago` : `${Math.round(m / 1440)} days ago`;
};

function Tabs({ tab, setTab, onJourney }: { tab: string; setTab: (t: 'play' | 'board') => void; onJourney?: (() => void) | undefined }) {
  return (
    <span>
      <button className={tab === 'play' ? 'tab on' : 'tab'} onClick={() => setTab('play')}>Play</button>
      <button className={tab === 'board' ? 'tab on' : 'tab'} onClick={() => setTab('board')}>Board</button>
      {onJourney && <button className="tab" onClick={onJourney}>Journey</button>}
    </span>
  );
}

type Partner = { id: string; role: Role; moves: string; user: string; at: number };
type Lesson = { n: number; total: number; tip: string; onNext: () => void; name?: string | undefined; endLabel?: string | undefined; onWin?: ((moves: string) => void) | undefined; onBack?: (() => void) | undefined };

function Game({ st, tutorial, onBonus, onPartner, onYesterday, onJourney }: { st: St; tutorial?: Lesson; onBonus?: () => void; onPartner?: () => void; onYesterday?: () => void; onJourney?: () => void }) {
  const level = useMemo(() => parse(st.rows), [st.rows]);
  const [moves, setMoves] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [tab, setTab] = useState<'play' | 'board'>('play');
  const [thanked, setThanked] = useState(false);
  const [copied, setCopied] = useState<'no' | 'ok' | 'fail'>('no');
  const [tries, setTries] = useState(0);
  const [sound, setSoundRaw] = useState(soundOn);
  const [music, setMusicRaw] = useState(musicOn);
  const [sfx, setSfx] = useState(sfxVol);
  const [mus, setMus] = useState(musicVol);
  const setSound = (on: boolean) => {
    soundOn = on;
    setSoundRaw(on);
  };
  const setMusicState = (on: boolean) => {
    setMusic(on);
    setMusicRaw(on);
  };

  const rep = useMemo(() => replay(level, st.role, moves, st.ghost.moves), [level, moves, st]);
  const sim = rep.s;

  const finished = sim.da && sim.db;
  useEffect(() => {
    if (finished && tutorial?.onWin) tutorial.onWin(moves);
    // Reports a Journey win once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);
  const par = useMemo(() => minSteps(level, st.role, st.ghost.moves), [level, st]);
  const human = st.ghost.user !== 'bot';
  const postId = (() => {
    try {
      return context.postId;
    } catch {
      return undefined;
    }
  })();
  const sayThanks = () => {
    setThanked(true);
    fetch('/api/thanks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ghostId: st.ghost.id }),
    }).catch(() => undefined);
  };
  const nStars = par ? (moves.length <= par ? 3 : moves.length <= par + 2 ? 2 : 1) : 1;
  const shareText = `Yestermate #${st.day + 1} ${'★'.repeat(nStars)}${'☆'.repeat(3 - nStars)}\n${moves.length} steps, par ${par ?? '?'}${human ? `, with u/${st.ghost.user}` : ''}`;
  const copyResult = () => {
    try {
      navigator.clipboard
        .writeText(shareText)
        .then(() => setCopied('ok'))
        .catch(() => setCopied('fail'));
    } catch {
      setCopied('fail');
    }
  };
  useEffect(() => {
    if (finished && sound) [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 160), i * 140));
    // Plays once when the level is finished.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);
  const me = st.role === 'A' ? sim.a : sim.b;
  const pt = st.role === 'A' ? sim.b : sim.a;
  const myGoal = st.role === 'A' ? level.ga : level.gb;
  const ptGoal = st.role === 'A' ? level.gb : level.ga;

  const press = useCallback(
    (m: number) => {
      if (finished || moves.length >= MAX_TICKS) return;
      if (sound) beep(m === 0 ? 300 : 420, 70);
      setMoves((v) => v + m);
    },
    [finished, moves.length, sound]
  );

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const m = KEYS[e.key];
      if (m !== undefined) {
        e.preventDefault();
        press(m);
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [press]);

  useEffect(() => {
    if (!finished || res || tutorial) return;
    fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moves, ghostId: st.ghost.id }),
    })
      .then((r) => r.json())
      .then((j) => setRes(j.ok ? j : { humans: 0, streak: 0, failed: true }))
      .catch(() => setRes({ humans: 0, streak: 0, failed: true }));
    // Only send once, when the level is finished.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, tries]);

  const cellAt = (p: { x: number; y: number }) => level.cells[p.y]![p.x]!;
  const doorOpacity = (door: string) => {
    const plate = door.toLowerCase();
    if (cellAt(pt) === plate) return 0.15;
    if (cellAt(me) === plate) return 0.5;
    return 1;
  };
  const D = [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]] as const;
  const gp = st.role === 'A' ? sim.b : sim.a;
  const gm = Number(st.ghost.moves[rep.ptr] ?? '0');
  const waitTarget = rep.blocked && gm > 0 ? { x: gp.x + D[gm]![0], y: gp.y + D[gm]![1] } : null;
  const waitCell = waitTarget ? cellAt(waitTarget) : '';
  const onPlate = (c: string) => 'xyz'.includes(c);
  const baseHint =
    moves.length === 0
      ? `Each move is one step for you and your yestermate. Your yestermate is ${st.ghost.user === 'bot' ? 'a bot' : 'u/' + st.ghost.user + (st.ghost.at ? ', who played ' + ago(st.ghost.at) : '')}, and their moves are fixed.`
      : rep.blocked
        ? 'Your yestermate is waiting at the glowing door. Stand on the glowing ring to open it. For a silver gate, just wait for the beat.'
        : onPlate(cellAt(me))
        ? 'You are holding a door open for your partner.'
        : onPlate(cellAt(pt))
          ? 'Your partner is holding a door open for you. Go through it.'
          : moves.length >= 12
            ? 'Stuck? Try waiting a step so your partner gets into place. Restart is free.'
            : level.cells.some((r) => r.includes('T'))
              ? 'Silver gates open for two steps, then close for two. Time your crossing to the beat.'
              : 'A door opens only while your partner stands on its plate.';
  const hintText = tutorial && moves.length === 0 ? tutorial.tip : baseHint;

  if (tab === 'board') {
    return (
      <div className="w">
        <div className="top">
          <Tabs tab={tab} setTab={setTab} onJourney={onJourney} />
          <span />
        </div>
        <div className="card">
          <div className="big">Best partners</div>
          <div className="hint">Ranked by how many strangers played with their runs.</div>
          {st.top.length === 0 && <div className="hint">Nobody yet. Play today and be the first.</div>}
          {st.top.map((t, i) => (
            <div key={t.member} className="rowb">
              <span>{i + 1}. u/{t.member}</span>
              <span>{t.score}</span>
            </div>
          ))}
          <div className="hint">Strangers who played with your runs: {st.uses}</div>
          <Badges m={metricsOf(st)} />
        </div>
      </div>
    );
  }

  const cols = level.cells[0]!.length - 2;
  const rows = level.cells.length - 2;
  const same = (p: { x: number; y: number }, x: number, y: number) => p.x === x && p.y === y;
  const pos = (p: { x: number; y: number }) => ({
    width: `${100 / cols}%`,
    height: `${100 / rows}%`,
    left: `${((p.x - 1) / cols) * 100}%`,
    top: `${((p.y - 1) / rows) * 100}%`,
  });
  return (
    <div className="w">
      <div className="top">
        <span className="logo">Yester<b>mate</b></span>
        <span className="steps">
          {tutorial ? (tutorial.total === 1 ? (tutorial.name ?? 'Lesson') : `${tutorial.name ?? 'Lesson'} ${tutorial.n} of ${tutorial.total}`) : `Step ${moves.length}${par ? ` · Par ${par}` : ''}`}
        </span>
      </div>
      <div className="top">
        <Tabs tab={tab} setTab={setTab} onJourney={onJourney} />
        <span>
          <button className="tab" onClick={() => setSound(!sound)}>{sound ? 'Sound on' : 'Sound off'}</button>
          <button className="tab" onClick={() => setMusicState(!music)}>{music ? 'Music on' : 'Music off'}</button>
        </span>
      </div>
      {(sound || music) && (
        <div className="vol">
          {sound && (
            <label>
              Sound
              <input type="range" min="0" max="1" step="0.05" value={sfx} onChange={(e) => { sfxVol = Number(e.target.value); setSfx(sfxVol); }} />
            </label>
          )}
          {music && (
            <label>
              Music
              <input type="range" min="0" max="1" step="0.05" value={mus} onChange={(e) => { musicVol = Number(e.target.value); setMus(musicVol); setMusicVol(musicVol); }} />
            </label>
          )}
        </div>
      )}

      <div className={finished ? 'board won' : 'board'} style={{ aspectRatio: `${cols} / ${rows}` }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
          {level.cells.slice(1, -1).flatMap((row, y) =>
            row
              .slice(1, -1)
              .split('')
              .map((ch, x) => {
                const k = COLOR[ch.toLowerCase()];
                const isPlate = 'xyz'.includes(ch);
                const isDoor = 'XYZ'.includes(ch);
                const isGate = ch === 'T';
                const ask = !!waitTarget && (same(waitTarget, x + 1, y + 1) || ('XYZ'.includes(waitCell) && ch === waitCell.toLowerCase()));
                const pressed = isPlate && (same(me, x + 1, y + 1) || same(pt, x + 1, y + 1));
                return (
                  <div key={`${x}-${y}`} className={(ch === '#' ? 'c wall' : 'c') + (ask ? ' ask' : '')}>
                    {isPlate && <div className="plate" style={{ borderColor: k, background: pressed ? k : 'transparent' }} />}
                    {isGate && <div className="door gate" style={{ opacity: sim.t % 4 < 2 ? 0.15 : 1 }} />}
                    {isDoor && <div className="door" style={{ background: k, opacity: doorOpacity(ch) }} />}
                    {same(myGoal, x + 1, y + 1) && <div className="goal" style={{ borderColor: ME }} />}
                    {same(ptGoal, x + 1, y + 1) && <div className="goal" style={{ borderColor: PARTNER }} />}
                  </div>
                );
              })
          )}
        </div>
        <div className="actor" style={pos(pt)}>
          <div className="body" style={{ background: PARTNER, opacity: 0.8 }}><i /><i /></div>
        </div>
        <div className="actor" style={pos(me)}>
          <div className="body" style={{ background: ME }}><i /><i /></div>
        </div>
      </div>

      {!finished && (
        <>
          <div className="hint">{hintText}</div>
          <div className="pad">
            <span />
            <button onClick={() => press(1)}>↑</button>
            <span />
            <button onClick={() => press(3)}>←</button>
            <button onClick={() => press(0)}>wait</button>
            <button onClick={() => press(4)}>→</button>
            <span />
            <button onClick={() => press(2)}>↓</button>
            <button onClick={() => setMoves('')}>restart</button>
          </div>
        </>
      )}

      {finished && (
        <div className="card">
          {tutorial ? (
            <>
              <div className="big">Nice!</div>
              <div style={{ fontSize: 26, color: '#f2b84b' }}>{'★'.repeat(nStars)}{'☆'.repeat(3 - nStars)}</div>
              <div className="hint">{tutorial.total === 1 ? 'Done' : `${tutorial.name ?? 'Lesson'} ${tutorial.n} of ${tutorial.total} done`} in {moves.length} steps. Par is {par}.</div>
              <button onClick={tutorial.onNext}>{tutorial.n === tutorial.total ? (tutorial.endLabel ?? "Start today's level") : `Next ${(tutorial.name ?? 'lesson').toLowerCase()}`}</button>
              {tutorial.onBack && <button onClick={tutorial.onBack}>Level map</button>}
            </>
          ) : !res ? (
            <div>Adding your run to the chain...</div>
          ) : res.failed ? (
            <>
              <div className="big">Run not saved</div>
              <div className="hint">Your solve worked, but we could not reach the server.</div>
              <button
                onClick={() => {
                  setRes(null);
                  setTries((t) => t + 1);
                }}
              >
                Try saving again
              </button>
            </>
          ) : (
            <>
              <div className="big">Link #{res.link ?? res.humans}</div>
              <div style={{ fontSize: 26, color: '#f2b84b' }}>{'★'.repeat(nStars)}{'☆'.repeat(3 - nStars)}</div>
              <div className="hint">{moves.length} steps. Par is {par}.</div>
              <div>
                {res.practice
                  ? 'Practice run. Your run for today is already in the chain.'
                  : `You and ${st.ghost.user === 'bot' ? 'the bot' : 'u/' + st.ghost.user} solved it in ${moves.length} steps.`}
              </div>
              <div>Streak: {res.streak} day{res.streak === 1 ? '' : 's'}</div>
              <div>Strangers who played with your runs: {st.uses}</div>
              {st.thanks > 0 && <div className="hint">Thank-yous from partners: {st.thanks}</div>}
              {st.recent.length > 0 && <div className="hint">Latest: {st.recent.map((u) => 'u/' + u).join(', ')}</div>}
              <div className="hint">Your run is now someone's yestermate. Come back tomorrow to see who used it.</div>
              {!res.practice && <Chain partners={st.partners} joined />}
              <button onClick={copyResult}>{copied === 'ok' ? 'Result copied' : 'Copy result to share'}</button>
              {copied === 'fail' && <div className="share">{shareText}</div>}
              {(human || postId) && (
                <>
                  {human && <div className="hint">Tell u/{st.ghost.user} how it went.</div>}
                  <div className="two">
                    {human && (
                      <button disabled={thanked} onClick={sayThanks}>
                        {thanked ? 'Thanks sent' : 'Say thanks'}
                      </button>
                    )}
                    {postId && (
                      <button onClick={() => navigateTo(`https://www.reddit.com/comments/${postId.replace(/^t3_/, '')}`)}>
                        Comment
                      </button>
                    )}
                  </div>
                </>
              )}
              {onPartner ? <button onClick={onPartner}>Play with another stranger</button> : <button onClick={() => setMoves('')}>Play again for practice</button>}
              {onYesterday && <button onClick={onYesterday}>Yesterday's puzzle, with yesterday's mate</button>}
              {onBonus && <button onClick={onBonus}>Bonus puzzles with a bot</button>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const TUTORIAL = [
  { rows: LEVELS[0]!, role: 'A' as Role, tip: 'Your partner will stand on the ring to open the door for you. Wait for it, then walk through.' },
  { rows: LEVELS[0]!, role: 'B' as Role, tip: 'Now you are the helper. Step on the ring so your partner can get through, then go to your own square.' },
  { rows: LEVELS[1]!, role: 'A' as Role, tip: 'Watch where your partner goes. A door opens for you only while they hold its ring.' },
];

type Plan = { rows: string[]; role: Role; tip: string };

function Tutorial({ lessons, onDone, name, endLabel }: { lessons: Plan[]; onDone: () => void; name?: string; endLabel?: string }) {
  const [i, setI] = useState(0);
  const t = lessons[i]!;
  const st = useMemo<St>(() => {
    const sol = solve(parse(t.rows))!;
    const ghost = { id: 'tutorial', moves: t.role === 'A' ? sol.b : sol.a, user: 'bot' };
    return { day: 0, rows: t.rows, role: t.role, ghost, humans: 0, played: false, streak: 0, uses: 0, top: [], tutorialDone: true, recent: [], partners: [], thanks: 0, yesterday: null, stats: { dailyStars: 0, dailyThree: 0, journey: [] } };
  }, [t]);
  const next = () => (i + 1 < lessons.length ? setI(i + 1) : onDone());
  return <Game key={i} st={st} tutorial={{ n: i + 1, total: lessons.length, tip: t.tip, onNext: next, name, endLabel }} />;
}

function JourneyMap({ st, onPick, onBack }: { st: St; onPick: (i: number) => void; onBack: () => void }) {
  const done = st.stats.journey;
  const m: Metrics = metricsOf(st);
  return (
    <div className="w">
      <div className="top">
        <span className="logo">Jour<b>ney</b></span>
        <button className="tab" onClick={onBack}>Back</button>
      </div>
      <div className="hint">{m.cleared} of {JOURNEY.length} levels cleared, {m.stars} stars. Each level has a bot partner. Clear one to unlock the next.</div>
      <div className="map">
        {JOURNEY.map((_, i) => {
          const stars = done[i] ?? 0;
          const open = i === 0 || (done[i - 1] ?? 0) > 0;
          return (
            <button key={i} disabled={!open} className={stars ? 'lv done' : 'lv'} onClick={() => onPick(i)}>
              {i + 1}
              <small>{open ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : 'locked'}</small>
            </button>
          );
        })}
      </div>
      <div className="big">Badges</div>
      <Badges m={m} />
    </div>
  );
}

function JourneyPlay({ level, base, onBack, onNext, onSaved }: { level: number; base: St; onBack: () => void; onNext: () => void; onSaved: (j: number[]) => void }) {
  const rows = JOURNEY[level]!;
  const role: Role = level % 2 ? 'B' : 'A';
  const sol = useMemo(() => solve(parse(rows))!, [rows]);
  const st = useMemo<St>(
    () => ({ ...base, day: level, rows, role, ghost: { id: `j${level}`, moves: role === 'A' ? sol.b : sol.a, user: 'bot' } }),
    [base, level, rows, role, sol]
  );
  const onWin = (moves: string) => {
    fetch('/api/journey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level, moves }) })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) onSaved(j.journey);
      })
      .catch(() => undefined);
  };
  const lesson: Lesson = { n: level + 1, total: JOURNEY.length, tip: `Level ${level + 1}. Your partner is a bot.`, name: 'Level', endLabel: 'Back to the map', onNext, onBack, onWin };
  return <Game key={level} st={st} tutorial={lesson} />;
}

function App() {
  const [st, setSt] = useState<St | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [bonus, setBonus] = useState(false);
  const [yday, setYday] = useState(false);
  const [jmap, setJmap] = useState(false);
  const [jlevel, setJlevel] = useState<number | null>(null);
  const [pick, setPick] = useState(-1);
  useEffect(() => {
    fetch('/api/state')
      .then((r) => {
        if (!r.ok) throw new Error('bad response');
        return r.json();
      })
      .then(setSt)
      .catch(() => setFailed(true));
  }, [attempt]);
  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };
  if (failed)
    return (
      <div className="w">
        <div className="card">
          <div className="big">Could not load today's level</div>
          <div className="hint">Check your connection and try again.</div>
          <button onClick={retry}>Try again</button>
        </div>
      </div>
    );
  if (!st) return <div className="w hint">Loading today's level...</div>;
  if (!st.tutorialDone) {
    const done = () => {
      fetch('/api/tutorial-done', { method: 'POST' }).catch(() => undefined);
      setSt({ ...st, tutorialDone: true });
    };
    return <Tutorial lessons={TUTORIAL} onDone={done} />;
  }
  if (jlevel !== null) {
    return (
      <JourneyPlay
        level={jlevel}
        base={st}
        onBack={() => setJlevel(null)}
        onNext={() => setJlevel(jlevel + 1 < JOURNEY.length ? jlevel + 1 : null)}
        onSaved={(journey) => setSt({ ...st, stats: { ...st.stats, journey } })}
      />
    );
  }
  if (jmap) return <JourneyMap st={st} onPick={(i) => setJlevel(i)} onBack={() => setJmap(false)} />;
  if (yday && st.yesterday) {
    const y = st.yesterday;
    const yst: St = { ...st, day: st.day - 1, rows: y.rows, role: y.role, ghost: y.ghost };
    const who = y.ghost.user === 'bot' ? 'a bot' : `u/${y.ghost.user}`;
    return (
      <Game
        key="yesterday"
        st={yst}
        tutorial={{ n: 1, total: 1, tip: `Yesterday's puzzle. Your yestermate is ${who}.`, name: 'Yesterday', endLabel: 'Back to today', onNext: () => setYday(false) }}
      />
    );
  }
  if (bonus) {
    const list: Plan[] = Array.from({ length: 5 }, (_, k) => ({
      rows: LEVELS[1 + ((st.day + k) % (LEVELS.length - 1))]!,
      role: (k % 2 ? 'B' : 'A') as Role,
      tip: 'Bonus puzzle. Your partner is a bot, so this does not change the chain.',
    }));
    return <Tutorial lessons={list} name="Bonus" endLabel="Back to today's puzzle" onDone={() => setBonus(false)} />;
  }
  const list = st.partners;
  const chosen = pick >= 0 ? list[pick] : undefined;
  const dst: St = chosen
    ? { ...st, role: chosen.role === 'A' ? 'B' : 'A', ghost: { id: chosen.id, moves: chosen.moves, user: chosen.user, at: chosen.at } }
    : st;
  const nextPartner = () => setPick((p) => ((p < 0 ? list.length - 1 : p) + 1) % list.length);
  return <Game key={dst.ghost.id} st={dst} onBonus={() => setBonus(true)} onJourney={() => setJmap(true)} {...(st.yesterday ? { onYesterday: () => setYday(true) } : {})} {...(list.length > 1 ? { onPartner: nextPartner } : {})} />;
}

const style = document.createElement('style');
style.textContent = css + chainCss + badgeCss;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);