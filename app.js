// ============================================================
//  CLUCK & CONQUER — app.js
//  Pure vanilla JS, localStorage persistence, real timestamps
// ============================================================

'use strict';

// ── Constants ────────────────────────────────────────────────
const PHASE_DURATION_MS   = 5 * 60 * 1000;    // 5 min per phase
const TOTAL_MATURE_MS     = 20 * 60 * 1000;   // 20 min total
const ROTTEN_MS           = 12 * 60 * 60 * 1000; // 12 hours
const CHICKEN_DISPLAY_MS  = 60 * 1000;        // 1 min on board
const EGG_RADIUS          = 36;               // px, collision radius
const BANK_SIZE           = 5;

const TIER_PROBS = {
  basic: [
    { tier: 'basic', w: 50 },
    { tier: 'fancy', w: 50 },
  ],
  fancy: [
    { tier: 'fancy', w: 50 },
    { tier: 'rare',  w: 50 },
  ],
  rare: [
    { tier: 'rare',  w: 25 },
    { tier: 'fancy', w: 50 },
    { tier: 'basic', w: 25 },
  ],
};

// Bank tier generation (after first bank)
const BANK_GEN = [
  { tier: 'basic',  w: 60 },
  { tier: 'fancy',  w: 30 },
  { tier: 'rare',   w: 10 },
];

const EGG_EMOJI_BY_PHASE = {
  basic: ['🥚','🥚','🥚','🥚'],
  fancy: ['🥚','🥚','🥚','🥚'],
  rare:  ['🥚','🥚','🥚','🥚'],
};
// Visual variety by phase
const EGG_PHASE_EMOJI = ['🥚','🥚','🥚','🪺'];

// ── State ────────────────────────────────────────────────────
let state = loadState();

// ── DOM refs ─────────────────────────────────────────────────
const barnyard         = document.getElementById('barnyard');
const barnyardHint     = document.getElementById('barnyard-hint');
const eggBankSlots     = document.getElementById('egg-bank-slots');
const eggBankStatus    = document.getElementById('egg-bank-status');
const catalogPanel     = document.getElementById('catalog-panel');
const catalogOverlay   = document.getElementById('catalog-overlay');
const catalogBody      = document.getElementById('catalog-body');
const catalogBadge     = document.getElementById('catalog-total-badge');
const catalogToggle    = document.getElementById('catalog-toggle');
const catalogClose     = document.getElementById('catalog-close');

const eggModalBackdrop = document.getElementById('egg-modal-backdrop');
const eggModalContent  = document.getElementById('egg-modal-content');
const eggModalClose    = document.getElementById('egg-modal-close');

const chickenModalBackdrop = document.getElementById('chicken-modal-backdrop');
const chickenModalContent  = document.getElementById('chicken-modal-content');
const chickenModalClose    = document.getElementById('chicken-modal-close');

const cycleModalBackdrop = document.getElementById('cycle-modal-backdrop');
const replenishBtn       = document.getElementById('replenish-btn');

const taskPromptBackdrop = document.getElementById('task-prompt-backdrop');
const taskTitleInput     = document.getElementById('task-title-input');
const taskCancelBtn      = document.getElementById('task-cancel-btn');
const taskConfirmBtn     = document.getElementById('task-confirm-btn');

const toastContainer     = document.getElementById('toast-container');

// ── Pending placement state ───────────────────────────────────
let pendingPlacement = null; // { x, y, tier }

// ── Tick interval ────────────────────────────────────────────
let tickInterval = null;

// ============================================================
//  STATE MANAGEMENT
// ============================================================
function defaultState() {
  return {
    bank: generateBank(true),         // array of tier strings
    bankUsed: 0,                      // how many from current bank have been placed+resolved
    placedEggs: [],                   // active placed egg objects
    resolvedCount: 0,                 // resolved in current cycle
    catalog: buildCatalogCounts(),    // { chicken_id: count }
    cycleId: 1,
    pendingCycleComplete: false,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem('cluck_state');
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure catalog has all keys
      const catalog = buildCatalogCounts();
      Object.assign(catalog, parsed.catalog || {});
      parsed.catalog = catalog;
      return parsed;
    }
  } catch(e) { console.warn('State parse error', e); }
  return defaultState();
}

function saveState() {
  localStorage.setItem('cluck_state', JSON.stringify(state));
}

function buildCatalogCounts() {
  const c = {};
  CHICKEN_DATA.forEach(ch => { c[ch.id] = 0; });
  return c;
}

// ============================================================
//  EGG / BANK HELPERS
// ============================================================
function generateBank(initialOnly = false) {
  const bank = [];
  if (initialOnly) {
    for (let i = 0; i < BANK_SIZE; i++) bank.push('basic');
    return bank;
  }
  for (let i = 0; i < BANK_SIZE; i++) {
    bank.push(weightedRandom(BANK_GEN));
  }
  return bank;
}

function weightedRandom(options) {
  const total = options.reduce((s, o) => s + o.w, 0);
  let r = Math.random() * total;
  for (const o of options) {
    r -= o.w;
    if (r <= 0) return o.tier;
  }
  return options[options.length - 1].tier;
}

function pickChicken(eggTier) {
  const tierStr = weightedRandom(TIER_PROBS[eggTier]);
  const pool = CHICKENS_BY_TIER[tierStr];
  return pool[Math.floor(Math.random() * pool.length)];
}

function getPhase(placedTs) {
  const elapsed = Date.now() - placedTs;
  return Math.min(3, Math.floor(elapsed / PHASE_DURATION_MS));
}

function isMature(placedTs) {
  return Date.now() - placedTs >= TOTAL_MATURE_MS;
}

function isRotten(placedTs) {
  return Date.now() - placedTs >= ROTTEN_MS;
}

function timeUntilMature(placedTs) {
  const remaining = TOTAL_MATURE_MS - (Date.now() - placedTs);
  return Math.max(0, remaining);
}

function formatTimeLeft(ms) {
  if (ms <= 0) return 'Ready!';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2,'0')}s`;
}

function bankRemaining() {
  // Count eggs in bank not yet placed/consumed
  // We track how many from current bank are still available
  const placed = state.placedEggs.filter(e =>
    e.cycleId === state.cycleId && e.state !== 'placeholder'
  ).length;
  return Math.max(0, BANK_SIZE - state.resolvedCount - placed);
}

// ============================================================
//  EGG CREATION / PLACEMENT
// ============================================================
function createEgg(x, y, tier, title) {
  return {
    id: 'egg_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
    cycleId: state.cycleId,
    tier,
    title,
    x, y,
    placedTs: Date.now(),
    resolvedTs: null,
    state: 'active', // active | completed | deleted | rotten
    chickenId: null, // assigned on completion
    chickenDisplayUntil: null,
  };
}

function canPlace(x, y) {
  for (const egg of state.placedEggs) {
    if (egg.state === 'completed' || egg.state === 'deleted') continue;
    const dx = egg.x - x, dy = egg.y - y;
    if (Math.sqrt(dx*dx + dy*dy) < EGG_RADIUS * 2) return false;
  }
  return true;
}

function getCurrentBankComposition() {
  // Current bank: original 5 slots, minus how many have been consumed (placed)
  const placed = state.placedEggs.filter(e => e.cycleId === state.cycleId).length;
  return {
    available: BANK_SIZE - placed,
    total: BANK_SIZE,
    tiers: state.bank,
    nextTier: state.bank[placed] || null,
  };
}

// ============================================================
//  RENDER
// ============================================================
function render() {
  renderBankBar();
  renderEggs();
  renderCatalog();
  updateHint();
}

function renderBankBar() {
  const placed = state.placedEggs.filter(e => e.cycleId === state.cycleId).length;
  eggBankSlots.innerHTML = '';
  for (let i = 0; i < BANK_SIZE; i++) {
    const span = document.createElement('span');
    span.className = 'bank-egg ' + (state.bank[i] || 'basic');
    if (i < placed) {
      span.classList.add('used');
      span.textContent = '🥚';
      span.title = 'Used';
    } else {
      span.textContent = '🥚';
      span.title = capitalise(state.bank[i]) + ' egg';
    }
    eggBankSlots.appendChild(span);
  }

  const available = BANK_SIZE - placed;
  const resolved  = state.resolvedCount;
  if (available === 0 && resolved < BANK_SIZE) {
    eggBankStatus.textContent = `All eggs placed — ${BANK_SIZE - resolved} awaiting resolution`;
  } else if (available > 0) {
    eggBankStatus.textContent = `${available} egg${available !== 1 ? 's' : ''} remaining`;
  } else {
    eggBankStatus.textContent = '';
  }
}

function renderEggs() {
  // Remove stale egg tokens (keep chicken tokens managed separately)
  document.querySelectorAll('.egg-token').forEach(el => el.remove());

  const now = Date.now();

  for (const egg of state.placedEggs) {
    // Skip fully done non-visible eggs
    if (egg.state === 'completed' || egg.state === 'deleted') {
      // Chicken display handled by chicken tokens
      continue;
    }

    const el = document.createElement('div');
    el.className = 'egg-token';
    el.dataset.id = egg.id;
    el.style.left = egg.x + 'px';
    el.style.top  = egg.y + 'px';

    const rotten = isRotten(egg.placedTs);
    if (rotten && egg.state !== 'rotten') {
      egg.state = 'rotten';
      saveState();
    }

    const phase = getPhase(egg.placedTs);
    el.dataset.phase = rotten ? 'rotten' : phase;
    if (rotten) el.classList.add('rotten');

    el.innerHTML = `
      <div class="egg-graphic">
        ${rotten ? '<img src="assets/rotten egg.png" alt="Rotten egg" class="rotten-egg-img" />' : EGG_PHASE_EMOJI[phase]}
        <span class="egg-crack">${phase >= 2 ? '✨' : ''}</span>
      </div>
      <div class="egg-tier-dot ${egg.tier}"></div>
    `;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openEggModal(egg.id);
    });

    barnyard.appendChild(el);
  }
}

function updateHint() {
  const hasActiveEggs = state.placedEggs.some(e =>
    e.state === 'active' || e.state === 'rotten'
  );
  const comp = getCurrentBankComposition();
  if (hasActiveEggs || comp.available === 0) {
    barnyardHint.classList.add('hidden');
  } else {
    barnyardHint.classList.remove('hidden');
  }
}

// ── Catalog render ───────────────────────────────────────────
function renderCatalog() {
  const total = Object.values(state.catalog).reduce((s,v) => s+v, 0);
  catalogBadge.textContent = total;

  catalogBody.innerHTML = '';

  ['basic','fancy','rare'].forEach(tier => {
    const section = document.createElement('div');
    section.className = 'catalog-tier-section';
    section.innerHTML = `
      <div class="catalog-tier-header catalog-tier-${tier}">
        ${tier === 'basic' ? '🥚' : tier === 'fancy' ? '✨' : '💎'}
        ${capitalise(tier)} Tier
      </div>
    `;
    CHICKENS_BY_TIER[tier].forEach(chicken => {
      const count = state.catalog[chicken.id] || 0;
      const locked = count === 0;
      const row = document.createElement('div');
      row.className = 'catalog-chicken-row';
      row.innerHTML = `
        <img src="assets/${chicken.name}.png" class="catalog-chicken-emoji ${locked ? 'locked' : ''}" alt="${locked ? '' : chicken.name}" />
        <div class="catalog-chicken-info">
          <div class="catalog-chicken-name ${locked ? 'locked' : ''}">${locked ? '???' : chicken.name}</div>
          <div class="catalog-chicken-tier-label">${capitalise(tier)}</div>
        </div>
        <div class="catalog-count-badge ${count === 0 ? 'zero' : ''}">${count}</div>
      `;
      row.addEventListener('click', () => openChickenModal(chicken.id, locked));
      section.appendChild(row);
    });
    catalogBody.appendChild(section);
  });
}

// ============================================================
//  EGG MODAL
// ============================================================
function openEggModal(eggId) {
  const egg = state.placedEggs.find(e => e.id === eggId);
  if (!egg) return;

  const rotten  = egg.state === 'rotten';
  const mature  = isMature(egg.placedTs);
  const phase   = getPhase(egg.placedTs);
  const elapsed = Date.now() - egg.placedTs;
  const pct     = Math.min(100, (elapsed / TOTAL_MATURE_MS) * 100);
  const timeLeft = formatTimeLeft(timeUntilMature(egg.placedTs));

  const phaseDots = [0,1,2,3].map(i =>
    `<div class="phase-dot ${phase >= i ? 'active' : ''}"></div>`
  ).join('');

  let bodyHtml = '';

  if (rotten) {
    bodyHtml = `
      <div class="egg-modal-phase-art"><img src="assets/rotten egg.png" alt="Rotten egg" class="rotten-egg-img" /></div>
      <div style="text-align:center;margin-bottom:8px;">
        <span class="egg-modal-tier-badge tier-badge-${egg.tier}">${capitalise(egg.tier)}</span>
      </div>
      <div class="rotten-msg">
        <strong>This egg has gone rotten.</strong><br><br>
        The task "<em>${escapeHtml(egg.title)}</em>" sat too long in the barnyard and was abandoned.
        A rotten egg cannot be completed or hatched.<br><br>
        Confirm to clear it from the barnyard.
      </div>
      <div class="egg-modal-actions">
        <button class="btn-secondary" id="em-cancel">Cancel</button>
        <button class="btn-danger" id="em-confirm-rotten">Acknowledge &amp; Remove 🗑️</button>
      </div>
    `;
  } else {
    bodyHtml = `
      <div class="egg-modal-phase-art">${EGG_PHASE_EMOJI[phase]}</div>
      <div style="text-align:center;margin-bottom:8px;">
        <span class="egg-modal-tier-badge tier-badge-${egg.tier}">${capitalise(egg.tier)}</span>
      </div>
      <div class="egg-modal-task">"${escapeHtml(egg.title)}"</div>
      <div class="egg-modal-progress">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-label">${mature ? '✅ Ready to hatch!' : `⏳ ${timeLeft} remaining`}</div>
      </div>
      <div class="phase-dots">${phaseDots}</div>
      ${mature ? `
        <label class="hatch-check-label">
          <input type="checkbox" id="hatch-checkbox" />
          Task Complete! Hatch!
        </label>
      ` : `
        <div class="egg-immature-msg">This egg needs more time. Check back when it's ready!</div>
      `}
      <div class="egg-modal-actions">
        <button class="btn-danger" id="em-delete">Delete Task 🗑️</button>
        <button class="btn-secondary" id="em-cancel">Close</button>
      </div>
    `;
  }

  eggModalContent.innerHTML = bodyHtml;
  eggModalBackdrop.classList.add('open');

  document.getElementById('em-cancel').addEventListener('click', closeEggModal);

  if (rotten) {
    document.getElementById('em-confirm-rotten').addEventListener('click', () => {
      acknowledgeRotten(eggId);
      closeEggModal();
    });
  } else {
    document.getElementById('em-delete')?.addEventListener('click', () => {
      deleteEgg(eggId);
      closeEggModal();
    });
    const hatchBox = document.getElementById('hatch-checkbox');
    if (hatchBox) {
      hatchBox.addEventListener('change', () => {
        if (hatchBox.checked) {
          closeEggModal();
          setTimeout(() => completeEgg(eggId), 100);
        }
      });
    }
  }
}

function closeEggModal() {
  eggModalBackdrop.classList.remove('open');
}

// ============================================================
//  CHICKEN CATALOG MODAL
// ============================================================
function openChickenModal(chickenId, locked) {
  const chicken = CHICKEN_MAP[chickenId];
  if (!chicken) return;
  const count = state.catalog[chickenId] || 0;

  let html = '';
  if (locked) {
    html = `
      <div class="chicken-modal-header">
        <div class="chicken-modal-emoji" style="filter:grayscale(1) opacity(0.4)">🥚</div>
        <div class="chicken-modal-meta">
          <h3>???</h3>
          <div class="chicken-modal-tier" style="color:var(--earth-light)">${capitalise(chicken.tier)} — Undiscovered</div>
          <div class="chicken-modal-count">Hatched: 0 times</div>
        </div>
      </div>
      <div class="chicken-modal-locked">
        Complete tasks to discover this ${capitalise(chicken.tier)} chicken!
      </div>
    `;
  } else {
    html = `
      <div class="chicken-modal-header">
        <img src="assets/${chicken.name}.png" class="chicken-modal-emoji" alt="${chicken.name}" />
        <div class="chicken-modal-meta">
          <h3>${chicken.name}</h3>
          <div class="chicken-modal-tier" style="color:var(--${chicken.tier === 'basic' ? 'basic' : chicken.tier === 'fancy' ? 'fancy' : 'rare'}-color)">${capitalise(chicken.tier)}</div>
          <div class="chicken-modal-count">Hatched: ${count} time${count !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div class="chicken-modal-desc">${escapeHtml(chicken.description)}</div>
      <div class="chicken-modal-traits">
        <div class="chicken-modal-trait">✦ <strong>Trait:</strong> ${chicken.trait}</div>
        <div class="chicken-modal-talent">✦ <strong>Talent:</strong> ${chicken.talent}</div>
      </div>
    `;
  }

  chickenModalContent.innerHTML = html;
  chickenModalBackdrop.classList.add('open');
}

function closeChickenModal() {
  chickenModalBackdrop.classList.remove('open');
}

// ============================================================
//  GAME LOGIC
// ============================================================
function deleteEgg(eggId) {
  const egg = state.placedEggs.find(e => e.id === eggId);
  if (!egg) return;
  egg.state = 'deleted';
  egg.resolvedTs = Date.now();
  state.resolvedCount++;
  saveState();
  renderEggs();
  renderBankBar();
  updateHint();
  showToast('🗑️ Task deleted. No chicken this time.');
  checkCycleComplete();
}

function acknowledgeRotten(eggId) {
  const egg = state.placedEggs.find(e => e.id === eggId);
  if (!egg) return;
  egg.state = 'deleted'; // treated as resolved, no reward
  egg.resolvedTs = Date.now();
  state.resolvedCount++;
  saveState();
  renderEggs();
  renderBankBar();
  updateHint();
  showToast('🟢 The rotten egg was cleared.');
  checkCycleComplete();
}

function completeEgg(eggId) {
  const egg = state.placedEggs.find(e => e.id === eggId);
  if (!egg || !isMature(egg.placedTs) || isRotten(egg.placedTs)) return;

  const chicken = pickChicken(egg.tier);
  egg.state = 'completed';
  egg.resolvedTs = Date.now();
  egg.chickenId = chicken.id;
  egg.chickenDisplayUntil = Date.now() + CHICKEN_DISPLAY_MS;
  state.resolvedCount++;
  state.catalog[chicken.id] = (state.catalog[chicken.id] || 0) + 1;
  saveState();

  playHatchSound();
  spawnParticles(egg.x, egg.y);
  showChickenOnBoard(egg);
  renderEggs();
  renderBankBar();
  renderCatalog();
  updateHint();

  showToast(`🐣 Hatched: ${chicken.name}! (${capitalise(chicken.tier)})`);

  setTimeout(() => checkCycleComplete(), 600);
}

function checkCycleComplete() {
  if (state.resolvedCount >= BANK_SIZE) {
    setTimeout(() => {
      cycleModalBackdrop.classList.add('open');
    }, 800);
  }
}

function replenishBank() {
  state.bank = generateBank(false);
  state.resolvedCount = 0;
  state.cycleId++;
  // Clean up old resolved eggs
  state.placedEggs = state.placedEggs.filter(e => e.state === 'active' || e.state === 'rotten');
  saveState();
  cycleModalBackdrop.classList.remove('open');
  render();
  showToast('🥚 New egg bank ready! Time to be productive!');
}

// ============================================================
//  CHICKEN ON BOARD DISPLAY
// ============================================================
function showChickenOnBoard(egg) {
  const el = document.createElement('div');
  el.className = 'chicken-token';
  el.style.left = egg.x + 'px';
  el.style.top  = egg.y + 'px';
  el.dataset.eggId = egg.id;

  const chicken = CHICKEN_MAP[egg.chickenId];
  el.innerHTML = `
    <img src="assets/${chicken.name}.png" class="chicken-emoji" alt="${chicken.name}" />
    <div class="chicken-name-label">${chicken.name}</div>
  `;
  barnyard.appendChild(el);

  const ttl = egg.chickenDisplayUntil - Date.now();
  setTimeout(() => {
    el.style.transition = 'opacity 0.5s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 500);
  }, Math.max(100, ttl));
}

function restoreChickenTokens() {
  const now = Date.now();
  state.placedEggs.forEach(egg => {
    if (egg.state === 'completed' && egg.chickenDisplayUntil && egg.chickenDisplayUntil > now) {
      showChickenOnBoard(egg);
    }
  });
}

// ============================================================
//  PARTICLES
// ============================================================
function spawnParticles(x, y) {
  const particles = ['✨','⭐','💫','🌟','🎉','🎊','🥳'];
  for (let i = 0; i < 10; i++) {
    const el = document.createElement('span');
    el.className = 'particle';
    el.textContent = particles[Math.floor(Math.random() * particles.length)];
    const angle = (i / 10) * Math.PI * 2;
    const dist  = 60 + Math.random() * 80;
    el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    el.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    el.style.setProperty('--dur', `${0.6 + Math.random() * 0.5}s`);
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    barnyard.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
}

// ============================================================
//  SOUND (Web Audio API synth — no external files needed)
// ============================================================
function playHatchSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Chirp 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(800, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);

    // Chirp 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1000, ctx.currentTime + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.32);
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc2.start(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 0.45);

    // Happy jingle
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'triangle';
      const t = ctx.currentTime + 0.45 + i * 0.1;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.start(t); o.stop(t + 0.15);
    });

    setTimeout(() => ctx.close(), 1500);
  } catch(e) { /* silently fail if audio blocked */ }
}

// ============================================================
//  TOAST
// ============================================================
function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 2900);
}

// ============================================================
//  BARNYARD CLICK → PLACEMENT FLOW
// ============================================================
barnyard.addEventListener('click', (e) => {
  // Ignore if clicking an egg
  if (e.target.closest('.egg-token') || e.target.closest('.chicken-token')) return;
  // Ignore if any modal is open
  if (document.querySelector('.modal-backdrop.open')) return;

  const comp = getCurrentBankComposition();
  if (comp.available <= 0) {
    showToast('🥚 No eggs left in this bank. Resolve active eggs first!');
    return;
  }

  const rect = barnyard.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (!canPlace(x, y)) {
    showToast('⚠️ Too close to another egg!');
    return;
  }

  const tier = comp.tiers[BANK_SIZE - comp.available];
  pendingPlacement = { x, y, tier };

  taskTitleInput.value = '';
  taskPromptBackdrop.classList.add('open');
  setTimeout(() => taskTitleInput.focus(), 80);
});

// ── Task prompt actions ───────────────────────────────────────
taskCancelBtn.addEventListener('click', () => {
  taskPromptBackdrop.classList.remove('open');
  pendingPlacement = null;
});

taskConfirmBtn.addEventListener('click', confirmTaskPlacement);
taskTitleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmTaskPlacement();
  if (e.key === 'Escape') {
    taskPromptBackdrop.classList.remove('open');
    pendingPlacement = null;
  }
});

function confirmTaskPlacement() {
  const title = taskTitleInput.value.trim();
  if (!title) {
    taskTitleInput.style.borderColor = 'var(--terracotta)';
    setTimeout(() => taskTitleInput.style.borderColor = '', 600);
    return;
  }
  if (!pendingPlacement) return;

  const egg = createEgg(
    pendingPlacement.x,
    pendingPlacement.y,
    pendingPlacement.tier,
    title
  );
  state.placedEggs.push(egg);
  saveState();
  pendingPlacement = null;
  taskPromptBackdrop.classList.remove('open');

  renderEggs();
  renderBankBar();
  updateHint();
  showToast(`🥚 Egg placed! Task: "${title}"`);
}

// ============================================================
//  CATALOG PANEL
// ============================================================
catalogToggle.addEventListener('click', () => {
  catalogPanel.classList.add('open');
  catalogOverlay.classList.add('open');
  renderCatalog();
});
catalogClose.addEventListener('click', closeCatalog);
catalogOverlay.addEventListener('click', closeCatalog);
function closeCatalog() {
  catalogPanel.classList.remove('open');
  catalogOverlay.classList.remove('open');
}

// ============================================================
//  MODAL CLOSE BUTTONS
// ============================================================
eggModalClose.addEventListener('click', closeEggModal);
eggModalBackdrop.addEventListener('click', (e) => {
  if (e.target === eggModalBackdrop) closeEggModal();
});

chickenModalClose.addEventListener('click', closeChickenModal);
chickenModalBackdrop.addEventListener('click', (e) => {
  if (e.target === chickenModalBackdrop) closeChickenModal();
});

replenishBtn.addEventListener('click', replenishBank);

// ============================================================
//  TICK — update egg phases every 5 seconds
// ============================================================
function tick() {
  let needsRender = false;
  const now = Date.now();

  state.placedEggs.forEach(egg => {
    if (egg.state !== 'active') return;

    // Check rotten
    if (isRotten(egg.placedTs) && egg.state === 'active') {
      egg.state = 'rotten';
      needsRender = true;
      saveState();
    }
  });

  if (needsRender) {
    renderEggs();
    renderBankBar();
    updateHint();
  } else {
    // Just re-render egg phase graphics (cheap)
    renderEggs();
  }
}

// ── Periodic update of phase visuals (every 5s) ───────────────
tickInterval = setInterval(tick, 5000);

// ============================================================
//  UTILITY
// ============================================================
function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
//  INIT
// ============================================================
function init() {
  // Resolve any eggs that became rotten while page was closed
  state.placedEggs.forEach(egg => {
    if (egg.state === 'active' && isRotten(egg.placedTs)) {
      egg.state = 'rotten';
    }
  });
  saveState();

  render();
  restoreChickenTokens();

  // If cycle was complete before reload, re-show popup
  if (state.resolvedCount >= BANK_SIZE) {
    setTimeout(() => cycleModalBackdrop.classList.add('open'), 400);
  }
}

init();
