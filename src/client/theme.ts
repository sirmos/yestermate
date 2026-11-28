// Visual polish layered over the base styles of each screen.
export const ENVS = ['night', 'forest', 'desert', 'ocean', 'ember', 'frost'];

export const themeCss = `
body{background:radial-gradient(120% 70% at 50% -10%,var(--glow,#2a3150) 0%,#171a24 55%,#101218 100%);background-attachment:fixed}
body::before{content:'';position:fixed;inset:0;background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.045) 1px,transparent 0);background-size:22px 22px;pointer-events:none}
.board{filter:drop-shadow(0 10px 26px rgba(0,0,0,.45))}
.c{background:linear-gradient(155deg,var(--c1,#30364a),var(--c2,#262b3b));box-shadow:inset 0 0 0 2px #151821,inset 0 1px 0 rgba(255,255,255,.05)}
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
.world{display:flex;justify-content:space-between;align-items:baseline;margin:8px 0 4px}
.world span{font-size:12px;opacity:.75}
body.light{background:radial-gradient(120% 70% at 50% -10%,#fff6dd 0%,#eef1f8 55%,#e4e9f3 100%);color:#232634}
body.light::before{background-image:radial-gradient(circle at 1px 1px,rgba(0,0,0,.05) 1px,transparent 0)}
body.light .c{background:linear-gradient(155deg,#ffffff,#e8ecf6);box-shadow:inset 0 0 0 2px #d3d9e7}
body.light .c.wall{background:repeating-linear-gradient(135deg,#98a1b7 0 6px,#a6aec2 6px 12px);box-shadow:inset 0 0 0 2px #8791a8}
body.light button{background:linear-gradient(#ffffff,#e3e8f3);color:#232634;box-shadow:0 3px 0 #b8c0d5,0 6px 14px rgba(0,0,0,.08)}
body.light .main{background:linear-gradient(#f4c862,#e0a52e);color:#14161c}
body.light .tab.on{background:#dbe2f1}
body.light .card{background:linear-gradient(160deg,#ffffff,#eef1f8);border:1px solid rgba(0,0,0,.08);box-shadow:0 14px 34px rgba(0,0,0,.12)}
body.light .hint,body.light .steps,body.light .world span{color:#3b4157;opacity:1}
body.light .slot{background:#ffffff;border-color:#b8c0d5;color:#8791a8}
body.light .ltr{color:#8a5a00;text-shadow:none}
body.light .find{background:#ffffff;color:#232634;border-color:#c6cddd}
body.light .bdg{background:#e3e8f3;color:#4b5268}
body.light .lv.done{background:#dbe6fb}
body.light .big{text-shadow:none}
body.light .rowb,body.light .who{color:#232634}
body[data-env=forest]{--c1:#2f4d42;--c2:#25403a;--glow:#244a3c}
body[data-env=desert]{--c1:#5a4630;--c2:#4a3826;--glow:#5a3f22}
body[data-env=ocean]{--c1:#2b4a60;--c2:#223c52;--glow:#1f4a66}
body[data-env=ember]{--c1:#553235;--c2:#452a33;--glow:#5a2630}
body[data-env=frost]{--c1:#3b4f66;--c2:#2f4258;--glow:#35506e}
.jam{color:#e8735a;font-weight:700;opacity:1}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.chip{padding:6px 10px;font-size:12px;border-radius:999px}
.note{font-size:13px;color:#f6e7c8;background:rgba(242,184,75,.12);border:1px solid rgba(242,184,75,.35);border-radius:12px;padding:6px 12px;text-align:center}
.tab{white-space:nowrap}
.slot.hint{color:#8d95ad;border-style:solid;border-color:#4a516a}
.pop{position:fixed;inset:0;background:rgba(8,10,16,.72);display:flex;align-items:center;justify-content:center;z-index:50;padding:20px}
.popcard{position:relative;overflow:hidden;background:linear-gradient(160deg,#2b3150,#202435);border:1px solid rgba(242,184,75,.5);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:12px;align-items:center;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 40px rgba(242,184,75,.25);animation:rise .35s ease;color:#ece8df}
.popcard .bdg{font-size:15px;padding:7px 14px}
.board{width:min(100%,calc(40vh * var(--r,1.5)));width:min(100%,calc(40dvh * var(--r,1.5)));margin:0 auto}
@media (max-height:700px){.w{gap:8px;padding:10px}.pad button{padding:7px 0;font-size:15px}.hint{font-size:13px}.slot{width:30px;height:34px;font-size:17px}.logo{font-size:18px}.card{padding:12px}.wordbox{gap:4px}}
@media (max-height:560px){.w.playing .hint:not(.jam){display:none}.pad{gap:4px}.pad button{padding:5px 0}.slot{width:26px;height:30px;font-size:15px}}
`;