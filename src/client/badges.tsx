// Badges are worked out from numbers the server already keeps.
export type Stats = { dailyStars: number; dailyThree: number; journey: number[] };
export type Metrics = { streak: number; stars: number; threes: number; cleared: number; thanks: number; used: number };

export const metricsOf = (x: { streak: number; thanks: number; uses: number; stats: Stats }): Metrics => {
  const j = x.stats.journey.map((v) => v ?? 0);
  return {
    streak: x.streak,
    stars: x.stats.dailyStars + j.reduce((a, b) => a + b, 0),
    threes: x.stats.dailyThree + j.filter((v) => v === 3).length,
    cleared: j.filter((v) => v > 0).length,
    thanks: x.thanks,
    used: x.uses,
  };
};

const LIST: { name: string; key: keyof Metrics; goal: number }[] = [
  { name: '3 day streak', key: 'streak', goal: 3 },
  { name: '7 day streak', key: 'streak', goal: 7 },
  { name: '14 day streak', key: 'streak', goal: 14 },
  { name: '30 day streak', key: 'streak', goal: 30 },
  { name: '25 stars', key: 'stars', goal: 25 },
  { name: '100 stars', key: 'stars', goal: 100 },
  { name: '250 stars', key: 'stars', goal: 250 },
  { name: '10 perfect levels', key: 'threes', goal: 10 },
  { name: '30 perfect levels', key: 'threes', goal: 30 },
  { name: '10 levels cleared', key: 'cleared', goal: 10 },
  { name: '25 levels cleared', key: 'cleared', goal: 25 },
  { name: '50 levels cleared', key: 'cleared', goal: 50 },
  { name: 'Journey complete', key: 'cleared', goal: 90 },
  { name: 'Good partner', key: 'thanks', goal: 5 },
  { name: 'Crowd favorite', key: 'used', goal: 25 },
];

export const badgeCss = `
.bdgs{display:flex;flex-wrap:wrap;gap:6px}
.bdg{font-size:11px;padding:4px 9px;border-radius:999px;background:#232837;color:#8d95ad}
.bdg.on{background:#f2b84b;color:#14161c;font-weight:700}
`;

export function Badges({ m }: { m: Metrics }) {
  const rows = LIST.map((b) => ({ ...b, v: m[b.key] }));
  return (
    <div className="bdgs">
      {rows.filter((b) => b.v >= b.goal).map((b) => (
        <span key={b.name} className="bdg on">{b.name}</span>
      ))}
      {rows.filter((b) => b.v < b.goal).map((b) => (
        <span key={b.name} className="bdg">{b.name} {b.v}/{b.goal}</span>
      ))}
    </div>
  );
}