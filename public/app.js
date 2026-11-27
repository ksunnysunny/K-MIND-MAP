(() => {
'use strict';

/* ───────────── 기본 유틸 ───────────── */
const KEY = 'kmindmap.v1';
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const firstLine = s => String(s || '').split('\n')[0];
const BRANCH = ['#4f7cff', '#f2784b', '#2bb673', '#a66bff', '#e8b100', '#e5527a', '#16a3b8', '#7a8b99'];
const FONT = "-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic','Segoe UI',sans-serif";

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}
function ago(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return '방금'; if (m < 60) return m + '분 전';
  if (m < 1440) return Math.floor(m / 60) + '시간 전';
  const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ───────────── 데이터 ───────────── */
const N = (t, c = [], o = {}) => ({ id: uid(), t, c, ...o });
const TASK = t => N(t, [], { done: false });

const TEMPLATES = {
  blank: { icon: '◯', name: '빈 맵', desc: '중심 주제만 있는 새 맵', make: () => N('중심 주제') },
  idea: { icon: '💡', name: '아이디어 메모', desc: '떠오르는 생각을 빠르게 적기', make: () => N('💡 아이디어', [
    N('지금 떠오른 생각'), N('해보고 싶은 것'), N('읽을 것 · 볼 것'), N('사고 싶은 것'), N('나중에 정리')]) },
  work: { icon: '📋', name: '업무 · 프로젝트', desc: '목표, 할 일, 일정, 회의 메모', make: () => N('📋 프로젝트', [
    N('🎯 목표', [N('핵심 목표'), N('성공 기준')]),
    N('✅ 할 일', [TASK('우선순위 높음'), TASK('이번 주'), TASK('다음에')]),
    N('📅 일정', [N('마감일'), N('중간 점검')]),
    N('🗣 회의 메모', [N('날짜 · 안건')]),
    N('⚠️ 이슈 · 리스크'), N('👥 담당자')]) },
  trip: { icon: '✈️', name: '여행 계획', desc: '일정, 숙소, 교통, 맛집, 준비물, 예산', make: () => N('✈️ 여행 계획', [
    N('📍 목적지'),
    N('📅 일정', [N('1일차', [N('오전'), N('오후'), N('저녁')]), N('2일차', [N('오전'), N('오후'), N('저녁')]), N('3일차')]),
    N('🏨 숙소'), N('🚆 교통', [N('가는 편'), N('오는 편'), N('현지 이동')]),
    N('🍜 맛집 · 카페'),
    N('🎒 준비물', [TASK('여권 · 신분증'), TASK('충전기'), TASK('상비약'), TASK('환전')]),
    N('💰 예산', [N('교통'), N('숙박'), N('식비'), N('쇼핑')])]) },
};

function welcome() {
  return N('👋 사용법', [
    N('맵 움직이기', [N('한 손가락 드래그 → 이동'), N('두 손가락 벌리기 → 확대/축소'), N('⌖ 버튼 → 한눈에 보기')]),
    N('노드 추가 · 편집', [N('노드 탭 → 선택'), N('선택된 노드 다시 탭 → 편집'), N('아래 [하위] [형제] 버튼으로 추가'), N('입력 중 Enter → 다음 항목 연속 입력')]),
    N('체크리스트', [TASK('[체크] 버튼으로 체크박스 추가'), TASK('상자를 탭하면 완료')]),
    N('메모장처럼', [N('홈의 💡 빠른 메모 → 아이디어 수첩에 저장'), N('상단 ☰ 버튼 → 개요(목록) 보기')]),
    N('내 데이터', [N('이 기기에만 저장됩니다'), N('⚙︎ 설정에서 백업 · 복원')]),
  ]);
}

function clean(n) {
  const o = { id: uid(), t: String(n && n.t != null ? n.t : ''), c: Array.isArray(n && n.c) ? n.c.map(clean) : [] };
  if (n && /^#[0-9a-f]{3,8}$/i.test(n.col || '')) o.col = n.col;
  if (n && typeof n.done === 'boolean') o.done = n.done;
  if (n && n.note) o.note = String(n.note);
  if (n && n.fold) o.fold = true;
  return o;
}

function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.maps)) return d; } catch (e) {}
  return { maps: [] };
}
let db = load();
if (!db.maps.length && !db.seeded) {
  const now = Date.now();
  db.maps.push({ id: uid(), created: now, updated: now, root: welcome() });
  db.seeded = true;
}
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 200);
}
function flush() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { toast('저장 공간이 부족합니다. 백업 후 정리해 주세요.'); }
}
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
flush();
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

/* ───────────── 상태 ───────────── */
let cur = null;           // 열려 있는 맵
let sel = null;           // 선택된 노드 id
let undoS = [], redoS = [];
let mode = 'map';
try { mode = localStorage.getItem('kmindmap.mode') || 'map'; } catch (e) {}
let V = { x: 0, y: 0, k: 1 };
const L = new Map();      // 레이아웃 정보 (저장하지 않음)

/* ───────────── 트리 도우미 ───────────── */
function locate(id, n = cur.root, p = null) {
  if (n.id === id) return { n, p, i: p ? p.c.indexOf(n) : 0 };
  for (const k of n.c) { const r = locate(id, k, n); if (r) return r; }
  return null;
}
const count = n => 1 + n.c.reduce((a, k) => a + count(k), 0);
function walkAll(n, f) { f(n); n.c.forEach(k => walkAll(k, f)); }
function visible(n = cur.root, out = []) { out.push(n); if (!n.fold) n.c.forEach(k => visible(k, out)); return out; }
const cloneNode = n => ({ ...n, id: uid(), c: n.c.map(cloneNode) });
function progress(root) {
  let a = 0, b = 0; walkAll(root, n => { if (n.done !== undefined) { b++; if (n.done) a++; } }); return [a, b];
}

/* ───────────── 변경 / 실행취소 ───────────── */
function snap() { undoS.push(JSON.stringify(cur.root)); if (undoS.length > 80) undoS.shift(); redoS = []; }
function changed() { cur.updated = Date.now(); save(); render(); }
function mutate(fn) { snap(); fn(); changed(); }
function doUndo() {
  if (!undoS.length) return; closeEditor();
  redoS.push(JSON.stringify(cur.root)); cur.root = JSON.parse(undoS.pop());
  if (!locate(sel)) sel = cur.root.id; changed();
}
function doRedo() {
  if (!redoS.length) return; closeEditor();
  undoS.push(JSON.stringify(cur.root)); cur.root = JSON.parse(redoS.pop());
  if (!locate(sel)) sel = cur.root.id; changed();
}

/* ───────────── 노드 동작 ───────────── */
function inheritDone(ref) { return ref && ref.done !== undefined ? { done: false } : {}; }

function addChild() {
  const r = locate(sel); if (!r) return;
  const last = r.n.c[r.n.c.length - 1];
  const nn = N('', [], inheritDone(last));
  snap(); r.n.fold = false; r.n.c.push(nn); sel = nn.id; changed();
  openEditor(nn.id, true);
}
function addSiblingOf(id) {
  const r = locate(id); if (!r) return;
  if (!r.p) { sel = id; return addChild(); }
  const nn = N('', [], inheritDone(r.n));
  snap(); r.p.c.splice(r.i + 1, 0, nn); sel = nn.id; changed();
  openEditor(nn.id, true);
}
function removeSel() {
  const r = locate(sel); if (!r || !r.p) return;
  const n = count(r.n);
  if (n > 1 && !confirm(`"${firstLine(r.n.t) || '이 노드'}" 와 하위 ${n - 1}개를 삭제할까요?`)) return;
  mutate(() => { r.p.c.splice(r.i, 1); sel = (r.p.c[r.i] || r.p.c[r.i - 1] || r.p).id; });
}
function moveSel(dir) {
  const r = locate(sel); if (!r || !r.p) return;
  const j = r.i + dir; if (j < 0 || j >= r.p.c.length) return;
  mutate(() => { const [x] = r.p.c.splice(r.i, 1); r.p.c.splice(j, 0, x); });
  reveal(sel);
}
function indentSel() {
  const r = locate(sel); if (!r || !r.p || r.i === 0) return;
  mutate(() => { const [x] = r.p.c.splice(r.i, 1); const prev = r.p.c[r.i - 1]; prev.fold = false; prev.c.push(x); });
}
function outdentSel() {
  const r = locate(sel); if (!r || !r.p) return;
  const g = locate(r.p.id); if (!g || !g.p) return;
  mutate(() => { const [x] = r.p.c.splice(r.i, 1); g.p.c.splice(g.i + 1, 0, x); });
}
function dupSel() {
  const r = locate(sel); if (!r || !r.p) return;
  mutate(() => { const cp = cloneNode(r.n); r.p.c.splice(r.i + 1, 0, cp); sel = cp.id; });
}
function toggleFoldId(id) {
  const r = locate(id); if (!r || !r.n.c.length) return;
  mutate(() => { if (r.n.fold) delete r.n.fold; else r.n.fold = true; });
}
function toggleDone(id) {
  const r = locate(id); if (!r) return;
  mutate(() => { r.n.done = !r.n.done; }); sel = id;
}
function toggleCheckbox() {
  const r = locate(sel); if (!r) return;
  mutate(() => { if (r.n.done === undefined) r.n.done = false; else delete r.n.done; });
}

/* ───────────── 레이아웃 ───────────── */
const mctx = document.createElement('canvas').getContext('2d');
const fontFor = d => d === 0 ? { s: 18, w: 700 } : d === 1 ? { s: 16, w: 600 } : { s: 15, w: 400 };
const fontStr = f => `${f.w} ${f.s}px ${FONT}`;

function wrapText(text, maxW, f) {
  mctx.font = fontStr(f);
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const tk of (para.match(/\S+\s*|\s+/g) || [''])) {
      if (mctx.measureText((line + tk).trimEnd()).width <= maxW) { line += tk; continue; }
      if (line) { out.push(line.trimEnd()); line = ''; }
      if (mctx.measureText(tk.trimEnd()).width <= maxW) { line = tk; continue; }
      for (const ch of tk) {                       // 긴 단어는 글자 단위로 줄바꿈
        if (line && mctx.measureText(line + ch).width > maxW) { out.push(line); line = ''; }
        line += ch;
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}

const GX = 46, GY = 10;
function layout() {
  L.clear();
  const colW = [];
  (function m(n, d, col) {
    const f = fontFor(d);
    const lines = wrapText(n.t, d === 1 ? 200 : 220, f);
    mctx.font = fontStr(f);
    let tw = 0; lines.forEach(s => { tw = Math.max(tw, mctx.measureText(s).width); });
    const padX = d === 0 ? 16 : 13, padY = d === 0 ? 12 : 9;
    const extraL = n.done !== undefined ? 24 : 0, extraR = n.note ? 18 : 0;
    const w = Math.max(54, Math.ceil(tw) + padX * 2 + extraL + extraR);
    const h = Math.round(lines.length * f.s * 1.38 + padY * 2);
    const c = n.col || col;
    L.set(n.id, { n, d, lines, f, w, h, padX, padY, extraL, col: c, x: 0, y: 0 });
    colW[d] = Math.max(colW[d] || 0, w);
    if (!n.fold) n.c.forEach((k, i) => m(k, d + 1, d === 0 ? BRANCH[i % BRANCH.length] : c));
  })(cur.root, 0, null);

  const xs = [0];
  for (let d = 1; d < colW.length; d++) xs[d] = xs[d - 1] + colW[d - 1] + GX;
  const sh = new Map();
  (function s(n) {
    const ks = n.fold ? [] : n.c; let tot = 0;
    ks.forEach((k, i) => { tot += s(k) + (i ? GY : 0); });
    sh.set(n.id, [Math.max(L.get(n.id).h, tot), tot]); return sh.get(n.id)[0];
  })(cur.root);
  (function p(n, top) {
    const l = L.get(n.id); l.x = xs[l.d];
    const [H, tot] = sh.get(n.id); const ks = n.fold ? [] : n.c;
    if (!ks.length) { l.y = top + H / 2; return; }
    let yy = top + (H - tot) / 2;
    ks.forEach(k => { p(k, yy); yy += sh.get(k.id)[0] + GY; });
    l.y = (L.get(ks[0].id).y + L.get(ks[ks.length - 1].id).y) / 2;
  })(cur.root, 0);
}
function bounds() {
  let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
  L.forEach(l => {
    x1 = Math.min(x1, l.x); y1 = Math.min(y1, l.y - l.h / 2);
    x2 = Math.max(x2, l.x + l.w + (l.n.fold && l.n.c.length ? 28 : 0)); y2 = Math.max(y2, l.y + l.h / 2);
  });
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };
}

function theme() {
  const s = getComputedStyle(document.documentElement), g = k => s.getPropertyValue(k).trim();
  return { bg: g('--bg'), surface: g('--surface'), text: g('--text'), accent: g('--accent'), root: g('--root'), rootfg: g('--rootfg') };
}

/* ───────────── 맵 그리기 (SVG 문자열) ───────────── */
function drawMap(th, selId) {
  let links = '', nodes = '';
  L.forEach(l => {
    const n = l.n;
    if (!n.fold) n.c.forEach(k => {
      const c = L.get(k.id), x1 = l.x + l.w, x2 = c.x, mx = (x1 + x2) / 2;
      links += `<path d="M${x1} ${l.y}C${mx} ${l.y} ${mx} ${c.y} ${x2} ${c.y}" fill="none" stroke="${esc(c.col)}" stroke-width="${c.d === 1 ? 3.5 : 2.2}" stroke-linecap="round"/>`;
    });
    const { x, y, w, h, d, f, col } = l;
    let fill, stroke = 'none', sw = 0, tc;
    if (d === 0) { fill = n.col || th.root; tc = th.rootfg; }
    else if (d === 1) { fill = col; tc = '#fff'; }
    else { fill = th.surface; stroke = col; sw = 2; tc = th.text; }
    const onFill = d < 2, ink = onFill ? '#fff' : col;
    let g = `<g data-id="${n.id}" transform="translate(${x} ${y - h / 2})">`;
    if (selId === n.id) g += `<rect x="-5" y="-5" width="${w + 10}" height="${h + 10}" rx="${d === 0 ? 19 : 16}" fill="none" stroke="${th.accent}" stroke-width="2.5"/>`;
    g += `<rect width="${w}" height="${h}" rx="${d === 0 ? 14 : 11}" fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="${sw}"/>`;
    if (n.done !== undefined) {
      g += `<g data-chk="${n.id}"><rect width="${l.padX + 26}" height="${h}" fill="transparent"/>` +
        `<rect x="${l.padX}" y="${h / 2 - 8}" width="16" height="16" rx="4" fill="${n.done ? ink : 'none'}" stroke="${esc(ink)}" stroke-width="2"/>` +
        (n.done ? `<path d="M${l.padX + 3.5} ${h / 2} l3.5 3.5 l6 -7" fill="none" stroke="${onFill ? esc(fill) : '#fff'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` : '') + '</g>';
    }
    l.lines.forEach((s, i) => {
      g += `<text x="${l.padX + l.extraL}" y="${l.padY + f.s * 1.38 * i + f.s * 1.04}" font-size="${f.s}" font-weight="${f.w}" font-family="${FONT}" fill="${esc(tc)}"` +
        `${n.done ? ' text-decoration="line-through" opacity=".6"' : ''}>${esc(s)}</text>`;
    });
    if (n.note) g += `<text x="${w - l.padX - 14}" y="${l.padY + f.s}" font-size="12">📝</text>`;
    if (n.fold && n.c.length) {
      g += `<g data-fold="${n.id}"><circle cx="${w + 14}" cy="${h / 2}" r="11" fill="${th.surface}" stroke="${esc(col)}" stroke-width="2"/>` +
        `<text x="${w + 14}" y="${h / 2 + 4}" text-anchor="middle" font-size="11" font-weight="700" font-family="${FONT}" fill="${th.text}">${count(n) - 1}</text></g>`;
    }
    nodes += g + '</g>';
  });
  return links + nodes;
}

/* ───────────── 렌더링 ───────────── */
const stage = $('#stage'), svg = $('#svg'), world = $('#world'), outline = $('#outline');

function render() {
  if (!cur) return;
  $('#mapTitle').textContent = firstLine(cur.root.t) || '제목 없음';
  $('#btnUndo').disabled = !undoS.length; $('#btnRedo').disabled = !redoS.length;
  $('#btnView').textContent = mode === 'map' ? '☰' : '🗺';
  $('#btnFit').hidden = mode !== 'map';
  svg.hidden = mode !== 'map'; outline.hidden = mode === 'map';
  layout();
  if (mode === 'map') world.innerHTML = drawMap(theme(), sel); else renderOutline();
  updateToolbar();
}

function renderOutline() {
  let h = '';
  (function w(n, d, col) {
    const c = n.col || col;
    const hasK = n.c.length > 0;
    h += `<div class="orow d${Math.min(d, 2)}${sel === n.id ? ' sel' : ''}" data-id="${n.id}" style="--c:${esc(c || 'var(--root)')};margin-left:${d * 16}px">` +
      `<span class="fold" ${hasK ? `data-fold="${n.id}"` : ''}>${hasK ? (n.fold ? '▸' : '▾') : '•'}</span>` +
      (n.done !== undefined ? `<span class="chk${n.done ? ' on' : ''}" data-chk="${n.id}">${n.done ? '✓' : ''}</span>` : '') +
      `<span class="txt${n.done ? ' done' : ''}">${esc(n.t) || '<i style="color:var(--sub)">(비어 있음)</i>'}${n.note ? `<span class="note">📝 ${esc(n.note)}</span>` : ''}</span></div>`;
    if (!n.fold) n.c.forEach((k, i) => w(k, d + 1, d === 0 ? BRANCH[i % BRANCH.length] : c));
  })(cur.root, 0, null);
  outline.innerHTML = h;
}

function updateToolbar() {
  const r = locate(sel) || locate(cur.root.id); if (!r) return;
  const isRoot = !r.p, set = (a, dis) => { const b = $(`[data-act="${a}"]`); b.disabled = !!dis; };
  set('sibling', false); set('del', isRoot); set('dup', isRoot);
  set('up', isRoot || r.i === 0); set('down', isRoot || r.i === r.p.c.length - 1);
  set('indent', isRoot || r.i === 0); set('outdent', isRoot || !locate(r.p.id).p);
  set('fold', !r.n.c.length);
  $('#foldLabel').textContent = r.n.fold ? '펼치기' : '접기';
  $('[data-act="check"]').classList.toggle('on', r.n.done !== undefined);
}

/* ───────────── 보기(팬 / 줌) ───────────── */
function applyView(anim) {
  world.classList.toggle('anim', !!anim);
  world.style.transform = `translate(${V.x}px,${V.y}px) scale(${V.k})`;
}
function saveView() { cur.view = { x: V.x, y: V.y, k: V.k }; save(); }
function fitView(anim) {
  layout();
  const b = bounds(), W = stage.clientWidth, H = stage.clientHeight;
  const k = clamp(Math.min((W - 32) / b.w, (H - 32) / b.h, 1), 0.35, 1);
  V = { k, x: Math.max(16, (W - b.w * k) / 2) - b.x1 * k, y: (H - b.h * k) / 2 - b.y1 * k };
  applyView(anim); saveView();
}
function reveal(id, forEdit) {
  if (mode !== 'map') {
    const el = outline.querySelector(`[data-id="${id}"]`); if (el) el.scrollIntoView({ block: forEdit ? 'start' : 'nearest' });
    return;
  }
  const l = L.get(id); if (!l) return;
  const W = stage.clientWidth, H = stage.clientHeight;
  const sx = V.x + l.x * V.k, sy = V.y + l.y * V.k, hw = l.h * V.k / 2, ww = l.w * V.k;
  let moved = false;
  const lo = forEdit ? 30 : 16, hi = forEdit ? H * 0.34 : H - 16;
  if (sy - hw < lo || sy + hw > hi) { V.y += (forEdit ? H * 0.2 : H / 2) - sy; moved = true; }
  if (sx < 12 || sx + ww > W - 12) { V.x += W / 2 - (sx + ww / 2); moved = true; }
  if (moved) { applyView(true); saveView(); }
}

const ptrs = new Map(); let gest = null;
svg.addEventListener('pointerdown', e => {
  svg.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  world.classList.remove('anim');
  if (ptrs.size === 1) gest = { sx: e.clientX, sy: e.clientY, vx: V.x, vy: V.y, moved: false, target: e.target, pinch: null };
  else if (gest && ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    gest.moved = true;
    gest.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: V.k, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, vx: V.x, vy: V.y };
  }
});
svg.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p || !gest) return;
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size >= 2 && gest.pinch) {
    const [a, b] = [...ptrs.values()], g = gest.pinch, r = svg.getBoundingClientRect();
    const k = clamp(g.k * Math.hypot(a.x - b.x, a.y - b.y) / g.d, 0.2, 3);
    const wx = (g.mx - r.left - g.vx) / g.k, wy = (g.my - r.top - g.vy) / g.k;
    V.k = k; V.x = (a.x + b.x) / 2 - r.left - wx * k; V.y = (a.y + b.y) / 2 - r.top - wy * k;
    applyView(); return;
  }
  if (ptrs.size === 1) {
    const dx = e.clientX - gest.sx, dy = e.clientY - gest.sy;
    if (!gest.moved && Math.hypot(dx, dy) < 6) return;
    gest.moved = true; V.x = gest.vx + dx; V.y = gest.vy + dy; applyView();
  }
});
function endPtr(e, cancelled) {
  if (!ptrs.delete(e.pointerId) || !gest) return;
  if (ptrs.size === 0) {
    const g = gest; gest = null;
    if (g.moved || cancelled) saveView(); else tapTarget(g.target);
  } else if (ptrs.size === 1) {            // 핀치 후 남은 손가락으로 계속 이동
    const p = [...ptrs.values()][0];
    Object.assign(gest, { sx: p.x, sy: p.y, vx: V.x, vy: V.y, pinch: null, moved: true });
  }
}
svg.addEventListener('pointerup', e => endPtr(e, false));
svg.addEventListener('pointercancel', e => endPtr(e, true));
svg.addEventListener('wheel', e => {
  e.preventDefault();
  const r = svg.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  const k = clamp(V.k * Math.exp(-e.deltaY * 0.0015), 0.2, 3), wx = (mx - V.x) / V.k, wy = (my - V.y) / V.k;
  V.k = k; V.x = mx - wx * k; V.y = my - wy * k; applyView(); clearTimeout(svg._w); svg._w = setTimeout(saveView, 300);
}, { passive: false });

function tapTarget(t) {
  if (!t || !t.closest) return;
  const chk = t.closest('[data-chk]'); if (chk) return toggleDone(chk.dataset.chk);
  const fl = t.closest('[data-fold]'); if (fl) return toggleFoldId(fl.dataset.fold);
  const nd = t.closest('[data-id]'); if (nd) pick(nd.dataset.id);
}
function pick(id) {
  if (sel === id) openEditor(id, false); else { sel = id; render(); }
}
outline.addEventListener('click', e => tapTarget(e.target));
$('#btnFit').onclick = () => fitView(true);

/* ───────────── 노드 편집 시트 ───────────── */
const edSheet = $('#editSheet'), edText = $('#edText'), edNote = $('#edNote');
let ed = null;

function buildColors(active) {
  $('#edColors').innerHTML = `<button class="auto${!active ? ' on' : ''}" data-col="" aria-label="자동"></button>` +
    BRANCH.concat(['#2b3350']).map(c => `<button style="--c:${c}" class="${active === c ? 'on' : ''}" data-col="${c}"></button>`).join('');
}
function openEditor(id, isNew) {
  const r = locate(id); if (!r) return;
  ed = { id, isNew }; sel = id;
  edText.value = r.n.t; edNote.value = r.n.note || '';
  buildColors(r.n.col);
  edSheet.hidden = false;
  reveal(id, true);
  setTimeout(() => { edText.focus(); edText.select(); }, 40);
}
function saveEdit() {
  if (!ed) return;
  const r = locate(ed.id); if (!r) return;
  const t = edText.value.trim(), note = edNote.value.trim();
  if (!t) return;
  if (t !== r.n.t || note !== (r.n.note || '')) {
    if (!ed.isNew) snap();          // 방금 만든 노드는 이미 실행취소 단계가 있음
    r.n.t = t; if (note) r.n.note = note; else delete r.n.note;
    changed();
  }
}
function closeEditor() {
  if (!ed) return;
  const { id, isNew } = ed, empty = !edText.value.trim(), r = locate(id);
  if (empty) {
    ed = null; edSheet.hidden = true;
    if (isNew && r && r.p && !r.n.t) { r.p.c.splice(r.i, 1); sel = r.p.id; undoS.pop(); changed(); }
    return;
  }
  saveEdit(); ed = null; edSheet.hidden = true;
}
edText.addEventListener('keydown', e => {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!edText.value.trim()) return closeEditor();
    const id = ed.id; saveEdit(); ed = null; addSiblingOf(id);
  } else if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    if (!edText.value.trim()) return;
    const id = ed.id; saveEdit(); ed = null; sel = id; addChild();
  }
});
$('#edColors').addEventListener('click', e => {
  const b = e.target.closest('[data-col]'); if (!b || !ed) return;
  const r = locate(ed.id); if (!r) return;
  snap(); if (b.dataset.col) r.n.col = b.dataset.col; else delete r.n.col;
  buildColors(r.n.col); changed();
});
$('#edDone').onclick = closeEditor;
$('#edBackdrop').onclick = closeEditor;

/* ───────────── 일반 시트 / 메뉴 ───────────── */
const sheetRoot = $('#sheetRoot');
function sheet(html, mount) {
  sheetRoot.innerHTML = `<div class="sheet"><div class="backdrop"></div><div class="panel">${html}</div></div>`;
  const close = () => { sheetRoot.innerHTML = ''; };
  $('.backdrop', sheetRoot).onclick = close;
  if (mount) mount($('.panel', sheetRoot), close);
  return close;
}
function menuSheet(title, items, note) {
  sheet(`<h2>${esc(title)}</h2>${note ? `<p>${note}</p>` : ''}<div class="menu">` + items.map((it, i) =>
    `<button data-i="${i}" class="${it.danger ? 'danger' : ''}"><span class="ic">${it.icon || ''}</span><span>${esc(it.label)}${it.desc ? `<small>${esc(it.desc)}</small>` : ''}</span></button>`
  ).join('') + '</div>', (p, close) => {
    p.addEventListener('click', e => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      close(); items[+b.dataset.i].fn();
    });
  });
}

/* ───────────── 내보내기 / 가져오기 ───────────── */
function download(name, blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function deliver(name, blob) {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  download(name, blob);
}
const safeName = s => (firstLine(s).replace(/[\\/:*?"<>|]+/g, '').trim() || '마인드맵').slice(0, 40);

function toMarkdown(root) {
  let out = `# ${firstLine(root.t)}\n\n`;
  const rec = (n, d) => {
    out += '  '.repeat(d) + '- ' + (n.done === undefined ? '' : n.done ? '[x] ' : '[ ] ') + n.t.replace(/\n/g, ' ') +
      (n.note ? ` — ${n.note.replace(/\n/g, ' ')}` : '') + '\n';
    n.c.forEach(k => rec(k, d + 1));
  };
  root.c.forEach(k => rec(k, 0));
  return out;
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('복사했어요'); return; } catch (e) {}
  await deliver('mindmap.md', new Blob([text], { type: 'text/markdown' }));
}
async function exportPng() {
  layout(); const th = theme(), b = bounds(), pad = 40, W = Math.ceil(b.w + pad * 2), H = Math.ceil(b.h + pad * 2);
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="${th.bg}"/>` +
    `<g transform="translate(${pad - b.x1} ${pad - b.y1})">${drawMap(th, null)}</g></svg>`;
  const img = new Image();
  await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml); });
  const sc = Math.min(2, 4096 / Math.max(W, H)), cv = document.createElement('canvas');
  cv.width = Math.round(W * sc); cv.height = Math.round(H * sc);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  await deliver(safeName(cur.root.t) + '.png', blob);
}
const jsonBlob = o => new Blob([JSON.stringify(o, null, 1)], { type: 'application/json' });

function importData(text) {
  let d; try { d = JSON.parse(text); } catch (e) { return toast('올바른 파일이 아니에요'); }
  const maps = Array.isArray(d.maps) ? d.maps : d.root ? [d] : null;
  if (!maps) return toast('올바른 파일이 아니에요');
  const now = Date.now(); let n = 0;
  maps.forEach(m => {
    if (!m || !m.root) return;
    db.maps.unshift({ id: uid(), created: m.created || now, updated: m.updated || now, root: clean(m.root), ...(m.inbox ? { inbox: true } : {}) }); n++;
  });
  save(); renderHome(); toast(`${n}개의 맵을 가져왔어요`);
}
$('#filePick').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (f) importData(await f.text());
});

/* ───────────── 메뉴들 ───────────── */
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });

function editorMenu() {
  menuSheet(firstLine(cur.root.t), [
    { icon: '⌖', label: '화면에 맞추기', fn: () => { mode = 'map'; render(); fitView(true); } },
    { icon: '📋', label: '텍스트로 복사', desc: '마크다운 목록 형태', fn: () => copyText(toMarkdown(cur.root)) },
    { icon: '🖼', label: '이미지로 저장 (PNG)', fn: () => exportPng().catch(() => toast('이미지를 만들지 못했어요')) },
    { icon: '💾', label: '파일로 저장 (JSON)', desc: '다른 기기로 옮기거나 백업', fn: () => deliver(safeName(cur.root.t) + '.json', jsonBlob(cur)) },
    { icon: '🗑', label: '이 맵 삭제', danger: true, fn: () => deleteMap(cur.id, true) },
  ]);
}
function deleteMap(id, leave) {
  const m = db.maps.find(x => x.id === id); if (!m) return;
  if (!confirm(`"${firstLine(m.root.t)}" 맵을 삭제할까요? 되돌릴 수 없어요.`)) return;
  db.maps = db.maps.filter(x => x.id !== id); save();
  if (leave) { cur = null; location.hash = '#/'; } else renderHome();
}
function cardMenu(id) {
  const m = db.maps.find(x => x.id === id); if (!m) return;
  menuSheet(firstLine(m.root.t), [
    { icon: '⧉', label: '복제', fn: () => { db.maps.unshift({ ...JSON.parse(JSON.stringify(m)), id: uid(), root: cloneNode(m.root), updated: Date.now(), inbox: undefined }); save(); renderHome(); } },
    { icon: '💾', label: '파일로 저장 (JSON)', fn: () => deliver(safeName(m.root.t) + '.json', jsonBlob(m)) },
    { icon: '🗑', label: '삭제', danger: true, fn: () => deleteMap(id, false) },
  ]);
}
function settingsMenu() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const items = [];
  if (deferredInstall) items.push({ icon: '📲', label: '앱으로 설치', desc: '홈 화면에 추가', fn: async () => { deferredInstall.prompt(); deferredInstall = null; } });
  items.push(
    { icon: '💾', label: '전체 백업 저장', desc: `맵 ${db.maps.length}개를 JSON 파일로`, fn: () => deliver('K마인드맵-백업-' + new Date().toISOString().slice(0, 10) + '.json', jsonBlob({ maps: db.maps })) },
    { icon: '📂', label: '백업 · 파일 불러오기', fn: () => $('#filePick').click() },
  );
  const note = standalone ? '데이터는 이 기기 안에만 저장돼요. 가끔 백업해 두세요.' :
    ios ? '설치: Safari 하단 <b>공유 ⎙ → 홈 화면에 추가</b>' :
    deferredInstall ? '' : '설치: 브라우저 메뉴 <b>⋮ → 홈 화면에 추가 / 앱 설치</b>';
  menuSheet('설정', items, note);
}
function templateMenu() {
  menuSheet('새 맵 만들기', Object.entries(TEMPLATES).map(([k, t]) => ({
    icon: t.icon, label: t.name, desc: t.desc, fn: () => newMap(k),
  })));
}
function newMap(kind) {
  const now = Date.now(), m = { id: uid(), created: now, updated: now, root: TEMPLATES[kind].make() };
  db.maps.unshift(m); save(); pendingTitleEdit = m.id; openHash(m.id);
}
function quickMemo() {
  sheet(`<h2>💡 빠른 메모</h2><textarea id="qm" rows="4" placeholder="떠오른 생각을 바로 적어두세요"></textarea>` +
    `<div class="panel-actions"><span class="hint">'아이디어 수첩' 맵에 저장돼요</span><button class="btn primary" id="qmSave">저장</button></div>`, (p, close) => {
    const ta = $('#qm', p); setTimeout(() => ta.focus(), 50);
    $('#qmSave', p).onclick = () => {
      const t = ta.value.trim(); if (!t) return close();
      let m = db.maps.find(x => x.inbox);
      if (!m) { const now = Date.now(); m = { id: uid(), inbox: true, created: now, updated: now, root: N('💡 아이디어 수첩') }; db.maps.unshift(m); }
      const d = new Date(), pad = n => String(n).padStart(2, '0');
      m.root.c.unshift(N(t, [], { note: `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}` }));
      m.updated = Date.now(); save(); close(); renderHome(); toast('아이디어 수첩에 저장했어요');
    };
  });
}

/* ───────────── 홈 화면 ───────────── */
function renderHome() {
  const q = $('#search').value.trim().toLowerCase();
  const maps = [...db.maps].sort((a, b) => b.updated - a.updated);
  let h = '';
  maps.forEach(m => {
    const title = firstLine(m.root.t) || '제목 없음';
    let hits = [];
    if (q) {
      const tm = title.toLowerCase().includes(q);
      walkAll(m.root, n => { if (hits.length < 3 && n !== m.root && (n.t + ' ' + (n.note || '')).toLowerCase().includes(q)) hits.push(n); });
      if (!tm && !hits.length) return;
    }
    const [a, b] = progress(m.root);
    const idx = db.maps.indexOf(m);
    h += `<div class="card" style="--c:${BRANCH[idx % BRANCH.length]}"><button class="body" data-open="${m.id}">` +
      `<div class="name">${esc(title)}</div><div class="meta">노드 ${count(m.root)}개${b ? ` · ✅ ${a}/${b}` : ''} · ${ago(m.updated)}</div>` +
      hits.map(n => `<div class="hit">› <b>${esc(firstLine(n.t))}</b></div>`).join('') +
      `</button><button class="dots" data-menu="${m.id}" aria-label="더보기">⋯</button></div>`;
  });
  $('#mapList').innerHTML = h || `<div class="empty">${q ? '검색 결과가 없어요' : '아직 맵이 없어요<br>아래 <b>＋ 새 맵</b>으로 시작해 보세요'}</div>`;
}
$('#mapList').addEventListener('click', e => {
  const o = e.target.closest('[data-open]'); if (o) { fromHome = true; return openHash(o.dataset.open); }
  const m = e.target.closest('[data-menu]'); if (m) cardMenu(m.dataset.menu);
});
$('#search').addEventListener('input', renderHome);
$('#btnNew').onclick = templateMenu;
$('#btnQuick').onclick = quickMemo;
$('#btnSettings').onclick = settingsMenu;

/* ───────────── 라우팅 ───────────── */
let fromHome = false, pendingTitleEdit = null;
const openHash = id => { fromHome = true; location.hash = '#/m/' + id; };

function route() {
  closeEditor(); sheetRoot.innerHTML = '';
  const m = location.hash.match(/^#\/m\/(.+)$/);
  const map = m && db.maps.find(x => x.id === m[1]);
  if (map) openMap(map); else showHome();
}
function showHome() {
  flush(); cur = null; $('#editor').hidden = true; $('#home').hidden = false; renderHome();
}
function openMap(map) {
  cur = map; sel = map.root.id; undoS = []; redoS = [];
  $('#home').hidden = true; $('#editor').hidden = false;
  render();
  if (map.view) { V = { ...map.view }; applyView(); } else fitView();
  if (pendingTitleEdit === map.id) { pendingTitleEdit = null; setTimeout(() => openEditor(map.root.id, false), 150); }
}
addEventListener('hashchange', route);
$('#btnBack').onclick = () => { closeEditor(); if (fromHome && history.length > 1) history.back(); else location.hash = '#/'; fromHome = false; };

/* ───────────── 툴바 / 헤더 ───────────── */
$('#toolbar').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const a = b.dataset.act;
  ({
    child: addChild, sibling: () => addSiblingOf(sel), edit: () => openEditor(sel, false), check: toggleCheckbox,
    more: () => { const r = $('#moreRow'); r.hidden = !r.hidden; },
    up: () => moveSel(-1), down: () => moveSel(1), indent: indentSel, outdent: outdentSel,
    fold: () => toggleFoldId(sel), dup: dupSel, del: removeSel,
  })[a]();
});
$('#btnUndo').onclick = doUndo;
$('#btnRedo').onclick = doRedo;
$('#btnMenu').onclick = editorMenu;
$('#mapTitle').onclick = () => openEditor(cur.root.id, false);
$('#btnView').onclick = () => {
  mode = mode === 'map' ? 'outline' : 'map';
  try { localStorage.setItem('kmindmap.mode', mode); } catch (e) {}
  render(); if (mode === 'map') { if (cur.view) { V = { ...cur.view }; applyView(); } else fitView(); }
  setTimeout(() => reveal(sel), 30);
};

/* 키보드 단축키 (PC) */
document.addEventListener('keydown', e => {
  if (!cur || $('#editor').hidden || !edSheet.hidden || sheetRoot.innerHTML) return;
  if (/input|textarea/i.test(e.target.tagName)) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key;
  if (mod && k.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? doRedo() : doUndo(); }
  if (mod && k.toLowerCase() === 'y') { e.preventDefault(); return doRedo(); }
  const r = locate(sel); if (!r) return;
  const vis = visible(), i = vis.findIndex(n => n.id === sel);
  if (k === 'Tab') { e.preventDefault(); addChild(); }
  else if (k === 'Enter') { e.preventDefault(); addSiblingOf(sel); }
  else if (k === 'F2' || k === ' ') { e.preventDefault(); openEditor(sel, false); }
  else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); removeSel(); }
  else if (k === 'ArrowDown' && vis[i + 1]) { e.preventDefault(); sel = vis[i + 1].id; render(); reveal(sel); }
  else if (k === 'ArrowUp' && vis[i - 1]) { e.preventDefault(); sel = vis[i - 1].id; render(); reveal(sel); }
  else if (k === 'ArrowLeft' && r.p) { e.preventDefault(); sel = r.p.id; render(); reveal(sel); }
  else if (k === 'ArrowRight' && r.n.c.length && !r.n.fold) { e.preventDefault(); sel = r.n.c[0].id; render(); reveal(sel); }
});

/* 키보드가 올라올 때 시트 위치 보정 (iOS) */
if (window.visualViewport) {
  const fix = () => {
    const vv = visualViewport, off = Math.max(0, innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--kb', off + 'px');
  };
  visualViewport.addEventListener('resize', fix); visualViewport.addEventListener('scroll', fix);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => cur && render());
addEventListener('resize', () => { if (cur && mode === 'map') render(); });

/* 시작 */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
route();
})();
