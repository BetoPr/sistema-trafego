/* =============================================================
   robo-guia.js  —  Mascote-guia neon (plug-and-play) para CRM
   -------------------------------------------------------------
   Uso mínimo:
     <script src="robo-guia.js"></script>
     <script>
       RoboGuia.init({
         color: '#25ffa8',
         chat: true,
         chatSuggestions: [{ intent:'excluir', label:'Como excluir etiqueta?' }],
         tours: [{
           id:'excluir',
           intents:['excluir etiqueta','apagar tag'],
           steps:[
             { target:'etiquetas-menu',   text:'Abra **Etiquetas**.' },
             { target:'etiqueta-excluir', text:'Clique em **Excluir** 🗑️' }
           ],
           done:'Pronto! ✅'
         }]
       });
     </script>
   Marque os elementos do CRM com data-guide:
     <a data-guide="etiquetas-menu">Etiquetas</a>
   API: RoboGuia.start(id) | .ask(texto) | .stop() | .registerTours([]) | .resetOnboarding()
   ============================================================= */
(function (global) {
  "use strict";

  var PW = 92, PH = 101, HW = PW / 2, HH = PH / 2, VW = 120, VH = 132, SX = PW / VW, SY = PH / VH;
  var REST_L = 125.6, REST_R = 54.2;
  var reduce = global.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;

  var opts = {}, tours = [], byId = {}, busy = false, glanceX = 0, glanceY = 0, activeRing = null;
  var S = { x: 0, y: 0, tilt: 0, lookX: 0, lookY: 0, flying: false };
  // DOM refs
  var root, pip, eyes, armL, armR, bubble, ptr, ring, toast, aria, chat;

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function center(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r }; }
  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function strip(t) { return t.replace(/\*\*(.+?)\*\*/g, '$1'); }
  function bold(t) { return t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  function resolve(key) { return document.querySelector('[data-guide="' + key + '"]'); }

  /* ---------- styles ---------- */
  var CSS =
  '#rg-root{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:"Segoe UI",system-ui,sans-serif;}' +
  '#rg-fx{position:fixed;inset:0;pointer-events:none;}' +
  '#rg-ptr{animation:rg-march .6s linear infinite;}' +
  '@keyframes rg-march{to{stroke-dashoffset:-20;}}' +
  '#rg-pip{position:fixed;left:0;top:0;width:92px;height:101px;transform-origin:46px 50px;pointer-events:none;will-change:transform;color:var(--rg-c,#25ffa8);opacity:0;transition:opacity .3s;}' +
  'body.rg-touring #rg-pip, body.rg-drawer-open #rg-pip{opacity:1;}' +
  '#rg-pip svg{width:100%;height:100%;overflow:visible;}' +
  '#rg-pip .rg-arm{transition:transform .35s cubic-bezier(.34,1.3,.5,1);transform-box:view-box;}' +
  '#rg-armL{transform-origin:48px 68px;}#rg-armR{transform-origin:72px 68px;}' +
  '#rg-pip .rg-eye{animation:rg-blink 4.5s infinite;transform-box:fill-box;transform-origin:center;}' +
  '@keyframes rg-blink{0%,93%,100%{transform:scaleY(1);}96%{transform:scaleY(.1);}}' +
  '#rg-pip .rg-leg{transform-box:view-box;transform:scaleY(.4);}' +
  '#rg-legL{transform-origin:54px 88px;}#rg-legR{transform-origin:66px 88px;}' +
  '#rg-pip .rg-flame{transform-box:view-box;opacity:1;animation:rg-flk .16s ease-in-out infinite alternate;transition:transform .25s ease;}' +
  '#rg-flameL{transform-origin:54px 99px;transform:scaleY(.55);}#rg-flameR{transform-origin:66px 99px;transform:scaleY(.55);animation-delay:.08s;}' +
  '#rg-pip.rg-boost #rg-flameL,#rg-pip.rg-boost #rg-flameR{transform:scaleY(1.05);}' +
  '@keyframes rg-flk{from{opacity:.6;}to{opacity:1;}}' +
  '#rg-eyesHappy{opacity:0;}#rg-pip.rg-happy #rg-eyesHappy{opacity:1;}#rg-pip.rg-happy .rg-eye{opacity:0;}' +
  '#rg-spot{position:fixed;border-radius:11px;pointer-events:none;opacity:0;transition:opacity .25s;box-shadow:0 0 0 9999px rgba(0,0,0,.72);will-change:left,top,width,height;}' +
  '#rg-spot.rg-on{opacity:1;}' +
  '#rg-veil{position:fixed;inset:0;background:rgba(0,0,0,.72);pointer-events:none;opacity:0;transition:opacity .25s;}' +
  '#rg-veil.rg-on{opacity:1;}' +
  '#rg-ring{position:fixed;border-radius:11px;pointer-events:none;opacity:0;transition:opacity .2s;box-shadow:0 0 0 2px var(--rg-c,#25ffa8);}' +
  '#rg-ring.rg-on{opacity:1;animation:rg-pulse 1.2s ease-in-out infinite;}' +
  '@keyframes rg-pulse{0%,100%{box-shadow:0 0 0 2px var(--rg-c,#25ffa8),0 0 0 4px rgba(37,255,168,.4);}50%{box-shadow:0 0 0 2px var(--rg-c,#25ffa8),0 0 0 12px rgba(37,255,168,0);}}' +
  '#rg-bubble{position:fixed;left:0;top:0;max-width:360px;background:#0c1512;border:1.5px solid var(--rg-c,#25ffa8);color:#e9fff7;padding:12px 15px;border-radius:14px;font-size:13px;line-height:1.5;font-weight:500;box-shadow:0 10px 26px rgba(0,0,0,.5);transform:translate(-50%,-100%) scale(.5);opacity:0;transition:opacity .2s,transform .22s cubic-bezier(.34,1.5,.5,1);pointer-events:none;white-space:pre-line;}' +
  '#rg-bubble.rg-on{opacity:1;transform:translate(-50%,-100%) scale(1);pointer-events:auto;}' +
  '#rg-bubble.rg-center{left:50%!important;top:50%!important;transform:translate(-50%,-50%) scale(1)!important;max-width:min(440px,calc(100vw - 40px));}' +
  '#rg-bubble.rg-center::after{display:none;}' +
  '#rg-bubble::after{content:"";position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);border:9px solid transparent;border-top-color:var(--rg-c,#25ffa8);}' +
  '#rg-bubble strong{color:var(--rg-c,#25ffa8);}' +
  '#rg-bubble .rg-go{margin-top:12px;display:flex;gap:6px;align-items:center;justify-content:center;width:fit-content;background:var(--rg-c,#25ffa8);color:#04140d;border:0;border-radius:8px;padding:7px 14px;font-size:12.5px;font-weight:800;cursor:pointer;clear:both;}' +
  '#rg-bubble .rg-go-wrap{margin-top:10px;display:flex;justify-content:flex-end;}' +
  '#rg-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:#04140d;color:var(--rg-c,#25ffa8);border:1px solid var(--rg-c,#25ffa8);padding:11px 18px;border-radius:12px;font-size:13.5px;font-weight:700;opacity:0;transition:.25s;pointer-events:none;}' +
  '#rg-toast.rg-on{opacity:1;transform:translateX(-50%) translateY(0);}' +
  '#rg-aria{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);}' +
  /* chat */
  '#rg-launch{position:fixed;right:24px;bottom:24px;width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;pointer-events:auto;background:var(--rg-c,#25ffa8);color:#04140d;font-size:24px;display:grid;place-items:center;box-shadow:0 10px 26px rgba(37,255,168,.4);transition:transform .18s;}' +
  '#rg-launch:hover{transform:scale(1.07);}' +
  '#rg-chat{position:fixed;right:24px;bottom:92px;width:310px;max-width:calc(100vw - 36px);background:#111715;border:1px solid #1e2c27;border-radius:18px;box-shadow:0 16px 44px rgba(0,0,0,.5);overflow:hidden;pointer-events:auto;transform-origin:bottom right;transition:transform .25s cubic-bezier(.34,1.4,.5,1),opacity .2s;}' +
  '#rg-chat.rg-hide{transform:scale(.6) translateY(20px);opacity:0;pointer-events:none;}' +
  '#rg-chat .rg-h{background:rgba(37,255,168,.1);padding:13px 16px;color:var(--rg-c,#25ffa8);font-weight:800;font-size:14px;}' +
  '#rg-chat .rg-b{padding:13px 15px;}#rg-chat .rg-b p{font-size:13px;color:#8fa89f;margin:0 0 10px;}' +
  '#rg-chat .rg-chip{display:block;width:100%;text-align:left;margin-bottom:8px;padding:10px 12px;border-radius:10px;font-size:13px;font-weight:600;background:#0d1311;border:1px solid #1e2c27;color:#e9fff7;cursor:pointer;}' +
  '#rg-chat .rg-chip:hover{border-color:var(--rg-c,#25ffa8);color:var(--rg-c,#25ffa8);}' +
  '#rg-chat .rg-in{display:flex;gap:8px;padding:11px 13px;border-top:1px solid #1e2c27;}' +
  '#rg-chat .rg-in input{flex:1;background:#0d1311;border:1px solid #1e2c27;color:#e9fff7;border-radius:10px;padding:9px 11px;font-size:13px;outline:none;}' +
  '#rg-chat .rg-in button{border:0;background:var(--rg-c,#25ffa8);color:#04140d;border-radius:10px;padding:0 14px;font-weight:800;cursor:pointer;}' +
  '@media (prefers-reduced-motion:reduce){#rg-ptr,#rg-pip .rg-flame,#rg-pip .rg-eye,#rg-ring.rg-on{animation:none;}}';

  /* ---------- robot svg ---------- */
  var SVG =
  '<svg viewBox="0 0 120 132" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
      '<filter id="rg-neon" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<linearGradient id="rg-flmOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bff0ff"/><stop offset="0.45" stop-color="#5cd0ff"/><stop offset="1" stop-color="#5cd0ff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="rg-flmIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#dff8ff"/><stop offset="1" stop-color="#9fe6ff" stop-opacity="0"/></linearGradient>' +
      '<filter id="rg-flmBlur" x="-90%" y="-50%" width="280%" height="230%"><feGaussianBlur stdDeviation="1.4"/></filter>' +
    '</defs>' +
    '<g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#rg-neon)">' +
      '<line x1="60" y1="34" x2="60" y2="25"/>' +
      '<g class="rg-flame" id="rg-flameL"><path d="M48,99 Q54,121 54,127 Q54,121 60,99 Z" fill="url(#rg-flmOut)" stroke="none" filter="url(#rg-flmBlur)"/><path d="M50.5,99 Q54,114 54,119 Q54,114 57.5,99 Z" fill="url(#rg-flmIn)" stroke="none"/></g>' +
      '<g class="rg-flame" id="rg-flameR"><path d="M60,99 Q66,121 66,127 Q66,121 72,99 Z" fill="url(#rg-flmOut)" stroke="none" filter="url(#rg-flmBlur)"/><path d="M62.5,99 Q66,114 66,119 Q66,114 69.5,99 Z" fill="url(#rg-flmIn)" stroke="none"/></g>' +
      '<path d="M51,94 L57,94 L59,100 L49,100 Z"/><path d="M63,94 L69,94 L71,100 L61,100 Z"/>' +
      '<path id="rg-armL" class="rg-arm" d="M48,68 L35,86"/>' +
      '<path id="rg-armR" class="rg-arm" d="M72,68 L85,86"/>' +
      '<rect x="42" y="34" width="36" height="27" rx="9"/>' +
      '<g id="rg-eyes">' +
        '<circle class="rg-eye" cx="52" cy="47.5" r="3.1" fill="currentColor" stroke="none"/>' +
        '<circle class="rg-eye" cx="68" cy="47.5" r="3.1" fill="currentColor" stroke="none"/>' +
        '<g id="rg-eyesHappy"><path d="M48,49 Q52,44 56,49"/><path d="M64,49 Q68,44 72,49"/></g>' +
      '</g>' +
      '<rect x="47" y="64" width="26" height="24" rx="7"/>' +
      '<line class="rg-leg" id="rg-legL" x1="54" y1="88" x2="54" y2="97"/>' +
      '<line class="rg-leg" id="rg-legR" x1="66" y1="88" x2="66" y2="97"/>' +
    '</g>' +
  '</svg>';

  /* ---------- build overlay ---------- */
  function build() {
    var st = document.createElement('style'); st.id = 'rg-style'; st.textContent = CSS; document.head.appendChild(st);

    root = document.createElement('div'); root.id = 'rg-root';
    root.style.setProperty('--rg-c', opts.color || '#25ffa8');
    root.innerHTML =
      '<svg id="rg-fx"><defs><marker id="rg-arrow" markerWidth="12" markerHeight="12" refX="8" refY="6" orient="auto"><path d="M2,2 L9,6 L2,10 Z" fill="' + (opts.color || '#25ffa8') + '"/></marker></defs>' +
      '<line id="rg-ptr" x1="0" y1="0" x2="0" y2="0" stroke="' + (opts.color || '#25ffa8') + '" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round" marker-end="url(#rg-arrow)" opacity="0"/></svg>' +
      '<div id="rg-veil"></div>' +
      '<div id="rg-spot"></div>' +
      '<div id="rg-ring"></div>' +
      '<div id="rg-pip">' + SVG + '</div>' +
      '<div id="rg-bubble"></div>' +
      '<div id="rg-toast"></div>' +
      '<div id="rg-aria" aria-live="polite"></div>';
    document.body.appendChild(root);

    pip = byq('#rg-pip'); eyes = byq('#rg-eyes'); armL = byq('#rg-armL'); armR = byq('#rg-armR');
    bubble = byq('#rg-bubble'); ptr = byq('#rg-ptr'); ring = byq('#rg-ring'); toast = byq('#rg-toast'); aria = byq('#rg-aria');
    var veil = byq('#rg-veil'); var spot = byq('#rg-spot');
    window._rgVeil = veil; window._rgSpot = spot;

    if (opts.chat !== false) buildChat();

    S.x = innerWidth - 78; S.y = innerHeight - 120;
    flightArms();
    requestAnimationFrame(render);
    setInterval(function () { if (reduce || S.flying || busy) return; glanceX = (Math.random() * 2 - 1) * 4; glanceY = (Math.random() * 2 - 1) * 2; }, 2300);
    addEventListener('resize', function () { if (!busy) { S.x = innerWidth - 78; S.y = innerHeight - 120; } });
  }
  function byq(s) { return root.querySelector(s); }

  function buildChat() {
    var chips = (opts.chatSuggestions || []).map(function (c) {
      return '<button class="rg-chip" data-intent="' + c.intent + '">' + c.label + '</button>';
    }).join('');
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<button id="rg-launch" aria-label="Abrir ajuda">💬</button>' +
      '<div id="rg-chat" class="rg-hide"><div class="rg-h">' + (opts.chatTitle || 'Posso te ensinar 👇') + '</div>' +
      '<div class="rg-b"><p>' + (opts.chatHint || 'Escolha ou escreva sua dúvida:') + '</p>' + chips + '</div>' +
      '<div class="rg-in"><input id="rg-text" placeholder="Escreva sua dúvida…"/><button id="rg-send">▸</button></div></div>';
    root.appendChild(wrap);
    chat = byq('#rg-chat');
    byq('#rg-launch').addEventListener('click', function () { chat.classList.toggle('rg-hide'); });
    root.querySelectorAll('.rg-chip').forEach(function (c) { c.addEventListener('click', function () { API.start(c.dataset.intent); }); });
    var input = byq('#rg-text');
    function send() { var v = input.value.trim(); if (!v) return; input.value = ''; if (!API.ask(v)) noMatch(); }
    byq('#rg-send').addEventListener('click', send);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
  }

  /* ---------- render loop ---------- */
  function render(now) {
    var bob = reduce ? 0 : Math.sin(now / 600) * (S.flying ? 1.6 : 4.5);
    pip.style.transform = 'translate3d(' + (S.x - HW).toFixed(2) + 'px,' + (S.y - HH + bob).toFixed(2) + 'px,0) rotate(' + S.tilt.toFixed(2) + 'deg)';
    if (!S.flying && !busy) { S.lookX += (glanceX - S.lookX) * 0.05; S.lookY += (glanceY - S.lookY) * 0.05; }
    eyes.style.transform = 'translate(' + S.lookX.toFixed(2) + 'px,' + S.lookY.toFixed(2) + 'px)';
    if (bubble.classList.contains('rg-on')) { bubble.style.left = S.x + 'px'; bubble.style.top = (S.y - HH + bob + 10) + 'px'; }
    if (activeRing) { var r = activeRing.getBoundingClientRect(); ring.style.left = (r.left - 4) + 'px'; ring.style.top = (r.top - 4) + 'px'; ring.style.width = (r.width + 8) + 'px'; ring.style.height = (r.height + 8) + 'px';
      var sp = window._rgSpot; if (sp && sp.classList.contains('rg-on')) { sp.style.left = (r.left - 6) + 'px'; sp.style.top = (r.top - 6) + 'px'; sp.style.width = (r.width + 12) + 'px'; sp.style.height = (r.height + 12) + 'px'; }
    }
    requestAnimationFrame(render);
  }

  /* ---------- motion ---------- */
  function flyTo(tx, ty) {
    return new Promise(function (resolve) {
      var sx = S.x, sy = S.y, dx = tx - sx, dy = ty - sy, dist = Math.hypot(dx, dy);
      var dur = reduce ? 400 : clamp(dist * 1.5, 500, 1300), t0 = performance.now();
      S.flying = true; pip.classList.add('rg-boost');
      (function step(now) {
        var p = dur ? (now - t0) / dur : 1; if (p > 1) p = 1; var e = easeInOut(p);
        S.x = sx + dx * e; S.y = sy + dy * e;
        var vx = dx * (1 - e);
        S.tilt += (clamp(vx * 0.05, -13, 13) - S.tilt) * 0.2;
        S.lookX += (clamp(dx * 0.02, -4, 4) - S.lookX) * 0.15;
        S.lookY += (clamp(dy * 0.02, -3, 3) - S.lookY) * 0.15;
        if (p < 1) requestAnimationFrame(step);
        else { S.flying = false; pip.classList.remove('rg-boost'); settle(resolve); }
      })(performance.now());
    });
  }
  function settle(resolve) {
    var t0 = performance.now();
    (function s(now) { S.tilt *= 0.85; S.lookX *= 0.85; S.lookY *= 0.85;
      if (now - t0 < 260) requestAnimationFrame(s); else { S.tilt = 0; resolve && resolve(); } })(performance.now());
  }
  function aimArm(tx, ty) {
    var useL = tx < S.x, ox = useL ? 48 : 72, rest = useL ? REST_L : REST_R;
    var shX = (S.x - HW) + ox * SX, shY = (S.y - HH) + 68 * SY;
    var R = Math.atan2(ty - shY, tx - shX) * 180 / Math.PI - rest;
    while (R > 180) R -= 360; while (R < -180) R += 360; R = clamp(R, -150, 150);
    (useL ? armL : armR).style.transform = 'rotate(' + R + 'deg)';
    (useL ? armR : armL).style.transform = useL ? 'rotate(18deg)' : 'rotate(-18deg)';
    S.lookX = clamp((tx - S.x) * 0.02, -4, 4); S.lookY = clamp((ty - S.y) * 0.02, -3, 3);
  }
  function flightArms() { armL.style.transform = 'rotate(-18deg)'; armR.style.transform = 'rotate(18deg)'; }

  /* ---------- ui bits ---------- */
  function say(html) { bubble.innerHTML = bold(html); bubble.classList.add('rg-on'); }
  function hush() { bubble.classList.remove('rg-on'); }
  function announce(t) { aria.textContent = strip(t); }
  function showPtr(tx, ty) { var a = Math.atan2(ty - S.y, tx - S.x); ptr.setAttribute('x1', S.x + Math.cos(a) * 32); ptr.setAttribute('y1', S.y + Math.sin(a) * 32); ptr.setAttribute('x2', tx); ptr.setAttribute('y2', ty); ptr.style.opacity = .95; }
  function hidePtr() { ptr.style.opacity = 0; }
  function showRing(el) { activeRing = el; ring.classList.add('rg-on'); }
  function hideRing() { activeRing = null; ring.classList.remove('rg-on'); }
  function showSpot(el) { var sp = window._rgSpot; if (!sp || !el) return; var r = el.getBoundingClientRect(); sp.style.left = (r.left - 6) + 'px'; sp.style.top = (r.top - 6) + 'px'; sp.style.width = (r.width + 12) + 'px'; sp.style.height = (r.height + 12) + 'px'; sp.classList.add('rg-on'); }
  function hideSpot() { var sp = window._rgSpot; if (sp) sp.classList.remove('rg-on'); }
  function showVeil() { var v = window._rgVeil; if (v) v.classList.add('rg-on'); }
  function hideVeil() { var v = window._rgVeil; if (v) v.classList.remove('rg-on'); }
  function showToast(m) { toast.textContent = m; toast.classList.add('rg-on'); clearTimeout(toast._t); toast._t = setTimeout(function () { toast.classList.remove('rg-on'); }, 2200); }

  function park(rect) {
    var gap = 20, m = 10;
    var x = rect.right + gap + HW;
    if (x + HW < innerWidth - m) return { x: x, y: clampY(rect) };
    x = rect.left - gap - HW;
    if (x - HW > m) return { x: x, y: clampY(rect) };
    var y = rect.bottom + gap + HH;
    if (y + HH < innerHeight - m) return { x: clampX(rect.left + rect.width / 2), y: y };
    y = rect.top - gap - HH;
    return { x: clampX(rect.left + rect.width / 2), y: Math.max(HH + m + 56, y) };
  }
  function clampY(r) { return clamp(r.top + r.height / 2 - 8, HH + 70, innerHeight - HH - 10); }
  function clampX(cx) { return clamp(cx, HW + 10, innerWidth - HW - 10); }

  function waitAdvance(el) {
    return new Promise(function (resolve) {
      var done = false;
      function f() { if (done) return; done = true; el && el.removeEventListener('click', f); resolve(); }
      if (el) el.addEventListener('click', f);
      bubble._adv = f;
    });
  }
  async function scrollIfNeeded(el) {
    var r = el.getBoundingClientRect();
    if (r.top < 72 || r.bottom > innerHeight - 10 || r.left < 0 || r.right > innerWidth) {
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
      await sleep(reduce ? 0 : 450);
    }
  }

  /* ---------- step + tour ---------- */
  async function step(st) {
    // Step sem target: só explicação central com veil escurecido.
    if (!st.target) {
      hideSpot(); hideRing(); hidePtr();
      showVeil();
      // Robô fica fora da tela durante explicação central pra não tampar
      var px = parkPos();
      await flyTo(px.x, px.y);
      bubble.classList.add('rg-center');
      var label = st.btn || 'Entendi ▸';
      say(st.text + '<div class="rg-go-wrap"><button class="rg-go">' + label + '</button></div>'); announce(st.text);
      bubble.querySelector('.rg-go').onclick = function () { bubble._adv && bubble._adv(); };
      await new Promise(function (res) { bubble._adv = res; });
      bubble.classList.remove('rg-center');
      hideVeil(); flightArms(); hush(); await sleep(160);
      return;
    }
    // Retry resolve por ate 3.5s — espera Next.js client-side nav + render.
    var el = resolve(st.target);
    if (!el) {
      var t0 = performance.now();
      while (performance.now() - t0 < 3500) {
        await sleep(150);
        el = resolve(st.target);
        if (el) break;
      }
    }
    if (!el) { await missing(st.target); return; }
    await scrollIfNeeded(el);
    var rect = el.getBoundingClientRect();
    var p = park(rect);
    await flyTo(p.x, p.y);
    var c = center(el);
    aimArm(c.x, c.y); showSpot(el); showRing(el); showPtr(c.x, c.y);
    var btnLabel = st.btn || (st.requireClick === false ? 'Próximo ▸' : 'Cliquei ▸');
    say(st.text + '<div class="rg-go-wrap"><button class="rg-go">' + btnLabel + '</button></div>'); announce(st.text);
    bubble.querySelector('.rg-go').onclick = function () { bubble._adv && bubble._adv(); };
    if (st.requireClick === false) await new Promise(function (res) { bubble._adv = res; });
    else await waitAdvance(el);
    hidePtr(); hideRing(); hideSpot(); flightArms(); hush(); await sleep(160);
  }
  async function missing(key) {
    await flyTo(innerWidth * 0.5, innerHeight * 0.42);
    say('Hmm, não encontrei **' + key + '** nesta tela 🤔<button class="rg-go">Ok ▸</button>');
    announce('Não encontrei ' + key + ' nesta tela.');
    bubble.querySelector('.rg-go').onclick = function () { bubble._adv && bubble._adv(); };
    await new Promise(function (res) { bubble._adv = res; });
    hush();
  }
  async function done(msg) {
    await flyTo(innerWidth - 78, innerHeight - 120);
    pip.classList.add('rg-happy');
    say(msg + '<div class="rg-go-wrap"><button class="rg-go">Fechar ▸</button></div>'); announce(strip(msg));
    bubble.querySelector('.rg-go').onclick = function () { bubble._adv && bubble._adv(); };
    await new Promise(function (res) { bubble._adv = res; });
    hush(); pip.classList.remove('rg-happy');
    if (chat) chat.classList.remove('rg-hide');
  }

  async function runTour(t) {
    if (busy) return; busy = true;
    document.body.classList.add('rg-touring');
    if (chat) chat.classList.add('rg-hide');
    document.querySelectorAll('.rg-was-open').forEach(function (e) { e.classList.remove('rg-was-open'); });
    await flyTo(innerWidth * 0.5, innerHeight * 0.45);
    say('Bora! Me segue 👀'); announce('Vou te mostrar.'); await sleep(800); hush();
    try { for (var i = 0; i < t.steps.length; i++) await step(t.steps[i]); if (t.done) await done(t.done); }
    finally {
      busy = false;
      hideVeil(); hideSpot();
      document.body.classList.remove('rg-touring');
      // Volta pra ponto de espera se drawer continua aberto
      if (document.body.classList.contains('rg-drawer-open')) {
        var park = parkPos();
        flyTo(park.x, park.y);
      }
    }
  }

  function parkPos() {
    // Posição de espera: do lado de fora do drawer (drawer = 360px right).
    var drawerW = 360;
    var pad = 60;
    if (innerWidth - drawerW - pad - HW < 40) {
      // Mobile: drawer ocupa quase tudo. Park ao topo-esquerda.
      return { x: HW + 24, y: HH + 80 };
    }
    return { x: innerWidth - drawerW - pad, y: innerHeight / 2 };
  }

  /* ---------- intent matching ---------- */
  function matchIntent(text) {
    var t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (var i = 0; i < tours.length; i++) {
      var arr = tours[i].intents || [];
      for (var j = 0; j < arr.length; j++) {
        var kw = arr[j].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (t.indexOf(kw) !== -1 || kw.split(' ').every(function (w) { return w && t.indexOf(w) !== -1; })) return tours[i].id;
      }
    }
    return null;
  }
  function noMatch() {
    if (chat) chat.classList.add('rg-hide');
    flyTo(innerWidth * 0.5, innerHeight * 0.4).then(function () {
      say((opts.fallback || 'Ainda não sei te ensinar isso 😅') + '<div class="rg-go-wrap"><button class="rg-go">Ok ▸</button></div>');
      bubble.querySelector('.rg-go').onclick = function () { hush(); if (chat) chat.classList.remove('rg-hide'); };
    });
  }

  /* ---------- public API ---------- */
  var API = {
    init: function (config) {
      opts = config || {};
      tours = (opts.tours || []).slice();
      tours.forEach(function (t) { byId[t.id] = t; });
      if (document.body) build(); else addEventListener('DOMContentLoaded', build);
      if (opts.welcome) {
        var k = 'rg_welcome_' + opts.welcome;
        if (!localStorage.getItem(k)) {
          localStorage.setItem(k, '1');
          var run = function () { API.start(opts.welcome); };
          if (document.body) setTimeout(run, 900); else addEventListener('DOMContentLoaded', function () { setTimeout(run, 900); });
        }
      }
      return API;
    },
    registerTours: function (arr) { (arr || []).forEach(function (t) { byId[t.id] = t; tours.push(t); }); return API; },
    start: function (id) { var t = byId[id]; if (t) runTour(t); return !!t; },
    parkAt: function (x, y) {
      if (typeof x !== 'number') { var p = parkPos(); x = p.x; y = p.y; }
      if (root) flyTo(x, y);
    },
    parkOutsideDrawer: function () { var p = parkPos(); if (root) flyTo(p.x, p.y); },
    ask: function (text) { var id = matchIntent(text); if (id) { API.start(id); return true; } return false; },
    stop: function () { busy = false; hidePtr(); hideRing(); hush(); flightArms(); },
    showToast: showToast,
    resetOnboarding: function () { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('rg_welcome_') === 0) localStorage.removeItem(k); }); }
  };
  global.RoboGuia = API;
})(window);
