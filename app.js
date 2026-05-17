'use strict';

/* ══════════════════════════════════════════
   CONFIG
══════════════════════════════════════════ */
const FB = {
  apiKey: "AIzaSyBZyvTsyAy4M1H2dqNt9EvpBJ6tIecqLKs",
  authDomain: (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') ? window.location.hostname : "coffee-17f9c.firebaseapp.com",
  projectId: "coffee-17f9c",
  storageBucket: "coffee-17f9c.appspot.com",
  messagingSenderId: "1031227878537",
  appId: "1:1031227878537:web:4b5bd47fe23e475226ea58",
};
const HOST_EMAILS = ['latte1332011@gmail.com', 'rojthep36@gmail.com'];
const HOST_PIN = '1234';   // ← change this to your preferred PIN
const MAX_SCORE = 15;
const RADAR_KEYS = ['fragrance', 'flavor', 'acidity', 'mouthfeel', 'aftertaste', 'sweetness'];
const RADAR_LBLS = ['Fr/Aroma', 'Flavor', 'Acidity', 'Mouthfeel', 'Aftertaste', 'Sweetness'];
const AFF_KEYS = ['fragrance', 'flavor', 'aftertaste', 'acidity', 'sweetness', 'mouthfeel', 'overall'];
const AFF_LBLS = ['Fragrance/Aroma', 'Flavor', 'Aftertaste', 'Acidity', 'Sweetness', 'Mouthfeel', 'Overall'];
const ROASTS = ['NA', 'Light', 'Medium', 'Medium-Dark', 'Dark'];
const TASTES = ['Salty', 'Sour', 'Sweet', 'Bitter', 'Umami'];
const MOUTHFEELS = ['Rough', 'Oily', 'Smooth', 'Mouth-drying', 'Metallic'];
const SCALE_LBLS = ['Extremely Low', 'Very Low', 'Moderately Low', 'Slightly Low',
  'Neither High nor Low', 'Slightly High', 'Moderately High', 'Very High', 'Extremely High', 'Perfect'];
const FLAVOR_BANK = {
  Floral: ['Jasmine', 'Rose', 'Hibiscus', 'Tea-like'],
  Fruity: ['Berry', 'Citrus', 'Stone fruit', 'Tropical', 'Apple', 'Grape', 'Banana'],
  Sweet: ['Honey', 'Caramel', 'Brown sugar', 'Molasses', 'Vanilla'],
  Nuts: ['Almond', 'Hazelnut', 'Peanut', 'Walnut'],
  Spice: ['Cinnamon', 'Clove', 'Cardamom', 'Pepper'],
  Cocoa: ['Cocoa', 'Dark chocolate', 'Milk chocolate'],
  Other: ['Fermented', 'Winey', 'Boozy', 'Herbal'],
};

/* ══════════════════════════════════════════
   FIREBASE
══════════════════════════════════════════ */
firebase.initializeApp(FB);
const auth = firebase.auth();
const db = firebase.firestore();
const TS = () => firebase.firestore.FieldValue.serverTimestamp();

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
const S = {
  theme: localStorage.getItem('cvt') || 'dark',
  user: null,
  hostEmail: null,
  hostName: null,
  myName: localStorage.getItem('cva.name') || 'Guest',
  // room
  roomId: null,
  roomTitle: '',
  hostUid: null,
  samples: [],
  activeSample: null,   // full sample object
  myEval: null,
  allEvals: [],
  tab: 'evaluate',
  openSummaryId: null,
};
let _unsubs = [];          // all active Firestore listeners
let _evalUnsub = null;     // separate tracker for myEval listener

/* ══════════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(S.theme);
  window.addEventListener('hashchange', route);
  route();

  // No redirect result needed — using popup flow instead
});

/* ══════════════════════════════════════════
   ROUTER
══════════════════════════════════════════ */
function route() {
  stopListeners();
  const m = location.hash.match(/^#room\/(\d+)/);
  m ? renderRoom(m[1]) : renderHome();
}

function stopListeners() {
  _unsubs.forEach(fn => fn());
  _unsubs = [];
  if (_evalUnsub) { _evalUnsub(); _evalUnsub = null; }
  // destroy any Chart.js instances
  Chart.instances && Object.values(Chart.instances).forEach(c => c.destroy());
}

/* ══════════════════════════════════════════
   THEME
══════════════════════════════════════════ */
function applyTheme(t) {
  S.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('cvt', t);
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
let _toastTimer;
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ══════════════════════════════════════════
   HOME PAGE
══════════════════════════════════════════ */
function renderHome() {
  document.getElementById('app').innerHTML = `
    <header class="hdr">
      <div class="wrap hdr-inner">
        <a href="#" class="hdr-left">
          <img src="logo-dark.png"  class="logo logo-dark"  alt="logo">
          <img src="logo-light.png" class="logo logo-light" alt="logo">
        </a>
        <div class="hdr-right">
          <button class="btn-icon" id="themeBtn">${S.theme === 'dark' ? '☀️' : '🌙'}</button>
        </div>
      </div>
    </header>
    <main class="wrap page-main">
      <div class="hero">
        <div class="hero-h">The Roastery <span class="accent">by Roj</span></div>
        <div class="hero-s">SCA CVA Collaborative Coffee Cupping Platform</div>
      </div>

      <div class="card" id="authCard"><div class="muted text-sm center" style="padding:8px">Loading…</div></div>
      <div class="card" id="createCard" style="display:none">
        <div class="card-title">🏠 Create Room</div>
        <div class="flex gap-2" style="flex-wrap:wrap">
          <input class="inp flex-1" id="roomTitle" placeholder="Room title (optional)" style="min-width:180px">
          <button class="btn-primary" id="createBtn">+ Create Room</button>
        </div>
      </div>
      <div class="card" id="myRoomsCard" style="display:none">
        <div class="card-title" style="justify-content:space-between">
          <span>📋 My Rooms</span>
          <span class="muted text-sm" id="roomCnt"></span>
        </div>
        <div id="roomsList"></div>
      </div>
      <div class="card">
        <div class="card-title">🚪 Join a Room</div>
        <div class="join-grid">
          <input class="inp" id="joinName" placeholder="Your name" value="${esc(S.myName)}">
          <input class="inp" id="joinId" placeholder="Room ID (e.g. 123456)" inputmode="numeric">
          <button class="btn-primary" id="joinBtn">Enter Room →</button>
        </div>
        <p class="muted text-xs mt-2">Enter the room ID given by the host to join a cupping session.</p>
      </div>
    </main>`;

  on('themeBtn', 'click', () => { applyTheme(S.theme === 'dark' ? 'light' : 'dark'); g('themeBtn').textContent = S.theme === 'dark' ? '☀️' : '🌙'; });
  on('createBtn', 'click', createRoom);
  on('roomTitle', 'keydown', e => e.key === 'Enter' && createRoom());
  on('joinBtn', 'click', joinRoom);
  on('joinId', 'keydown', e => e.key === 'Enter' && joinRoom());

  const unsub = auth.onAuthStateChanged(u => {
    S.user = u;
    // Restore host session from localStorage for anonymous-auth hosts
    if (u && !S.hostEmail) {
      const saved = localStorage.getItem('cva.hostEmail');
      if (saved && HOST_EMAILS.includes(saved.toLowerCase())) {
        S.hostEmail = saved;
        S.hostName = saved.split('@')[0];
      }
    }
    paintAuth();
    const isHost = !!u && !!S.hostEmail && HOST_EMAILS.includes(S.hostEmail.toLowerCase());
    g('createCard').style.display = isHost ? '' : 'none';
    g('myRoomsCard').style.display = isHost ? '' : 'none';
    if (isHost) watchRooms(u.uid);
  });
  _unsubs.push(unsub);
}

function paintAuth() {
  const el = g('authCard'); if (!el) return;
  if (S.user) {
    el.innerHTML = `
      <div class="flex gap-3" style="align-items:center;flex-wrap:wrap">
        <div class="avatar">☕</div>
        <div class="flex-1">
          <div style="font-weight:700">${esc(S.hostName || S.hostEmail || 'Host')}</div>
          <div class="text-xs muted">${esc(S.hostEmail || '')} · Host</div>
        </div>
        <button class="btn btn-sm" id="soBtn">Sign out</button>
      </div>`;
    on('soBtn', 'click', () => auth.signOut().then(() => {
      S.hostEmail = null; S.hostName = null;
      localStorage.removeItem('cva.hostEmail');
      toast('Signed out', 'info');
    }));
  } else {
    el.innerHTML = `
      <div style="padding:6px 0">
        <p class="muted text-sm" style="margin-bottom:18px;text-align:center">Host access — enter your email and PIN.</p>
        <div style="display:flex;flex-direction:column;gap:10px">
          <select class="inp" id="hostEmail">
            ${HOST_EMAILS.map(e => `<option value="${e}">${e}</option>`).join('')}
          </select>
          <div style="position:relative">
            <input class="inp" id="hostPin" type="password" placeholder="Host PIN" autocomplete="off"
              style="width:100%;padding-right:44px;box-sizing:border-box">
            <button id="pinToggle" type="button"
              style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);font-size:16px;padding:0;line-height:1">👁</button>
          </div>
          <button class="btn-primary" id="siBtn" style="width:100%">☕ Sign in as Host</button>
        </div>
      </div>`;
    on('pinToggle', 'click', () => {
      const inp = g('hostPin');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
    const doSignIn = async () => {
      const email = g('hostEmail')?.value.trim().toLowerCase();
      const pin = g('hostPin')?.value;
      const btn = g('siBtn');
      if (!pin) { toast('Please enter your PIN.', 'error'); return; }
      if (pin !== HOST_PIN) { toast('⛔ Incorrect PIN.', 'error'); g('hostPin').value=''; g('hostPin').focus(); return; }
      if (!HOST_EMAILS.includes(email)) { toast('⛔ Email not authorized.', 'error'); return; }
      if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
      // Set host profile before sign-in so onAuthStateChanged can read it
      S.hostEmail = email;
      S.hostName = email.split('@')[0];
      localStorage.setItem('cva.hostEmail', email);
      localStorage.setItem('cva.name', S.hostName);
      try {
        await auth.signInAnonymously();
        toast(`Welcome, ${S.hostName}! ☕`, 'success');
        // Manually update UI — onAuthStateChanged may not re-fire if already anonymous
        paintAuth();
        if (g('createCard')) g('createCard').style.display = '';
        if (g('myRoomsCard')) g('myRoomsCard').style.display = '';
        if (S.user) watchRooms(S.user.uid);
      } catch (e) {
        toast(e.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = '☕ Sign in as Host'; }
      }
    };
    on('siBtn', 'click', doSignIn);
    on('hostPin', 'keydown', e => e.key === 'Enter' && doSignIn());
  }
}

function watchRooms(uid) {
  const u = db.collection('rooms').where('hostUid', '==', uid)
    .onSnapshot(snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      const el = g('roomsList'); const cnt = g('roomCnt');
      if (!el) return;
      cnt.textContent = `${list.length} room${list.length !== 1 ? 's' : ''}`;
      if (!list.length) { el.innerHTML = '<p class="muted text-sm" style="font-style:italic;padding:8px 0">No rooms yet.</p>'; return; }
      el.innerHTML = list.map(r => `
        <div class="room-row" data-open="${r.id}">
          <div class="flex-1">
            <div class="room-name">${esc(r.title || '(Untitled)')}</div>
            <div class="room-id">ID: ${r.id}</div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-sm" data-open="${r.id}">Open</button>
            <button class="btn btn-sm btn-danger" data-del="${r.id}">Delete</button>
          </div>
        </div>`).join('');
      el.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => location.hash = `#room/${b.dataset.open}`));
      el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); delRoom(b.dataset.del); }));
    }, e => toast(e.message, 'error'));
  _unsubs.push(u);
}

async function createRoom() {
  if (!S.user || !S.hostEmail) { toast('Please sign in first.', 'error'); return; }
  const title = g('roomTitle')?.value.trim() || '';
  const id = String(Math.floor(100000 + Math.random() * 900000));
  await db.collection('rooms').doc(id).set({
    title: title || `Room ${id}`,
    hostUid: S.user.uid,
    hostEmail: S.hostEmail,
    hostName: S.hostName || S.hostEmail,
    createdAt: TS()
  });
  localStorage.setItem('cva.name', S.hostName || S.hostEmail || 'Host');
  if (g('roomTitle')) g('roomTitle').value = '';
  toast('☕ Room created!', 'success');
  location.hash = `#room/${id}`;
}

async function delRoom(id) {
  if (!confirm('Delete this room?')) return;
  await db.collection('rooms').doc(id).delete();
  toast('Room deleted.', 'info');
}

function joinRoom() {
  const name = g('joinName')?.value.trim() || 'Guest';
  const roomId = g('joinId')?.value.trim();
  if (!roomId) { toast('Enter a room ID.', 'error'); return; }
  S.myName = name;
  localStorage.setItem('cva.name', name);
  location.hash = `#room/${roomId}`;
}

/* ══════════════════════════════════════════
   ROOM PAGE
══════════════════════════════════════════ */
async function renderRoom(roomId) {
  S.roomId = roomId; S.tab = 'evaluate'; S.activeSample = null; S.myEval = null;
  S.myName = localStorage.getItem('cva.name') || 'Guest';

  document.getElementById('app').innerHTML = `
    <header class="hdr">
      <div class="wrap hdr-inner">
        <div class="hdr-left">
          <a href="#" class="back-link">← Home</a>
          <span class="sep">/</span>
          <span class="room-title-hdr" id="roomHdrTitle">Room ${esc(roomId)}</span>
        </div>
        <div class="hdr-right">
          <button class="btn-icon" id="qrBtn" title="Share Room QR">📷</button>
          <button class="btn-icon" id="themeBtn">${S.theme === 'dark' ? '☀️' : '🌙'}</button>
          <span class="role-badge" id="roleBadge">GUEST</span>
          <span class="text-sm muted" id="nameTag">You: <b style="color:var(--text)">${esc(S.myName)}</b></span>
        </div>
      </div>
    </header>
    <main class="wrap page-main">
      <div class="tabs">
        <button class="tab active" data-tab="evaluate">✍️ Evaluate</button>
        <button class="tab" data-tab="summary">📊 Room Summary</button>
      </div>
      <div id="roomBody"><p class="muted text-sm center" style="padding:40px">Loading…</p></div>
    </main>`;

  on('themeBtn', 'click', () => { applyTheme(S.theme === 'dark' ? 'light' : 'dark'); g('themeBtn').textContent = S.theme === 'dark' ? '☀️' : '🌙'; });
  on('qrBtn', 'click', () => showQR(roomId));
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active'); S.tab = t.dataset.tab; paintBody();
  }));

  // Check room exists
  const rdoc = await db.collection('rooms').doc(roomId).get();
  if (!rdoc.exists) { g('roomBody').innerHTML = `<div class="card center" style="padding:40px"><b style="font-size:18px">Room not found</b><p class="muted mt-2">ID <code>${esc(roomId)}</code> does not exist.</p><a href="#" class="btn-primary" style="display:inline-flex;margin-top:20px">← Back</a></div>`; return; }
  const rd = rdoc.data(); S.roomTitle = rd.title || `Room ${roomId}`; S.hostUid = rd.hostUid;
  g('roomHdrTitle').textContent = S.roomTitle;

  // Auth (anon for guests)
  const au = auth.onAuthStateChanged(async u => {
    if (!u) { try { const r = await auth.signInAnonymously(); S.user = r.user; } catch { S.user = null; } }
    else S.user = u;
    const h = isHost();
    const badge = g('roleBadge');
    if (badge) { badge.textContent = h ? 'HOST' : 'GUEST'; badge.className = 'role-badge' + (h ? ' host' : ''); }
    paintBody();
  });
  _unsubs.push(au);

  // Samples (real-time)
  const su = db.collection('samples').where('roomId', '==', roomId)
    .onSnapshot(snap => {
      S.samples = snap.docs.map(d => d.data()).sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      if (!S.activeSample && S.samples.length) S.activeSample = S.samples[0];
      if (S.activeSample) S.activeSample = S.samples.find(s => s.id === S.activeSample.id) || S.samples[0] || null;
      watchMyEval();
      paintBody();
    });
  _unsubs.push(su);

  // All evals (for summary)
  const eu = db.collection('evaluations').where('roomId', '==', roomId)
    .onSnapshot(snap => { S.allEvals = snap.docs.map(d => d.data()); if (S.tab === 'summary') paintBody(); });
  _unsubs.push(eu);
}

function isHost() { return !!S.user && S.user.uid === S.hostUid; }

function watchMyEval() {
  if (_evalUnsub) { _evalUnsub(); _evalUnsub = null; }
  if (!S.activeSample || !S.myName) return;
  const id = `${S.activeSample.id}__${S.myName}`;
  _evalUnsub = db.collection('evaluations').doc(id).onSnapshot(d => {
    S.myEval = d.exists ? d.data() : null;
    refreshSummaryCard();
  });
}

/* ── Paint the body area ── */
function paintBody() {
  if (S.tab === 'evaluate') paintEvaluate();
  else paintSummary();
}

/* ══════════════════════════════════════════
   EVALUATE TAB
══════════════════════════════════════════ */
function paintEvaluate() {
  const h = isHost();
  g('roomBody').innerHTML = `
    <div class="room-layout">
      <aside>
        <div class="card">
          <div class="flex gap-2" style="align-items:center;justify-content:space-between;margin-bottom:14px">
            <span style="font-weight:700">Samples <span class="muted">(${S.samples.length})</span></span>
            ${h ? `<button class="btn-primary btn-sm" id="newSampleBtn">+ New</button>` : ''}
          </div>
          <div id="samplesList">
            ${!S.samples.length
      ? `<p class="muted text-sm" style="font-style:italic;padding:8px 0">${h ? 'No samples. Click + New.' : 'Waiting for host…'}</p>`
      : S.samples.map(s => `
                <div class="sample-item${S.activeSample?.id === s.id ? ' active' : ''}" data-sid="${s.id}">
                  <div class="flex-1" style="overflow:hidden">
                    <div style="font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                      ${esc(s.code || '(no code)')} <span class="muted" style="font-weight:400;font-size:12px">${s.roast}</span>
                    </div>
                    <div class="muted text-xs">${s.sessionDate}</div>
                  </div>
                  ${h ? `<button class="btn btn-sm btn-danger" data-delsample="${s.id}" title="Delete">✕</button>` : ''}
                </div>`).join('')}
          </div>
        </div>
      </aside>

      <section id="mainSection">
        ${!S.activeSample
      ? `<div class="card muted text-sm center" style="padding:40px">${S.samples.length ? 'Select a sample to begin.' : 'No samples yet.'}</div>`
      : `
            <div class="card" id="sampleInfoCard">${buildSampleInfo()}</div>
            <div class="card" style="margin-top:0">
              <div class="flex gap-3" style="align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:16px">
                <span style="font-weight:700;font-size:15px">SCA CVA Combined Form</span>
                <span class="muted text-sm">Evaluator: <b style="color:var(--text)">${esc(S.myName)}</b></span>
              </div>
              ${buildSCAForm()}
            </div>
            <div class="card" id="summaryCard" style="margin-top:0">${buildPersonalSummary()}</div>
          `}
      </section>
    </div>`;

  // Sample selection
  g('roomBody').querySelectorAll('.sample-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('[data-delsample]')) return;
      S.activeSample = S.samples.find(s => s.id === el.dataset.sid) || null;
      watchMyEval(); paintBody();
    });
  });
  g('roomBody').querySelectorAll('[data-delsample]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); deleteSample(b.dataset.delsample); }));
  if (g('newSampleBtn')) on('newSampleBtn', 'click', newSample);

  if (S.activeSample) { bindSampleInfo(); bindForm(); drawPersonalRadar(); }
}

/* ── Sample info card ── */
function buildSampleInfo() {
  const s = S.activeSample; if (!s) return ''; const h = isHost();
  return `
    <div style="font-weight:700;margin-bottom:14px">Sample Information</div>
    <div class="info-grid">
      <label class="field-label">Sample Code
        <input class="inp" id="sCode" value="${esc(s.code)}" ${h ? '' : 'disabled'} placeholder="e.g. A, B, C">
      </label>
      <label class="field-label">Roast Level
        <select class="inp" id="sRoast" ${h ? '' : 'disabled'}>
          ${ROASTS.map(r => `<option${r === s.roast ? ' selected' : ''}>${r}</option>`).join('')}
        </select>
      </label>
      <label class="field-label">Session Date
        <input type="date" class="inp" id="sDate" value="${s.sessionDate}" ${h ? '' : 'disabled'}>
      </label>
    </div>
    ${!h ? '<p class="muted text-xs mt-2">* Only the host can edit sample information.</p>' : ''}`;
}

function bindSampleInfo() {
  if (!isHost() || !S.activeSample) return;
  let dt;
  const save = () => { clearTimeout(dt); dt = setTimeout(() => db.collection('samples').doc(S.activeSample.id).update({ code: g('sCode')?.value || '', roast: g('sRoast')?.value || 'NA', sessionDate: g('sDate')?.value || todayISO(), updatedAt: TS() }), 350); };
  g('sCode')?.addEventListener('input', save);
  g('sRoast')?.addEventListener('change', save);
  g('sDate')?.addEventListener('change', save);
}

/* ── SCA Form HTML ── */
function buildSCAForm() {
  const ev = S.myEval || defEval();
  return `
  <div class="sca-wrap">
    <div class="part1">
      <div class="part-label">Part 1 — Sensory Descriptive Assessment</div>

      ${scoreBlock('Fragrance / Aroma', 'fragrance', ev.scores)}
      <div class="two-col" style="margin-top:14px;margin-bottom:20px">
        <div>
          <div class="field-title accent">Aroma Descriptors (max 5)</div>
          ${chipBank('aroma', ev.descriptors.fragranceDry || [], 5)}
        </div>
        ${noteField('notesAroma', 'Aroma Notes', ev.notesAroma)}
      </div>

      <div class="part-divider"></div>
      ${scoreBlock('Flavor', 'flavor', ev.scores)}
      ${scoreBlock('Aftertaste', 'aftertaste', ev.scores)}
      <div class="two-col" style="margin-top:14px;margin-bottom:20px">
        <div>
          <div class="field-title accent">Flavor Descriptors (max 5)</div>
          ${chipBank('flavor', ev.descriptors.flavorNotes || [], 5)}
        </div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div>
            <div class="field-title">Main Tastes (max 2)</div>
            ${limitChips('tastes', TASTES, ev.attributes.mainTastes || [], 2)}
          </div>
          ${noteField('notesFlavor', 'Flavor Notes', ev.notesFlavor)}
        </div>
      </div>

      <div class="part-divider"></div>
      ${scoreBlock('Acidity', 'acidity', ev.scores)}
      <div style="margin:10px 0 16px">
        <div class="field-title">Acidity Type</div>
        <select class="inp" id="acidityType" style="max-width:300px">
          <option value="">— Select —</option>
          <option value="dry"${ev.attributes.acidityType === 'dry' ? ' selected' : ''}>DRY (cherry, grassy, tart)</option>
          <option value="sweet"${ev.attributes.acidityType === 'sweet' ? ' selected' : ''}>SWEET (juicy, fruit-like, bright)</option>
        </select>
      </div>

      ${scoreBlock('Sweetness', 'sweetness', ev.scores)}
      ${scoreBlock('Mouthfeel (Intensity)', 'mouthfeel', ev.scores)}
      <div style="margin:10px 0 16px">
        <div class="field-title">Mouthfeel Properties (max 2)</div>
        ${limitChips('mouthfeel', MOUTHFEELS, ev.attributes.mouthfeelProps || [], 2)}
      </div>

      <div class="part-divider"></div>
      ${noteField('notesGeneral', 'General Notes', ev.notesGeneral)}
    </div>

    <div class="part2">
      <div class="legend-card">
        <div class="legend-title">Impression of Quality Scale</div>
        <div class="legend-gradient"></div>
        <div class="legend-ends">
          <span>Extremely Low</span>
          <span>Neither</span>
          <span>Extremely High</span>
        </div>
        <div class="legend-nums">
          ${Array.from({ length: 10 }, (_, i) => `<span>${i + 1}</span>`).join('')}
        </div>
      </div>
      <div class="card" style="padding:14px;box-shadow:none;background:var(--panel2);overflow:hidden">
        <div class="part-label">Part 2 — Affective Assessment</div>
        ${AFF_KEYS.map((k, i) => affRow(k, AFF_LBLS[i], ev.affective?.[k] ?? null)).join('')}
      </div>
    </div>
  </div>`;
}

function scoreBlock(title, key, scores) {
  const v = Number(scores?.[key] ?? 0);
  const pct = (v / MAX_SCORE) * 100;
  const lvl = v === 0 ? -1 : v <= 5 ? 0 : v <= 10 ? 1 : 2;
  return `
  <div class="intensity-block">
    <div class="intensity-head">
      <span class="intensity-name">${title}</span>
      <div class="score-badge-wrap">
        <span class="score-badge${v > 0 ? ' on' : ''}">${v}</span>
        <span class="score-max">/ ${MAX_SCORE}</span>
      </div>
    </div>
    <div class="score-track" data-skey="${key}">
      <button class="score-btn" data-act="dec">−</button>
      <input type="number" class="score-num" min="0" max="${MAX_SCORE}" value="${v}" data-skey="${key}" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0">
      <div class="score-bar"><div class="score-fill" style="width:${pct}%"></div></div>
      <button class="score-btn" data-act="inc">+</button>
    </div>
    <div class="score-levels">
      <span class="level-lbl${lvl === 0 ? ' on' : ''}">1–5 · LOW</span>
      <span class="level-lbl${lvl === 1 ? ' on' : ''}">6–10 · MED</span>
      <span class="level-lbl${lvl === 2 ? ' on' : ''}">11–15 · HIGH</span>
    </div>
  </div>`;
}

function chipBank(type, selected, max) {
  const sel = new Set(selected);
  return `<div class="chip-bank" data-btype="${type}" data-max="${max}">
    ${Object.entries(FLAVOR_BANK).map(([grp, items]) => `
      <div class="chip-group-label">${grp}</div>
      <div class="chips">${items.map(it => `<button class="chip${sel.has(it) ? ' on' : ''}" data-chip="${esc(it)}">${esc(it)}</button>`).join('')}</div>`).join('')}
    <div class="chip-count">${sel.size}/${max} selected</div>
  </div>`;
}

function limitChips(type, opts, selected, max) {
  const sel = new Set(selected);
  return `<div class="chips limit-chips" data-ltype="${type}" data-max="${max}">
    ${opts.map(o => `<button class="chip${sel.has(o) ? ' on' : ''}" data-chip="${esc(o)}">${esc(o)}</button>`).join('')}
    <span class="chip-count">${sel.size}/${max}</span>
  </div>`;
}

function affRow(key, label, val) {
  return `<div class="aff-row">
    <div class="aff-head">
      <span class="aff-label">${label}</span>
      <span class="aff-score${val ? ' on' : ''}">${val ?? '–'}</span>
    </div>
    <div class="ninebox" data-akey="${key}">
      ${Array.from({ length: 10 }, (_, i) => `<button class="nine-btn${val === i + 1 ? ' on' : ''}" data-n="${i + 1}" title="${SCALE_LBLS[i]}">${i + 1}</button>`).join('')}
    </div>
  </div>`;
}

function noteField(id, label, val) {
  return `<div>
    <div class="field-title accent">${label}</div>
    <textarea class="note-area" id="${id}" rows="3" placeholder="Type notes here…">${esc(val || '')}</textarea>
  </div>`;
}

function buildPersonalSummary() {
  const sc = S.myEval?.scores; const af = S.myEval?.affective;
  const avg = descAvg(sc); const total = Math.round((avg / MAX_SCORE) * 100); const aff = affAvg(af);
  return `
    <div class="snapshot-head">
      <span style="font-weight:700;font-size:14px;letter-spacing:-.01em">My Snapshot</span>
      <div><span class="snap-score">${total}</span><span class="snap-max">/ 100</span></div>
    </div>
    <canvas id="radarCanvas" style="max-height:220px;margin:10px 0 4px"></canvas>
    <div class="snap-stats">
      <div class="snap-stat">
        <div class="snap-val">${avg.toFixed(1)}</div>
        <div class="snap-key">Descriptive / ${MAX_SCORE}</div>
      </div>
      <div class="snap-stat">
        <div class="snap-val${aff != null ? '' : ' muted'}">${aff != null ? aff.toFixed(1) : '–'}</div>
        <div class="snap-key">Affective / 9</div>
      </div>
    </div>
    <button class="btn-primary" style="width:100%;margin-top:14px" id="saveBtn">Save Evaluation</button>`;
}

function refreshSummaryCard() {
  const el = g('summaryCard'); if (!el) return;
  el.innerHTML = buildPersonalSummary();
  on('saveBtn', 'click', () => saveEval({}).then(() => toast('Saved! ✓', 'success')));
  drawPersonalRadar();
}

/* ── Bind all form events ── */
function bindForm() {
  const body = g('roomBody'); if (!body) return;

  // Score +/- + input
  body.querySelectorAll('.score-track').forEach(row => {
    const key = row.dataset.skey;
    const inp = row.querySelector('.score-num');
    const fill = row.querySelector('.score-fill');
    const block = row.closest('.intensity-block');

    const refresh = v => {
      inp.value = v; fill.style.width = `${(v / MAX_SCORE) * 100}%`;
      const badge = block.querySelector('.score-badge');
      if (badge) { badge.textContent = v; badge.classList.toggle('on', v > 0); }
      block.querySelectorAll('.level-lbl').forEach(b => b.classList.remove('on'));
      if (v > 0 && v <= 5) block.querySelectorAll('.level-lbl')[0]?.classList.add('on');
      else if (v > 5 && v <= 10) block.querySelectorAll('.level-lbl')[1]?.classList.add('on');
      else if (v > 10) block.querySelectorAll('.level-lbl')[2]?.classList.add('on');
      drawPersonalRadar();
    };
    row.querySelector('[data-act="dec"]').addEventListener('click', () => { const v = clamp(+(inp.value) || 0, -1); refresh(v); saveEval({ scores: { [key]: v } }); });
    row.querySelector('[data-act="inc"]').addEventListener('click', () => { const v = clamp(+(inp.value) || 0, +1); refresh(v); saveEval({ scores: { [key]: v } }); });
    inp.addEventListener('input', () => { const v = clamp(+(inp.value) || 0, 0); refresh(v); saveEval({ scores: { [key]: v } }); });
  });

  // Flavor/aroma chip banks
  body.querySelectorAll('.chip-bank').forEach(bank => {
    const max = +bank.dataset.max;
    const field = bank.dataset.btype === 'aroma' ? 'fragranceDry' : 'flavorNotes';
    bank.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const on = chip.classList.contains('on');
        const cur = [...bank.querySelectorAll('.chip.on')];
        if (!on && cur.length >= max) return;
        chip.classList.toggle('on');
        const sel = [...bank.querySelectorAll('.chip.on')].map(c => c.dataset.chip);
        bank.querySelector('.chip-count').textContent = `${sel.length}/${max} selected`;
        saveEval({ descriptors: { [field]: sel } });
      });
    });
  });

  // Limited chips
  body.querySelectorAll('.limit-chips').forEach(el => {
    const max = +el.dataset.max;
    const field = el.dataset.ltype === 'tastes' ? 'mainTastes' : 'mouthfeelProps';
    el.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const on = chip.classList.contains('on');
        const cur = [...el.querySelectorAll('.chip.on')];
        if (!on && cur.length >= max) return;
        chip.classList.toggle('on');
        const sel = [...el.querySelectorAll('.chip.on')].map(c => c.dataset.chip);
        const cnt = el.querySelector('.chip-count'); if (cnt) cnt.textContent = `${sel.length}/${max}`;
        saveEval({ attributes: { [field]: sel } });
      });
    });
  });

  // Acidity type
  g('acidityType')?.addEventListener('change', e => saveEval({ attributes: { acidityType: e.target.value } }));

  // Notes (debounced 400ms)
  ['notesAroma', 'notesFlavor', 'notesGeneral'].forEach(id => {
    let t; g(id)?.addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => saveEval({ [id]: e.target.value }), 400); });
  });

  // Nine-box affective
  body.querySelectorAll('.ninebox').forEach(box => {
    const key = box.dataset.akey;
    box.querySelectorAll('.nine-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = +btn.dataset.n; const cur = S.myEval?.affective?.[key] ?? null; const next = cur === n ? null : n;
        box.querySelectorAll('.nine-btn').forEach(b => b.classList.toggle('on', +b.dataset.n === next));
        const scoreEl = box.closest('.aff-row')?.querySelector('.aff-score');
        if (scoreEl) { scoreEl.textContent = next ?? '–'; scoreEl.classList.toggle('on', next != null); }
        saveEval({ affective: { [key]: next } });
      });
    });
  });

  // Save button
  on('saveBtn', 'click', () => saveEval({}).then(() => toast('Saved! ✓', 'success')));
}

/* ══════════════════════════════════════════
   SUMMARY TAB
══════════════════════════════════════════ */
function paintSummary() {
  if (!isHost()) {
    g('roomBody').innerHTML = `<div class="card center" style="padding:40px"><p class="muted">Only the host can view the room summary.</p></div>`;
    return;
  }
  const byId = {};
  S.samples.forEach(s => { byId[s.id] = { sample: s, evals: [] }; });
  S.allEvals.forEach(ev => { if (byId[ev.sampleId]) byId[ev.sampleId].evals.push(ev); });

  if (!S.samples.length) { g('roomBody').innerHTML = `<div class="card muted text-sm center" style="padding:32px">No samples yet.</div>`; return; }

  g('roomBody').innerHTML = `<div style="display:grid;gap:10px">${S.samples.map(s => {
    const { evals } = byId[s.id] || { evals: [] };
    const avg = avgScores(evals);
    const total = evals.length ? Math.round((descAvg(avg) / MAX_SCORE) * 100) : null;
    const aff = affAvgAll(evals);
    const open = S.openSummaryId === s.id;
    return `<div class="sum-card${open ? ' open' : ''}">
      <div class="sum-hdr" data-sid="${s.id}">
        <div class="sum-code">${esc((s.code || '?').slice(0, 2))}</div>
        <div class="sum-meta">
          <span class="sum-title">${esc(s.code || '(no code)')}</span>
          <span class="sum-sub">${esc(s.roast)} · ${s.sessionDate}</span>
        </div>
        <div class="sum-right">
          ${total !== null
        ? `<div class="sum-score">${total}<span class="sum-score-max">/100</span></div>`
        : `<span class="muted text-xs">No data</span>`}
          <span class="muted text-xs">${evals.length} eval${evals.length !== 1 ? 's' : ''}</span>
          <span class="sum-chevron">▼</span>
        </div>
      </div>
      ${open ? `
      <div class="sum-detail">
        <div class="sum-radar-wrap"><canvas id="rs_${s.id}" height="200"></canvas></div>
        <div class="sum-right-col">
          <div class="sum-bars">
            ${RADAR_KEYS.map((k, i) => {
          const v = avg[k] || 0;
          return `<div class="sum-bar-row">
                <span class="sum-bar-label">${RADAR_LBLS[i]}</span>
                <div class="sum-bar-track"><div class="sum-bar-fill" style="width:${(v / MAX_SCORE) * 100}%"></div></div>
                <span class="sum-bar-val">${v.toFixed(1)}</span>
              </div>`;
        }).join('')}
          </div>
          <div class="sum-footer">
            <div class="sum-stat">
              <div class="sum-stat-val">${total ?? '–'}</div>
              <div class="sum-stat-key">Score / 100</div>
            </div>
            <div class="sum-stat">
              <div class="sum-stat-val${aff == null ? ' dim' : ''}">${aff != null ? aff.toFixed(1) : '–'}</div>
              <div class="sum-stat-key">Affective / 10</div>
            </div>
            <div class="sum-evals">
              ${evals.map(e => `<span class="sum-eval-chip">${esc(e.evaluatorName)}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>`: ''}
    </div>`;
  }).join('')}</div>`;

  g('roomBody').querySelectorAll('.sum-hdr').forEach(h => {
    h.addEventListener('click', () => {
      S.openSummaryId = S.openSummaryId === h.dataset.sid ? null : h.dataset.sid;
      paintSummary();
      if (S.openSummaryId) {
        const { evals } = byId[S.openSummaryId] || { evals: [] };
        setTimeout(() => drawRadar(`rs_${S.openSummaryId}`, avgScores(evals)), 60);
      }
    });
  });
  if (S.openSummaryId) {
    const { evals } = byId[S.openSummaryId] || { evals: [] };
    setTimeout(() => drawRadar(`rs_${S.openSummaryId}`, avgScores(evals)), 80);
  }
}

/* ══════════════════════════════════════════
   FIREBASE OPS
══════════════════════════════════════════ */
async function newSample() {
  if (!isHost()) return;
  const id = randId();
  const s = { id, roomId: S.roomId, code: '', roast: 'NA', sessionDate: todayISO(), createdByUid: S.hostUid, updatedAt: TS() };
  await db.collection('samples').doc(id).set(s);
  S.activeSample = s;
}

async function deleteSample(sid) {
  if (!isHost() || !confirm('Delete this sample?')) return;
  await db.collection('samples').doc(sid).delete();
  if (S.activeSample?.id === sid) { const rest = S.samples.filter(s => s.id !== sid); S.activeSample = rest[0] || null; }
}

async function saveEval(patch) {
  if (!S.activeSample || !S.user) return;
  const eid = `${S.activeSample.id}__${S.myName}`;
  const base = S.myEval || defEval();
  const merged = {
    ...base, id: eid, roomId: S.roomId, sampleId: S.activeSample.id,
    evaluatorName: S.myName, evaluatorUid: S.user.uid,
    scores: { ...base.scores, ...(patch.scores || {}) },
    descriptors: { ...base.descriptors, ...(patch.descriptors || {}) },
    attributes: { ...base.attributes, ...(patch.attributes || {}) },
    affective: { ...(base.affective || defEval().affective), ...(patch.affective || {}) },
  };
  if (patch.notesAroma !== undefined) merged.notesAroma = patch.notesAroma;
  if (patch.notesFlavor !== undefined) merged.notesFlavor = patch.notesFlavor;
  if (patch.notesGeneral !== undefined) merged.notesGeneral = patch.notesGeneral;
  merged.updatedAt = TS();
  S.myEval = merged;
  return db.collection('evaluations').doc(eid).set(prune(merged), { merge: true });
}

/* ══════════════════════════════════════════
   CHARTS
══════════════════════════════════════════ */
function drawPersonalRadar() { drawRadar('radarCanvas', S.myEval?.scores); }

function drawRadar(canvasId, scores) {
  const el = g(canvasId); if (!el) return;
  const existing = Chart.getChart(el); if (existing) existing.destroy();
  const dark = S.theme === 'dark';
  const grid = dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)';
  const tick = dark ? '#78716c' : '#a8a29e';
  const acc = dark ? '#f59e0b' : '#d97706';
  const fill = dark ? 'rgba(245,158,11,.10)' : 'rgba(217,119,6,.09)';
  const ptBg = dark ? '#1c1917' : '#ffffff';
  new Chart(el, {
    type: 'radar',
    data: {
      labels: RADAR_LBLS,
      datasets: [{
        data: RADAR_KEYS.map(k => +(scores?.[k] ?? 0)),
        borderColor: acc,
        backgroundColor: fill,
        pointBackgroundColor: ptBg,
        pointBorderColor: acc,
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2.5,
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 500, easing: 'easeOutQuart' },
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: MAX_SCORE,
          ticks: { stepSize: 5, color: tick, font: { size: 10 }, backdropColor: 'transparent' },
          grid: { color: grid },
          pointLabels: { color: tick, font: { size: 12, weight: '600' } },
          angleLines: { color: grid },
        }
      }
    }
  });
}

/* ══════════════════════════════════════════
   MATH
══════════════════════════════════════════ */
function descAvg(s) { if (!s) return 0; const v = RADAR_KEYS.map(k => +(s[k] ?? 0)); return v.reduce((a, b) => a + b, 0) / v.length; }
function affAvg(a) { if (!a) return null; const v = AFF_KEYS.slice(0, -1).map(k => a[k]).filter(n => typeof n === 'number'); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }
function affAvgAll(evals) {
  const valid = evals.map(e => e.affective).filter(Boolean);
  if (!valid.length) return null;
  const kas = AFF_KEYS.slice(0, -1).map(k => { const v = valid.map(a => a[k]).filter(n => typeof n === 'number'); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }).filter(n => n !== null);
  return kas.length ? kas.reduce((a, b) => a + b, 0) / kas.length : null;
}
function avgScores(evals) {
  const all = ['fragrance', 'flavor', 'aftertaste', 'acidity', 'body', 'sweetness', 'balance', 'cleanCup', 'uniformity', 'mouthfeel'];
  const r = {};
  all.forEach(k => { const v = evals.map(e => e.scores?.[k] ?? 0); r[k] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; });
  return r;
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function defEval() {
  return {
    scores: { fragrance: 0, flavor: 0, aftertaste: 0, acidity: 0, body: 0, sweetness: 0, balance: 0, cleanCup: 0, uniformity: 0, mouthfeel: 0 },
    descriptors: { fragranceDry: [], fragranceCrust: [], fragranceBreak: [], flavorNotes: [] },
    attributes: { acidityType: '', mainTastes: [], mouthfeelProps: [] },
    affective: { fragrance: null, flavor: null, aftertaste: null, acidity: null, sweetness: null, mouthfeel: null, overall: null },
    notesAroma: '', notesFlavor: '', notesGeneral: '',
  };
}
function clamp(v, d) { return Math.max(0, Math.min(MAX_SCORE, typeof d === 'number' && Math.abs(d) === 1 ? v + d : d === 0 ? Math.round(v) : v)); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function randId() { return Math.random().toString(36).slice(2, 10); }
function prune(o) { return JSON.parse(JSON.stringify(o, (_, v) => v === undefined ? null : v)); }
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function g(id) { return document.getElementById(id); }
function on(id, ev, fn) { const el = g(id); if (el) el.addEventListener(ev, fn); }

/* ══════════════════════════════════════════
   QR CODE
══════════════════════════════════════════ */
function showQR(roomId) {
  const overlay = g('qrOverlay');
  if (!overlay) return;

  const joinUrl = location.origin + location.pathname + '#room/' + roomId;

  const nameEl = g('qrRoomName');
  const idEl   = g('qrRoomIdDisplay');
  if (nameEl) nameEl.textContent = S.roomTitle || ('Room ' + roomId);
  if (idEl)   idEl.textContent   = 'ID: ' + roomId;

  // Render QR into .qr-canvas-wrap
  const wrap = document.querySelector('.qr-canvas-wrap');
  if (wrap) {
    wrap.innerHTML = '';
    if (typeof qrcode !== 'undefined') {
      try {
        const qr = qrcode(0, 'M');
        qr.addData(joinUrl);
        qr.make();
        const cells  = qr.getModuleCount();
        const cellPx = Math.floor(200 / cells);
        const cv = document.createElement('canvas');
        cv.width = cv.height = cells * cellPx;
        cv.style.cssText = 'display:block;border-radius:4px';
        const ctx = cv.getContext('2d');
        for (let row = 0; row < cells; row++) {
          for (let col = 0; col < cells; col++) {
            ctx.fillStyle = qr.isDark(row, col) ? '#000' : '#fff';
            ctx.fillRect(col * cellPx, row * cellPx, cellPx, cellPx);
          }
        }
        wrap.appendChild(cv);
      } catch(e) { _qrImgFallback(wrap, joinUrl, roomId); }
    } else {
      _qrImgFallback(wrap, joinUrl, roomId);
    }
  }


  overlay.classList.add('show');

  // ── Wire buttons (clone to remove stale listeners) ──
  const copyBtn  = g('qrCopyBtn');
  const dlBtn    = g('qrDownloadBtn');
  const closeBtn = g('qrCloseBtn');

  // Copy Link
  const newCopy = copyBtn.cloneNode(true);
  copyBtn.replaceWith(newCopy);
  newCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
    } catch {
      // Fallback: textarea execCommand
      const ta = Object.assign(document.createElement('textarea'), {
        value: joinUrl,
        style: 'position:fixed;opacity:0',
      });
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    newCopy.textContent = '✓ Copied!';
    setTimeout(() => { newCopy.textContent = '📋 Copy Link'; }, 2200);
  });

  // Download QR
  const newDl = dlBtn.cloneNode(true);
  dlBtn.replaceWith(newDl);
  newDl.addEventListener('click', () => {
    // Try canvas first (qrcode-generator rendered it)
    const cv = wrap && wrap.querySelector('canvas');
    if (cv) {
      const link = document.createElement('a');
      link.download = 'room-' + roomId + '-qr.png';
      link.href = cv.toDataURL('image/png'); link.click();
      return;
    }
    // Fallback: draw Google Charts img onto tmp canvas
    const img = wrap && wrap.querySelector('img');
    if (img && img.complete && img.naturalWidth) {
      const tmp = document.createElement('canvas');
      tmp.width = img.naturalWidth || 200; tmp.height = img.naturalHeight || 200;
      const ctx = tmp.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, tmp.width, tmp.height);
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = 'room-' + roomId + '-qr.png';
      link.href = tmp.toDataURL('image/png'); link.click();
    } else {
      toast('QR not ready yet, please wait a moment.', 'error');
    }
  });

  // Close button
  const newClose = closeBtn.cloneNode(true);
  closeBtn.replaceWith(newClose);
  newClose.addEventListener('click', closeQR);
}

function closeQR() {
  const overlay = g('qrOverlay');
  if (overlay) overlay.classList.remove('show');
}

function _qrImgFallback(wrap, joinUrl, roomId) {
  const img = document.createElement('img');
  img.width = 200; img.height = 200;
  img.alt = 'QR Code for Room ' + roomId;
  img.style.cssText = 'display:block;border-radius:4px';
  img.src = 'https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=' + encodeURIComponent(joinUrl) + '&choe=UTF-8&chld=M|1';
  wrap.appendChild(img);
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  const overlay = g('qrOverlay');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeQR(); });
});
