'use strict';

const APP_VERSION = '1.3';
const KEY_DATA = 'ppl.data.v1';
const KEY_ACTIVE = 'ppl.active.v1';
const DAY = 86400000;

/* ================= Утилиты ================= */

const $ = (s, el = document) => el.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = (n) => String(n).padStart(2, '0');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function parseNum(v) {
  const s = String(v ?? '').trim().replace(',', '.');
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
const roundTo = (n, step) => Math.round(n / step) * step;
const fmtW = (w) => (w == null ? '' : String(Math.round(w * 100) / 100).replace('.', ','));
const fmtSet = (s) => (s.w ? `${fmtW(s.w)}×${s.r}` : `${s.r} повт`);
const fmtInt = (n) => Math.round(n).toLocaleString('ru-RU');
const fmtRest = (s) => `${Math.floor(s / 60)}:${pad2(s % 60)}`;
const fmtDate = (ts, o = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(ts).toLocaleDateString('ru-RU', o);
function fmtDay(ts, weekday = false) {
  const o = { day: 'numeric', month: 'short' };
  if (weekday) o.weekday = 'short';
  if (new Date(ts).getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
  return new Date(ts).toLocaleDateString('ru-RU', o).replace(/\s?г\.$/, '');
}
const fmtTime = (ts) => new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function fmtClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}
function fmtDur(ms) {
  const m = Math.max(1, Math.round(ms / 60000));
  return m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч ${pad2(m % 60)} мин`;
}
function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

// Расчётный 1ПМ по формуле Эпли
const e1rm = (w, r) => (!w || !r ? 0 : r === 1 ? w : w * (1 + r / 30));

function summarize(sets) {
  let e1 = 0, best = null, maxW = 0, maxWReps = 0, vol = 0, maxR = 0, sumR = 0;
  for (const s of sets) {
    const w = s.w || 0, r = s.r || 0, e = e1rm(w, r);
    if (e > e1) { e1 = e; best = s; }
    if (w > maxW || (w === maxW && r > maxWReps)) { maxW = w; maxWReps = r; }
    vol += w * r;
    maxR = Math.max(maxR, r);
    sumR += r;
  }
  if (!best && sets.length) best = sets.reduce((a, b) => ((b.r || 0) > (a.r || 0) ? b : a));
  return { e1, best, maxW, maxWReps, vol, maxR, sumR };
}

const ICON = {
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3.2"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/></svg>',
};

/* ================= Программа по умолчанию ================= */

function tex(variants, sets, repMin, repMax, base, step) {
  return { id: uid(), variants, sets, repMin, repMax, base, step, rest: null };
}

function defaultTemplates() {
  return [
    { id: 'push', name: 'Push', note: 'Грудь, плечи, трицепс', exercises: [
      tex(['Жим штанги лёжа'], 4, 6, 8, true, 2.5),
      tex(['Жим гантелей на наклонной 30°'], 3, 8, 10, true, 2),
      tex(['Жим на плечи сидя'], 3, 8, 10, true, 2),
      tex(['Бабочка', 'Кроссовер'], 3, 10, 15, false, 2.5),
      tex(['Махи в стороны'], 4, 12, 15, false, 1),
      tex(['Брусья'], 3, 8, 12, true, 2.5),
      tex(['Разгибания на блоке (прямая ручка)'], 3, 10, 12, false, 2.5),
    ] },
    { id: 'pull', name: 'Pull', note: 'Спина, задняя дельта, бицепс', exercises: [
      tex(['Верхний блок', 'Подтягивания'], 4, 6, 10, true, 2.5),
      tex(['Тяга штанги в наклоне', 'Т-гриф'], 3, 8, 10, true, 2.5),
      tex(['Хаммер', 'Нижний блок'], 3, 10, 12, true, 2.5),
      tex(['Махи лёжа на наклонной (задняя дельта)'], 3, 12, 15, false, 1),
      tex(['Махи в стороны'], 3, 12, 15, false, 1),
      tex(['Сгибания со штангой'], 3, 8, 10, false, 2.5),
      tex(['Молотки'], 3, 10, 12, false, 1),
    ] },
    { id: 'legs', name: 'Legs', note: 'Ноги', exercises: [
      tex(['Присед', 'Гакк'], 4, 6, 8, true, 2.5),
      tex(['Румынская тяга с гантелями'], 3, 8, 10, true, 2),
      tex(['Жим ногами'], 3, 10, 12, true, 5),
      tex(['Сгибания ног'], 3, 10, 12, false, 2.5),
      tex(['Разгибания ног'], 3, 12, 15, false, 2.5),
      tex(['Икры'], 4, 10, 15, false, 5),
    ] },
  ];
}

/* ================= Хранилище ================= */

function defaultData() {
  return {
    v: 1,
    templates: defaultTemplates(),
    history: [],
    settings: { lighter: false, wakeLock: true, restBase: 150, restIso: 90, lastExport: 0 },
    lastVariant: {},
  };
}

function normalize(d) {
  const def = defaultData();
  return {
    v: 1,
    templates: Array.isArray(d?.templates) ? d.templates : def.templates,
    history: Array.isArray(d?.history) ? d.history.slice().sort((a, b) => a.startedAt - b.startedAt) : [],
    settings: { ...def.settings, ...(d?.settings || {}) },
    lastVariant: d?.lastVariant || {},
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(KEY_DATA);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { /* повреждённые данные — начнём заново */ }
  return defaultData();
}
function loadActive() {
  try { return JSON.parse(localStorage.getItem(KEY_ACTIVE)) || null; } catch (e) { return null; }
}
function saveData() {
  try { localStorage.setItem(KEY_DATA, JSON.stringify(data)); }
  catch (e) { toast('Не удалось сохранить данные: ' + e.message); }
}
function saveActive() {
  try {
    if (active) localStorage.setItem(KEY_ACTIVE, JSON.stringify(active));
    else localStorage.removeItem(KEY_ACTIVE);
  } catch (e) { toast('Не удалось сохранить тренировку: ' + e.message); }
}

let data = loadData();
let active = loadActive();
const nav = { tab: 'train', stack: { train: [], history: [], progress: [], program: [] } };
const ui = { metric: null };
let pendingChart = null;

/* ================= Логика тренировки ================= */

const restFor = (e) => e.rest ?? (e.base ? data.settings.restBase : data.settings.restIso);
const findTpl = (id) => data.templates.find((t) => t.id === id);
const findTe = (id) => { for (const t of data.templates) for (const e of t.exercises) if (e.id === id) return e; return null; };
const findEx = (key) => active?.exercises.find((e) => e.key === key);

function nextTemplate() {
  const T = data.templates;
  if (!T.length) return null;
  const last = [...data.history].reverse().find((w) => T.some((t) => t.id === w.templateId));
  if (!last) return T[0];
  return T[(T.findIndex((t) => t.id === last.templateId) + 1) % T.length];
}

// Последнее выполнение упражнения (при редактировании — только до этой тренировки)
function lastPerf(name, ctx) {
  const before = ctx?.editOf ? ctx.startedAt : Infinity;
  for (let i = data.history.length - 1; i >= 0; i--) {
    const w = data.history[i];
    if (w.id === ctx?.editOf || w.startedAt >= before) continue;
    const e = w.exercises.find((x) => x.name === name);
    if (e && e.sets.length) return { ...e, t: w.startedAt };
  }
  return null;
}

// Двойная прогрессия: все подходы на верхней границе → прибавляем вес
function suggest(e, last) {
  if (!last) return { kind: 'new', weight: null, text: 'Первый раз: подбери вес так, чтобы оставалось 1–2 повтора в запасе' };
  const sets = last.sets;
  const top = Math.max(...sets.map((s) => s.w || 0));
  const sameWeight = sets.every((s) => (s.w || 0) === top);
  const allMax = sets.every((s) => s.r >= e.repMax);
  const enough = sets.length >= (last.target || sets.length);
  if (sameWeight && allMax && enough) {
    if (top > 0) {
      const w = roundTo(top + e.step, 0.25);
      return { kind: 'up', weight: w, text: `<b>Прибавь: ${fmtW(w)} кг</b> — в прошлый раз все подходы на ${e.repMax}+` };
    }
    return { kind: 'up', weight: null, text: `<b>Все подходы на ${e.repMax}+</b> — можно добавить отягощение` };
  }
  const below = sets.some((s) => s.r < e.repMin);
  if (top > 0) {
    return { kind: 'hold', weight: top, text: below
      ? `<b>Держи ${fmtW(top)} кг</b> — добери до ${e.repMin}+ повторов`
      : `<b>Держи ${fmtW(top)} кг</b> — цель: ${e.repMax} во всех подходах` };
  }
  return { kind: 'hold', weight: null, text: `<b>Цель:</b> ${e.repMax} повторов во всех подходах` };
}

function newExercise(te, lighter) {
  const lv = data.lastVariant[te.id];
  const target = !te.base && lighter ? Math.max(1, te.sets - 1) : te.sets;
  return {
    key: uid(), teId: te.id,
    name: te.variants.includes(lv) ? lv : te.variants[0],
    variants: [...te.variants],
    target, repMin: te.repMin, repMax: te.repMax, base: !!te.base, step: te.step || 2.5, rest: restFor(te),
    sets: Array.from({ length: target }, () => ({ w: null, r: null, done: false })),
  };
}

function startWorkout(tplId) {
  if (!active) {
    const t = findTpl(tplId);
    if (!t) return;
    const lighter = !!data.settings.lighter;
    active = { id: uid(), templateId: t.id, name: t.name, startedAt: Date.now(), lighter, rest: null, exercises: [] };
    active.exercises = t.exercises.map((te) => newExercise(te, lighter));
    saveActive();
  }
  nav.tab = 'train';
  render('top');
}

function wkStats(w) {
  let sets = 0, vol = 0;
  for (const e of w.exercises) for (const s of e.sets) { sets++; vol += (s.w || 0) * (s.r || 0); }
  return { sets, vol };
}

function findPRs(w) {
  const prs = [];
  const earlier = data.history.filter((x) => x.id !== w.id && x.startedAt < w.startedAt);
  for (const e of w.exercises) {
    const prev = earlier.flatMap((x) => x.exercises.filter((y) => y.name === e.name).flatMap((y) => y.sets));
    if (!prev.length) continue;
    const a = summarize(e.sets), b = summarize(prev);
    if (a.maxW > 0) {
      if (a.e1 > b.e1 + 0.01) prs.push({ name: e.name, text: `${fmtSet(a.best)} · 1ПМ ≈ ${fmtW(roundTo(a.e1, 0.5))} кг` });
    } else if (a.maxR > b.maxR) {
      prs.push({ name: e.name, text: `${a.maxR} повт` });
    }
  }
  return prs;
}

function saveWorkout() {
  const a = active;
  const w = {
    id: a.editOf || a.id, templateId: a.templateId, name: a.name, lighter: !!a.lighter,
    startedAt: a.startedAt, finishedAt: a.editOf ? a.finishedAt : Date.now(),
    exercises: a.exercises.map((e) => ({
      name: e.name, teId: e.teId, base: e.base, repMin: e.repMin, repMax: e.repMax, target: e.target,
      sets: e.sets.filter((s) => s.done && s.r != null).map((s) => ({ w: s.w || null, r: s.r })),
    })).filter((e) => e.sets.length),
  };
  if (!w.exercises.length) return toast('Нет отмеченных подходов — сохранять нечего');

  const prs = a.editOf ? [] : findPRs(w);
  if (a.editOf) {
    const i = data.history.findIndex((x) => x.id === a.editOf);
    if (i >= 0) data.history[i] = w; else data.history.push(w);
  } else {
    data.history.push(w);
    for (const e of a.exercises) if (findTe(e.teId)) data.lastVariant[e.teId] = e.name;
  }
  data.history.sort((x, y) => x.startedAt - y.startedAt);
  saveData();

  active = null;
  saveActive();
  if (a.editOf) {
    nav.tab = 'history';
    nav.stack.history = [{ page: 'detail', arg: w.id, y: 0 }];
    render('top');
    toast('Изменения сохранены');
  } else {
    render('top');
    summarySheet(w, prs);
  }
}

function discardWorkout() {
  const editOf = active?.editOf;
  active = null;
  saveActive();
  if (editOf) {
    nav.tab = 'history';
    nav.stack.history = [{ page: 'detail', arg: editOf, y: 0 }];
  }
  render('top');
}

/* ================= Таймер отдыха, экран ================= */

function startRest(sec) {
  active.rest = { endsAt: Date.now() + sec * 1000, total: sec * 1000 };
}

function tick() {
  const el = $('#timer');
  const r = active?.rest;
  const now = Date.now();
  if (!r) {
    if (!el.hidden) { el.hidden = true; document.body.classList.remove('timer-on'); }
  } else {
    if (el.hidden) { el.hidden = false; document.body.classList.add('timer-on'); }
    const left = r.endsAt - now;
    const btn = el.querySelector('.tbtn-main');
    if (left > 0) {
      el.classList.remove('done');
      $('#timer-time').textContent = fmtClock(left + 999);
      el.querySelector('.timer-caption').textContent = 'Отдых';
      $('#timer-fill').style.width = `${Math.min(100, (1 - left / r.total) * 100)}%`;
      btn.textContent = 'Пропустить';
    } else {
      el.classList.add('done');
      $('#timer-time').textContent = '+' + fmtClock(-left);
      el.querySelector('.timer-caption').textContent = 'Пора к подходу';
      $('#timer-fill').style.width = '100%';
      btn.textContent = 'Ок';
      if (-left > 120000) { active.rest = null; saveActive(); }
    }
  }
  const clk = $('#wk-clock');
  if (clk && active && !active.editOf) clk.textContent = fmtClock(now - active.startedAt);
}

let wakeLock = null;
async function updateWakeLock() {
  const want = !!active && !active.editOf && data.settings.wakeLock && document.visibilityState === 'visible';
  try {
    if (want && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!want && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch (e) { wakeLock = null; }
}

/* ================= Шторки и тосты ================= */

function openSheet(html, onPick) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  const bg = root.firstElementChild;
  const close = () => { root.innerHTML = ''; };
  bg.addEventListener('click', (ev) => {
    if (ev.target === bg) return close();
    const b = ev.target.closest('[data-s]');
    if (!b) return;
    if (b.dataset.s === 'cancel') return close();
    onPick?.(b.dataset.s, close, b);
  });
  return close;
}

function confirmSheet({ title, text = '', ok, okClass = 'btn-primary', cancel = 'Отмена', onOk }) {
  openSheet(
    `<h2>${esc(title)}</h2>${text ? `<p>${text}</p>` : ''}
     <button class="btn ${okClass}" data-s="ok">${esc(ok)}</button>
     <button class="btn" data-s="cancel">${esc(cancel)}</button>`,
    (s, close) => { close(); if (s === 'ok') onOk(); });
}

let toastTimer = null;
function toast(text, btnLabel, onBtn, ms = 3200) {
  const el = $('#toast');
  el.innerHTML = `<div class="grow">${esc(text)}</div>${btnLabel ? `<button class="btn btn-primary btn-sm">${esc(btnLabel)}</button>` : ''}`;
  el.hidden = false;
  el.onclick = (ev) => {
    el.hidden = true;
    if (btnLabel && ev.target.closest('button')) onBtn();
  };
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

function summarySheet(w, prs) {
  const st = wkStats(w);
  openSheet(`
    <h2>Тренировка сохранена</h2>
    <p>${esc(w.name)} · ${esc(fmtDate(w.startedAt))}</p>
    <div class="stats">
      <div class="stat"><div class="v">${Math.max(1, Math.round((w.finishedAt - w.startedAt) / 60000))}</div><div class="l">минут</div></div>
      <div class="stat"><div class="v">${st.sets}</div><div class="l">${plural(st.sets, 'подход', 'подхода', 'подходов')}</div></div>
      <div class="stat"><div class="v">${fmtInt(st.vol)}</div><div class="l">кг объём</div></div>
    </div>
    ${prs.length ? `<div class="section-title" style="margin-top:4px">Новые рекорды</div>
      <div class="card card-tight">${prs.map((p) => `<div class="list-row"><div class="grow"><div class="title">${esc(p.name)}<span class="pr">PR</span></div><div class="meta">${esc(p.text)}</div></div></div>`).join('')}</div>` : ''}
    <button class="btn btn-primary" data-s="cancel">Отлично</button>`);
}

/* ================= Экраны ================= */

const backBtn = (label) => `<button class="back" data-act="nav-back">${ICON.back}${esc(label)}</button>`;

const switchRow = (key, title, meta) => `
  <label class="switch-row">
    <div class="grow"><div>${title}</div>${meta ? `<div class="meta">${meta}</div>` : ''}</div>
    <span class="switch"><input type="checkbox" data-change="setting" data-f="${key}" ${data.settings[key] ? 'checked' : ''}><span></span></span>
  </label>`;

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  return navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

function installBanner() {
  if (!isIOS() || isStandalone()) return '';
  return `<div class="banner"><b>Установи на экран «Домой»:</b> кнопка «Поделиться» в Safari → «На экран „Домой“».
    Записывай тренировки в установленном приложении: у Safari и у приложения разные хранилища.</div>`;
}

function backupBanner() {
  if (data.history.length < 3 || Date.now() - (data.settings.lastExport || 0) < 14 * DAY) return '';
  return `<div class="banner"><b>Сделай резервную копию.</b> Данные хранятся только на этом телефоне.
    <button class="link-btn" data-act="export">Сохранить копию</button></div>`;
}

function viewHome() {
  const now = Date.now();
  const h = data.history;
  const next = nextTemplate();
  const last = h.at(-1);
  const others = data.templates.filter((t) => t !== next);
  const n7 = h.filter((w) => now - w.startedAt < 7 * DAY).length;
  const n30 = h.filter((w) => now - w.startedAt < 30 * DAY).length;

  let out = `<div class="page-head"><div class="grow"><h1>Тренировка</h1>
    <div class="sub">${esc(cap(fmtDate(now, { weekday: 'long', day: 'numeric', month: 'long' })))}</div></div></div>`;
  out += installBanner() + backupBanner();

  if (next) {
    const n = next.exercises.length;
    out += `<button class="hero" data-act="start" data-tpl="${next.id}">
      <div class="eyebrow">${last ? `Следующая · прошлая: ${esc(last.name)}, ${esc(relDay(last.startedAt))}` : 'Первая тренировка'}</div>
      <div class="name">${esc(next.name)}</div>
      <div class="desc">${esc(next.note || '')}${next.note ? ' · ' : ''}${n} ${plural(n, 'упражнение', 'упражнения', 'упражнений')}</div>
      <div class="go">Начать →</div>
    </button>`;
  } else {
    out += `<div class="empty">Нет ни одной тренировки в программе.<br>Добавь её во вкладке «Программа».</div>`;
  }
  if (others.length) {
    out += `<div class="tpl-grid">${others.map((t) => `
      <button class="tpl-btn" data-act="start" data-tpl="${t.id}">
        <div class="name">${esc(t.name)}</div><div class="meta">${esc(t.note || `${t.exercises.length} упр.`)}</div>
      </button>`).join('')}</div>`;
  }
  out += `<div class="card card-tight">${switchRow('lighter', 'Облегчённый режим', '−1 подход в изоляции, если проседает восстановление')}</div>`;
  out += `<div class="stats">
    <div class="stat"><div class="v">${n7}</div><div class="l">за 7 дней</div></div>
    <div class="stat"><div class="v">${n30}</div><div class="l">за 30 дней</div></div>
    <div class="stat"><div class="v">${h.length}</div><div class="l">всего</div></div>
  </div>`;
  out += `<div class="section-title">Правила</div>
    <div class="card"><ul class="rules">
      <li>Отдых 2–3 мин на базовых, 60–90 с на изоляции. Таймер запускается сам после подхода.</li>
      <li>Останавливайся за 1–2 повтора до отказа.</li>
      <li>Сделал верх диапазона во всех подходах — прибавляй вес. Нет — держи.</li>
      <li>Проседает восстановление — включи облегчённый режим. Базовые не трогай.</li>
    </ul></div>`;
  return out;
}

function relDay(ts) {
  const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const d = Math.round((sod(Date.now()) - sod(ts)) / DAY);
  if (d <= 0) return 'сегодня';
  if (d === 1) return 'вчера';
  return `${d} ${plural(d, 'день', 'дня', 'дней')} назад`;
}

function viewWorkout() {
  const a = active;
  const edit = !!a.editOf;
  let total = 0, done = 0;
  for (const e of a.exercises) for (const s of e.sets) { total++; if (s.done) done++; }

  let out = `<div class="wk-head">
    <div class="grow">
      <div class="name">${esc(a.name)}</div>
      <div class="meta">${edit ? `Редактирование · ${esc(fmtDate(a.startedAt))}` : `<span id="wk-clock">${fmtClock(Date.now() - a.startedAt)}</span>`} · ${done}/${total} подходов</div>
    </div>
    <button class="btn btn-primary btn-sm" data-act="finish">${edit ? 'Сохранить' : 'Завершить'}</button>
  </div>`;
  if (!edit) {
    out += `<div class="tip">Останавливайся за 1–2 повтора до отказа.${a.lighter ? ' Облегчённый режим: −1 подход в изоляции.' : ''}</div>`;
  }
  out += a.exercises.map(exCard).join('');
  out += `<button class="btn" data-act="add-ex">+ Упражнение</button>
    <div style="height:10px"></div>
    <button class="btn btn-danger" data-act="cancel-workout">${edit ? 'Отменить изменения' : 'Отменить тренировку'}</button>`;
  return out;
}

function exCard(e) {
  const last = lastPerf(e.name, active);
  const sug = suggest(e, last);
  const complete = e.sets.length > 0 && e.sets.every((s) => s.done);
  const chips = e.variants.length > 1
    ? `<div class="chips">${e.variants.map((v, i) => `<button class="chip${v === e.name ? ' on' : ''}" data-act="variant" data-ex="${e.key}" data-v="${i}">${esc(v)}</button>`).join('')}</div>`
    : '';
  const hint = active.editOf ? ''
    : `<div class="hint ${sug.kind}"><span class="ic">${sug.kind === 'up' ? '↑' : sug.kind === 'new' ? '•' : '='}</span><span>${sug.text}</span></div>`;
  return `<section class="ex${complete ? ' complete' : ''}">
    <div class="ex-top">
      <div class="grow">
        <div class="ex-name">${esc(e.name)}</div>
        <div class="ex-plan">${e.target} × ${e.repMin}–${e.repMax} · отдых ${fmtRest(e.rest)}<span class="tag">${e.base ? 'база' : 'изол.'}</span></div>
      </div>
      <button class="icon-btn" data-act="ex-menu" data-ex="${e.key}" aria-label="Действия">${ICON.dots}</button>
    </div>
    ${chips}${hint}
    <div class="sets">
      <div class="set-head"><span></span><span>Прошлый</span><span>кг</span><span>Повт</span><span></span></div>
      ${e.sets.map((s, i) => setRow(e, s, i, last)).join('')}
    </div>
    <div class="ex-foot">
      <button data-act="set-remove" data-ex="${e.key}">− Подход</button>
      <button data-act="set-add" data-ex="${e.key}">+ Подход</button>
    </div>
  </section>`;
}

function setRow(e, s, i, last) {
  const p = last?.sets[i];
  const attrs = `data-input="set" data-ex="${e.key}" data-i="${i}" autocomplete="off" enterkeyhint="done"`;
  return `<div class="set-row${s.done ? ' done' : ''}">
    <span class="set-n">${i + 1}</span>
    <span class="set-prev">${p ? fmtSet(p) : '—'}</span>
    <input class="num" type="text" inputmode="decimal" ${attrs} data-f="w" value="${fmtW(s.w)}" placeholder="${p?.w ? fmtW(p.w) : '—'}" aria-label="Вес, подход ${i + 1}">
    <input class="num" type="text" inputmode="numeric" pattern="[0-9]*" ${attrs} data-f="r" value="${s.r ?? ''}" placeholder="${p ? p.r : `${e.repMin}–${e.repMax}`}" aria-label="Повторы, подход ${i + 1}">
    <button class="check" data-act="set-done" data-ex="${e.key}" data-i="${i}" aria-label="Подход ${i + 1} выполнен">${ICON.check}</button>
  </div>`;
}

function viewHistory() {
  const h = data.history;
  let out = `<div class="page-head"><div class="grow"><h1>История</h1>
    <div class="sub">${h.length} ${plural(h.length, 'тренировка', 'тренировки', 'тренировок')}</div></div></div>`;
  if (!h.length) return out + `<div class="empty">Здесь появятся завершённые тренировки.</div>`;
  let month = '';
  for (const w of [...h].reverse()) {
    const d = new Date(w.startedAt);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (key !== month) {
      if (month) out += '</div>';
      out += `<div class="section-title">${key}</div><div class="card card-tight">`;
      month = key;
    }
    const st = wkStats(w);
    out += `<button class="list-row" data-act="open-history" data-id="${w.id}">
      <div class="grow"><div class="title">${esc(w.name)}</div>
        <div class="meta">${esc(fmtDate(w.startedAt))} · ${fmtDur(w.finishedAt - w.startedAt)} · ${st.sets} ${plural(st.sets, 'подход', 'подхода', 'подходов')}</div></div>
      <div class="end">${st.vol ? `${fmtInt(st.vol)} кг` : ''}</div>${ICON.chev}
    </button>`;
  }
  return out + '</div>';
}

function viewHistoryDetail(id) {
  const w = data.history.find((x) => x.id === id);
  if (!w) { nav.stack.history = []; return viewHistory(); }
  const st = wkStats(w);
  const prNames = new Set(findPRs(w).map((p) => p.name));
  return `${backBtn('История')}
    <div class="page-head"><div class="grow"><h1>${esc(w.name)}</h1>
      <div class="sub">${esc(cap(fmtDate(w.startedAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })))} · ${fmtTime(w.startedAt)}–${fmtTime(w.finishedAt)}</div></div></div>
    <div class="stats">
      <div class="stat"><div class="v">${Math.max(1, Math.round((w.finishedAt - w.startedAt) / 60000))}</div><div class="l">минут</div></div>
      <div class="stat"><div class="v">${st.sets}</div><div class="l">${plural(st.sets, 'подход', 'подхода', 'подходов')}</div></div>
      <div class="stat"><div class="v">${fmtInt(st.vol)}</div><div class="l">кг объём</div></div>
    </div>
    ${w.exercises.map((e) => {
      const s = summarize(e.sets);
      return `<div class="card">
        <div class="title" style="font-weight:700">${esc(e.name)}${prNames.has(e.name) ? '<span class="pr">PR</span>' : ''}</div>
        <div class="hist-sets">${e.sets.map(fmtSet).join(' · ')}</div>
        ${s.e1 ? `<div class="small muted" style="margin-top:4px">1ПМ ≈ ${fmtW(roundTo(s.e1, 0.5))} кг · объём ${fmtInt(s.vol)} кг</div>` : ''}
      </div>`;
    }).join('')}
    <div class="btn-row" style="margin-top:16px">
      <button class="btn" data-act="edit-workout" data-id="${w.id}">Редактировать</button>
      <button class="btn btn-danger" data-act="delete-workout" data-id="${w.id}">Удалить</button>
    </div>`;
}

function exerciseIndex() {
  const map = new Map();
  for (const w of data.history) {
    for (const e of w.exercises) {
      let m = map.get(e.name);
      if (!m) map.set(e.name, (m = { name: e.name, sessions: [] }));
      m.sessions.push({ t: w.startedAt, sets: e.sets, s: summarize(e.sets) });
    }
  }
  return map;
}

function viewProgress() {
  const idx = exerciseIndex();
  let out = `<div class="page-head"><div class="grow"><h1>Прогресс</h1>
    <div class="sub">Рекорды и динамика по упражнениям</div></div></div>`;
  if (!idx.size) return out + `<div class="empty">Заверши первую тренировку — здесь появятся графики и рекорды.</div>`;

  const groups = [];
  const seen = new Set();
  for (const t of data.templates) {
    const items = [];
    for (const te of t.exercises) {
      for (const v of te.variants) {
        if (idx.has(v) && !seen.has(v)) { seen.add(v); items.push(idx.get(v)); }
      }
    }
    if (items.length) groups.push({ title: t.name, items });
  }
  const rest = [...idx.values()].filter((m) => !seen.has(m.name));
  if (rest.length) groups.push({ title: 'Другие', items: rest });

  for (const g of groups) {
    out += `<div class="section-title">${esc(g.title)}</div><div class="card card-tight">`;
    for (const m of g.items) {
      const lastS = m.sessions.at(-1);
      const n = m.sessions.length;
      out += `<button class="list-row" data-act="open-ex" data-name="${esc(m.name)}">
        <div class="grow"><div class="title">${esc(m.name)}</div>
          <div class="meta">${n} ${plural(n, 'тренировка', 'тренировки', 'тренировок')} · ${esc(fmtDay(lastS.t))}</div></div>
        <div class="end">${lastS.s.best ? fmtSet(lastS.s.best) : ''}</div>${ICON.chev}
      </button>`;
    }
    out += '</div>';
  }
  return out;
}

function viewProgressDetail(name) {
  const m = exerciseIndex().get(name);
  if (!m) { nav.stack.progress = []; return viewProgress(); }
  const bw = m.sessions.every((s) => !s.s.maxW);
  const metrics = bw
    ? [['reps', 'Макс. повторы'], ['sum', 'Сумма повторов']]
    : [['e1', '1ПМ'], ['w', 'Макс. вес'], ['vol', 'Объём']];
  const metric = metrics.some((x) => x[0] === ui.metric) ? ui.metric : metrics[0][0];
  const val = (s) => ({ e1: roundTo(s.s.e1, 0.5), w: s.s.maxW, vol: s.s.vol, reps: s.s.maxR, sum: s.s.sumR })[metric];
  const unit = metric === 'reps' || metric === 'sum' ? 'повт' : 'кг';
  pendingChart = { pts: m.sessions.map((s) => ({ t: s.t, v: val(s) })), unit, metric };

  const date = (t) => esc(fmtDay(t));
  let kpis;
  if (bw) {
    const best = m.sessions.reduce((a, b) => (b.s.maxR > a.s.maxR ? b : a));
    kpis = `<div class="stat"><div class="v">${best.s.maxR}</div><div class="l">рекорд повторов · ${date(best.t)}</div></div>
      <div class="stat"><div class="v">${m.sessions.length}</div><div class="l">${plural(m.sessions.length, 'тренировка', 'тренировки', 'тренировок')}</div></div>`;
  } else {
    const bE = m.sessions.reduce((a, b) => (b.s.e1 > a.s.e1 ? b : a));
    const bW = m.sessions.reduce((a, b) => (b.s.maxW > a.s.maxW || (b.s.maxW === a.s.maxW && b.s.maxWReps > a.s.maxWReps) ? b : a));
    kpis = `<div class="stat"><div class="v">${fmtW(roundTo(bE.s.e1, 0.5))}<small> кг</small></div><div class="l">рекорд 1ПМ · ${fmtSet(bE.s.best)} · ${date(bE.t)}</div></div>
      <div class="stat"><div class="v">${fmtW(bW.s.maxW)}<small> кг</small></div><div class="l">макс. вес · ×${bW.s.maxWReps} · ${date(bW.t)}</div></div>`;
  }

  return `${backBtn('Прогресс')}
    <div class="page-head"><div class="grow"><h1>${esc(name)}</h1></div></div>
    <div class="kpis">${kpis}</div>
    <div class="card">
      <div class="seg">${metrics.map(([k, l]) => `<button class="${k === metric ? 'on' : ''}" data-act="metric" data-m="${k}">${l}</button>`).join('')}</div>
      <div class="chart" id="chart"></div>
      ${metric === 'e1' ? '<div class="small muted" style="margin-top:8px">1ПМ — расчётный максимум на один повтор (формула Эпли). Растёт, даже если вес тот же, а повторов больше.</div>' : ''}
    </div>
    <div class="section-title">Все тренировки</div>
    <div class="card card-tight">${[...m.sessions].reverse().map((s) => `
      <div class="list-row"><div class="grow"><div class="meta" style="margin:0">${esc(fmtDay(s.t, true))}</div>
        <div class="hist-sets">${s.sets.map(fmtSet).join(' · ')}</div></div></div>`).join('')}
    </div>`;
}

function viewProgram() {
  const s = data.settings;
  let out = `<div class="page-head"><div class="grow"><h1>Программа</h1>
    <div class="sub">Шаблоны тренировок и настройки</div></div></div>`;
  out += `<div class="card card-tight">${data.templates.map((t) => `
    <button class="list-row" data-act="open-tpl" data-tpl="${t.id}">
      <div class="grow"><div class="title">${esc(t.name)}</div>
        <div class="meta">${t.exercises.length} ${plural(t.exercises.length, 'упражнение', 'упражнения', 'упражнений')}${t.note ? ' · ' + esc(t.note) : ''}</div></div>${ICON.chev}
    </button>`).join('') || '<div class="list-row muted">Пока пусто</div>'}</div>
    <button class="btn" data-act="tpl-new">+ Новая тренировка</button>`;

  out += `<div class="section-title">Отдых по умолчанию, секунды</div>
    <div class="card card-tight">
      <label class="switch-row"><div class="grow"><div>Базовые</div><div class="meta">Жимы, тяги, присед, брусья</div></div>
        <input class="inp c" style="width:84px" inputmode="numeric" pattern="[0-9]*" data-change="setting" data-f="restBase" value="${s.restBase}"></label>
      <label class="switch-row"><div class="grow"><div>Изоляция</div><div class="meta">Махи, сгибания, разгибания</div></div>
        <input class="inp c" style="width:84px" inputmode="numeric" pattern="[0-9]*" data-change="setting" data-f="restIso" value="${s.restIso}"></label>
    </div>`;

  out += `<div class="section-title">Настройки</div>
    <div class="card card-tight">
      ${switchRow('lighter', 'Облегчённый режим', '−1 подход в изоляции')}
      ${switchRow('wakeLock', 'Не гасить экран', 'Пока идёт тренировка')}
    </div>`;

  out += `<div class="section-title">Данные</div>
    <div class="card card-tight">
      <button class="list-row" data-act="export"><div class="grow"><div class="title">Сохранить резервную копию</div>
        <div class="meta">${s.lastExport ? 'Последняя: ' + esc(fmtDate(s.lastExport, { day: 'numeric', month: 'long', year: 'numeric' })) : 'Ещё не сохранялась'}</div></div>${ICON.chev}</button>
      <button class="list-row" data-act="import"><div class="grow"><div class="title">Восстановить из файла</div>
        <div class="meta">Заменит текущие данные</div></div>${ICON.chev}</button>
      <button class="list-row" data-act="reset-program"><div class="grow"><div class="title">Вернуть исходную программу</div>
        <div class="meta">История останется</div></div></button>
      <button class="list-row" data-act="wipe"><div class="grow"><div class="title" style="color:var(--danger)">Удалить все данные</div></div></button>
    </div>
    <p class="small muted" style="text-align:center;margin-top:20px">Версия ${APP_VERSION} · данные хранятся только на этом устройстве</p>`;
  return out;
}

function viewTemplate(id) {
  const t = findTpl(id);
  if (!t) { nav.stack.program = []; return viewProgram(); }
  return `${backBtn('Программа')}
    <div class="page-head"><div class="grow"><h1 id="tpl-title">${esc(t.name)}</h1></div></div>
    <div class="card">
      <label class="field"><span>Название</span><input class="inp" data-change="tpl" data-tpl="${t.id}" data-f="name" value="${esc(t.name)}"></label>
      <label class="field" style="margin:0"><span>Описание</span><input class="inp" data-change="tpl" data-tpl="${t.id}" data-f="note" value="${esc(t.note || '')}"></label>
    </div>
    <div class="section-title">Упражнения</div>
    ${t.exercises.map((e, i) => edExCard(t, e, i)).join('')}
    <button class="btn" data-act="tpl-add-ex" data-tpl="${t.id}">+ Упражнение</button>
    <div style="height:24px"></div>
    <button class="btn btn-danger" data-act="tpl-delete" data-tpl="${t.id}">Удалить тренировку «${esc(t.name)}»</button>`;
}

function edExCard(t, e, i) {
  const a = `data-change="tex" data-tpl="${t.id}" data-ex="${e.id}"`;
  const n = t.exercises.length;
  const defRest = e.base ? data.settings.restBase : data.settings.restIso;
  return `<div class="ed-ex">
    <div class="ed-ex-top">
      <div class="grow">${i + 1}</div>
      ${i > 0 ? `<button class="icon-btn" data-act="tpl-ex-move" data-tpl="${t.id}" data-ex="${e.id}" data-d="-1" aria-label="Выше">${ICON.up}</button>` : ''}
      ${i < n - 1 ? `<button class="icon-btn" data-act="tpl-ex-move" data-tpl="${t.id}" data-ex="${e.id}" data-d="1" aria-label="Ниже">${ICON.down}</button>` : ''}
      <button class="icon-btn" data-act="tpl-ex-del" data-tpl="${t.id}" data-ex="${e.id}" aria-label="Удалить">${ICON.trash}</button>
    </div>
    <label class="field"><span>Название (варианты через « / »)</span><input class="inp" ${a} data-f="variants" value="${esc(e.variants.join(' / '))}"></label>
    <div class="grid-4">
      <label class="field"><span>Подходы</span><input class="inp c" inputmode="numeric" pattern="[0-9]*" ${a} data-f="sets" value="${e.sets}"></label>
      <label class="field"><span>Повт. от</span><input class="inp c" inputmode="numeric" pattern="[0-9]*" ${a} data-f="repMin" value="${e.repMin}"></label>
      <label class="field"><span>до</span><input class="inp c" inputmode="numeric" pattern="[0-9]*" ${a} data-f="repMax" value="${e.repMax}"></label>
      <label class="field"><span>Шаг, кг</span><input class="inp c" inputmode="decimal" ${a} data-f="step" value="${fmtW(e.step)}"></label>
    </div>
    <div class="ed-row">
      <label class="field" style="margin:0"><span>Отдых, с</span><input class="inp c" inputmode="numeric" pattern="[0-9]*" ${a} data-f="rest" value="${e.rest ?? ''}" placeholder="${defRest}"></label>
      <label class="switch-row"><div class="grow">Базовое<div class="meta">Длинный отдых</div></div>
        <span class="switch"><input type="checkbox" ${a} data-f="base" ${e.base ? 'checked' : ''}><span></span></span></label>
    </div>
  </div>`;
}

/* ================= График ================= */

function niceTicks(lo, hi, n = 4) {
  if (lo === hi) { const d = Math.abs(lo) * 0.1 || 1; lo -= d; hi += d; }
  const raw = (hi - lo) / (n - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step;
  const out = [];
  for (let v = a; v <= b + step / 2; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

function drawChart(el, { pts, unit, metric }) {
  const W = 340, H = 200, L = 46, R = 14, T = 36, B = 24;
  const fmtV = (v) => (metric === 'vol' ? fmtInt(v) : fmtW(v));
  const vs = pts.map((p) => p.v);
  const ticks = niceTicks(Math.min(...vs), Math.max(...vs));
  const lo = ticks[0], hi = ticks.at(-1);
  const t0 = pts[0].t, t1 = pts.at(-1).t;
  const x = (t) => (t1 === t0 ? L + (W - L - R) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - R));
  const y = (v) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);

  const grid = ticks.map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>
    <text class="axis-t" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fmtV(v)}</text>`).join('');
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const area = pts.length > 1 ? `${line}L${x(t1).toFixed(1)},${H - B}L${x(t0).toFixed(1)},${H - B}Z` : '';
  const dots = pts.length <= 40 ? pts.map((p) => `<circle class="dot" cx="${x(p.t).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4"/>`).join('') : '';
  const dl = (t) => esc(fmtDay(t));
  const xl = pts.length > 1
    ? `<text class="axis-t" x="${L}" y="${H - 4}" text-anchor="start">${dl(t0)}</text><text class="axis-t" x="${W - R}" y="${H - 4}" text-anchor="end">${dl(t1)}</text>`
    : `<text class="axis-t" x="${x(t0)}" y="${H - 4}" text-anchor="middle">${dl(t0)}</text>`;

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="График прогресса">
    <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff6a3d" stop-opacity=".25"/><stop offset="1" stop-color="#ff6a3d" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path class="area" d="${area}"/><path class="line" d="${line}"/>${dots}
    <line class="xhair" y1="${T - 6}" y2="${H - B}" visibility="hidden"/>
    <circle class="dot-on" r="5.5" visibility="hidden"/>
    ${xl}
  </svg><div class="chart-tip" hidden></div>`;

  const svg = el.querySelector('svg'), tip = el.querySelector('.chart-tip');
  const xh = svg.querySelector('.xhair'), dot = svg.querySelector('.dot-on');
  const show = (clientX) => {
    const r = svg.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * W;
    let bi = 0;
    pts.forEach((p, i) => { if (Math.abs(x(p.t) - sx) < Math.abs(x(pts[bi].t) - sx)) bi = i; });
    const p = pts[bi], px = x(p.t), py = y(p.v);
    xh.setAttribute('x1', px); xh.setAttribute('x2', px); xh.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.setAttribute('visibility', 'visible');
    tip.innerHTML = `<b>${fmtV(p.v)} ${unit}</b> <span class="d">${esc(fmtDay(p.t))}</span>`;
    tip.hidden = false;
    const half = tip.offsetWidth / 2;
    tip.style.left = `${Math.min(Math.max((px / W) * r.width, half), r.width - half)}px`;
  };
  svg.addEventListener('pointerdown', (ev) => show(ev.clientX));
  svg.addEventListener('pointermove', (ev) => show(ev.clientX));
}

/* ================= Рендер и навигация ================= */

function render(scroll = 'keep') {
  const y = window.scrollY;
  const top = nav.stack[nav.tab].at(-1);
  let html;
  if (nav.tab === 'train') html = active ? viewWorkout() : viewHome();
  else if (nav.tab === 'history') html = top?.page === 'detail' ? viewHistoryDetail(top.arg) : viewHistory();
  else if (nav.tab === 'progress') html = top?.page === 'detail' ? viewProgressDetail(top.arg) : viewProgress();
  else html = top?.page === 'template' ? viewTemplate(top.arg) : viewProgram();

  $('#view').innerHTML = html;
  document.querySelectorAll('#tabbar [data-tab]').forEach((b) => {
    b.classList.toggle('on', b.dataset.tab === nav.tab);
    if (b.dataset.tab === 'train') b.classList.toggle('live', !!active);
  });
  if (pendingChart) {
    const el = $('#chart');
    if (el) drawChart(el, pendingChart);
    pendingChart = null;
  }
  window.scrollTo(0, scroll === 'keep' ? y : scroll === 'top' ? 0 : scroll);
  updateWakeLock();
  tick();
}

function go(page, arg) {
  nav.stack[nav.tab].push({ page, arg, y: window.scrollY });
  render('top');
}
function back() {
  const e = nav.stack[nav.tab].pop();
  render(e ? e.y : 'top');
}

/* ================= Действия ================= */

function exportData() {
  const name = `ppl-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const json = JSON.stringify({ app: 'ppl', version: 1, exportedAt: new Date().toISOString(), data });
  const file = new File([json], name, { type: 'application/json' });
  const done = () => { data.settings.lastExport = Date.now(); saveData(); render(); };
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: name }).then(done).catch((e) => { if (e.name !== 'AbortError') toast('Не получилось: ' + e.message); });
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  done();
}

function importData() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.style.display = 'none';
  document.body.appendChild(inp);
  inp.addEventListener('change', async () => {
    const f = inp.files[0];
    inp.remove();
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      const d = obj.data ?? obj;
      if (!Array.isArray(d.templates) || !Array.isArray(d.history)) throw new Error('format');
      const n = d.history.length;
      confirmSheet({
        title: 'Восстановить из копии?',
        text: `В файле ${n} ${plural(n, 'тренировка', 'тренировки', 'тренировок')}. Текущие данные на телефоне будут заменены.`,
        ok: 'Восстановить', okClass: 'btn-danger',
        onOk: () => { data = normalize(d); saveData(); render('top'); toast('Данные восстановлены'); },
      });
    } catch (e) {
      toast('Не получилось прочитать файл — это точно резервная копия?');
    }
  });
  inp.click();
}

const ACT = {
  start: (el) => startWorkout(el.dataset.tpl),
  'nav-back': () => back(),
  'open-history': (el) => go('detail', el.dataset.id),
  'open-ex': (el) => { ui.metric = null; go('detail', el.dataset.name); },
  'open-tpl': (el) => go('template', el.dataset.tpl),
  metric: (el) => { ui.metric = el.dataset.m; render(); },

  'set-done': (el) => {
    const e = findEx(el.dataset.ex), i = +el.dataset.i, row = e?.sets[i];
    if (!row) return;
    if (row.done) { row.done = false; saveActive(); render(); return; }
    // Пустые поля = повторил прошлый раз: берём серые значения этого подхода
    const p = lastPerf(e.name, active)?.sets[i];
    if (row.r == null) {
      if (!p?.r) {
        const inp = $(`input[data-ex="${e.key}"][data-i="${i}"][data-f="r"]`);
        inp.focus();
        inp.classList.remove('shake');
        void inp.offsetWidth;
        inp.classList.add('shake');
        return;
      }
      row.r = p.r;
    }
    if (row.w == null && p?.w) row.w = p.w;
    row.done = true;
    if (!active.editOf) startRest(e.rest);
    saveActive();
    render();
  },
  'set-add': (el) => {
    const e = findEx(el.dataset.ex);
    e.sets.push({ w: e.sets.at(-1)?.w ?? null, r: null, done: false });
    saveActive();
    render();
  },
  'set-remove': (el) => {
    const e = findEx(el.dataset.ex);
    if (e.sets.length <= 1) return toast('Чтобы убрать упражнение целиком — нажми ⋯');
    const pop = () => { e.sets.pop(); saveActive(); render(); };
    if (e.sets.at(-1).done) confirmSheet({ title: 'Удалить выполненный подход?', ok: 'Удалить', okClass: 'btn-danger', onOk: pop });
    else pop();
  },
  variant: (el) => {
    const e = findEx(el.dataset.ex), v = e?.variants[+el.dataset.v];
    if (!v || v === e.name) return;
    e.name = v;
    saveActive();
    render();
  },
  'ex-menu': (el) => {
    const e = findEx(el.dataset.ex);
    const list = active.exercises, i = list.indexOf(e);
    openSheet(`<h2>${esc(e.name)}</h2><p>${e.target} × ${e.repMin}–${e.repMax} · отдых ${fmtRest(e.rest)}</p>
      ${i > 0 ? '<button class="btn" data-s="up">Поднять выше</button>' : ''}
      ${i < list.length - 1 ? '<button class="btn" data-s="down">Опустить ниже</button>' : ''}
      <button class="btn btn-danger" data-s="del">Убрать из тренировки</button>
      <button class="btn" data-s="cancel">Отмена</button>`, (s, close) => {
      close();
      if (s === 'up' || s === 'down') {
        const j = s === 'up' ? i - 1 : i + 1;
        [list[i], list[j]] = [list[j], list[i]];
      } else if (s === 'del') {
        list.splice(i, 1);
      }
      saveActive();
      render();
    });
  },
  'add-ex': () => {
    const inWk = new Set(active.exercises.map((e) => e.teId));
    const seen = new Set();
    const opts = [];
    for (const t of data.templates) {
      for (const te of t.exercises) {
        const k = te.variants.join(' / ');
        if (inWk.has(te.id) || seen.has(k)) continue;
        seen.add(k);
        opts.push({ te, t });
      }
    }
    const add = (te) => {
      const e = newExercise(te, active.lighter);
      active.exercises.push(e);
      saveActive();
      render();
      window.scrollTo(0, document.body.scrollHeight);
    };
    openSheet(`<h2>Добавить упражнение</h2>
      <div style="display:flex;gap:8px;margin:12px 0">
        <input class="inp" id="custom-ex" placeholder="Своё упражнение" autocomplete="off">
        <button class="btn btn-primary btn-sm" style="height:42px;flex:none" data-s="custom">Добавить</button>
      </div>
      ${opts.length ? `<div class="card card-tight">${opts.map((o, i) => `
        <button class="list-row" data-s="te:${i}"><div class="grow"><div class="title">${esc(o.te.variants.join(' / '))}</div>
          <div class="meta">${esc(o.t.name)} · ${o.te.sets} × ${o.te.repMin}–${o.te.repMax}</div></div></button>`).join('')}</div>` : ''}
      <button class="btn" data-s="cancel">Отмена</button>`, (s, close) => {
      if (s === 'custom') {
        const name = $('#custom-ex').value.trim();
        if (!name) return $('#custom-ex').focus();
        close();
        const lc = name.toLowerCase();
        let te = null;
        for (const t of data.templates) for (const x of t.exercises) if (x.variants.some((v) => v.toLowerCase() === lc)) te = x;
        add(te ? { ...te, variants: [te.variants.find((v) => v.toLowerCase() === lc)] }
          : { id: 'x-' + uid(), variants: [name], sets: 3, repMin: 8, repMax: 12, base: false, step: 2.5, rest: null });
      } else if (s.startsWith('te:')) {
        close();
        add(opts[+s.slice(3)].te);
      }
    });
  },
  finish: () => {
    let total = 0, done = 0;
    for (const e of active.exercises) for (const s of e.sets) { total++; if (s.done) done++; }
    if (active.editOf) return saveWorkout();
    if (!done) {
      return confirmSheet({ title: 'Нет выполненных подходов', text: 'Отметь подходы галочкой или отмени тренировку.',
        ok: 'Отменить тренировку', okClass: 'btn-danger', cancel: 'Назад', onOk: discardWorkout });
    }
    if (done < total) {
      const left = total - done;
      return confirmSheet({ title: 'Завершить тренировку?',
        text: `${left} ${plural(left, 'подход не отмечен', 'подхода не отмечены', 'подходов не отмечены')} — они не сохранятся.`,
        ok: 'Завершить', cancel: 'Продолжить тренировку', onOk: saveWorkout });
    }
    saveWorkout();
  },
  'cancel-workout': () => {
    const edit = !!active.editOf;
    confirmSheet({
      title: edit ? 'Отменить изменения?' : 'Отменить тренировку?',
      text: edit ? 'Сохранённая версия останется как была.' : 'Все записанные подходы этой тренировки пропадут.',
      ok: edit ? 'Отменить изменения' : 'Удалить тренировку', okClass: 'btn-danger', cancel: 'Назад', onOk: discardWorkout,
    });
  },
  'timer-add': (el) => {
    const r = active?.rest;
    if (!r) return;
    const now = Date.now(), ms = +el.dataset.sec * 1000;
    if (r.endsAt <= now) {
      if (ms < 0) return;
      Object.assign(r, { endsAt: now + ms, total: ms });
    } else {
      r.endsAt = Math.max(now + 1000, r.endsAt + ms);
      r.total = Math.max(r.total + ms, r.endsAt - now);
    }
    saveActive();
    tick();
  },
  'timer-stop': () => {
    if (active) { active.rest = null; saveActive(); }
    tick();
  },

  'edit-workout': (el) => {
    if (active) return toast('Сначала заверши или отмени текущую тренировку');
    const w = data.history.find((x) => x.id === el.dataset.id);
    if (!w) return;
    active = {
      id: uid(), editOf: w.id, templateId: w.templateId, name: w.name, lighter: w.lighter,
      startedAt: w.startedAt, finishedAt: w.finishedAt, rest: null,
      exercises: w.exercises.map((e) => {
        const te = findTe(e.teId);
        return {
          key: uid(), teId: e.teId, name: e.name,
          variants: te?.variants.includes(e.name) ? [...te.variants] : [e.name],
          target: e.target || e.sets.length, repMin: e.repMin, repMax: e.repMax, base: e.base,
          step: te?.step || 2.5, rest: restFor(te || e),
          sets: e.sets.map((s) => ({ w: s.w, r: s.r, done: true })),
        };
      }),
    };
    saveActive();
    nav.tab = 'train';
    render('top');
  },
  'delete-workout': (el) => {
    confirmSheet({
      title: 'Удалить тренировку?', text: 'Её нельзя будет восстановить (кроме как из резервной копии).',
      ok: 'Удалить', okClass: 'btn-danger',
      onOk: () => { data.history = data.history.filter((x) => x.id !== el.dataset.id); saveData(); back(); },
    });
  },

  'tpl-new': () => {
    const t = { id: uid(), name: 'Новая тренировка', note: '', exercises: [] };
    data.templates.push(t);
    saveData();
    go('template', t.id);
  },
  'tpl-add-ex': (el) => {
    findTpl(el.dataset.tpl).exercises.push(tex(['Новое упражнение'], 3, 8, 12, false, 2.5));
    saveData();
    render();
  },
  'tpl-ex-move': (el) => {
    const list = findTpl(el.dataset.tpl).exercises;
    const i = list.findIndex((e) => e.id === el.dataset.ex), j = i + +el.dataset.d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    saveData();
    render();
  },
  'tpl-ex-del': (el) => {
    const t = findTpl(el.dataset.tpl);
    const e = t.exercises.find((x) => x.id === el.dataset.ex);
    confirmSheet({
      title: `Убрать «${e.variants.join(' / ')}»?`, text: 'История по этому упражнению сохранится.',
      ok: 'Убрать', okClass: 'btn-danger',
      onOk: () => { t.exercises = t.exercises.filter((x) => x !== e); saveData(); render(); },
    });
  },
  'tpl-delete': (el) => {
    const t = findTpl(el.dataset.tpl);
    confirmSheet({
      title: `Удалить «${t.name}»?`, text: 'Шаблон пропадёт из программы. История тренировок сохранится.',
      ok: 'Удалить', okClass: 'btn-danger',
      onOk: () => { data.templates = data.templates.filter((x) => x !== t); saveData(); back(); },
    });
  },

  export: () => exportData(),
  import: () => importData(),
  'reset-program': () => confirmSheet({
    title: 'Вернуть исходную программу?', text: 'Твои изменения в шаблонах пропадут. История тренировок останется.',
    ok: 'Вернуть', okClass: 'btn-danger',
    onOk: () => { data.templates = defaultTemplates(); data.lastVariant = {}; saveData(); render(); toast('Программа восстановлена'); },
  }),
  wipe: () => confirmSheet({
    title: 'Удалить все данные?', text: 'Пропадут история, рекорды и программа. Если нужна копия — сначала сохрани её.',
    ok: 'Удалить всё', okClass: 'btn-danger',
    onOk: () => { data = defaultData(); active = null; saveData(); saveActive(); render('top'); toast('Все данные удалены'); },
  }),
};

/* ================= События ================= */

document.addEventListener('click', (ev) => {
  const tab = ev.target.closest('[data-tab]');
  if (tab) {
    const t = tab.dataset.tab;
    if (nav.tab === t) nav.stack[t] = [];
    nav.tab = t;
    render('top');
    return;
  }
  const el = ev.target.closest('[data-act]');
  if (!el || el.closest('#sheet-root')) return;
  ACT[el.dataset.act]?.(el, ev);
});

// Ввод веса/повторов в тренировке — сохраняем на каждое нажатие
document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.dataset.input !== 'set' || !active) return;
  const e = findEx(el.dataset.ex), i = +el.dataset.i, row = e?.sets[i];
  if (!row) return;
  if (el.dataset.f === 'w') {
    row.w = parseNum(el.value);
  } else {
    const n = parseInt(el.value, 10);
    row.r = Number.isFinite(n) ? n : null;
  }
  saveActive();
});

// Настройки и редактор программы — сохраняем при выходе из поля
document.addEventListener('change', (ev) => {
  const el = ev.target, kind = el.dataset.change;
  if (!kind) return;

  if (kind === 'setting') {
    const f = el.dataset.f;
    if (el.type === 'checkbox') {
      data.settings[f] = el.checked;
    } else {
      const n = parseInt(el.value, 10);
      if (Number.isFinite(n) && n >= 10 && n <= 900) data.settings[f] = n;
      el.value = data.settings[f];
    }
    saveData();
    if (f === 'wakeLock') updateWakeLock();
    return;
  }

  if (kind === 'tpl') {
    const t = findTpl(el.dataset.tpl), v = el.value.trim();
    if (el.dataset.f === 'name') {
      if (v) { t.name = v; const h = $('#tpl-title'); if (h) h.textContent = v; } else el.value = t.name;
    } else {
      t.note = v;
    }
    saveData();
    return;
  }

  if (kind === 'tex') {
    const t = findTpl(el.dataset.tpl), e = t?.exercises.find((x) => x.id === el.dataset.ex);
    if (!e) return;
    const f = el.dataset.f, card = el.closest('.ed-ex');
    if (f === 'variants') {
      const vs = el.value.split('/').map((s) => s.trim()).filter(Boolean);
      if (vs.length) e.variants = vs;
      el.value = e.variants.join(' / ');
    } else if (f === 'base') {
      e.base = el.checked;
      card.querySelector('[data-f="rest"]').placeholder = e.base ? data.settings.restBase : data.settings.restIso;
    } else if (f === 'rest') {
      const n = parseInt(el.value, 10);
      e.rest = Number.isFinite(n) && n > 0 ? n : null;
      el.value = e.rest ?? '';
    } else if (f === 'step') {
      const n = parseNum(el.value);
      if (n > 0) e.step = n;
      el.value = fmtW(e.step);
    } else {
      const n = parseInt(el.value, 10);
      if (Number.isFinite(n) && n > 0 && n < 100) e[f] = n;
      if (e.repMin > e.repMax) [e.repMin, e.repMax] = [e.repMax, e.repMin];
      card.querySelector('[data-f="sets"]').value = e.sets;
      card.querySelector('[data-f="repMin"]').value = e.repMin;
      card.querySelector('[data-f="repMax"]').value = e.repMax;
    }
    saveData();
  }
});

const isTextField = (el) => el?.matches?.('input:not([type=checkbox]):not([type=file]), textarea');
document.addEventListener('focusin', (ev) => {
  if (!isTextField(ev.target)) return;
  document.body.classList.add('kb');
  if (ev.target.classList.contains('num')) {
    setTimeout(() => { try { ev.target.setSelectionRange(0, ev.target.value.length); } catch (e) { /* ignore */ } }, 0);
  }
});
document.addEventListener('focusout', () => {
  setTimeout(() => { if (!isTextField(document.activeElement)) document.body.classList.remove('kb'); }, 60);
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.matches?.('input')) ev.target.blur();
});
document.addEventListener('visibilitychange', () => {
  updateWakeLock();
  if (document.visibilityState === 'visible') tick();
});

/* ================= Старт ================= */

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const offer = () => toast('Доступна новая версия приложения', 'Обновить', () => reg.waiting?.postMessage('skipWaiting'), 0);
    if (reg.waiting && hadController) offer();
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(); });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
}

if (!localStorage.getItem(KEY_DATA)) saveData();
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
render('top');
setInterval(tick, 250);
registerSW();
