// A row of linked dots: one per person in today's chain, ending with your slot.
export const chainCss = `
.chain{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;row-gap:6px}
.lk{display:flex;align-items:center}
.ln{width:14px;border-top:2px dashed #5b6278}
.dot{width:28px;height:28px;border-radius:50%;background:#4fc3b5;color:#14161c;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}
.dot.bot{background:#3a4156;color:#9aa3bb}
.dot.next{background:transparent;border:2px dashed #f2b84b;color:#f2b84b;font-size:10px}
.dot.you{background:#f2b84b;color:#14161c;font-size:10px;box-shadow:0 0 12px rgba(242,184,75,.6)}
`;

type Person = { id: string; user: string };

export function Chain({ partners, joined = false }: { partners: Person[]; joined?: boolean }) {
  const shown = partners.slice(-6);
  return (
    <div className="chain">
      {shown.map((p, i) => (
        <span key={p.id} className="lk">
          {i > 0 && <i className="ln" />}
          <b className={p.user === 'bot' ? 'dot bot' : 'dot'} title={p.user}>
            {p.user === 'bot' ? 'bot' : p.user.slice(0, 1).toUpperCase()}
          </b>
        </span>
      ))}
      <span className="lk">
        {shown.length > 0 && <i className="ln" />}
        <b className={joined ? 'dot you' : 'dot next'}>you</b>
      </span>
    </div>
  );
}