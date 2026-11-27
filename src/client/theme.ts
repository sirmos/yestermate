// Visual polish layered over the base styles of each screen.
export const themeCss = `
body{background:radial-gradient(120% 70% at 50% -10%,#2a3150 0%,#171a24 55%,#101218 100%);background-attachment:fixed}
body::before{content:'';position:fixed;inset:0;background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.045) 1px,transparent 0);background-size:22px 22px;pointer-events:none}
.board{filter:drop-shadow(0 10px 26px rgba(0,0,0,.45))}
.c{background:linear-gradient(155deg,#30364a,#262b3b);box-shadow:inset 0 0 0 2px #151821,inset 0 1px 0 rgba(255,255,255,.05)}
.c.wall{background:repeating-linear-gradient(135deg,#0f1118 0 6px,#12141c 6px 12px);box-shadow:inset 0 0 0 2px #0a0b10}
.body{box-shadow:0 6px 14px rgba(0,0,0,.5),inset 0 -4px 0 rgba(0,0,0,.18),inset 0 3px 0 rgba(255,255,255,.28)}
.door{box-shadow:0 0 12px rgba(255,255,255,.25)}
.plate{box-shadow:0 0 10px rgba(255,255,255,.12)}
button{background:linear-gradient(#383e55,#2b3044);box-shadow:0 3px 0 #171a26,0 6px 14px rgba(0,0,0,.25);letter-spacing:.2px}
button:active{transform:translateY(3px);box-shadow:0 0 0 #171a26}
.card{background:linear-gradient(160deg,#272c3f,#202435);border:1px solid rgba(255,255,255,.06);box-shadow:0 14px 34px rgba(0,0,0,.4)}
.big{text-shadow:0 0 18px rgba(242,184,75,.35)}
.go{box-shadow:0 0 26px rgba(242,184,75,.45),0 4px 0 #b88a2e}
.w.playing .chrome{display:none}
.vol{flex-wrap:wrap}
.pad button{padding:10px 0}
.pad{gap:6px}
.hint{font-size:14px;opacity:.9}
.main{background:linear-gradient(#f4c862,#e0a52e);color:#14161c;font-weight:800;box-shadow:0 3px 0 #b88a2e,0 6px 14px rgba(0,0,0,.25)}
.more{display:flex;flex-direction:column;gap:8px}
.more summary{cursor:pointer;font-size:14px;opacity:.85;padding:6px 0}
`;