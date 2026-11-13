import './index.css';
import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MAX_TICKS, parse, start, step, type Role } from '../shared/sim';

type St = {
  rows: string[];
  role: Role;
  ghost: { id: string; moves: string; user: string };
  humans: number;
  played: boolean;
  streak: number;
  uses: number;
  top: { member: string; score: number }[];
};
type Result = { humans: number; streak: number; practice?: boolean };

const KEYS: Record<string, number> = {
  ArrowUp: 1, w: 1, ArrowDown: 2, s: 2, ArrowLeft: 3, a: 3, ArrowRight: 4, d: 4, ' ': 0,
};
const COLOR: Record<string, string> = { x: '#e8735a', y: '#8b7be8' };
const ME = '#f2b84b';
const PARTNER = '#4fc3b5';

const css = `
body{margin:0;background:#14161c;color:#ece8df;font-family:system-ui,sans-serif}
.w{max-width:440px;margin:0 auto;padding:12px;display:flex;flex-direction:column;gap:10px;min-height:100vh;box-sizing:border-box}
.top{display:flex;justify-content:space-between;font-size:13px;opacity:.8}
.grid{display:grid;gap:3px}
.c{aspect-ratio:1;border-radius:6px;position:relative;background:#232733}
.c.wall{background:#0c0d11}
.dot{position:absolute;inset:22%;border-radius:50%}
.bar{position:absolute;inset:8% 30%;border-radius:3px}
.goal{position:absolute;inset:14%;border-radius:8px;border:2px dashed}
.me,.pt{position:absolute;inset:16%;border-radius:50%;transition:all .12s}
.pt{opacity:.75;box-shadow:inset 0 0 0 3px #14161c}
.pad{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
button{background:#2b3040;color:#ece8df;border:0;border-radius:10px;padding:14px 0;font-size:18px}
button:active{background:#3a4156}
.card{background:#232733;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:8px}
.big{font-size:26px;font-weight:700}
.hint{font-size:13px;opacity:.7;line-height:1.4}
`;

function Game({ st }: { st: St }) {
  const level = useMemo(() => parse(st.rows), [st.rows]);
  const [moves, setMoves] = useState('');
  const [res, setRes] = useState<Result | null>(null);

  const sim = useMemo(() => {
    let s = start(level);
    for (let t = 0; t < moves.length; t++) {
      const p = Number(moves[t]);
      const g = Number(st.ghost.moves[t] ?? '0');
      s = st.role === 'A' ? step(level, s, p, g) : step(level, s, g, p);
    }
    return s;
  }, [level, moves, st]);

  const finished = sim.da && sim.db;
  const me = st.role === 'A' ? sim.a : sim.b;
  const pt = st.role === 'A' ? sim.b : sim.a;
  const myGoal = st.role === 'A' ? level.ga : level.gb;
  const ptGoal = st.role === 'A' ? level.gb : level.ga;

  const press = useCallback(
    (m: number) => {
      if (finished || moves.length >= MAX_TICKS) return;
      setMoves((v) => v + m);
    },
    [finished, moves.length]
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
    if (!finished || res) return;
    fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moves, ghostId: st.ghost.id }),
    })
      .then((r) => r.json())
      .then((j) => setRes(j))
      .catch(() => setRes({ humans: st.humans, streak: st.streak, practice: true }));
    // Only send once, when the level is finished.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const cellAt = (p: { x: number; y: number }) => level.cells[p.y]![p.x]!;
  const doorOpacity = (door: string) => {
    const plate = door.toLowerCase();
    if (cellAt(pt) === plate) return 0.15;
    if (cellAt(me) === plate) return 0.5;
    return 1;
  };

  const w = level.cells[0]!.length;
  return (
    <div className="w">
      <div className="top">
        <span>You are the amber dot</span>
        <span>Step {moves.length} / {MAX_TICKS}</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${w}, 1fr)` }}>
        {level.cells.flatMap((row, y) =>
          row.split('').map((ch, x) => {
            const door = ch === 'X' || ch === 'Y';
            const col = COLOR[ch.toLowerCase()];
            return (
              <div key={`${x}-${y}`} className={ch === '#' ? 'c wall' : 'c'}>
                {(ch === 'x' || ch === 'y') && <div className="dot" style={{ background: col, opacity: 0.5 }} />}
                {door && (
                  <div className="bar" style={{ background: col, opacity: doorOpacity(ch) }} />
                )}
                {x === myGoal.x && y === myGoal.y && <div className="goal" style={{ borderColor: ME }} />}
                {x === ptGoal.x && y === ptGoal.y && <div className="goal" style={{ borderColor: PARTNER }} />}
                {x === pt.x && y === pt.y && <div className="pt" style={{ background: PARTNER }} />}
                {x === me.x && y === me.y && <div className="me" style={{ background: ME }} />}
              </div>
            );
          })
        )}
      </div>

      {!finished && (
        <>
          <div className="hint">
            {moves.length === 0
              ? `Each move is one step for you and your partner. Your partner is ${st.ghost.user === 'bot' ? 'a bot' : 'u/' + st.ghost.user}, and their moves are fixed. Time yours to fit.`
              : 'A door opens only while your partner stands on its plate. Hold theirs the same way.'}
          </div>
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
          {!res ? (
            <div>Adding your run to the chain...</div>
          ) : (
            <>
              <div className="big">Link #{res.humans}</div>
              <div>
                {res.practice
                  ? 'Practice run. Your run for today is already in the chain.'
                  : `You and ${st.ghost.user === 'bot' ? 'the bot' : 'u/' + st.ghost.user} solved it in ${moves.length} steps.`}
              </div>
              <div>Streak: {res.streak} day{res.streak === 1 ? '' : 's'}</div>
              <div>Strangers who played with your runs: {st.uses}</div>
              <div className="hint">Come back tomorrow to see who used your run.</div>
              <button onClick={() => setMoves('')}>Play again for practice</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  const [st, setSt] = useState<St | null>(null);
  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then(setSt)
      .catch(() => undefined);
  }, []);
  if (!st) return <div className="w">Loading...</div>;
  return <Game st={st} />;
}

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);