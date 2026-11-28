import './index.css';
import { StrictMode, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { context, navigateTo } from '@devvit/web/client';
import { Chain, chainCss } from './chain';
import { ENVS, themeCss } from './theme';
import { Badges, badgeCss, earnedNames, metricsOf, type Metrics, type Stats } from './badges';
import { JOURNEY } from '../shared/journey';
import { setMusic as setMusicEngine, setMusicVol } from './music';
import { MAX_TICKS, minSteps, parse, pickWord, placeLetters, replay, solve, trail, variantRows, type Role } from '../shared/sim';
import { WORDS } from '../shared/words';
import { LEVELS } from '../shared/levels';

type St = {
  rows: string[];
  role: Role;
  ghost: { id: string; moves: string; user: string; at?: number | undefined; note?: number | undefined };
  humans: number;
  played: boolean;
  streak: number;
  uses: number;
  top: { member: string; score: number }[];
  tutorialDone: boolean;
  partners: Partner[];
  thanks: number;
  stats: Stats;
  hearts: { n: number; nextIn: number };
  seen: string[];
  community: { wins: number; links: number; streak: number; goal: number };
  avatar: string | null;
  weekly: { level: number; best: number | null; top: { member: string; score: number }[] };
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
.card{position:relative;overflow:hidden}
.stars{font-size:30px;color:#f2b84b;display:flex;gap:4px}
.st.on{animation:starpop .55s ease backwards}
@keyframes starpop{0%{transform:scale(0) rotate(-40deg);opacity:0}70%{transform:scale(1.45)}}
.conf{position:absolute;left:50%;top:50px;width:0;height:0;pointer-events:none}
.conf i{position:absolute;width:6px;height:11px;border-radius:2px;animation:burst 1s ease-out forwards}
@keyframes burst{from{opacity:1;transform:rotate(var(--a)) translateY(0)}to{opacity:0;transform:rotate(var(--a)) translateY(-110px)}}
.find{background:#171a22;border:1px solid #2d3345;border-radius:10px;padding:10px;color:#ece8df;font:inherit}
.who{display:flex;justify-content:space-between;padding:12px 14px;text-align:left}
.who small{opacity:.7}
.wordbox{display:flex;flex-direction:column;gap:6px;align-items:center}
.wordbar{display:flex;gap:6px;justify-content:center}
.slot{width:36px;height:42px;border-radius:9px;background:#1b1f2b;border:2px dashed #3a4156;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:21px;color:#5b6278}
.slot.me{background:#f2b84b;color:#14161c;border:2px solid #f2b84b;animation:starpop .45s ease}
.slot.pt{background:#4fc3b5;color:#14161c;border:2px solid #4fc3b5;animation:starpop .45s ease}
.ltr{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:#f6e7c8;text-shadow:0 0 12px rgba(242,184,75,.9);animation:pulse 1.6s infinite;pointer-events:none}
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

const NOTES = [
  'Good luck!',
  'Watch the gate beat.',
  'Hold the door for me!',
  'The first letter is easy.',
  'Take your time.',
  'You have got this!',
  'Thanks for waiting at my door.',
  'Spell it out, friend.',
];

const ago = (t?: number) => {
  if (!t) return '';
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} hours ago` : `${Math.round(m / 1440)} days ago`;
};

function difficultyOf(rows: string[], par: number | null) {
  const flat = rows.join('');
  const doors = ['X', 'Y', 'Z'].filter((d) => flat.includes(d)).length;
  const gate = flat.includes('T');
  const p = par ?? 0;
  if (p >= 14 || (gate && doors >= 2)) return 'Expert';
  if (p >= 12 || gate) return 'Hard';
  if (p >= 10) return 'Medium';
  return 'Easy';
}

function Stars({ n }: { n: number }) {
  return (
    <div className="stars">
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? 'st on' : 'st'} style={{ animationDelay: `${i * 0.25}s` }}>
          {i < n ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

function Confetti() {
  const colors = ['#f2b84b', '#4fc3b5', '#e8735a', '#8b7be8'];
  return (
    <div className="conf">
      {Array.from({ length: 18 }, (_, i) => (
        <i key={i} style={{ '--a': `${i * 20}deg`, background: colors[i % 4] } as CSSProperties} />
      ))}
    </div>
  );
}

function PartnerList({ list, onPick, onBack }: { list: Partner[]; onPick: (id: string) => void; onBack: () => void }) {
  const [q, setQ] = useState('');
  const key = q.trim().replace(/^u\//i, '').toLowerCase();
  const shown = [...list].reverse().filter((p) => p.user.toLowerCase().includes(key));
  return (
    <div className="w">
      <div className="top">
        <span className="logo">Pick a yeste<b>rmate</b></span>
        <button className="tab" onClick={onBack}>Back</button>
      </div>
      <input className="find" placeholder="Search a username, like a friend" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="hint">Each run is a stranger's recording from today. Pick one to play with.</div>
      {shown.length === 0 && <div className="hint">No runs match yet. Ask your friend to win today's level first.</div>}
      {shown.map((p) => (
        <button key={p.id} className="who" onClick={() => onPick(p.id)}>
          <b>{p.user === 'bot' ? 'Bot' : `u/${p.user}`}</b>
          <small>{p.moves.length} steps{p.at ? `, ${ago(p.at)}` : ''}</small>
        </button>
      ))}
    </div>
  );
}

function Tabs({ tab, setTab, onJourney }: { tab: string; setTab: (t: 'play' | 'board') => void; onJourney?: (() => void) | undefined }) {
  return (
    <span>
      <button className={tab === 'play' ? 'tab on' : 'tab'} onClick={() => setTab('play')}>Play</button>
      <button className={tab === 'board' ? 'tab on' : 'tab'} onClick={() => setTab('board')}>Board</button>
      {onJourney && <button className="tab" onClick={onJourney}>Journey</button>}
    </span>
  );
}

type Partner = { id: string; role: Role; moves: string; user: string; at: number; note?: number | undefined };
type Lesson = { n: number; total: number; tip: string; onNext: () => void; name?: string | undefined; endLabel?: string | undefined; onWin?: ((moves: string) => void) | undefined; onBack?: (() => void) | undefined; onSpend?: (() => Promise<boolean>) | undefined };

function Game({ st, tutorial, onBonus, onPartner, onYesterday, onJourney, onChoose, onWeekly, onRefresh }: { st: St; tutorial?: Lesson; onBonus?: () => void; onPartner?: () => void; onYesterday?: () => void; onJourney?: () => void; onChoose?: () => void; onWeekly?: () => void; onRefresh?: () => void }) {
  const level = useMemo(() => parse(st.rows), [st.rows]);
  const [moves, setMoves] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [tab, setTab] = useState<'play' | 'board'>('play');
  const [thanked, setThanked] = useState(false);
  const [copied, setCopied] = useState<'no' | 'ok' | 'fail'>('no');
  const [posted, setPosted] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [noHeart, setNoHeart] = useState(false);
  const [noteSent, setNoteSent] = useState<number | null>(null);
  const [hints, setHints] = useState(0);
  const lockRef = useRef(false);
  const [light, setLight] = useState(() => document.body.classList.contains('light'));
  const toggleTheme = () => setLight(document.body.classList.toggle('light'));
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
  const wordMode = !tutorial || (tutorial.name ?? 'Lesson') !== 'Lesson';
  const envIndex = tutorial?.name === 'Level' ? Math.floor(st.day / 15) : tutorial?.name === 'Weekly Boss' ? 5 : tutorial ? 0 : st.day;
  useEffect(() => {
    document.body.dataset.env = ENVS[envIndex % ENVS.length]!;
  }, [envIndex]);
  const word = useMemo(() => pickWord(level, WORDS, st.day), [level, st.day]);
  const letters = useMemo(() => (wordMode ? placeLetters(level, word[0], st.day) : []), [level, word, st.day, wordMode]);
  const tr = useMemo(() => (wordMode ? trail(level, st.role, moves, st.ghost.moves) : { a: [], b: [] }), [level, moves, st, wordMode]);
  const mineTrail = st.role === 'A' ? tr.a : tr.b;
  const theirTrail = st.role === 'A' ? tr.b : tr.a;
  const hit = (path: { x: number; y: number }[], q: { x: number; y: number }) => path.some((p) => p.x === q.x && p.y === q.y);
  const got = letters.map((q) => ({ ...q, by: hit(mineTrail, q) ? 'me' : hit(theirTrail, q) ? 'pt' : '' }));
  const slotView = [...word[0]].map((c, i) => ({ c, by: got.find((g) => g.slot === i)?.by ?? '' }));
  const wordShown = slotView.map((v) => (v.by ? v.c : '_')).join('');
  const jam = got.some((g) => g.decoy && g.by === 'me');
  useEffect(() => {
    lockRef.current = jam;
  }, [jam]);
  const missed = got.filter((g) => !g.decoy && !g.by).length;
  const hinted = (i: number) => (hints >= 1 && i === 0) || (hints >= 2 && i === word[0].length - 1);
  const wordDone = got.some((g) => !g.decoy) && got.filter((g) => !g.decoy).every((g) => g.by) && !jam;
  const diff = tutorial ? '' : difficultyOf(st.rows, par);
  const wordLine = wordDone ? `Word found: ${word[0]}.` : jam ? 'A wrong letter jammed the word.' : `Word: ${slotView.map((v) => (v.by ? v.c : '_')).join(' ')}. ${missed} letter${missed === 1 ? '' : 's'} missed.`;
  const human = st.ghost.user !== 'bot';
  const postId = (() => {
    try {
      return context.postId;
    } catch {
      return undefined;
    }
  })();
  const postResult = () => {
    setPosted(true);
    fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: shareText }),
    }).catch(() => undefined);
  };
  const sendNote = (i: number) => {
    setNoteSent(i);
    fetch('/api/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: i }),
    }).catch(() => undefined);
  };
  const restart = () => {
    if (tutorial?.onSpend && moves.length > 0 && !finished) {
      tutorial
        .onSpend()
        .then((ok) => (ok ? setMoves('') : setNoHeart(true)))
        .catch(() => undefined);
    } else {
      setMoves('');
    }
  };
  const sayThanks = () => {
    setThanked(true);
    fetch('/api/thanks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ghostId: st.ghost.id }),
    }).catch(() => undefined);
  };
  const slack = 2 + letters.reduce((n, q) => n + (q.decoy ? 0 : 2 * q.d), 0);
  const nStars = wordMode
    ? 1 + (wordDone ? 1 : 0) + (par && moves.length <= par + slack ? 1 : 0)
    : par ? (moves.length <= par ? 3 : moves.length <= par + 2 ? 2 : 1) : 1;
  const shareText = `Yestermate #${st.day + 1} ${'★'.repeat(nStars)}${'☆'.repeat(3 - nStars)}\n${moves.length} steps, par ${par ?? '?'}${human ? `, with u/${st.ghost.user}` : ''}${tutorial ? '' : `\nWord ${wordShown}`}`;
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
      if (finished || moves.length >= MAX_TICKS || lockRef.current) return;
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
      .then((j) => {
        setRes(j.ok ? j : { humans: 0, streak: 0, failed: true });
        if (j.ok) onRefresh?.();
      })
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
      ? `Every move is one step for both of you. Your yestermate is ${st.ghost.user === 'bot' ? 'a bot' : 'u/' + st.ghost.user + (st.ghost.at ? ', who played ' + ago(st.ghost.at) : '')}, and their moves are fixed.${tutorial ? '' : ' Collect the letters to spell the answer.'}`
      : rep.blocked
        ? 'Your yestermate is waiting at the glowing door. Stand on the glowing ring to open it. For a silver gate, just wait for the beat.'
        : onPlate(cellAt(me))
        ? 'You are holding a door open for your partner.'
        : onPlate(cellAt(pt))
          ? 'Your partner is holding a door open for you. Go through it.'
          : moves.length >= 12
            ? `Stuck? Try waiting a step so your partner gets into place.${tutorial?.name === 'Level' ? '' : ' Restart is free.'}`
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
          <div className="hint">Community: {st.community.links} partnerships so far. Next goal: {st.community.goal}. Community streak: {st.community.streak} days.</div>
          {onChoose && <button onClick={onChoose}>Choose a yestermate by name</button>}
          {onWeekly && <button onClick={onWeekly}>Weekly Boss</button>}
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
    <div className={moves.length > 0 && !finished ? 'w playing' : 'w'}>
      <div className="top">
        <span className="logo">Yester<b>mate</b></span>
        <span className="steps">
          {tutorial ? (tutorial.total === 1 ? (tutorial.name ?? 'Lesson') : tutorial.name === 'Level' ? `Level ${tutorial.n}` : `${tutorial.name ?? 'Lesson'} ${tutorial.n} of ${tutorial.total}`) + (tutorial.name === 'Level' ? ` · ♥ ${st.hearts.n}` : '') : `${diff} · Step ${moves.length}${par ? ` · Par ${par}` : ''}`}
        </span>
      </div>
      <div className="top chrome">
        <Tabs tab={tab} setTab={setTab} onJourney={onJourney} />
        <button className="tab" onClick={() => setAudioOpen((v) => !v)}>Settings</button>
      </div>
      {audioOpen && (
        <div className="vol chrome">
          <label>
            <button className="tab" onClick={() => setSound(!sound)}>{sound ? 'Sound on' : 'Sound off'}</button>
            <input type="range" min="0" max="1" step="0.05" value={sfx} onChange={(e) => { sfxVol = Number(e.target.value); setSfx(sfxVol); }} />
          </label>
          <label>
            <button className="tab" onClick={toggleTheme}>{light ? 'Light mode' : 'Dark mode'}</button>
          </label>
          <label>
            <button className="tab" onClick={() => setMusicState(!music)}>{music ? 'Music on' : 'Music off'}</button>
            <input type="range" min="0" max="1" step="0.05" value={mus} onChange={(e) => { musicVol = Number(e.target.value); setMus(musicVol); setMusicVol(musicVol); }} />
          </label>
        </div>
      )}

      {wordMode && (
        <div className="wordbox">
          {!tutorial && st.ghost.note !== undefined && st.ghost.note >= 0 && (
            <div className="note">u/{st.ghost.user} left you a note: “{NOTES[st.ghost.note]}”</div>
          )}
          <div className="wordbar">
            {slotView.map((v, i) => (
              <span key={i} className={v.by ? `slot ${v.by}` : hinted(i) ? 'slot hint' : 'slot'}>{v.by ? v.c : hinted(i) ? v.c : '_'}</span>
            ))}
          </div>
          <div className="hint">Riddle: {word[1]}</div>
          {jam && <div className="hint jam">Wrong letter! The word is jammed. Press restart to try again.</div>}
          {!finished && hints < 2 && <button className="tab" onClick={() => setHints((h) => h + 1)}>Hint ({2 - hints} left)</button>}
        </div>
      )}
      <div className={finished ? 'board won' : 'board'} style={{ aspectRatio: `${cols} / ${rows}`, ['--r' as string]: cols / rows } as CSSProperties}>
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
                const Lt = got.find((g) => g.x === x + 1 && g.y === y + 1);
                const ask = !!waitTarget && (same(waitTarget, x + 1, y + 1) || ('XYZ'.includes(waitCell) && ch === waitCell.toLowerCase()));
                const pressed = isPlate && (same(me, x + 1, y + 1) || same(pt, x + 1, y + 1));
                return (
                  <div key={`${x}-${y}`} className={(ch === '#' ? 'c wall' : 'c') + (ask ? ' ask' : '')}>
                    {isPlate && <div className="plate" style={{ borderColor: k, background: pressed ? k : 'transparent' }} />}
                    {Lt && !Lt.by && <div className="ltr">{Lt.ch}</div>}
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
          {noHeart && <div className="hint jam">No hearts left. One comes back every 30 minutes, and a 3 star clear gives one back.</div>}
          <div className="pad">
            <span />
            <button onClick={() => press(1)}>↑</button>
            <span />
            <button onClick={() => press(3)}>←</button>
            <button onClick={() => press(0)}>wait</button>
            <button onClick={() => press(4)}>→</button>
            <span />
            <button onClick={() => press(2)}>↓</button>
            <button className={jam ? 'main' : undefined} onClick={restart}>restart</button>
          </div>
        </>
      )}

      {finished && (
        <div className="card">
          <Confetti />
          {tutorial ? (
            <>
              <div className="big">Nice!</div>
              <Stars n={nStars} />
              {wordMode && <div className="hint">{wordLine} Stars: 1 finish, 2 spell the word, 3 few steps.</div>}
              <div className="hint">{tutorial.total === 1 ? 'Done' : tutorial.name === 'Level' ? `Level ${tutorial.n} done` : `${tutorial.name ?? 'Lesson'} ${tutorial.n} of ${tutorial.total} done`} in {moves.length} steps. Par is {par}.</div>
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
              <Stars n={nStars} />
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
              <div className="hint">{wordDone ? `Word found: ${word[0]}. You and your yestermate spelled it together.` : `Word: ${slotView.map((v) => (v.by ? v.c : '_')).join(' ')}. ${missed} letter${missed === 1 ? '' : 's'} missed.`}</div>
              {!res.practice && <Chain partners={st.partners} joined />}
              {!res.practice && (
                <div>
                  {noteSent === null ? (
                    <>
                      <div className="hint">Leave a note for the next stranger:</div>
                      <div className="chips">
                        {NOTES.map((n, i) => (
                          <button key={i} className="chip" onClick={() => sendNote(i)}>{n}</button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="hint">Note sent: “{NOTES[noteSent]}” The next stranger will read it.</div>
                  )}
                </div>
              )}
              <div className="two">
                <button onClick={copyResult}>{copied === 'ok' ? 'Copied' : 'Copy result'}</button>
                {!res.practice && (
                  <button disabled={posted} onClick={postResult}>{posted ? 'Posted' : 'Post to comments'}</button>
                )}
              </div>
              {copied === 'fail' && <div className="share">{shareText}</div>}
              {(human || postId) && (
                <div className="two">
                  {human && (
                    <button disabled={thanked} onClick={sayThanks}>{thanked ? 'Thanks sent' : `Thank u/${st.ghost.user}`}</button>
                  )}
                  {postId && (
                    <button onClick={() => navigateTo(`https://www.reddit.com/comments/${postId.replace(/^t3_/, '')}`)}>Comment</button>
                  )}
                </div>
              )}
              {onPartner ? (
                <button className="main" onClick={onPartner}>Play with another stranger</button>
              ) : (
                <button className="main" onClick={() => setMoves('')}>Play again for practice</button>
              )}
              <details className="more">
                <summary>More ways to play</summary>
                {onChoose && <button onClick={onChoose}>Choose a yestermate by name</button>}
                {onWeekly && <button onClick={onWeekly}>Weekly Boss</button>}
                {onYesterday && <button onClick={onYesterday}>Yesterday's puzzle, with yesterday's mate</button>}
                {onBonus && <button onClick={onBonus}>Bonus puzzles with a bot</button>}
              </details>
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

type Plan = { rows: string[]; role: Role; tip: string; day?: number };

function Tutorial({ lessons, onDone, name, endLabel }: { lessons: Plan[]; onDone: () => void; name?: string; endLabel?: string }) {
  const [i, setI] = useState(0);
  const t = lessons[i]!;
  const st = useMemo<St>(() => {
    const sol = solve(parse(t.rows))!;
    const ghost = { id: 'tutorial', moves: t.role === 'A' ? sol.b : sol.a, user: 'bot' };
    return { day: t.day ?? 0, rows: t.rows, role: t.role, ghost, humans: 0, played: false, streak: 0, uses: 0, top: [], tutorialDone: true, recent: [], partners: [], thanks: 0, yesterday: null, stats: { dailyStars: 0, dailyThree: 0, journey: [] }, community: { wins: 0, links: 0, streak: 0, goal: 10 }, avatar: null, weekly: { level: 0, best: null, top: [] }, hearts: { n: 5, nextIn: 0 }, seen: [] };
  }, [t]);
  const next = () => (i + 1 < lessons.length ? setI(i + 1) : onDone());
  return <Game key={i} st={st} tutorial={{ n: i + 1, total: lessons.length, tip: t.tip, onNext: next, name, endLabel }} />;
}

const WORLDS = [
  { name: 'Warm-up', tag: 'Easy' },
  { name: 'Crossings', tag: 'Easy' },
  { name: 'Tricky doors', tag: 'Medium' },
  { name: 'Gate rhythm', tag: 'Hard' },
  { name: 'Deep vaults', tag: 'Hard' },
  { name: 'The Echo', tag: 'Expert' },
  { name: 'Season 2: Moonrise', tag: 'Medium' },
  { name: 'Long shadows', tag: 'Medium' },
  { name: 'Mirror halls', tag: 'Hard' },
  { name: 'Storm gates', tag: 'Hard' },
  { name: 'Echo vault', tag: 'Expert' },
  { name: 'The last path', tag: 'Expert' },
];
const WORLD_SIZE = 15;

function JourneyMap({ st, onPick, onBack }: { st: St; onPick: (i: number) => void; onBack: () => void }) {
  const done = st.stats.journey;
  const m: Metrics = metricsOf(st);
  const firstOpen = done.findIndex((v) => !(v ?? 0));
  const frontier = firstOpen === -1 ? done.length : firstOpen;
  const current = Math.floor(frontier / WORLD_SIZE);
  return (
    <div className="w">
      <div className="top">
        <span className="logo">Jour<b>ney</b></span>
        <button className="tab" onClick={onBack}>Back</button>
      </div>
      <div className="hint">
        ♥ {st.hearts.n}/5{st.hearts.n < 5 ? `, next heart in ${Math.ceil(st.hearts.nextIn / 60)} min` : ''}. Restarting a level costs a heart. A 3 star clear gives one back.
      </div>
      <div className="hint">Level {frontier + 1} is next. {m.stars} stars so far. The Journey never ends: new worlds appear as you climb.</div>
      {Array.from({ length: current + 2 }, (_, k) => {
        const w = WORLDS[k % WORLDS.length]!;
        const round = Math.floor(k / WORLDS.length);
        const from = k * WORLD_SIZE;
        const count = done.slice(from, from + WORLD_SIZE).filter((v) => (v ?? 0) > 0).length;
        return (
          <div key={k}>
            <div className="world">
              <b>World {k + 1}: {w.name}{round > 0 ? ` (mirror ${round})` : ''}</b>
              <span>{w.tag} · {count}/{WORLD_SIZE}</span>
            </div>
            {k <= current ? (
              <div className="map">
                {Array.from({ length: WORLD_SIZE }, (_, j) => {
                  const i = from + j;
                  const stars = done[i] ?? 0;
                  const open = i === 0 || (done[i - 1] ?? 0) > 0;
                  return (
                    <button key={i} disabled={!open || st.hearts.n < 1} className={stars ? 'lv done' : 'lv'} onClick={() => onPick(i)}>
                      {i + 1}
                      <small>{open ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : 'locked'}</small>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="hint">Locked. Clear World {k} to enter.</div>
            )}
          </div>
        );
      })}
      <div className="big">Badges</div>
      <Badges m={m} />
    </div>
  );
}

function JourneyPlay({ level, base, onBack, onNext, onSaved, onHearts, weekly = false }: { level: number; base: St; onBack: () => void; onNext: () => void; onSaved: (j: number[]) => void; onHearts: (h: { n: number; nextIn: number }) => void; weekly?: boolean }) {
  const rows = useMemo(() => variantRows(JOURNEY[level % JOURNEY.length]!, Math.floor(level / JOURNEY.length)), [level]);
  const role: Role = weekly ? 'A' : level % 2 ? 'B' : 'A';
  const sol = useMemo(() => solve(parse(rows))!, [rows]);
  const st = useMemo<St>(
    () => ({ ...base, day: level, rows, role, ghost: { id: `j${level}`, moves: role === 'A' ? sol.b : sol.a, user: 'bot' } }),
    [base, level, rows, role, sol]
  );
  const onWin = (moves: string) => {
    fetch(weekly ? '/api/weekly' : '/api/journey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level, moves }) })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          onSaved(j.journey ?? []);
          if (j.hearts) onHearts(j.hearts);
        }
      })
      .catch(() => undefined);
  };
  const onSpend = () =>
    fetch('/api/hearts/spend', { method: 'POST' })
      .then((r) => r.json())
      .then((j) => {
        if (j.hearts) onHearts(j.hearts);
        return !!j.ok;
      });
  const lesson: Lesson = weekly
    ? { n: 1, total: 1, tip: 'Weekly Boss. Fewest steps wins the week.', name: 'Weekly Boss', endLabel: 'Back', onNext: onBack, onBack, onWin }
    : { n: level + 1, total: 1000000, tip: `Level ${level + 1}. Your partner is a bot.`, name: 'Level', endLabel: 'Back to the map', onNext, onBack, onWin, onSpend };
  return <Game key={level} st={st} tutorial={lesson} />;
}

function WeeklyView({ st, onPlay, onBack }: { st: St; onPlay: () => void; onBack: () => void }) {
  return (
    <div className="w">
      <div className="top">
        <span className="logo">Weekly <b>Boss</b></span>
        <button className="tab" onClick={onBack}>Back</button>
      </div>
      <div className="hint">One hard level for the whole week, with a bot partner. Finish in the fewest steps. A new boss arrives every 7 days.</div>
      <div className="card">
        <div className="big">{st.weekly.best ? `Your best: ${st.weekly.best} steps` : 'Not beaten yet'}</div>
        <button onClick={onPlay}>{st.weekly.best ? 'Try to beat your best' : 'Take on the boss'}</button>
      </div>
      <div className="big">Fewest steps this week</div>
      {st.weekly.top.length === 0 && <div className="hint">Nobody yet. Be the first.</div>}
      {st.weekly.top.map((t, i) => (
        <div key={t.member} className="rowb">
          <span>{i + 1}. u/{t.member}</span>
          <span>{t.score}</span>
        </div>
      ))}
    </div>
  );
}

function App({ onState }: { onState: (s: St) => void }) {
  const [st, setSt] = useState<St | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [bonus, setBonus] = useState(false);
  const [yday, setYday] = useState(false);
  const [jmap, setJmap] = useState(false);
  const [jlevel, setJlevel] = useState<number | null>(null);
  const [plist, setPlist] = useState(false);
  const [wview, setWview] = useState(false);
  const [wplay, setWplay] = useState(false);
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
  useEffect(() => {
    if (st) onState(st);
  }, [st, onState]);
  const refreshProgress = () => {
    fetch('/api/progress')
      .then((r) => r.json())
      .then((j) => setSt((p) => (p ? { ...p, ...j } : p)))
      .catch(() => undefined);
  };
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
  if (wplay) {
    return (
      <JourneyPlay
        weekly
        onHearts={() => undefined}
        level={st.weekly.level}
        base={st}
        onBack={() => setWplay(false)}
        onNext={() => setWplay(false)}
        onSaved={() => {
          fetch('/api/state').then((r) => r.json()).then(setSt).catch(() => undefined);
        }}
      />
    );
  }
  if (wview) return <WeeklyView st={st} onPlay={() => setWplay(true)} onBack={() => setWview(false)} />;
  if (plist) {
    return (
      <PartnerList
        list={st.partners}
        onBack={() => setPlist(false)}
        onPick={(id) => {
          setPick(st.partners.findIndex((p) => p.id === id));
          setPlist(false);
        }}
      />
    );
  }
  if (jlevel !== null) {
    return (
      <JourneyPlay
        level={jlevel}
        base={st}
        onBack={() => setJlevel(null)}
        onNext={() => setJlevel(jlevel + 1)}
        onSaved={(journey) => setSt((p) => (p ? { ...p, stats: { ...p.stats, journey } } : p))}
        onHearts={(h) => setSt((p) => (p ? { ...p, hearts: h } : p))}
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
    const list: Plan[] = Array.from({ length: 5 }, (_, k) => {
      const idx = 1 + ((st.day + k) % (LEVELS.length - 1));
      return { rows: LEVELS[idx]!, day: idx, role: (k % 2 ? 'B' : 'A') as Role, tip: 'Bonus puzzle. Your partner is a bot, so this does not change the chain.' };
    });
    return <Tutorial lessons={list} name="Bonus" endLabel="Back to today's puzzle" onDone={() => setBonus(false)} />;
  }
  const list = st.partners;
  const chosen = pick >= 0 ? list[pick] : undefined;
  const dst: St = chosen
    ? { ...st, role: chosen.role === 'A' ? 'B' : 'A', ghost: { id: chosen.id, moves: chosen.moves, user: chosen.user, at: chosen.at, note: chosen.note } }
    : st;
  const nextPartner = () => setPick((p) => ((p < 0 ? list.length - 1 : p) + 1) % list.length);
  return <Game key={dst.ghost.id} st={dst} onBonus={() => setBonus(true)} onRefresh={refreshProgress} onJourney={() => setJmap(true)} onWeekly={() => setWview(true)} {...(st.partners.length > 1 ? { onChoose: () => setPlist(true) } : {})} {...(st.yesterday ? { onYesterday: () => setYday(true) } : {})} {...(list.length > 1 ? { onPartner: nextPartner } : {})} />;
}

function BadgePopup({ names, onClose }: { names: string[]; onClose: () => void }) {
  return (
    <div className="pop" onClick={onClose}>
      <div className="popcard" onClick={(e) => e.stopPropagation()}>
        <Confetti />
        <div className="big">{names.length > 1 ? 'New badges!' : 'New badge!'}</div>
        {names.map((n) => (
          <span key={n} className="bdg on">{n}</span>
        ))}
        <button className="main" onClick={onClose}>Nice!</button>
      </div>
    </div>
  );
}

function Root() {
  const [pop, setPop] = useState<string[]>([]);
  const known = useRef<string[] | null>(null);
  const check = useCallback((s: St) => {
    if (known.current === null) known.current = s.seen ?? [];
    const fresh = earnedNames(metricsOf(s)).filter((n) => !known.current!.includes(n));
    if (fresh.length === 0) return;
    known.current = [...known.current, ...fresh];
    setPop(fresh);
    fetch('/api/badges/seen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names: fresh }) }).catch(() => undefined);
  }, []);
  return (
    <>
      <App onState={check} />
      {pop.length > 0 && <BadgePopup names={pop} onClose={() => setPop([])} />}
    </>
  );
}

const style = document.createElement('style');
style.textContent = css + chainCss + badgeCss + themeCss;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);