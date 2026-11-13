import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parse } from '../shared/sim';

type Info = {
  day: number;
  rows: string[];
  role: 'A' | 'B';
  humans: number;
  played: boolean;
  streak: number;
  uses: number;
  ghost: { user: string };
};

const css = `
body{margin:0;background:#14161c;color:#ece8df;font-family:system-ui,sans-serif}
.s{min-height:100vh;box-sizing:border-box;padding:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center}
.pair{display:flex;align-items:center;gap:0}
.d{width:22px;height:22px;border-radius:50%}
.l{width:54px;border-top:3px dashed #5b6278}
h1{margin:0;font-size:28px;letter-spacing:.5px}
.sub{font-size:14px;opacity:.75;max-width:280px;line-height:1.4}
.row{display:flex;gap:18px;font-size:13px}
.row b{display:block;font-size:20px;color:#f2b84b}
.mini{display:grid;gap:2px}
.m{width:16px;height:16px;border-radius:3px;background:#232733;position:relative}
.m.w{background:#0c0d11}
.mk{position:absolute;inset:2px;border-radius:50%}
.go{background:#f2b84b;color:#14161c;border:0;border-radius:999px;padding:12px 28px;font-size:16px;font-weight:700;cursor:pointer}
`;

function Mini({ rows, role }: { rows: string[]; role: 'A' | 'B' }) {
  const l = parse(rows);
  const me = role === 'A' ? l.a : l.b;
  const pt = role === 'A' ? l.b : l.a;
  const myGoal = role === 'A' ? l.ga : l.gb;
  const ptGoal = role === 'A' ? l.gb : l.ga;
  const door: Record<string, string> = { x: '#e8735a', y: '#8b7be8' };
  const same = (p: { x: number; y: number }, x: number, y: number) => p.x === x && p.y === y;
  return (
    <div className="mini" style={{ gridTemplateColumns: `repeat(${l.cells[0]!.length}, 16px)` }}>
      {l.cells.flatMap((row, y) =>
        row.split('').map((ch, x) => {
          const col = door[ch.toLowerCase()];
          const plate = ch === ch.toLowerCase();
          return (
            <div key={`${x}-${y}`} className={ch === '#' ? 'm w' : 'm'}>
              {col && <div className="mk" style={{ background: col, opacity: plate ? 0.5 : 1, borderRadius: plate ? '50%' : 2 }} />}
              {same(myGoal, x, y) && <div className="mk" style={{ border: '2px dashed #f2b84b', borderRadius: 4 }} />}
              {same(ptGoal, x, y) && <div className="mk" style={{ border: '2px dashed #4fc3b5', borderRadius: 4 }} />}
              {same(pt, x, y) && <div className="mk" style={{ background: '#4fc3b5', opacity: 0.8 }} />}
              {same(me, x, y) && <div className="mk" style={{ background: '#f2b84b' }} />}
            </div>
          );
        })
      )}
    </div>
  );
}

function Splash() {
  const [info, setInfo] = useState<Info | null>(null);
  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  const partner = info ? (info.ghost.user === 'bot' ? 'a bot' : `u/${info.ghost.user}`) : '';

  return (
    <div className="s">
      {info ? (
        <Mini rows={info.rows} role={info.role} />
      ) : (
        <div className="pair">
          <div className="d" style={{ background: '#f2b84b' }} />
          <div className="l" />
          <div className="d" style={{ background: '#4fc3b5', opacity: 0.75 }} />
        </div>
      )}
      <h1>Yestermate</h1>
      <div className="sub">
        {info
          ? `Today your partner is ${partner}. Their moves are fixed. Time yours to fit.`
          : 'Solve a small puzzle with a stranger from yesterday.'}
      </div>
      {info && (
        <div className="row">
          <span><b>{info.humans}</b>in today's chain</span>
          <span><b>{info.streak}</b>day streak</span>
          <span><b>{info.uses}</b>used your runs</span>
        </div>
      )}
      <button className="go" onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}>
        {info?.played ? 'Play again' : "Play today's level"}
      </button>
    </div>
  );
}

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);