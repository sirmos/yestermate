import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parse } from '../shared/sim';
import { Chain, chainCss } from './chain';
import { themeCss } from './theme';

type Info = {
  day: number;
  rows: string[];
  role: 'A' | 'B';
  humans: number;
  avatar: string | null;
  community: { wins: number; links: number; streak: number; goal: number };
  partners: { id: string; user: string }[];
  played: boolean;
  streak: number;
  uses: number;
  ghost: { user: string };
};

const css = `
body{margin:0;background:radial-gradient(120% 70% at 50% 0%,#222838 0%,#14161c 62%);color:#ece8df;font-family:'Trebuchet MS',system-ui,sans-serif}
.s{min-height:100vh;box-sizing:border-box;padding:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center}
.pair{display:flex;align-items:center;gap:0}
.d{width:22px;height:22px;border-radius:50%}
.l{width:54px;border-top:3px dashed #5b6278}
h1{margin:0;font-size:28px;letter-spacing:.5px}
.sub{font-size:14px;opacity:.75;max-width:280px;line-height:1.4}
.row{display:flex;gap:18px;font-size:13px}
.row b{display:block;font-size:20px;color:#f2b84b}
h1 b{color:#f2b84b}
.mini{display:grid;gap:3px}
.m{width:24px;height:24px;border-radius:6px;background:#272c3b;position:relative}
.m.w{background:#0d0f14}
.mk{position:absolute;inset:4px}
.who2{display:flex;align-items:center;gap:8px;font-size:13px;opacity:.9}
.who2 img{width:26px;height:26px;border-radius:50%;background:#272c3b}
.comm{font-size:12px;opacity:.85;display:flex;flex-direction:column;align-items:center;gap:4px}
.bar2{width:200px;height:7px;border-radius:99px;background:#272c3b;overflow:hidden}
.bar2 i{display:block;height:100%;background:#f2b84b}
.go{background:#f2b84b;color:#14161c;border:0;border-radius:999px;padding:12px 28px;font-size:16px;font-weight:700;cursor:pointer}
`;

function Mini({ rows, role }: { rows: string[]; role: 'A' | 'B' }) {
  const l = parse(rows);
  const cols = l.cells[0]!.length - 2;
  const n = l.cells.length - 2;
  const me = role === 'A' ? l.a : l.b;
  const pt = role === 'A' ? l.b : l.a;
  const myGoal = role === 'A' ? l.ga : l.gb;
  const ptGoal = role === 'A' ? l.gb : l.ga;
  const door: Record<string, string> = { x: '#e8735a', y: '#8b7be8', z: '#4fa3e8', t: '#cfd6e6' };
  const same = (p: { x: number; y: number }, x: number, y: number) => p.x === x + 1 && p.y === y + 1;
  return (
    <div className="mini" style={{ gridTemplateColumns: `repeat(${cols}, 24px)`, gridTemplateRows: `repeat(${n}, 24px)` }}>
      {l.cells.slice(1, -1).flatMap((row, y) =>
        row
          .slice(1, -1)
          .split('')
          .map((ch, x) => {
            const k = door[ch.toLowerCase()];
            const plate = 'xyz'.includes(ch);
            return (
              <div key={`${x}-${y}`} className={ch === '#' ? 'm w' : 'm'}>
                {k && plate && <div className="mk" style={{ border: `2px solid ${k}`, borderRadius: '50%' }} />}
                {k && !plate && <div className="mk" style={{ background: k, inset: '2px 8px', borderRadius: 3 }} />}
                {same(myGoal, x, y) && <div className="mk" style={{ border: '2px dashed #f2b84b', borderRadius: 6 }} />}
                {same(ptGoal, x, y) && <div className="mk" style={{ border: '2px dashed #4fc3b5', borderRadius: 6 }} />}
                {same(pt, x, y) && <div className="mk" style={{ background: '#4fc3b5', opacity: 0.85, borderRadius: '36%' }} />}
                {same(me, x, y) && <div className="mk" style={{ background: '#f2b84b', borderRadius: '36%' }} />}
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
      <h1>Yester<b>mate</b></h1>
      <div className="sub">
        {info
          ? 'Yesterday, a stranger left you a path. Today, you finish what they started.'
          : 'Solve a small puzzle with a stranger from yesterday.'}
      </div>
      {info && (
        <div className="who2">
          {info.avatar && <img src={info.avatar} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}
          <span>Your yestermate today: {partner}</span>
        </div>
      )}
      {info && <Chain partners={info.partners} />}
      {info && (
        <div className="row">
          <span><b>{info.humans}</b>in today's chain</span>
          <span><b>{info.streak}</b>day streak</span>
          <span><b>{info.uses}</b>used your runs</span>
        </div>
      )}
      {info && (
        <div className="comm">
          <span>Community: {info.community.links} of {info.community.goal} partnerships</span>
          <div className="bar2"><i style={{ width: `${Math.min(100, (info.community.links / Math.max(1, info.community.goal)) * 100)}%` }} /></div>
        </div>
      )}
      <button className="go" onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}>
        {info?.played ? 'Play again' : "Play today's level"}
      </button>
    </div>
  );
}

const style = document.createElement('style');
style.textContent = css + chainCss + themeCss;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);