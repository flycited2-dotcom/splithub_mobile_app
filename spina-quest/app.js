/* ============================================================
   СПИНА: КВЕСТ v2 — логика приложения
   Контент (миссии, достижения, герои) — в data.js
   ============================================================ */
'use strict';

const STORAGE_KEY = 'spinaQuest.v2';
const LEGACY_KEY = 'spinaQuestProgress';
const DEMO_SPEED = 20; // во сколько раз ускорять таймер в демо-режиме

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ------------------------------------------------------------
   Состояние и хранение
   ------------------------------------------------------------ */
function defaultState() {
  return {
    version: 2,
    profile: null, // { name, hero, createdAt }
    settings: { sound: true, voice: true, vibrate: true, pin: '', freeMode: false, demo: false },
    xp: 0,
    sessions: [], // { id, lessonId, date, at, stars, sec, done, skipped, feedback, stopped }
    achievements: {}, // id -> дата
    levelSeen: 1,
  };
}

let state = loadState();
saveState();

function loadState() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { s = null; }
  if (!s || s.version !== 2) {
    s = defaultState();
    migrateLegacy(s);
  }
  // на случай новых полей в будущих версиях
  s.settings = Object.assign(defaultState().settings, s.settings || {});
  s.sessions = s.sessions || [];
  s.achievements = s.achievements || {};
  return s;
}

function migrateLegacy(s) {
  let legacy = null;
  try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'); } catch (e) { legacy = null; }
  if (!legacy || typeof legacy !== 'object') return;
  Object.keys(legacy).forEach(k => {
    const idx = Number(k), v = legacy[k];
    const lesson = LESSONS[idx];
    if (!lesson || !v) return;
    const sec = lesson.exercises.reduce((a, e) => a + e.sec, 0);
    const done = lesson.exercises.map((_, i) => i);
    s.sessions.push({
      id: 'legacy-' + idx, lessonId: lesson.id, date: v.date || localDate(new Date()),
      at: (v.date || localDate(new Date())) + 'T12:00:00', stars: v.stars || 1, sec,
      done, skipped: [], feedback: {}, stopped: v.comfort === 'pain', legacy: true,
    });
    s.xp += done.length * XP.exercise + (v.stars || 1) * XP.star;
  });
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* приватный режим */ }
}

/* ------------------------------------------------------------
   Утилиты
   ------------------------------------------------------------ */
const pad2 = n => String(n).padStart(2, '0');
function localDate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function todayStr() { return localDate(new Date()); }
function fmt(sec) { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${pad2(sec % 60)}`; }
function esc(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function lessonSec(l) { return l.exercises.reduce((a, e) => a + e.sec, 0); }
function lessonMinutes(l) { return Math.ceil((lessonSec(l) + l.exercises.length * 8) / 60); }
function lessonIndex(id) { return LESSONS.findIndex(l => l.id === id); }
function plural(n, one, few, many) { const m = n % 10, h = n % 100; if (m === 1 && h !== 11) return one; if (m >= 2 && m <= 4 && (h < 12 || h > 14)) return few; return many; }

let toastTimer = null;
function toast(msg, ms = 2400) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

/* ------------------------------------------------------------
   Сводка прогресса
   ------------------------------------------------------------ */
function bestStars() {
  const b = {};
  state.sessions.forEach(s => { b[s.lessonId] = Math.max(b[s.lessonId] || 0, s.stars || 0); });
  return b;
}
function completedIds() { return new Set(state.sessions.map(s => s.lessonId)); }
function totalStars() { return Object.values(bestStars()).reduce((a, v) => a + v, 0); }
function totalMinutes() { return Math.round(state.sessions.reduce((a, s) => a + (s.sec || 0), 0) / 60); }
function totalExercises() { return state.sessions.reduce((a, s) => a + (s.done ? s.done.length : 0), 0); }

function streakInfo() {
  const days = [...new Set(state.sessions.map(s => s.date))].sort();
  if (!days.length) return { current: 0, best: 0 };
  const dayNum = d => Math.round(new Date(d + 'T00:00:00').getTime() / 86400000);
  // лучшая серия
  let best = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    run = dayNum(days[i]) - dayNum(days[i - 1]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  // текущая серия: считаем от сегодня (или от вчера, если сегодня ещё не занимались)
  const set = new Set(days);
  const today = todayStr();
  let cursor = new Date();
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (set.has(localDate(cursor))) { current++; cursor.setDate(cursor.getDate() - 1); }
  return { current, best: Math.max(best, current) };
}

function levelInfo(xp = state.xp) {
  let idx = 0;
  LEVELS.forEach((l, i) => { if (xp >= l.xp) idx = i; });
  const level = LEVELS[idx], next = LEVELS[idx + 1] || null;
  const pct = next ? Math.round(((xp - level.xp) / (next.xp - level.xp)) * 100) : 100;
  return { idx, number: idx + 1, level, next, pct };
}

function isUnlocked(i) {
  if (state.settings.freeMode || i === 0) return true;
  return completedIds().has(LESSONS[i - 1].id);
}

function todayMission() {
  const best = bestStars();
  const doneToday = state.sessions.some(s => s.date === todayStr());
  let idx = LESSONS.findIndex(l => !best[l.id]);
  let label = 'Сегодняшняя миссия';
  if (idx === -1) {
    // все пройдены: повторяем самую «слабую», при равенстве — по дню года
    let min = 4; LESSONS.forEach(l => { min = Math.min(min, best[l.id]); });
    const weak = LESSONS.map((l, i) => i).filter(i => best[LESSONS[i].id] === min);
    const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    idx = weak[doy % weak.length];
    label = min < 3 ? 'Повторение: доберём звёзды' : 'Повторение для мастера';
  }
  if (doneToday) label = 'Сегодня уже есть занятие! Ещё одно?';
  return { idx, label, doneToday };
}

function summaryForAchievements(lastSession) {
  const ids = completedIds();
  const best = bestStars();
  const st = streakInfo();
  const repeats = {};
  state.sessions.forEach(s => { repeats[s.lessonId] = (repeats[s.lessonId] || 0) + 1; });
  return {
    sessions: state.sessions,
    completedIds: ids,
    streak: st.current, bestStreak: st.best,
    totalStars: totalStars(),
    threeStar: Object.values(best).filter(v => v === 3).length,
    honest: state.sessions.filter(s => s.stopped).length,
    minutes: totalMinutes(),
    exercises: totalExercises(),
    hour: lastSession ? new Date(lastSession.at).getHours() : null,
    maxRepeat: Math.max(0, ...Object.values(repeats)),
  };
}

function checkAchievements(lastSession) {
  const sum = summaryForAchievements(lastSession);
  const unlocked = [];
  ACHIEVEMENTS.forEach(a => {
    if (state.achievements[a.id]) return;
    let ok = false;
    try { ok = !!a.check(sum); } catch (e) { ok = false; }
    if (ok) { state.achievements[a.id] = todayStr(); unlocked.push(a); }
  });
  return unlocked;
}

/* ------------------------------------------------------------
   Звук, голос, вибрация
   ------------------------------------------------------------ */
const audio = {
  ctx: null,
  ensure() {
    if (!state.settings.sound) return null;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch (e) { return null; }
  },
  tone(freq, dur = 0.12, type = 'sine', gain = 0.18, when = 0) {
    const ctx = this.ensure(); if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime + when);
    g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + when); o.stop(ctx.currentTime + when + dur + 0.05);
  },
  tick() { this.tone(880, 0.08, 'square', 0.08); },
  go() { this.tone(660, 0.1); this.tone(990, 0.18, 'sine', 0.2, 0.11); },
  side() { this.tone(740, 0.1); this.tone(740, 0.1, 'sine', 0.18, 0.15); },
  inhale() { this.tone(523, 0.25, 'triangle', 0.07); },
  exhale() { this.tone(392, 0.35, 'triangle', 0.07); },
  done() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.16, i * 0.12)); },
  fanfare() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.18, i * 0.13)); },
  unlock() { this.tone(1047, 0.12); this.tone(1319, 0.2, 'sine', 0.18, 0.12); },
};

const speech = {
  voice: null,
  ready() {
    if (!('speechSynthesis' in window)) return false;
    if (!this.voice) {
      const vs = speechSynthesis.getVoices();
      this.voice = vs.find(v => /^ru/i.test(v.lang) && /google|yandex|milena|premium|natural/i.test(v.name))
        || vs.find(v => /^ru/i.test(v.lang)) || null;
    }
    return true;
  },
  say(text, { interrupt = true, rate = 0.95 } = {}) {
    if (!state.settings.voice || !this.ready()) return;
    try {
      if (interrupt) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU'; u.rate = rate; u.pitch = 1.05;
      if (this.voice) u.voice = this.voice;
      speechSynthesis.speak(u);
    } catch (e) { /* нет голоса */ }
  },
  stop() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* ignore */ } },
};
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { speech.voice = null; speech.ready(); };

function vibrate(pattern) {
  if (!state.settings.vibrate) return;
  try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) { /* ignore */ }
}

/* ------------------------------------------------------------
   Конфетти
   ------------------------------------------------------------ */
function confetti(count = 140, duration = 2800) {
  const c = $('#confetti'); const ctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const colors = ['#6c5ce7', '#ff7a59', '#00c9a7', '#ffc93c', '#4facfe', '#f368e0'];
  const parts = Array.from({ length: count }, () => ({
    x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.5,
    w: 6 + Math.random() * 8, h: 8 + Math.random() * 10,
    vx: (Math.random() - 0.5) * 2.5, vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.25,
    color: pick(colors),
  }));
  const start = performance.now();
  function frame(t) {
    const k = (t - start) / duration;
    ctx.clearRect(0, 0, c.width, c.height);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.02;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = k > 0.75 ? Math.max(0, 1 - (k - 0.75) * 4) : 1;
      ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    });
    if (k < 1) requestAnimationFrame(frame); else ctx.clearRect(0, 0, c.width, c.height);
  }
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------
   Анимированные фигурки (SVG + SMIL-морфинг между позами)
   ------------------------------------------------------------ */
function poly(a, b, dur, cls = '') {
  const anim = b ? `<animate attributeName="points" values="${a};${b};${a}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>` : '';
  return `<polyline class="fig ${cls}" points="${a}">${anim}</polyline>`;
}
function head(a, b, dur, r = 15) {
  const [ax, ay] = a; const [bx, by] = b || a;
  const anim = b ? `<animate attributeName="cx" values="${ax};${bx};${ax}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/><animate attributeName="cy" values="${ay};${by};${ay}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>` : '';
  return `<circle class="fig head" cx="${ax}" cy="${ay}" r="${r}">${anim}</circle>`;
}
const floor = '<line class="floor" x1="20" y1="180" x2="280" y2="180"/>';
const wallR = '<line class="wallline" x1="232" y1="14" x2="232" y2="180"/>';
const wallB = '<line class="wallline" x1="196" y1="14" x2="196" y2="180"/>';
const chairR = '<path class="chair" d="M178 128 h40 v50 M218 128 v-40 M186 128 v50"/>';
const chairL = '<path class="chair" d="M112 128 h50 M118 128 v50 M118 128 v-42 M156 128 v50"/>';
const bench = '<path class="chair" d="M116 128 h68 M122 128 v50 M178 128 v50"/>';
const support = '<line class="wallline" x1="88" y1="40" x2="88" y2="180"/>';
const glow = (x, y) => `<circle class="fig glow" cx="${x}" cy="${y}" r="10"><animate attributeName="r" values="8;18;8" dur="10s" keyTimes="0;0.4;1" repeatCount="indefinite"/></circle>`;
const arrowUp = (x, y) => `<polyline class="fig accent" points="${x - 8},${y + 10} ${x},${y} ${x + 8},${y + 10}"><animate attributeName="points" values="${x - 8},${y + 10} ${x},${y} ${x + 8},${y + 10};${x - 8},${y} ${x},${y - 10} ${x + 8},${y};${x - 8},${y + 10} ${x},${y} ${x + 8},${y + 10}" dur="2.2s" repeatCount="indefinite"/></polyline>`;

const FIGURES = {
  walk: () => floor +
    head([150, 42]) + poly('150,58 150,118') +
    poly('150,72 138,108', '150,72 164,106', 1.1) + poly('150,72 164,106', '150,72 138,108', 1.1) +
    poly('150,118 140,150 128,178', '150,118 165,148 172,178', 1.1) + poly('150,118 165,148 172,178', '150,118 140,150 128,178', 1.1),
  shoulders: () => floor +
    head([150, 40]) + poly('118,70 182,70', '118,60 182,60', 1.6) + poly('150,70 150,120', '150,60 150,120', 1.6) +
    poly('118,70 112,122', '118,60 112,122', 1.6) + poly('182,70 188,122', '182,60 188,122', 1.6) +
    poly('150,120 135,178') + poly('150,120 165,178'),
  wall: () => floor + wallB +
    head([176, 44], [176, 39], 2.2) + poly('176,60 176,120', '176,55 176,120', 2.2) + poly('176,72 174,116', '176,67 174,116', 2.2) +
    poly('176,120 164,178') + poly('176,120 186,178') + arrowUp(176, 18),
  breath: () => floor +
    head([50, 162], null, 0, 14) + poly('66,162 140,162') + poly('88,162 116,140') +
    poly('140,162 176,122 200,178') + glow(108, 152),
  stand: () => floor +
    `<line class="fig accent" x1="150" y1="14" x2="150" y2="178" stroke-dasharray="4 8" stroke-width="3" opacity=".6"/>` +
    head([150, 40], [150, 37], 4) + poly('150,56 150,120', '150,53 150,120', 4) +
    poly('150,72 126,116', '150,69 126,116', 4) + poly('150,72 174,116', '150,69 174,116', 4) +
    poly('150,120 136,178') + poly('150,120 164,178') + glow(150, 92),
  breathstand: () => floor +
    head([150, 40]) + poly('150,56 150,120') + poly('150,72 126,116') + poly('150,72 174,116') +
    poly('150,120 136,178') + poly('150,120 164,178') + glow(150, 92),
  cat: () => floor +
    head([218, 122], [218, 132], 2.4, 13) + poly('105,128 150,128 195,128', '105,128 150,104 195,128', 2.4) +
    poly('195,128 195,178') + poly('105,128 105,178'),
  rotate: () => floor + bench +
    head([150, 50]) + poly('150,66 150,128') +
    `<g><animateTransform attributeName="transform" type="rotate" values="-14 150 100;14 150 100;-14 150 100" dur="2.2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>` +
    poly('120,80 180,80') + poly('124,84 165,98') + poly('176,84 135,98') + `</g>` +
    poly('150,128 165,128 165,178') + poly('150,128 135,128 135,178'),
  wallslide: () => floor + wallB +
    head([150, 40]) + poly('150,56 150,120') +
    poly('150,74 120,74 120,44', '150,74 126,48 126,16', 2.4) + poly('150,74 180,74 180,44', '150,74 174,48 174,16', 2.4) +
    poly('150,120 136,178') + poly('150,120 164,178'),
  deadbug: () => floor +
    head([50, 162], null, 0, 14) + poly('66,162 140,162') + poly('92,162 96,112') +
    poly('140,162 170,126 206,126') + poly('140,162 172,128 206,128', '140,162 186,152 216,178', 2) + glow(105, 152),
  bridge: () => floor +
    head([50, 165], null, 0, 14) + poly('66,165 140,165', '66,165 140,132', 2.2) +
    poly('140,165 178,126 190,178', '140,132 178,126 190,178', 2.2) + poly('84,165 126,178'),
  wallpush: () => floor + wallR +
    head([150, 40], [162, 44], 1.8) + poly('150,56 150,120', '162,60 158,120', 1.8) +
    poly('150,72 230,82', '162,74 200,78 230,82', 1.8) +
    poly('150,120 140,178', '158,120 140,178', 1.8) + poly('150,120 164,178', '158,120 164,178', 1.8),
  balance: () => floor + support +
    head([150, 40]) + poly('150,56 150,120') + poly('150,72 94,92') + poly('150,72 176,112') +
    poly('150,120 150,178') + poly('150,120 170,150 172,178', '150,120 174,146 176,166', 2),
  abduction: () => floor + support +
    head([150, 40]) + poly('150,56 150,120') + poly('150,72 94,92') + poly('150,72 176,112') +
    poly('150,120 144,178') + poly('150,120 162,178', '150,120 204,172', 1.8),
  squat: () => floor + chairR +
    head([150, 40], [140, 58], 1.8) + poly('150,56 150,120', '140,74 160,128', 1.8) +
    poly('150,72 176,100', '140,88 186,94', 1.8) +
    poly('150,120 152,150 150,178', '160,128 176,150 166,178', 1.8),
  bird: () => floor +
    head([218, 118], null, 0, 13) + poly('105,128 195,128') + poly('195,128 195,178') +
    poly('105,128 96,150 92,178', '105,128 60,122 22,118', 2.4) +
    poly('112,128 112,178') + poly('186,128 188,178', '186,128 232,118 276,110', 2.4),
  chin: () => floor +
    head([150, 62], [138, 62], 2, 20) + poly('150,82 150,150', '138,82 150,150', 2) + poly('118,96 182,96') +
    poly('118,96 110,150') + poly('182,96 190,150') +
    `<polyline class="fig accent" points="200,62 186,62"><animate attributeName="points" values="200,62 186,62;188,62 174,62;200,62 186,62" dur="2s" repeatCount="indefinite"/></polyline>`,
  scapula: () => floor +
    head([150, 40]) + poly('150,56 150,120') + poly('118,72 182,72') + poly('118,72 112,122') + poly('182,72 188,122') +
    poly('130,80 138,100', '137,86 143,106', 2, 'accent') + poly('170,80 162,100', '163,86 157,106', 2, 'accent') +
    poly('150,120 136,178') + poly('150,120 164,178'),
  sit: () => floor + chairL +
    head([150, 54], [150, 48], 4) + poly('150,70 150,128', '150,64 150,128', 4) + poly('150,84 150,118', '150,78 150,118', 4) +
    poly('150,128 186,128 186,178') + arrowUp(150, 22),
  armraise: () => floor +
    head([150, 40]) + poly('150,56 150,120') + poly('150,72 150,116', '150,72 206,44', 8) +
    poly('150,120 140,178') + poly('150,120 162,178') + glow(150, 92),
  sitstand: () => floor + chairL +
    head([150, 62], [172, 40], 2.4) + poly('150,78 150,128', '172,56 176,118', 2.4) +
    poly('150,92 186,96', '172,70 204,96', 2.4) +
    poly('150,128 186,128 186,178', '176,118 182,150 186,178', 2.4),
  calf: () => floor + wallR +
    head([150, 44], [158, 46], 2.4) + poly('150,60 155,120', '158,62 164,122', 2.4) +
    poly('150,72 230,86', '158,74 230,86', 2.4) +
    poly('155,120 176,150 182,178', '164,122 184,152 186,178', 2.4) + poly('155,120 110,178', '164,122 116,178', 2.4),
  stretch: () => floor + chairL +
    head([150, 56], [136, 76], 2.4) + poly('150,72 150,128', '136,92 150,128', 2.4) +
    poly('150,90 150,122', '136,104 152,142', 2.4) +
    poly('150,128 212,178') + poly('150,128 136,150 132,178'),
  armsup: () => floor + wallB +
    head([150, 44]) + poly('150,60 150,120') +
    poly('150,74 124,48 128,22', '150,74 134,40 134,8', 2.4) + poly('150,74 176,48 172,22', '150,74 166,40 166,8', 2.4) +
    poly('150,120 136,178') + poly('150,120 164,178'),
};

function figureSVG(visual, label) {
  const draw = FIGURES[visual] || FIGURES.stand;
  return `<svg viewBox="0 0 300 200" role="img" aria-label="${esc(label)}">${draw()}</svg><div class="demo-label">${esc(label)}</div>`;
}

/* ------------------------------------------------------------
   Навигация между экранами
   ------------------------------------------------------------ */
function show(id) {
  $$('.view').forEach(v => { v.hidden = v.id !== id; });
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

/* ------------------------------------------------------------
   Онбординг
   ------------------------------------------------------------ */
let pickedHero = null;
function renderOnboarding(step = 1) {
  show('onboardView');
  $$('.onboard-step').forEach(s => { s.hidden = s.dataset.step !== String(step); });
  if (step === 1) {
    $('#redFlagsList').innerHTML = RED_FLAGS.map(f => `<li>${esc(f)}</li>`).join('');
    const upd = () => { $('#onboardNext1').disabled = !($('#consentDoctor').checked && $('#consentAdult').checked); };
    $('#consentDoctor').onchange = upd; $('#consentAdult').onchange = upd; upd();
    $('#onboardNext1').onclick = () => renderOnboarding(2);
  } else {
    const grid = $('#heroGrid'); grid.innerHTML = '';
    pickedHero = state.profile ? state.profile.hero : null;
    $('#childName').value = state.profile ? state.profile.name : '';
    HEROES.forEach(h => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hero-pick' + (pickedHero === h.id ? ' active' : '');
      b.innerHTML = `<span>${h.emoji}</span><small>${esc(h.name)}</small>`;
      b.onclick = () => { pickedHero = h.id; $$('.hero-pick').forEach(x => x.classList.remove('active')); b.classList.add('active'); audio.tick(); upd(); };
      grid.appendChild(b);
    });
    const upd = () => { $('#onboardStart').disabled = !(pickedHero && $('#childName').value.trim().length > 0); };
    $('#childName').oninput = upd; upd();
    $('#onboardStart').onclick = () => {
      const name = $('#childName').value.trim().slice(0, 20);
      state.profile = Object.assign({ createdAt: new Date().toISOString() }, state.profile || {}, { name, hero: pickedHero });
      saveState(); audio.go();
      renderHome();
      toast(`Добро пожаловать, ${name}! 🎉`);
    };
  }
}

/* ------------------------------------------------------------
   Главная
   ------------------------------------------------------------ */
function heroOf() { return HEROES.find(h => h.id === (state.profile && state.profile.hero)) || HEROES[0]; }

function starsMarkup(n) {
  return '★★★'.split('').map((s, i) => `<span class="${i < n ? '' : 'off'}">★</span>`).join('');
}

function renderHome() {
  show('homeView');
  const hero = heroOf();
  document.documentElement.style.setProperty('--figure', hero.color);
  $('#heroAvatar').textContent = hero.emoji;
  $('#heroName').textContent = state.profile ? state.profile.name : 'Герой';
  const lv = levelInfo();
  $('#heroLevel').textContent = `${lv.level.icon} ${lv.level.title} · уровень ${lv.number}`;
  $('#xpBar').style.width = lv.pct + '%';
  $('#xpText').textContent = lv.next ? `${state.xp} / ${lv.next.xp} опыта до уровня ${lv.number + 1}` : `${state.xp} опыта · максимальный уровень`;
  $('#soundBtn').textContent = state.settings.sound ? '🔊' : '🔇';

  // сегодняшняя миссия
  const tm = todayMission(); const l = LESSONS[tm.idx];
  $('#todayLabel').textContent = tm.label;
  $('#todayTitle').textContent = `${l.badge} Миссия ${tm.idx + 1}. ${l.title}`;
  $('#todayMeta').textContent = `≈ ${lessonMinutes(l)} мин · ${l.exercises.length} ${plural(l.exercises.length, 'упражнение', 'упражнения', 'упражнений')}`;
  $('#todayBtn').textContent = tm.doneToday ? '▶ Ещё одна миссия' : '▶ Начать миссию';
  $('#todayBtn').onclick = () => openLesson(tm.idx);
  const st = streakInfo();
  $('#streakNum').textContent = st.current;
  $('#streakBadge').classList.toggle('hot', st.current >= 2);

  // неделя
  const days = new Set(state.sessions.map(s => s.date));
  const names = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = localDate(d); const done = days.has(key);
    html += `<div class="day${done ? ' done' : ''}${i === 0 ? ' today' : ''}"><i>${done ? '✓' : ''}</i>${names[d.getDay()]}</div>`;
  }
  $('#weekStrip').innerHTML = html;

  // статистика
  $('#statsStars').textContent = totalStars();
  $('#statsDone').textContent = completedIds().size;
  $('#statsMinutes').textContent = totalMinutes();

  // карта
  const best = bestStars();
  const map = $('#lessonMap'); map.innerHTML = '';
  LESSONS.forEach((les, i) => {
    const unlocked = isUnlocked(i); const stars = best[les.id] || 0;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'lesson-card' + (unlocked ? '' : ' locked') + (i === tm.idx && unlocked ? ' next' : '') + (stars ? ' done' : '');
    card.style.setProperty('--lc', les.color);
    card.innerHTML = `<div class="lesson-num">${unlocked ? (stars ? '✓' : i + 1) : '🔒'}</div>
      <div class="lesson-copy"><div class="lesson-title">${les.badge} ${esc(les.title)}</div>
      <div class="lesson-meta">≈ ${lessonMinutes(les)} мин · ${les.exercises.length} ${plural(les.exercises.length, 'упражнение', 'упражнения', 'упражнений')}</div></div>
      <div class="stars">${starsMarkup(stars)}</div>`;
    card.onclick = () => {
      if (!unlocked) { toast('Сначала пройди предыдущую миссию 🔒'); vibrate(40); return; }
      openLesson(i);
    };
    map.appendChild(card);
  });
}

/* ------------------------------------------------------------
   Трофеи
   ------------------------------------------------------------ */
function renderTrophies() {
  show('trophyView');
  const g = $('#achievementGrid');
  g.innerHTML = ACHIEVEMENTS.map(a => {
    const d = state.achievements[a.id];
    return `<div class="ach${d ? '' : ' locked'}"><div class="i">${a.icon}</div><div><b>${esc(a.title)}</b><small>${esc(a.desc)}${d ? ` · ${d.slice(8, 10)}.${d.slice(5, 7)}` : ''}</small></div></div>`;
  }).join('');
  const lv = levelInfo();
  $('#levelList').innerHTML = LEVELS.map((l, i) => `<div class="lvl${i <= lv.idx ? ' reached' : ''}${i === lv.idx ? ' current' : ''}"><div class="i">${l.icon}</div><b>${i + 1}. ${esc(l.title)}</b><small>${l.xp} опыта</small></div>`).join('');
}

/* ------------------------------------------------------------
   Прохождение миссии
   ------------------------------------------------------------ */
const run = {
  lessonIdx: 0, exIdx: 0, status: 'idle', // idle | ready | running | paused | done
  endAt: 0, remainingMs: 0, totalMs: 0, tick: null, readyTimer: null,
  done: new Set(), skipped: new Set(), feedback: {}, activeMs: 0, lastTickAt: 0,
  flags: {}, startedAt: null, leaveArmed: 0,
};
const RING_LEN = 2 * Math.PI * 52;

function speed() { return state.settings.demo ? DEMO_SPEED : 1; }

function openLesson(i) {
  run.lessonIdx = i; run.exIdx = 0; run.done = new Set(); run.skipped = new Set(); run.feedback = {};
  run.activeMs = 0; run.startedAt = new Date().toISOString(); run.status = 'idle';
  const l = LESSONS[i];
  document.documentElement.style.setProperty('--primary', l.color);
  $('#lessonBadge').textContent = l.badge;
  $('#lessonTitle').textContent = `Миссия ${i + 1}. ${l.title}`;
  $('#exercisePanel').hidden = false; $('#finishPanel').hidden = true;
  show('lessonView');
  renderExercise();
  speech.say(`Миссия ${i + 1}. ${l.title}. ${l.goal}`);
}

function currentExercise() { return LESSONS[run.lessonIdx].exercises[run.exIdx]; }

function renderExercise() {
  stopTick();
  const l = LESSONS[run.lessonIdx], e = currentExercise();
  run.status = 'idle'; run.flags = {}; run.remainingMs = e.sec * 1000; run.totalMs = e.sec * 1000;
  $('#phase').textContent = e.phase;
  const pos = POSITIONS[e.pos] || POSITIONS.stand;
  $('#position').textContent = `${pos.icon} ${pos.label}`;
  $('#exerciseName').textContent = e.name;
  $('#exerciseHow').textContent = e.how;
  $('#demoHost').innerHTML = figureSVG(e.visual, pos.label);
  $('#counter').textContent = `Упражнение ${run.exIdx + 1} из ${l.exercises.length}`;
  $('#lessonSteps').innerHTML = l.exercises.map((_, i) => `<i class="${run.done.has(i) || run.skipped.has(i) ? 'done' : ''}${i === run.exIdx ? ' cur' : ''}"></i>`).join('');
  $('#timer').textContent = fmt(e.sec);
  $('#timerHint').textContent = 'нажми «Начать»';
  $('#ringFg').style.strokeDashoffset = 0; $('#ringFg').classList.remove('warn');
  $('#startBtn').textContent = '▶ Начать'; $('#startBtn').disabled = false;
  $('#nextBtn').disabled = true;
  $('#feedbackRow').hidden = true; $$('.fb').forEach(b => b.classList.remove('active'));
  $('#sideRow').hidden = !e.sides; $$('.side').forEach(s => s.classList.remove('active'));
  if (e.sides) $('.side[data-side="L"]').classList.add('active');
  $('#breathPacer').hidden = !e.breath; $('#breathPacer').classList.remove('run');
  $('.timer-wrap').classList.toggle('paced', !!e.breath);
  $('#skipBtn').hidden = false;
}

function startOrPause() {
  audio.ensure();
  if (run.status === 'running') { pauseTimer(); return; }
  if (run.status === 'paused') { resumeTimer(); return; }
  if (run.status === 'idle') beginReady();
}

function beginReady() {
  const e = currentExercise(); const pos = POSITIONS[e.pos] || POSITIONS.stand;
  run.status = 'ready';
  $('#readyOverlay').hidden = false; $('#readyPos').textContent = `${pos.icon} ${pos.label}`;
  $('#readyLabel').textContent = 'Приготовься';
  speech.say(`${e.name}. ${e.how}`);
  let n = state.settings.demo ? 1 : 3;
  const step = () => {
    $('#readyNum').textContent = n; audio.tick(); vibrate(30);
    if (n === 0) {
      $('#readyOverlay').hidden = true; run.readyTimer = null;
      startRunning(); return;
    }
    n--; run.readyTimer = setTimeout(step, 1000);
  };
  // даём голосу назвать упражнение, затем отсчёт
  run.readyTimer = setTimeout(step, state.settings.voice && !state.settings.demo ? 2200 : 300);
}

function startRunning() {
  const e = currentExercise();
  run.status = 'running';
  run.endAt = Date.now() + run.remainingMs / speed();
  run.lastTickAt = Date.now();
  $('#startBtn').textContent = '⏸ Пауза';
  $('#timerHint').textContent = e.sides ? 'левая сторона' : (e.breath ? '' : 'спокойный темп');
  if (e.breath) $('#breathPacer').classList.add('run');
  audio.go(); vibrate([40, 60, 40]);
  if (!run.flags.started) { run.flags.started = true; speech.say('Начали!', { interrupt: false }); }
  run.tick = setInterval(onTick, 200);
  onTick();
}

function pauseTimer() {
  run.remainingMs = Math.max(0, (run.endAt - Date.now()) * speed());
  stopTick(); run.status = 'paused';
  $('#startBtn').textContent = '▶ Продолжить'; $('#timerHint').textContent = 'пауза';
  $('#breathPacer').classList.remove('run');
  speech.stop();
}
function resumeTimer() { startRunning(); }
function stopTick() { if (run.tick) clearInterval(run.tick); run.tick = null; if (run.readyTimer) clearTimeout(run.readyTimer); run.readyTimer = null; $('#readyOverlay').hidden = true; }

function onTick() {
  const e = currentExercise();
  const now = Date.now();
  run.activeMs += (now - run.lastTickAt); run.lastTickAt = now;
  const remainingMs = Math.max(0, (run.endAt - now) * speed());
  const remainingSec = remainingMs / 1000;
  const elapsedMs = run.totalMs - remainingMs;
  $('#timer').textContent = fmt(remainingSec);
  $('#ringFg').style.strokeDashoffset = RING_LEN * (1 - remainingMs / run.totalMs);
  $('#ringFg').classList.toggle('warn', remainingSec <= 10);

  // стороны: смена на половине
  if (e.sides && !run.flags.side && elapsedMs >= run.totalMs / 2) {
    run.flags.side = true;
    $$('.side').forEach(s => s.classList.toggle('active', s.dataset.side === 'R'));
    $('#timerHint').textContent = 'правая сторона';
    audio.side(); vibrate([80, 60, 80]); speech.say('Смени сторону!');
  }
  // дыхательный маятник: 4 с вдох, 6 с выдох
  if (e.breath) {
    const ph = (elapsedMs % 10000) < 4000 ? 'вдох' : 'выдох';
    if (run.flags.breath !== ph) {
      run.flags.breath = ph; $('#pacerText').textContent = ph;
      if (ph === 'вдох') audio.inhale(); else audio.exhale();
    }
  }
  // голосовые подсказки об остатке
  if (!run.flags.ten && remainingSec <= 10 && run.totalMs >= 30000) { run.flags.ten = true; speech.say('Осталось десять секунд', { interrupt: false }); }
  [3, 2, 1].forEach(n => { if (!run.flags['c' + n] && remainingSec <= n && remainingSec > n - 1) { run.flags['c' + n] = true; audio.tick(); } });

  if (remainingMs <= 0) completeExercise();
}

function completeExercise() {
  stopTick(); run.status = 'done';
  run.done.add(run.exIdx);
  $('#timer').textContent = '0:00'; $('#timerHint').textContent = 'готово!';
  $('#ringFg').style.strokeDashoffset = RING_LEN;
  $('#breathPacer').classList.remove('run');
  $('#startBtn').textContent = '✓ Готово'; $('#startBtn').disabled = true;
  $('#nextBtn').disabled = false;
  $('#feedbackRow').hidden = false; $('#skipBtn').hidden = true;
  $('#lessonSteps').children[run.exIdx].className = 'done';
  audio.done(); vibrate([60, 40, 60, 40, 120]);
  speech.say(pick(PRAISE));
}

function setFeedback(v) {
  run.feedback[run.exIdx] = v;
  $$('.fb').forEach(b => b.classList.toggle('active', b.dataset.fb === v));
  audio.tick();
  if (v === 'pain') {
    toast('Расскажи взрослому. Если больно — лучше остановиться.', 3200);
  }
}

function skipExercise() {
  if (run.status === 'running') pauseTimer();
  run.skipped.add(run.exIdx);
  toast('Упражнение пропущено', 1800);
  goNext();
}

function nextExercise() { goNext(); }

function goNext() {
  speech.stop();
  const l = LESSONS[run.lessonIdx];
  if (run.exIdx < l.exercises.length - 1) { run.exIdx++; renderExercise(); }
  else finishLesson(false);
}

function computeStars(stopped) {
  const n = LESSONS[run.lessonIdx].exercises.length;
  if (stopped) return 1;
  const pain = Object.values(run.feedback).includes('pain');
  const skips = run.skipped.size;
  if (run.done.size === n && !pain) return 3;
  if (run.done.size >= n - 1 && skips <= 1) return 2;
  return 1;
}

function finishLesson(stopped) {
  stopTick(); run.status = 'idle';
  const l = LESSONS[run.lessonIdx];
  const stars = computeStars(stopped);
  const firstTime = !completedIds().has(l.id);
  const streakBefore = streakInfo();
  const doneToday = state.sessions.some(s => s.date === todayStr());
  const streakForBonus = doneToday ? streakBefore.current : streakBefore.current + 1;
  const sec = Math.round(run.activeMs / 1000 * (state.settings.demo ? DEMO_SPEED : 1));

  let xp = run.done.size * XP.exercise + stars * XP.star + (firstTime ? XP.firstTime : 0)
    + Math.min(streakForBonus, 7) * XP.streakDay + (stopped ? XP.honesty : 0);
  const levelBefore = levelInfo().number;
  const session = {
    id: 'ses-' + Date.now(), lessonId: l.id, date: todayStr(), at: new Date().toISOString(),
    stars, sec, done: [...run.done], skipped: [...run.skipped], feedback: run.feedback, stopped: !!stopped, xp,
  };
  state.sessions.push(session); state.xp += xp;
  const unlocked = checkAchievements(session);
  const lvAfter = levelInfo();
  saveState();

  // экран финала
  $('#exercisePanel').hidden = true; $('#finishPanel').hidden = false;
  const hero = heroOf();
  $('#finishHero').textContent = stopped ? '💚' : hero.emoji;
  $('#finishTitle').textContent = stopped ? 'Ты правильно остановился' : (stars === 3 ? 'Идеально! Миссия пройдена' : 'Миссия завершена!');
  $$('#finishStars span').forEach((s, i) => s.classList.toggle('on', i < stars));
  const pain = Object.values(run.feedback).includes('pain');
  $('#finishText').textContent = stopped
    ? 'Остановиться при боли — поступок настоящего героя. Расскажи родителю, где и когда было больно, и не продолжай упражнение без консультации.'
    : pain ? 'Ты честно отметил боль — это важно. Обязательно расскажи взрослому перед следующим занятием.'
      : stars === 3 ? `${pick(PRAISE)} Спина становится сильнее с каждым днём.`
        : stars === 2 ? 'Отлично! В следующий раз попробуй выполнить все упражнения — и получишь третью звезду.'
          : 'Главное — ты занимался. Завтра получится ещё лучше!';
  $('#finishXp').textContent = '+' + xp;
  $('#finishStreak').textContent = streakInfo().current;
  $('#finishMinutes').textContent = Math.max(1, Math.round(sec / 60));
  const achBox = $('#finishAch');
  achBox.hidden = !unlocked.length;
  achBox.innerHTML = unlocked.map(a => `<div class="ach-toast"><div class="i">${a.icon}</div><div><b>Новое достижение: ${esc(a.title)}</b><small>${esc(a.desc)}</small></div></div>`).join('');
  const lu = $('#levelUp');
  lu.hidden = lvAfter.number <= levelBefore;
  if (!lu.hidden) lu.textContent = `⬆️ Новый уровень ${lvAfter.number}: ${lvAfter.level.icon} ${lvAfter.level.title}`;

  if (!stopped) {
    confetti(stars === 3 ? 180 : 90);
    audio.fanfare(); vibrate([100, 60, 100, 60, 200]);
    speech.say(stars === 3 ? 'Миссия пройдена на три звезды! Ты молодец!' : 'Миссия завершена. Отличная работа!');
  } else {
    audio.done();
  }
  if (unlocked.length) setTimeout(() => audio.unlock(), 900);
}

function closeFinish() {
  $('#exercisePanel').hidden = false; $('#finishPanel').hidden = true;
  document.documentElement.style.setProperty('--primary', '#6c5ce7');
  renderHome();
}

function leaveLesson() {
  const inProgress = run.done.size > 0 || run.status === 'running' || run.status === 'paused';
  if (inProgress && Date.now() - run.leaveArmed > 3000) {
    run.leaveArmed = Date.now();
    if (run.status === 'running') pauseTimer();
    toast('Выйти без сохранения? Нажми «Карта» ещё раз', 3000);
    return;
  }
  stopTick(); speech.stop();
  document.documentElement.style.setProperty('--primary', '#6c5ce7');
  renderHome();
}

/* Остановка при боли */
function painStop() {
  if (run.status === 'running') pauseTimer();
  $('#painModal').showModal();
}
function confirmPain() {
  $('#painModal').close();
  run.feedback[run.exIdx] = 'pain';
  finishLesson(true);
}

/* ------------------------------------------------------------
   Родительский раздел
   ------------------------------------------------------------ */
let pinBuf = '';
function openParent() {
  const dlg = $('#parentModal');
  pinBuf = '';
  if (state.settings.pin) {
    $('#pinGate').hidden = false; $('#parentBody').hidden = true;
    renderPinPad(); renderPinDots();
  } else {
    $('#pinGate').hidden = true; $('#parentBody').hidden = false;
    renderParent('overview');
  }
  dlg.showModal();
}
function renderPinPad() {
  const pad = $('#pinPad'); pad.innerHTML = '';
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].forEach(k => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = k;
    b.onclick = () => {
      if (k === '⌫') pinBuf = pinBuf.slice(0, -1);
      else if (k === '✓') { checkPin(); return; }
      else if (pinBuf.length < 4) pinBuf += k;
      renderPinDots();
      if (pinBuf.length === 4) checkPin();
    };
    pad.appendChild(b);
  });
}
function renderPinDots() { $$('#pinDots span').forEach((d, i) => d.classList.toggle('on', i < pinBuf.length)); }
function checkPin() {
  if (pinBuf === state.settings.pin) {
    $('#pinGate').hidden = true; $('#parentBody').hidden = false; renderParent('overview');
  } else {
    pinBuf = ''; renderPinDots();
    const dots = $('#pinDots'); dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake');
    vibrate([60, 40, 60]);
  }
}

function renderParent(tab) {
  $$('#parentTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  $$('#parentModal .tab-panel').forEach(p => { p.hidden = p.dataset.panel !== tab; });
  if (tab === 'overview') renderParentOverview();
  if (tab === 'history') renderParentHistory();
  if (tab === 'settings') renderParentSettings();
}

function renderParentOverview() {
  const st = streakInfo(); const lv = levelInfo();
  const painSessions = state.sessions.filter(s => s.stopped || Object.values(s.feedback || {}).includes('pain'));
  const last = state.sessions[state.sessions.length - 1];
  const lastDate = last ? new Date(last.at) : null;
  const week = state.sessions.filter(s => (Date.now() - new Date(s.at)) < 7 * 86400000).length;
  $('#parentOverview').innerHTML = `
    <div class="kv">
      <span>Ребёнок</span><b>${esc(state.profile ? state.profile.name : '—')} ${heroOf().emoji}</b>
      <span>Уровень героя</span><b>${lv.number} · ${esc(lv.level.title)} (${state.xp} опыта)</b>
      <span>Занятий всего</span><b>${state.sessions.length}</b>
      <span>Занятий за 7 дней</span><b>${week}</b>
      <span>Разных миссий пройдено</span><b>${completedIds().size} из ${LESSONS.length}</b>
      <span>Звёзд</span><b>${totalStars()} из ${LESSONS.length * 3}</b>
      <span>Серия дней (текущая / лучшая)</span><b>${st.current} / ${st.best}</b>
      <span>Минут занятий</span><b>${totalMinutes()}</b>
      <span>Упражнений выполнено</span><b>${totalExercises()}</b>
      <span>Последнее занятие</span><b>${lastDate ? lastDate.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</b>
      <span>Отметок боли / остановок</span><b class="${painSessions.length ? 'p' : ''}">${painSessions.length}</b>
    </div>
    ${painSessions.length ? `<div class="warn-box"><b>Внимание:</b> ребёнок отмечал боль или дискомфорт. Посмотрите вкладку «История» и обсудите с врачом, прежде чем продолжать эти упражнения.</div>` : ''}
    <div class="warn-box"><b>Медицинская граница:</b> приложение содержит только общеукрепляющие симметричные упражнения. Оно не подбирает коррекцию конкретной сколиотической дуги и не заменяет осмотр детского ортопеда / физиотерапевта. Для лечебной версии специалист должен утвердить индивидуальный план (PSSE / Schroth), ограничения и направление коррекции.</div>`;
}

function renderParentHistory() {
  const rows = [...state.sessions].reverse().slice(0, 60);
  if (!rows.length) { $('#parentHistory').innerHTML = '<p>Занятий пока не было.</p>'; return; }
  const html = rows.map(s => {
    const l = LESSONS[lessonIndex(s.lessonId)] || { title: s.lessonId, exercises: [] };
    const painEx = Object.entries(s.feedback || {}).filter(([, v]) => v === 'pain').map(([i]) => l.exercises[i] ? l.exercises[i].name : `упражнение ${Number(i) + 1}`);
    const tired = Object.values(s.feedback || {}).filter(v => v === 'tired').length;
    const pain = s.stopped || painEx.length;
    return `<div class="hrow${pain ? ' pain' : ''}"><span class="d">${s.date.slice(8, 10)}.${s.date.slice(5, 7)}</span>
      <span class="t">${esc(l.title)}<br><small style="color:var(--muted)">${'★'.repeat(s.stars)}${'☆'.repeat(3 - s.stars)} · ${Math.max(1, Math.round((s.sec || 0) / 60))} мин · выполнено ${s.done ? s.done.length : '?'}/${l.exercises.length}${s.skipped && s.skipped.length ? ` · пропущено ${s.skipped.length}` : ''}${tired ? ` · устал(а) ×${tired}` : ''}</small>
      ${painEx.length ? `<ul class="pain-list">${painEx.map(n => `<li>боль: ${esc(n)}</li>`).join('')}</ul>` : ''}${s.stopped ? `<div class="p">⛔ занятие остановлено из‑за боли</div>` : ''}</span></div>`;
  }).join('');
  $('#parentHistory').innerHTML = `<div class="hist">${html}</div>`;
}

let resetArmed = 0;
function renderParentSettings() {
  const s = state.settings;
  const sw = (key, label, hint) => `<label class="setting"><div>${label}<small>${hint}</small></div><span class="switch"><input type="checkbox" data-set="${key}" ${s[key] ? 'checked' : ''}><i></i></span></label>`;
  $('#parentSettings').innerHTML = `
    ${sw('sound', '🔊 Звуковые сигналы', 'старт, смена стороны, отсчёт, фанфары')}
    ${sw('voice', '🗣️ Голосовые подсказки', 'озвучивание упражнений — ребёнку не нужно смотреть в экран')}
    ${sw('vibrate', '📳 Вибрация', 'на телефонах с поддержкой')}
    ${sw('freeMode', '🗺️ Все миссии открыты', 'иначе миссии открываются по очереди')}
    ${sw('demo', '⚡ Демо‑режим', `таймер в ${DEMO_SPEED} раз быстрее — для тестирования`)}
    <div class="setting" style="display:block"><div>🔒 PIN‑код родителя<small>4 цифры. Пусто — без PIN.</small></div>
      <div class="pin-set"><input type="tel" id="pinInput" inputmode="numeric" maxlength="4" pattern="[0-9]*" placeholder="••••" value="${esc(s.pin)}"><button class="btn small ghost" id="pinSave" type="button">Сохранить</button></div></div>
    <div class="btn-row">
      <button class="btn small ghost" id="exportBtn" type="button">📤 Экспорт данных</button>
      <button class="btn small ghost" id="changeHeroBtn" type="button">🎭 Сменить героя / имя</button>
      <button class="btn small ghost red" id="resetBtn" type="button">🗑️ Сбросить прогресс</button>
      <button class="btn small ghost" id="reloadBtn" type="button">🔄 Обновить приложение</button>
    </div>
    <p style="font-size:12px;margin-top:12px">Версия 2.0 · данные хранятся только на этом устройстве</p>`;
  $$('#parentSettings input[data-set]').forEach(inp => {
    inp.onchange = () => { state.settings[inp.dataset.set] = inp.checked; saveState(); if (inp.dataset.set === 'sound') $('#soundBtn').textContent = state.settings.sound ? '🔊' : '🔇'; };
  });
  $('#pinSave').onclick = () => {
    const v = $('#pinInput').value.replace(/\D/g, '');
    if (v && v.length !== 4) { toast('PIN должен быть из 4 цифр'); return; }
    state.settings.pin = v; saveState(); toast(v ? 'PIN сохранён 🔒' : 'PIN отключён');
  };
  $('#exportBtn').onclick = exportData;
  $('#changeHeroBtn').onclick = () => { $('#parentModal').close(); renderOnboarding(2); };
  $('#reloadBtn').onclick = () => location.reload();
  $('#resetBtn').onclick = () => {
    if (Date.now() - resetArmed > 5000) { resetArmed = Date.now(); $('#resetBtn').textContent = '⚠️ Точно удалить? Нажмите ещё раз'; return; }
    const profile = state.profile; state = defaultState(); state.profile = profile; saveState();
    try { localStorage.removeItem(LEGACY_KEY); } catch (e) { /* ignore */ }
    $('#parentModal').close(); renderHome(); toast('Прогресс сброшен');
  };
}

function exportData() {
  const data = JSON.stringify({ exportedAt: new Date().toISOString(), app: 'spina-quest', ...state }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `spina-quest-${todayStr()}.json`; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  toast('Файл с данными сохранён');
}

/* ------------------------------------------------------------
   Привязка событий
   ------------------------------------------------------------ */
$('#startBtn').onclick = startOrPause;
$('#nextBtn').onclick = nextExercise;
$('#skipBtn').onclick = skipExercise;
$('#backBtn').onclick = leaveLesson;
$('#painBtn').onclick = painStop;
$('#confirmPain').onclick = confirmPain;
$('#cancelPain').onclick = () => $('#painModal').close();
$('#closeFinish').onclick = closeFinish;
$$('.fb').forEach(b => { b.onclick = () => setFeedback(b.dataset.fb); });
$('#parentBtn').onclick = openParent;
$('#closeParent').onclick = () => $('#parentModal').close();
$('#pinCancel').onclick = () => $('#parentModal').close();
$$('#parentTabs .tab').forEach(t => { t.onclick = () => renderParent(t.dataset.tab); });
$('#trophyBtn').onclick = renderTrophies;
$('#trophyBack').onclick = renderHome;
$('#soundBtn').onclick = () => { state.settings.sound = !state.settings.sound; saveState(); $('#soundBtn').textContent = state.settings.sound ? '🔊' : '🔇'; if (state.settings.sound) audio.go(); };
$('#readyOverlay').onclick = () => { /* тап по оверлею ничего не делает — защита от случайного пропуска */ };

// если вкладка ушла в фон и вернулась — сразу пересчитать таймер
document.addEventListener('visibilitychange', () => { if (!document.hidden && run.status === 'running') onTick(); });
window.addEventListener('resize', () => { const c = $('#confetti'); if (c) { c.width = innerWidth; c.height = innerHeight; } });

/* ------------------------------------------------------------
   Старт
   ------------------------------------------------------------ */
if (state.profile && state.profile.name) renderHome(); else renderOnboarding(1);
