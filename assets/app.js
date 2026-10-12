(() => {
  'use strict';

  /* ---------- constants ---------- */
  const MUSCLES = [
    ['chest', '胸肌'], ['front_delts', '三角肌前束'], ['side_delts', '三角肌中束'], ['rear_delts', '三角肌后束'],
    ['triceps', '肱三头肌'], ['biceps', '肱二头肌'], ['forearms', '前臂'], ['traps', '斜方肌'],
    ['lats', '背阔肌'], ['upper_back', '中上背'], ['lower_back', '下背'], ['abs', '腹直肌'], ['obliques', '腹斜肌'],
    ['glutes', '臀肌'], ['quads', '股四头肌'], ['hamstrings', '腘绳肌'], ['adductors', '内收肌'], ['calves', '小腿'],
  ];
  const MUSCLE_IDS = MUSCLES.map(([m]) => m);
  const NAME = Object.fromEntries(MUSCLES);
  const COL = {
    mint: '#3BB08F', mintD: '#1F7F63', mintL: '#D3EEE3', sky: '#5B9BD5', butter: '#E7B53F', apricot: '#EE8E6A',
    lav: '#8E73DE', coral: '#E06B6B', idle: '#E4EBE7', empty: '#EEF3F0', ink: '#1E2B28', ink3: '#8FA09A', burn: '#C5D3CC',
  };
  const MEAL_COLOR = { 早餐: '#A6DCC7', 午餐: '#5BBF9E', 晚餐: '#2E8F72', 加餐: '#CDE5F2' };
  const mealColor = (m) => MEAL_COLOR[m] || '#CDE5F2';
  const MACROS = [
    { k: 'protein_g', name: '蛋白质', c: COL.sky, f: 4 },
    { k: 'carb_g', name: '碳水', c: COL.butter, f: 4 },
    { k: 'fat_g', name: '脂肪', c: COL.apricot, f: 9 },
  ];
  const HEAT = d3.scaleLinear([0.5, 3, 6], ['#BFE6D7', '#5BBF9E', '#1F7F63']).interpolate(d3.interpolateRgb).clamp(true);
  const WEEK_HEAT = d3.scaleLinear([0.5, 8, 18], ['#C9EADD', '#5BBF9E', '#1F7F63']).interpolate(d3.interpolateRgb).clamp(true);
  const KCAL_HEAT = d3.scaleLinear([0, 1500, 3200], ['#E3F3EC', '#7CCBAE', '#1F7F63']).interpolate(d3.interpolateRgb).clamp(true);
  const SORE = ['#D9CFF7', '#AB95EA', '#7E64D8'];
  const CAL_BINS = [[0.6, '#CFE3F5', '少很多'], [0.85, '#8FBFE6', '偏少'], [1.1, '#5BBF9E', '接近目标'], [1.3, '#F2B48F', '偏多'], [Infinity, COL.coral, '多很多']];
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- helpers ---------- */
  const $ = (s) => document.querySelector(s);
  const fmt = d3.format(',');
  const g1 = (v) => d3.format(',.1~f')(v);
  const signed = d3.format('+.1f');
  const pad = (n) => String(n).padStart(2, '0');
  const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const toDate = (s) => new Date(s + 'T00:00:00Z');
  const iso = d3.utcFormat('%Y-%m-%d');
  const addDays = (s, n) => iso(d3.utcDay.offset(toDate(s), n));
  const WD = '日一二三四五六';
  const cnDate = (s) => { const d = toDate(s); return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日 周${WD[d.getUTCDay()]}`; };
  const shortDate = (s) => { const d = toDate(s); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
  const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toDate(s).getTime());
  const has = (v) => v !== null && v !== undefined && v !== '';
  const num = (v) => (has(v) ? Number(v) : null);
  const list = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
  const toMin = (t) => { const [a, b] = String(t || '').split(':').map(Number); return (a || 0) * 60 + (b || 0); };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  };
  const withSmall = (cls, big, small) => { const e = el('span', cls, big); if (small) e.append(el('small', null, small)); return e; };

  const tipEl = $('#tip');
  const showTip = (event, lines) => {
    tipEl.replaceChildren(...lines.map((l) => {
      const d = el('div', l.head ? 'h' : 'row');
      if (l.color) { const i = el('i'); i.style.background = l.color; d.append(i); }
      d.append(document.createTextNode(l.text));
      return d;
    }));
    tipEl.hidden = false;
    const w = tipEl.offsetWidth;
    const h = tipEl.offsetHeight;
    let x = event.clientX + 14;
    let y = event.clientY - h - 12;
    if (x + w > window.innerWidth - 8) x = event.clientX - w - 14;
    if (x < 8) x = 8;
    if (y < 8) y = event.clientY + 16;
    tipEl.style.left = `${x}px`;
    tipEl.style.top = `${y}px`;
  };
  const hideTip = () => { tipEl.hidden = true; };

  const measure = (box, strings) => {
    const s = d3.select(box).append('svg').attr('width', 1).attr('height', 1).style('position', 'absolute').style('visibility', 'hidden');
    let m = 0;
    for (const t of strings) m = Math.max(m, s.append('text').text(t).node().getComputedTextLength());
    s.remove();
    return Math.ceil(m);
  };
  const chartSvg = (box, w, h, label) => d3.select(box).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('width', '100%').attr('role', 'img').attr('aria-label', label);

  /* ---------- derived data ---------- */
  const dailyTotals = (D) => {
    const days = new Map();
    const at = (date) => {
      if (!days.has(date)) days.set(date, { date, kcal_in: 0, kcal_served: 0, protein_g: 0, carb_g: 0, fat_g: 0, mealIds: new Set(), kcal_out: 0, train_min: 0, sets: 0, n_exercises: 0, weight_kg: null, sleep_h: null, energy: null, mood: null, steps: null });
      return days.get(date);
    };
    for (const r of D.meals) {
      const d = at(r.date);
      d.kcal_in += num(r.kcal) || 0;
      d.kcal_served += num(r.kcal_served) ?? num(r.kcal) ?? 0;
      d.protein_g += num(r.protein_g) || 0;
      d.carb_g += num(r.carb_g) || 0;
      d.fat_g += num(r.fat_g) || 0;
      d.mealIds.add(r.meal_id);
    }
    for (const r of D.workouts) {
      const d = at(r.date);
      d.kcal_out += num(r.kcal_burn) || 0;
      d.train_min += num(r.duration_min) || 0;
      d.sets += num(r.sets) || 0;
      d.n_exercises += 1;
    }
    for (const r of D.body) {
      const d = at(r.date);
      for (const k of ['weight_kg', 'sleep_h', 'energy', 'mood', 'steps']) if (has(r[k])) d[k] = Number(r[k]);
    }
    const r1 = (v) => Math.round(v * 10) / 10;
    let lastW = null;
    return [...days.values()].sort((a, b) => (a.date < b.date ? -1 : 1)).map((d) => {
      const row = {
        ...d,
        n_meals: d.mealIds.size,
        kcal_in: Math.round(d.kcal_in),
        kcal_served: Math.round(d.kcal_served),
        protein_g: r1(d.protein_g),
        carb_g: r1(d.carb_g),
        fat_g: r1(d.fat_g),
        protein_kcal: Math.round(d.protein_g * 4),
        carb_kcal: Math.round(d.carb_g * 4),
        fat_kcal: Math.round(d.fat_g * 9),
        kcal_out: Math.round(d.kcal_out),
        net_kcal: Math.round(d.kcal_in - d.kcal_out),
        weight_change: d.weight_kg !== null && lastW !== null ? r1(d.weight_kg - lastW) : null,
      };
      delete row.mealIds;
      if (d.weight_kg !== null) lastW = d.weight_kg;
      return row;
    });
  };

  const mealTotals = (meals) => {
    const by = new Map();
    for (const r of meals) {
      if (!by.has(r.meal_id)) by.set(r.meal_id, { meal_id: r.meal_id, date: r.date, meal: r.meal, time: r.time || '', kcal: 0, kcal_served: 0, protein_g: 0, carb_g: 0, fat_g: 0, items: [] });
      const m = by.get(r.meal_id);
      m.kcal += num(r.kcal) || 0;
      m.kcal_served += num(r.kcal_served) ?? num(r.kcal) ?? 0;
      m.protein_g += num(r.protein_g) || 0;
      m.carb_g += num(r.carb_g) || 0;
      m.fat_g += num(r.fat_g) || 0;
      m.items.push(r);
      if (r.time && (!m.time || r.time < m.time)) m.time = r.time;
    }
    return [...by.values()]
      .map((m) => ({ ...m, kcal: Math.round(m.kcal), kcal_served: Math.round(m.kcal_served), leftover: Math.round(m.kcal_served - m.kcal) }))
      .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  };

  const muscleLoad = (workouts, body) => {
    const DAY = 864e5;
    const perDay = new Map();
    const add = (date, m, v) => { if (MUSCLE_IDS.includes(m)) perDay.set(`${date}|${m}`, (perDay.get(`${date}|${m}`) || 0) + v); };
    for (const r of workouts) {
      const sets = has(r.sets) ? Number(r.sets) || 0 : Math.round((Number(r.duration_min) || 0) / 10);
      list(r.primary).forEach((m) => add(r.date, m, sets));
      list(r.secondary).forEach((m) => add(r.date, m, sets / 2));
    }
    const sore = new Map();
    for (const r of body) {
      for (const part of list(r.soreness)) {
        const [m, v] = part.split(':').map((x) => x.trim());
        if (m && v) sore.set(`${r.date}|${m}`, Number(v) || 0);
      }
    }
    const dates = [...workouts, ...body].map((r) => r.date).sort();
    if (!dates.length) return [];
    const t0 = toDate(dates[0]).getTime();
    const t1 = toDate(dates[dates.length - 1]).getTime();
    const recent = {};
    const last = {};
    const rows = [];
    for (let t = t0; t <= t1; t += DAY) {
      const date = iso(new Date(t));
      for (const m of MUSCLE_IDS) {
        const s = perDay.get(`${date}|${m}`) || 0;
        (recent[m] = recent[m] || []).push(s);
        if (recent[m].length > 7) recent[m].shift();
        if (s > 0) last[m] = t;
        rows.push({
          date, muscle: m,
          sets_day: Math.round(s * 10) / 10,
          sets_7d: Math.round(d3.sum(recent[m]) * 10) / 10,
          days_since: last[m] === undefined ? null : Math.round((t - last[m]) / DAY),
          soreness: sore.get(`${date}|${m}`) || 0,
        });
      }
    }
    return rows;
  };

  const muscleValues = (D, day) => {
    const out = new Map();
    const trained = d3.group(D.muscleRows.filter((r) => r.sets_day > 0), (r) => r.muscle);
    for (const m of MUSCLE_IDS) {
      const row = D.muscleBy.get(`${day}|${m}`);
      if (row) { out.set(m, row); continue; }
      let s7 = 0;
      for (let i = 0; i < 7; i++) { const r = D.muscleBy.get(`${addDays(day, -i)}|${m}`); if (r) s7 += r.sets_day; }
      const before = (trained.get(m) || []).map((r) => r.date).filter((d) => d <= day).sort();
      const lastD = before.length ? before[before.length - 1] : null;
      out.set(m, { date: day, muscle: m, sets_day: 0, sets_7d: Math.round(s7 * 10) / 10, days_since: lastD ? d3.utcDay.count(toDate(lastD), toDate(day)) : null, soreness: 0 });
    }
    return out;
  };

  /* ---------- loading ---------- */
  const FILES = ['meals', 'workouts', 'body', 'notes', 'profile', 'meta'];
  const cache = {};
  const load = async (set) => {
    if (cache[set]) return cache[set];
    const base = set === 'demo' ? 'data/demo' : 'data';
    const entries = await Promise.all(FILES.map(async (n) => {
      const res = await fetch(`${base}/${n}.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${base}/${n}.json 读取失败（HTTP ${res.status}）`);
      return [n, await res.json()];
    }));
    const raw = Object.fromEntries(entries);
    const rows = (x) => (Array.isArray(x) ? x.filter((r) => r && isDay(r.date)) : []);
    const D = { meals: rows(raw.meals), workouts: rows(raw.workouts), body: rows(raw.body), notes: rows(raw.notes), profile: raw.profile || {}, meta: raw.meta || {} };
    D.targets = (D.profile && D.profile.targets) || {};
    D.daily = dailyTotals(D);
    D.dailyBy = new Map(D.daily.map((r) => [r.date, r]));
    D.mealTotals = mealTotals(D.meals);
    D.muscleRows = muscleLoad(D.workouts, D.body);
    D.muscleBy = new Map(D.muscleRows.map((r) => [`${r.date}|${r.muscle}`, r]));
    D.hasAny = D.meals.length + D.workouts.length + D.body.length > 0;
    cache[set] = D;
    return D;
  };

  /* ---------- state ---------- */
  const VIEWS = {
    day: { field: 'sets_day', note: '这一天每个肌群练了几组。主要发力的肌群算 1 组，辅助的算半组，有氧每 10 分钟算 1 组。', fmt: (v) => `${g1(v)} 组` },
    week: { field: 'sets_7d', note: '截至这一天，7 天里每个肌群累计练了几组。', fmt: (v) => `${g1(v)} 组` },
    recovery: { field: 'days_since', note: '离上次练到这个肌群过了几天，用来挑下一次练什么。', fmt: (v) => (v === 0 ? '当天' : `${v} 天前`) },
    sore: { field: 'soreness', note: '你说的酸痛程度：1 轻微，2 明显，3 很酸。', fmt: (v) => `${v} / 3` },
  };
  const q = new URLSearchParams(location.search);
  const state = {
    demo: q.get('demo') === '1',
    day: isDay(q.get('d')) ? q.get('d') : null,
    view: VIEWS[q.get('view')] ? q.get('view') : 'day',
    range: [14, 28, 90].includes(Number(q.get('range'))) ? Number(q.get('range')) : 28,
    sel: null,
  };
  let current = null;
  const syncUrl = () => {
    const p = new URLSearchParams();
    if (state.demo) p.set('demo', '1');
    if (state.day) p.set('d', state.day);
    if (state.view !== 'day') p.set('view', state.view);
    if (state.range !== 28) p.set('range', String(state.range));
    const s = p.toString();
    history.replaceState(null, '', s ? `?${s}` : location.pathname);
  };
  const setDay = (d) => { if (!isDay(d)) return; state.day = d; syncUrl(); render({ animate: true }); };
  const toggleDemo = () => { state.demo = !state.demo; state.day = null; state.sel = null; syncUrl(); render({ animate: true }); };

  /* ---------- controls ---------- */
  const dateInput = $('#date-input');
  $('#prev-week').addEventListener('click', () => current && setDay(addDays(current.day, -7)));
  $('#next-week').addEventListener('click', () => current && setDay(addDays(current.day, 7)));
  $('#go-today').addEventListener('click', () => { state.day = null; syncUrl(); render({ animate: true }); });
  dateInput.addEventListener('change', () => { if (dateInput.value && dateInput.validity.valid) setDay(dateInput.value); });
  $('#demo-toggle').addEventListener('click', toggleDemo);
  document.querySelectorAll('#view-seg button').forEach((b) => b.addEventListener('click', () => { state.view = b.dataset.v; syncUrl(); render(); }));
  document.querySelectorAll('#range-seg button').forEach((b) => b.addEventListener('click', () => { state.range = Number(b.dataset.v); syncUrl(); render(); }));

  /* ---------- body figure (built once) ---------- */
  const buildFigure = () => {
    const S = window.BODY_SHAPES;
    const svg = d3.select('#figure').append('svg').attr('viewBox', '0 0 420 410').attr('role', 'img').attr('aria-label', '正面和背面的肌群图');
    [['front', 0, '正面'], ['back', 220, '背面']].forEach(([side, ox, label]) => {
      const g = svg.append('g').attr('transform', `translate(${ox},12)`);
      const base = g.append('g').attr('class', 'base');
      for (const p of S.base) {
        const draw = (host) => (p.kind === 'ellipse'
          ? host.append('ellipse').attr('cx', p.cx).attr('cy', p.cy).attr('rx', p.rx).attr('ry', p.ry)
          : host.append('path').attr('d', p.d));
        draw(base);
        if (p.mirror) draw(base.append('g').attr('transform', 'matrix(-1 0 0 1 200 0)'));
      }
      const mus = g.append('g');
      for (const p of S[side]) {
        mus.append('path').attr('d', p.d).attr('class', 'mus').attr('data-m', p.m);
        mus.append('g').attr('transform', 'matrix(-1 0 0 1 200 0)').append('path').attr('d', p.d).attr('class', 'mus').attr('data-m', p.m);
      }
      if (side === 'front') g.append('path').attr('d', S.absLines).attr('class', 'abs-lines');
      svg.append('text').attr('class', 'fig-label').attr('x', ox + 100).attr('y', 404).text(label);
    });
    svg.selectAll('.mus').style('fill', COL.idle)
      .on('mousemove', (event) => {
        const m = event.currentTarget.dataset.m;
        const v = current && current.vals.get(m);
        const lines = [{ text: NAME[m], head: true }];
        if (v) {
          lines.push({ text: `这一天 ${g1(v.sets_day)} 组，近 7 天 ${g1(v.sets_7d)} 组` });
          lines.push({ text: v.days_since === null ? '还没有练过' : v.days_since === 0 ? '这一天练过' : `${v.days_since} 天前练过` });
          if (v.soreness) lines.push({ text: `酸痛 ${v.soreness} / 3` });
        }
        showTip(event, lines);
      })
      .on('mouseleave', hideTip)
      .on('click', (event) => { state.sel = event.currentTarget.dataset.m; render(); });
  };

  /* ---------- sections ---------- */
  const renderHeader = (ctx) => {
    const wk = $('#week');
    wk.replaceChildren();
    const start = d3.utcMonday.floor(toDate(ctx.day));
    const today = localToday();
    for (let i = 0; i < 7; i++) {
      const s = iso(d3.utcDay.offset(start, i));
      const r = ctx.D.dailyBy.get(s);
      const b = el('button', 'day-btn');
      b.type = 'button';
      if (s === today) b.classList.add('is-today');
      if (!ctx.demo && s > today) b.classList.add('is-future');
      b.setAttribute('aria-pressed', String(s === ctx.day));
      b.setAttribute('aria-label', cnDate(s) + (s === today ? '（今天）' : ''));
      const dots = el('span', 'dots');
      dots.append(el('i', r && r.n_meals ? 'eat' : null), el('i', r && r.n_exercises ? 'move' : null));
      b.append(el('span', 'wd', s === today ? '今天' : '周' + '一二三四五六日'[i]), el('span', 'dn', String(toDate(s).getUTCDate())), dots);
      b.addEventListener('click', () => setDay(s));
      wk.append(b);
    }
    if (document.activeElement !== dateInput) dateInput.value = ctx.day;
    const goToday = $('#go-today');
    goToday.textContent = ctx.demo ? '回到最新一天' : '回到今天';
    goToday.hidden = !state.day;
    document.querySelectorAll('#view-seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === ctx.view)));
    document.querySelectorAll('#range-seg button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === ctx.range)));
    $('#demo-toggle').textContent = ctx.demo ? '回到我的数据' : '看看填满数据的样子';
    document.title = ctx.demo ? '健康日志（示例）' : '健康日志';
  };

  const renderNotice = (ctx) => {
    const n = $('#notice');
    n.replaceChildren();
    n.classList.toggle('is-demo', ctx.demo);
    const btn = (text) => { const b = el('button', 'text-btn', text); b.type = 'button'; b.addEventListener('click', toggleDemo); return b; };
    if (ctx.demo) {
      n.hidden = false;
      n.append(el('strong', null, '正在看示例'), el('span', null, '这些数据是虚构的，只用来展示页面填满后的样子。'), btn('回到我的数据'));
    } else if (!ctx.D.hasAny) {
      n.hidden = false;
      n.append(el('strong', null, '还没有记录'), el('span', null, '在「健康」项目里把每顿饭的餐前、餐后照片发给 Claude，再说说运动和身体状态，这里就会更新。'), btn('先看看示例'));
    } else {
      n.hidden = true;
    }
  };

  const renderLede = (ctx) => {
    const p = $('#lede');
    p.replaceChildren();
    const r = ctx.dayRow;
    const b = (t) => el('b', null, t);
    p.append(`${cnDate(ctx.day)}，`);
    if (!r || (!r.n_meals && !r.n_exercises && !has(r.weight_kg) && !has(r.sleep_h))) {
      p.append(ctx.day > localToday() && !ctx.demo ? '这一天还没到。' : '还没有记录。');
      return;
    }
    if (r.n_meals) {
      p.append('吃了 ', b(`${fmt(r.kcal_in)} kcal`));
      const goal = ctx.goal('kcal');
      if (goal) p.append(`（目标 ${fmt(goal)}）`);
      p.append('，蛋白质 ', b(`${g1(r.protein_g)} g`));
    } else {
      p.append('还没有饮食记录');
    }
    if (r.n_exercises) {
      const top = [...ctx.vals.values()].filter((v) => v.sets_day > 0).sort((a, c) => c.sets_day - a.sets_day).slice(0, 3).map((v) => NAME[v.muscle]);
      p.append('；练了', top.length ? top.join('、') : '全身', '，');
      p.append(r.sets > 0 ? b(`${fmt(r.sets)} 组`) : b(`${fmt(r.train_min)} 分钟`));
      p.append('，运动消耗 ', b(`${fmt(r.kcal_out)} kcal`));
    } else {
      p.append('；没有训练');
    }
    p.append('。');
  };

  const renderPlate = (ctx) => {
    const box = $('#plate');
    const legend = $('#meal-legend');
    box.replaceChildren();
    legend.replaceChildren();
    const meals = ctx.D.mealTotals.filter((m) => m.date === ctx.day);
    const total = d3.sum(meals, (m) => m.kcal);
    const goal = ctx.goal('kcal');
    $('#eat-meta').textContent = meals.length ? `${meals.length} 顿` : '';
    const R = 100;
    const W = 24;
    const svg = d3.select(box).append('svg').attr('viewBox', '0 0 260 260').attr('role', 'img').attr('aria-label', `这一天吃掉 ${fmt(total)} kcal`);
    const g = svg.append('g').attr('transform', 'translate(130,130)');
    g.append('circle').attr('r', 125).attr('fill', 'none').attr('stroke', '#E8EFEB').attr('stroke-width', 1);
    g.append('circle').attr('r', R).attr('fill', 'none').attr('stroke', COL.empty).attr('stroke-width', W);
    g.append('circle').attr('r', R - W / 2 - 9).attr('fill', '#F6FAF8');
    const full = 2 * Math.PI;
    const scaleTo = goal || total || 1;
    let a = 0;
    const segs = [];
    for (const m of meals) {
      const span = Math.max(0, Math.min(full - a, (m.kcal / scaleTo) * full));
      if (span > 1e-3) segs.push({ m, a0: a, a1: a + span });
      a += span;
    }
    const arc = d3.arc().innerRadius(R - W / 2).outerRadius(R + W / 2).cornerRadius(7).padAngle(segs.length > 1 ? 0.03 : 0);
    const paths = g.selectAll('path.seg').data(segs).join('path').attr('class', 'seg')
      .style('fill', (s) => mealColor(s.m.meal)).style('cursor', 'default')
      .on('mousemove', (event, s) => showTip(event, [
        { text: `${s.m.meal} ${s.m.time}`, head: true },
        { text: `吃掉 ${fmt(s.m.kcal)} kcal`, color: mealColor(s.m.meal) },
        { text: s.m.items.map((r) => r.item).join('、') },
      ]))
      .on('mouseleave', hideTip);
    if (ctx.animate && !REDUCED) {
      paths.attr('d', (s) => arc({ startAngle: s.a0, endAngle: s.a0 }))
        .transition().duration(650).delay((s, i) => i * 120).ease(d3.easeCubicOut)
        .attrTween('d', (s) => { const i = d3.interpolate(s.a0, s.a1); return (t) => arc({ startAngle: s.a0, endAngle: i(t) }); });
    } else {
      paths.attr('d', (s) => arc({ startAngle: s.a0, endAngle: s.a1 }));
    }
    if (goal && total > goal) {
      const over = Math.min(full, ((total - goal) / goal) * full);
      g.append('path').attr('d', d3.arc().innerRadius(R + W / 2 + 4).outerRadius(R + W / 2 + 9).cornerRadius(3)({ startAngle: 0, endAngle: over })).style('fill', COL.coral);
    }
    g.append('text').attr('text-anchor', 'middle').attr('y', 8).style('font-family', 'var(--font-num)').style('font-size', '46px').style('font-weight', 600).style('fill', COL.ink).text(fmt(total));
    g.append('text').attr('text-anchor', 'middle').attr('y', 30).style('font-size', '12px').style('fill', COL.ink3).text('kcal');
    let sub;
    if (!goal) sub = '目标未设置';
    else if (total <= goal) sub = `离目标 ${fmt(goal)} 还差 ${fmt(goal - total)}`;
    else sub = `比目标 ${fmt(goal)} 多 ${fmt(total - goal)}`;
    g.append('text').attr('text-anchor', 'middle').attr('y', 52).style('font-size', '11.5px').style('fill', goal && total > goal ? COL.coral : COL.ink3).text(sub);

    if (!meals.length) {
      legend.append(el('li', 'hint', ctx.demo
        ? '这一天没有饮食记录。'
        : '每顿饭拍两张照片发给 Claude：开吃前一张，吃完后一张（剩下的也拍进去）。Claude 按剩下的量估算你实际吃掉多少，记在这里。'));
      return;
    }
    for (const m of meals) {
      const li = el('li');
      const sw = el('span', 'sw');
      sw.style.background = mealColor(m.meal);
      const name = el('span', 'name', m.meal);
      if (m.time) name.append(el('span', 'time', m.time));
      li.append(sw, name, withSmall('kc', fmt(m.kcal), 'kcal'));
      legend.append(li);
    }
  };

  const renderMacros = (ctx) => {
    const box = $('#macros');
    box.replaceChildren();
    const r = ctx.dayRow;
    const bar = el('div', 'macro-bar');
    const totalK = r ? d3.sum(MACROS, (m) => (r[m.k] || 0) * m.f) : 0;
    if (totalK > 0) {
      for (const m of MACROS) {
        const i = el('i');
        i.style.flex = String(((r[m.k] || 0) * m.f) / totalK);
        i.style.background = m.c;
        bar.append(i);
      }
    }
    const cols = el('div', 'macro-cols');
    for (const m of MACROS) {
      const c = el('div', 'macro');
      const lab = el('span', 'lab');
      const dot = el('i');
      dot.style.background = m.c;
      lab.append(dot, m.name);
      const v = r && r.n_meals ? g1(r[m.k]) : '—';
      const goal = ctx.goal(m.k);
      c.append(lab, withSmall('v', v, v === '—' ? null : 'g'), el('span', 'goal', goal ? `目标 ${g1(goal)} g` : '目标未设置'));
      cols.append(c);
    }
    const line = el('p', 'energy-line');
    if (r && r.n_exercises) {
      line.append('运动消耗 ', el('b', null, fmt(r.kcal_out)), ' kcal，吃掉减去运动是 ', el('b', null, fmt(r.net_kcal)), ' kcal。');
    } else {
      line.append('这一天没有运动消耗的记录。');
    }
    box.append(bar, cols, line);
  };

  const bodyFill = (view, v, ctx) => {
    if (!v) return COL.idle;
    if (view === 'day') return v.sets_day > 0 ? HEAT(v.sets_day) : COL.idle;
    if (view === 'week') {
      if (!(v.sets_7d > 0)) return COL.idle;
      const lo = ctx.goal('sets_week_min');
      const hi = ctx.goal('sets_week_max');
      if (lo && hi) {
        if (v.sets_7d < lo) return d3.interpolateRgb('#F6E6B5', COL.butter)(v.sets_7d / lo);
        return v.sets_7d <= hi ? COL.mint : COL.coral;
      }
      return WEEK_HEAT(v.sets_7d);
    }
    if (view === 'recovery') {
      if (v.days_since === null || v.days_since === undefined) return COL.idle;
      if (v.days_since <= 1) return COL.apricot;
      return v.days_since <= 3 ? COL.mint : COL.sky;
    }
    return v.soreness > 0 ? SORE[Math.min(3, Math.max(1, Math.round(v.soreness))) - 1] : COL.idle;
  };

  const renderBody = (ctx) => {
    const view = ctx.view;
    const V = VIEWS[view];
    $('#view-note').textContent = V.note;
    const legend = $('#body-legend');
    legend.replaceChildren();
    const chip = (c, t) => { const s = el('span'); const i = el('i'); i.style.background = c; s.append(i, t); legend.append(s); };
    const lo = ctx.goal('sets_week_min');
    const hi = ctx.goal('sets_week_max');
    if (view === 'day') { chip(COL.idle, '没练'); chip(HEAT(1), '1–2 组'); chip(HEAT(3.5), '3–5 组'); chip(HEAT(6), '6 组以上'); }
    if (view === 'week') {
      chip(COL.idle, '没练');
      if (lo && hi) { chip(COL.butter, `少于 ${lo} 组`); chip(COL.mint, `${lo}–${hi} 组`); chip(COL.coral, `多于 ${hi} 组`); }
      else { chip(WEEK_HEAT(3), '少'); chip(WEEK_HEAT(10), '中'); chip(WEEK_HEAT(18), '多'); }
    }
    if (view === 'recovery') { chip(COL.idle, '还没练过'); chip(COL.apricot, '0–1 天，恢复中'); chip(COL.mint, '2–3 天，可以再练'); chip(COL.sky, '4 天以上，该练了'); }
    if (view === 'sore') { chip(COL.idle, '不酸'); chip(SORE[0], '1'); chip(SORE[1], '2'); chip(SORE[2], '3'); }

    d3.selectAll('#figure .mus').style('fill', function () { return bodyFill(view, ctx.vals.get(this.dataset.m), ctx); });

    const rank = $('#rank');
    const detail = $('#detail');
    rank.replaceChildren();
    detail.replaceChildren();
    const items = MUSCLES.map(([m, name]) => ({ m, name, v: ctx.vals.get(m) }));
    const shown = items
      .filter((o) => (view === 'recovery' ? o.v.days_since !== null : o.v[V.field] > 0))
      .sort((a, b) => (view === 'recovery' ? a.v.days_since - b.v.days_since : b.v[V.field] - a.v[V.field]));
    const maxV = view === 'sore' ? 3 : Math.max(view === 'day' ? 6 : (hi || 16), d3.max(shown, (o) => o.v[V.field]) || 0);
    if (!shown.length) {
      const msg = {
        day: ctx.demo ? '这一天是休息日。' : '这一天没有训练记录。把做了什么动作、几组几次、多重，或者跑了多久告诉 Claude，就会标在身上。',
        week: '这 7 天没有训练记录。',
        recovery: '还没有任何训练记录。',
        sore: '这一天没有记录酸痛。',
      }[view];
      rank.append(el('li', 'rank-rest', msg));
    }
    if (state.sel && !NAME[state.sel]) state.sel = null;
    const sel = state.sel || (shown.length ? shown[0].m : null);
    for (const o of shown.slice(0, 8)) {
      const li = el('li');
      const b = el('button', o.m === sel ? 'sel' : null);
      b.type = 'button';
      const barBox = el('span', 'bar');
      const fill = el('i');
      fill.style.background = bodyFill(view, o.v, ctx);
      fill.style.width = view === 'recovery' ? '100%' : `${Math.min(100, (o.v[V.field] / maxV) * 100)}%`;
      barBox.append(fill);
      b.append(el('span', null, o.name), barBox, el('span', 'val', V.fmt(o.v[V.field])));
      b.addEventListener('click', () => { state.sel = o.m; render(); });
      li.append(b);
      rank.append(li);
    }
    if (shown.length > 8) rank.append(el('li', 'rank-rest', `另有 ${shown.length - 8} 个肌群`));
    d3.selectAll('#figure .mus').classed('sel', function () { return this.dataset.m === sel; });
    if (!sel) return;
    const v = ctx.vals.get(sel);
    detail.append(el('h4', null, NAME[sel]));
    const chips = el('div', 'chips');
    const c = (label, value) => { const s = el('span', 'chip', label + ' '); s.append(el('b', null, value)); chips.append(s); };
    c('这一天', `${g1(v.sets_day)} 组`);
    c('近 7 天', `${g1(v.sets_7d)} 组`);
    if (lo && hi) c('每周目标', `${lo}–${hi} 组`);
    chips.append(el('span', 'chip', v.days_since === null ? '还没练过' : v.days_since === 0 ? '这一天练过' : `${v.days_since} 天前练过`));
    if (v.soreness) c('酸痛', `${v.soreness} / 3`);
    detail.append(chips);
    const from = addDays(ctx.day, -6);
    const hits = ctx.D.workouts
      .filter((r) => r.date >= from && r.date <= ctx.day && (list(r.primary).includes(sel) || list(r.secondary).includes(sel)))
      .sort((a, b) => (a.date + (a.time || '') < b.date + (b.time || '') ? 1 : -1));
    if (hits.length) {
      detail.append(el('span', 'muted small', '近 7 天练到它的动作'));
      const ul = el('ul');
      for (const r of hits.slice(0, 4)) {
        const role = list(r.primary).includes(sel) ? '主要' : '辅助';
        const how = has(r.sets)
          ? `${r.sets} 组${has(r.reps) ? ` × ${r.reps}` : ''}${has(r.load_kg) ? `，${g1(r.load_kg)} kg` : ''}`
          : [has(r.duration_min) ? `${r.duration_min} 分钟` : '', has(r.distance_km) ? `${g1(r.distance_km)} km` : ''].filter(Boolean).join('，');
        const li = el('li', null, `${shortDate(r.date)} ${r.exercise}`);
        li.append(el('small', null, [how, role].filter(Boolean).join('，')));
        ul.append(li);
      }
      detail.append(ul);
    } else {
      detail.append(el('span', 'muted small', '近 7 天没有练到它的动作。'));
    }
  };

  const renderTimeline = (ctx) => {
    const box = $('#timeline');
    box.replaceChildren();
    const meals = ctx.D.mealTotals.filter((m) => m.date === ctx.day && m.time);
    const sessions = d3.groups(ctx.D.workouts.filter((r) => r.date === ctx.day && r.time), (r) => r.time)
      .map(([time, rows]) => ({ time, rows, dur: Math.max(15, d3.sum(rows, (r) => Number(r.duration_min) || 0)), kcal: d3.sum(rows, (r) => Number(r.kcal_burn) || 0) }));
    const w = Math.max(300, box.clientWidth);
    const h = 128;
    const times = [...meals.map((m) => toMin(m.time)), ...sessions.flatMap((s) => [toMin(s.time), toMin(s.time) + s.dur])];
    const lo = Math.min(6 * 60, d3.min(times) ?? 6 * 60);
    const hi = Math.max(23 * 60, d3.max(times) ?? 23 * 60);
    const x = d3.scaleLinear([lo, hi], [14, w - 14]);
    const svg = chartSvg(box, w, h, '一天里每顿饭和训练的时间');
    const base = 80;
    svg.append('line').attr('class', 'axis-line').attr('x1', x(lo)).attr('x2', x(hi)).attr('y1', base).attr('y2', base);
    const step = w < 520 ? 6 : 3;
    for (let m = Math.ceil(lo / 60 / step) * step * 60; m <= hi; m += step * 60) {
      svg.append('line').attr('class', 'axis-line').attr('x1', x(m)).attr('x2', x(m)).attr('y1', base - 4).attr('y2', base + 4);
      svg.append('text').attr('x', x(m)).attr('y', base + 18).attr('text-anchor', 'middle').text(`${pad(Math.floor(m / 60) % 24)}:00`);
    }
    if (ctx.day === localToday()) {
      const now = new Date();
      const nm = now.getHours() * 60 + now.getMinutes();
      if (nm >= lo && nm <= hi) {
        svg.append('line').attr('class', 'ref').attr('x1', x(nm)).attr('x2', x(nm)).attr('y1', 8).attr('y2', base + 30);
        svg.append('text').attr('class', 'halo').attr('x', x(nm) + 5).attr('y', 16).text('现在');
      }
    }
    if (!meals.length && !sessions.length) {
      svg.append('text').attr('class', 'empty-msg').attr('x', w / 2).attr('y', 44).attr('text-anchor', 'middle')
        .text(ctx.demo ? '这一天没有记录' : '这一天还没有记录，发来的饭和训练会按时间排在这条线上');
      return;
    }
    const rs = d3.scaleSqrt([0, 1200], [6, 24]).clamp(true);
    let lastX = -Infinity;
    let flip = false;
    for (const m of meals) {
      const cx = x(toMin(m.time));
      const rr = rs(m.kcal);
      svg.append('circle').attr('cx', cx).attr('cy', 44).attr('r', rr).style('fill', mealColor(m.meal)).style('stroke', '#fff').style('stroke-width', 2)
        .on('mousemove', (event) => showTip(event, [
          { text: `${m.meal} ${m.time}`, head: true },
          { text: `吃掉 ${fmt(m.kcal)} kcal`, color: mealColor(m.meal) },
          { text: m.items.map((r) => r.item).join('、') },
        ]))
        .on('mouseleave', hideTip);
      flip = cx - lastX < 76 ? !flip : false;
      lastX = cx;
      const ly = flip ? 44 + rr + 13 : 44 - rr - 7;
      svg.append('text').attr('class', 'halo strong').attr('x', cx).attr('y', Math.max(11, ly)).attr('text-anchor', 'middle').text(`${m.meal} ${fmt(m.kcal)}`);
    }
    for (const s of sessions) {
      const x0 = x(toMin(s.time));
      const x1 = x(toMin(s.time) + s.dur);
      const kinds = [...new Set(s.rows.map((r) => r.type).filter(Boolean))].join('、');
      const label = s.rows.length === 1 ? s.rows[0].exercise : `${kinds || '训练'}，${s.rows.length} 个动作`;
      svg.append('rect').attr('x', x0).attr('y', base + 26).attr('width', Math.max(8, x1 - x0)).attr('height', 10).attr('rx', 5).style('fill', COL.mintD)
        .on('mousemove', (event) => showTip(event, [
          { text: `${s.time} ${label}`, head: true },
          { text: `${fmt(s.dur)} 分钟，消耗 ${fmt(s.kcal)} kcal` },
          { text: s.rows.map((r) => r.exercise).join('、') },
        ]))
        .on('mouseleave', hideTip);
      const lw = measure(box, [label]);
      const right = x1 + 8 + lw <= w;
      svg.append('text').attr('class', 'halo').attr('x', right ? x1 + 8 : Math.max(lw, x0 - 8)).attr('y', base + 35).attr('text-anchor', right ? 'start' : 'end').text(label);
    }
  };

  const renderMeals = (ctx) => {
    const wrap = $('#meals');
    wrap.replaceChildren();
    const meals = ctx.D.mealTotals.filter((m) => m.date === ctx.day);
    if (!meals.length) {
      const e = el('div', 'empty');
      if (ctx.demo) e.textContent = '这一天没有饮食记录。';
      else {
        e.append(el('b', null, '这一天还没有饮食记录。'), document.createElement('br'),
          '每顿饭拍一张餐前、一张餐后，发到「健康」项目里。最好能看清整份饭和餐具，Claude 用盘子、碗的大小来估份量；有包装的食物，顺手拍一下营养成分表。');
      }
      wrap.append(e);
      return;
    }
    for (const m of meals) {
      const card = el('article', 'meal');
      card.style.setProperty('--meal-c', mealColor(m.meal));
      const head = el('div', 'meal-head');
      head.append(el('h3', null, m.meal), el('span', 'time', m.time || ''), withSmall('kc', fmt(m.kcal), 'kcal'));
      const served = el('div', 'served');
      const bar = el('div', 'served-bar');
      const fill = el('i');
      fill.style.width = `${m.kcal_served > 0 ? Math.min(100, (m.kcal / m.kcal_served) * 100) : 100}%`;
      bar.append(fill);
      served.append(bar, el('span', null, m.leftover > 0 ? `端上来约 ${fmt(m.kcal_served)} kcal，剩下约 ${fmt(m.leftover)} kcal` : `端上来约 ${fmt(m.kcal_served)} kcal，吃光了`));
      const items = el('div', 'items');
      for (const r of m.items) {
        const row = el('div', 'item');
        const what = el('span', 'what', r.item);
        const small = [has(r.portion) ? r.portion : null, has(r.protein_g) ? `蛋白 ${g1(r.protein_g)} g` : null].filter(Boolean).join('，');
        if (small) what.append(el('small', null, small));
        const pct = has(r.eaten_pct) ? Number(r.eaten_pct) : null;
        row.append(what, el('span', 'pct', pct === null ? '' : pct >= 100 ? '吃完' : `吃了 ${pct}%`), el('span', 'k', has(r.kcal) ? fmt(r.kcal) : '—'));
        const meta = el('div', 'item-meta');
        if (r.confidence === '低') meta.append(el('span', 'chip low', '估算把握低'));
        if (has(r.note)) meta.append(el('span', 'chip s', r.note));
        if (meta.childNodes.length) row.append(meta);
        items.append(row);
      }
      card.append(head, served, items);
      wrap.append(card);
    }
  };

  const renderState = (ctx) => {
    const box = $('#state');
    box.replaceChildren();
    const b = ctx.D.body.find((r) => r.date === ctx.day);
    if (!b) {
      box.append(el('p', 'empty', ctx.demo ? '这一天没有身体状态记录。' : '还没有记录。可以告诉 Claude：体重、睡了几小时、精力和心情（1–5 分）、步数，以及哪里酸（1–3 分）。'));
      return;
    }
    const tiles = el('div', 'tiles');
    const tile = (lab, v, unit, sub, pips) => {
      const t = el('div', 'tile');
      t.append(el('span', 'lab', lab), withSmall('v', has(v) ? v : '—', has(v) ? unit : null));
      if (sub) t.append(el('span', 'sub', sub));
      if (pips !== undefined) {
        const p = el('div', 'pips');
        for (let i = 1; i <= 5; i++) p.append(el('i', i <= pips ? 'on' : null));
        t.append(p);
      }
      return t;
    };
    const wc = ctx.dayRow && has(ctx.dayRow.weight_change) ? `比上次 ${signed(ctx.dayRow.weight_change)} kg` : null;
    const sleepGoal = ctx.goal('sleep_h');
    tiles.append(
      tile('体重', has(b.weight_kg) ? g1(b.weight_kg) : null, 'kg', wc),
      tile('睡眠', has(b.sleep_h) ? g1(b.sleep_h) : null, '小时', sleepGoal ? `目标 ${g1(sleepGoal)} 小时` : null),
      tile('精力', has(b.energy) ? String(b.energy) : null, '/ 5', null, has(b.energy) ? Number(b.energy) : 0),
      tile('心情', has(b.mood) ? String(b.mood) : null, '/ 5', null, has(b.mood) ? Number(b.mood) : 0),
    );
    if (has(b.steps)) tiles.append(tile('步数', fmt(b.steps), '步'));
    box.append(tiles);
    const sore = list(b.soreness).map((p) => p.split(':').map((x) => x.trim())).filter(([m, v]) => m && Number(v) > 0);
    if (sore.length) {
      const chips = el('div', 'chips');
      sore.forEach(([m, v]) => chips.append(el('span', 'chip v', `${NAME[m] || m} 酸 ${v}`)));
      box.append(chips);
    }
    if (has(b.note)) box.append(el('p', 'quote', b.note));
  };

  const renderNote = (ctx) => {
    const box = $('#note');
    box.replaceChildren();
    const ns = ctx.D.notes.filter((r) => r.date === ctx.day);
    if (!ns.length) {
      box.append(el('p', 'empty', ctx.demo ? '这一天没有点评。' : '你发来记录以后，Claude 会在这里写一两句：哪里够了，哪里差一点，下一顿或明天怎么调。'));
      return;
    }
    ns.forEach((n) => box.append(el('p', null, n.text)));
  };

  const renderTraining = (ctx) => {
    const box = $('#training');
    box.replaceChildren();
    const rows = ctx.D.workouts.filter((r) => r.date === ctx.day).sort((a, b) => ((a.time || '') < (b.time || '') ? -1 : 1));
    const r0 = ctx.dayRow;
    $('#train-meta').textContent = rows.length && r0 ? `${rows.length} 个动作，${fmt(r0.train_min)} 分钟，消耗约 ${fmt(r0.kcal_out)} kcal。点一行在身体地图上看它练到的肌群。` : '';
    if (!rows.length) {
      box.append(el('p', 'empty', ctx.demo ? '这一天是休息日。' : '这一天没有训练记录。力量训练说动作、组数、次数和重量；有氧说做了什么、多久、多远。'));
      return;
    }
    const t = el('table', 'tbl');
    const hr = el('tr');
    [['动作', ''], ['组 × 次', 'n'], ['重量', 'n'], ['时长', 'n'], ['消耗', 'n'], ['练到的肌群', '']].forEach(([h, c]) => hr.append(el('th', c, h)));
    const thead = el('thead');
    thead.append(hr);
    const tb = el('tbody');
    for (const r of rows) {
      const tr = el('tr');
      const ex = el('td', 'ex', r.exercise);
      const sub = [r.time, r.type, has(r.rpe) ? `RPE ${r.rpe}` : null, has(r.note) ? r.note : null].filter(Boolean).join('，');
      if (sub) ex.append(el('small', null, sub));
      const sets = has(r.sets) ? `${r.sets}${has(r.reps) ? ` × ${r.reps}` : ''}` : '—';
      const load = has(r.load_kg) ? `${g1(r.load_kg)} kg` : has(r.distance_km) ? `${g1(r.distance_km)} km` : '—';
      const chips = el('div', 'chips');
      list(r.primary).forEach((m) => chips.append(el('span', 'chip p', NAME[m] || m)));
      list(r.secondary).forEach((m) => chips.append(el('span', 'chip s', NAME[m] || m)));
      const mus = el('td');
      mus.append(chips);
      tr.append(ex, el('td', 'n', sets), el('td', 'n', load), el('td', 'n', has(r.duration_min) ? `${r.duration_min} 分钟` : '—'), el('td', 'n', has(r.kcal_burn) ? `${fmt(r.kcal_burn)} kcal` : '—'), mus);
      tr.addEventListener('click', () => {
        const m = list(r.primary)[0];
        if (!m) return;
        state.sel = m;
        if (state.view !== 'day') { state.view = 'day'; syncUrl(); }
        render();
        $('#figure').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
      });
      tb.append(tr);
    }
    t.append(thead, tb);
    box.append(t);
  };

  const barPath = (x, y, w, h, r, top) => {
    if (!(h > 0) || !(w > 0)) return '';
    const rr = Math.min(r, w / 2, h);
    return top
      ? `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
      : `M${x},${y}V${y + h - rr}Q${x},${y + h} ${x + rr},${y + h}H${x + w - rr}Q${x + w},${y + h} ${x + w},${y + h - rr}V${y}Z`;
  };

  const xLabels = (svg, days, x, h, w0, day) => {
    const every = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor(w0 / 46))));
    days.forEach((d, i) => {
      if ((days.length - 1 - i) % every !== 0) return;
      svg.append('text').attr('x', x(d) + x.bandwidth() / 2).attr('y', h - 4).attr('text-anchor', 'middle').attr('class', d === day ? 'strong' : null).text(shortDate(d));
    });
  };
  const hitColumns = (svg, days, x, h, tip) => {
    svg.append('g').selectAll('rect').data(days).join('rect').attr('class', 'hit')
      .attr('x', (d) => x(d) - (x.step() - x.bandwidth()) / 2).attr('width', x.step()).attr('y', 0).attr('height', h - 18)
      .on('mousemove', (event, d) => showTip(event, tip(d)))
      .on('mouseleave', hideTip)
      .on('click', (event, d) => setDay(d));
  };

  const renderEnergy = (ctx) => {
    const box = $('#energy-chart');
    box.replaceChildren();
    const legend = $('#energy-legend');
    legend.replaceChildren();
    const goal = ctx.goal('kcal');
    [...MACROS.map((m) => [m.name, m.c]), ['运动消耗', COL.burn]].forEach(([n, c]) => { const s = el('span'); const i = el('i'); i.style.background = c; s.append(i, n); legend.append(s); });
    if (goal) { const s = el('span'); s.append(el('i', 'line'), `目标 ${fmt(goal)} kcal`); legend.append(s); }
    const days = ctx.windowDays;
    const rows = days.map((d) => ctx.D.dailyBy.get(d) || null);
    const w = Math.max(300, box.clientWidth);
    const h = 230;
    const up = d3.max(rows, (r) => (r ? r.protein_kcal + r.carb_kcal + r.fat_kcal : 0)) || 0;
    const down = d3.max(rows, (r) => (r ? r.kcal_out : 0)) || 0;
    const y = d3.scaleLinear([-down, Math.max(up, goal || 0, 1000) * 1.06], [h - 22, 8]).nice();
    const ticks = y.ticks(5);
    const ml = measure(box, ticks.map((v) => fmt(Math.abs(v)))) + 10;
    const x = d3.scaleBand(days, [ml, w]).padding(0.24);
    const bw = Math.min(28, x.bandwidth());
    const bx = (d) => x(d) + (x.bandwidth() - bw) / 2;
    const svg = chartSvg(box, w, h, '每日摄入与运动消耗');
    ticks.forEach((v) => {
      svg.append('line').attr('class', v === 0 ? 'axis-line' : 'grid-line').attr('x1', ml).attr('x2', w).attr('y1', y(v)).attr('y2', y(v));
      svg.append('text').attr('x', ml - 6).attr('y', y(v) + 4).attr('text-anchor', 'end').text(fmt(Math.abs(v)));
    });
    if (days.includes(ctx.day)) svg.append('rect').attr('x', x(ctx.day) - 3).attr('y', 2).attr('width', x.bandwidth() + 6).attr('height', h - 22).attr('rx', 6).style('fill', '#EEF6F2');
    days.forEach((d, i) => {
      const r = rows[i];
      if (!r) return;
      let acc = 0;
      MACROS.forEach((m, j) => {
        const v = r[m.k.replace('_g', '_kcal')] || 0;
        if (v <= 0) return;
        const top = j === MACROS.length - 1 || MACROS.slice(j + 1).every((mm) => !(r[mm.k.replace('_g', '_kcal')] > 0));
        const hh = Math.max(0, y(acc) - y(acc + v) - (acc > 0 ? 1.5 : 0));
        svg.append('path').attr('d', top ? barPath(bx(d), y(acc + v), bw, hh, 5, true) : `M${bx(d)},${y(acc + v)}h${bw}v${hh}h${-bw}Z`).style('fill', m.c);
        acc += v;
      });
      if (r.kcal_out > 0) svg.append('path').attr('d', barPath(bx(d), y(0) + 2, bw, Math.max(0, y(-r.kcal_out) - y(0) - 2), 5, false)).style('fill', COL.burn);
    });
    if (goal) {
      svg.append('line').attr('class', 'ref').attr('x1', ml).attr('x2', w).attr('y1', y(goal)).attr('y2', y(goal));
    }
    if (!rows.some(Boolean)) svg.append('text').attr('class', 'empty-msg').attr('x', (ml + w) / 2).attr('y', y(Math.max(up, 1000) / 2)).attr('text-anchor', 'middle').text('这段时间还没有记录');
    xLabels(svg, days, x, h, w - ml, ctx.day);
    hitColumns(svg, days, x, h, (d) => {
      const r = ctx.D.dailyBy.get(d);
      if (!r || !(r.n_meals || r.n_exercises)) return [{ text: cnDate(d), head: true }, { text: '没有记录' }];
      return [
        { text: cnDate(d), head: true },
        { text: `吃掉 ${fmt(r.kcal_in)} kcal${goal ? `（目标 ${fmt(goal)}）` : ''}` },
        ...MACROS.map((m) => ({ text: `${m.name} ${g1(r[m.k])} g`, color: m.c })),
        { text: `运动消耗 ${fmt(r.kcal_out)} kcal`, color: COL.burn },
      ];
    });
  };

  const renderWeight = (ctx) => {
    const box = $('#weight-chart');
    box.replaceChildren();
    const pts = ctx.windowDays.map((d) => ctx.D.dailyBy.get(d)).filter((r) => r && has(r.weight_kg));
    $('#weight-meta').textContent = pts.length ? `这段时间称了 ${pts.length} 次` : '';
    const w = Math.max(260, box.clientWidth);
    const h = 190;
    const svg = chartSvg(box, w, h, '体重变化');
    if (pts.length < 2) {
      svg.append('text').attr('class', 'empty-msg').attr('x', w / 2).attr('y', h / 2).attr('text-anchor', 'middle')
        .text(pts.length ? `只称过一次：${g1(pts[0].weight_kg)} kg` : '还没有体重记录');
      return;
    }
    const y = d3.scaleLinear([d3.min(pts, (r) => r.weight_kg) - 0.4, d3.max(pts, (r) => r.weight_kg) + 0.4], [h - 22, 12]).nice();
    const ticks = y.ticks(4);
    const ml = measure(box, ticks.map((v) => g1(v))) + 10;
    const last = pts[pts.length - 1];
    const endLabel = `${g1(last.weight_kg)} kg`;
    const mr = measure(box, [endLabel]) + 14;
    const x = d3.scaleUtc([toDate(ctx.windowDays[0]), toDate(ctx.windowDays[ctx.windowDays.length - 1])], [ml, w - mr]);
    ticks.forEach((v) => {
      svg.append('line').attr('class', 'grid-line').attr('x1', ml).attr('x2', w - mr).attr('y1', y(v)).attr('y2', y(v));
      svg.append('text').attr('x', ml - 6).attr('y', y(v) + 4).attr('text-anchor', 'end').text(g1(v));
    });
    x.ticks(Math.max(2, Math.min(5, Math.floor((w - ml - mr) / 70)))).forEach((d) => {
      svg.append('text').attr('x', x(d)).attr('y', h - 4).attr('text-anchor', 'middle').text(`${d.getUTCMonth() + 1}/${d.getUTCDate()}`);
    });
    const id = 'wg';
    const grad = svg.append('defs').append('linearGradient').attr('id', id).attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
    [[0, 0.28], [0.5, 0.08], [1, 0]].forEach(([o, a]) => grad.append('stop').attr('offset', o).attr('stop-color', COL.mint).attr('stop-opacity', a));
    const px = (r) => x(toDate(r.date));
    svg.append('path').attr('d', d3.area().x(px).y0(h - 22).y1((r) => y(r.weight_kg))(pts)).style('fill', `url(#${id})`);
    svg.append('path').attr('d', d3.line().x(px).y((r) => y(r.weight_kg))(pts)).style('fill', 'none').style('stroke', COL.mint).style('stroke-width', 2.2).style('stroke-linecap', 'round').style('stroke-linejoin', 'round');
    svg.selectAll('circle.pt').data(pts).join('circle').attr('class', 'pt').attr('cx', px).attr('cy', (r) => y(r.weight_kg))
      .attr('r', (r) => (r.date === ctx.day ? 5 : 3.2)).style('fill', (r) => (r.date === ctx.day ? COL.mint : '#fff')).style('stroke', COL.mint).style('stroke-width', 1.8).style('cursor', 'pointer')
      .on('mousemove', (event, r) => showTip(event, [{ text: cnDate(r.date), head: true }, { text: `${g1(r.weight_kg)} kg${has(r.weight_change) ? `，比上次 ${signed(r.weight_change)}` : ''}` }]))
      .on('mouseleave', hideTip)
      .on('click', (event, r) => setDay(r.date));
    svg.append('text').attr('class', 'strong').attr('x', px(last) + 9).attr('y', y(last.weight_kg) + 4).text(endLabel);
  };

  const renderSleep = (ctx) => {
    const box = $('#sleep-chart');
    box.replaceChildren();
    const days = ctx.windowDays;
    const rows = days.map((d) => ctx.D.dailyBy.get(d) || null);
    const goal = ctx.goal('sleep_h');
    const w = Math.max(260, box.clientWidth);
    const h = 190;
    const y = d3.scaleLinear([0, Math.max(10, d3.max(rows, (r) => (r && has(r.sleep_h) ? r.sleep_h : 0)) || 0)], [h - 22, 30]).nice();
    const ticks = y.ticks(4);
    const ml = measure(box, ticks.map((v) => `${v}h`)) + 10;
    const x = d3.scaleBand(days, [ml, w]).padding(0.28);
    const bw = Math.min(20, x.bandwidth());
    const svg = chartSvg(box, w, h, '睡眠与精力');
    ticks.forEach((v) => {
      svg.append('line').attr('class', v === 0 ? 'axis-line' : 'grid-line').attr('x1', ml).attr('x2', w).attr('y1', y(v)).attr('y2', y(v));
      svg.append('text').attr('x', ml - 6).attr('y', y(v) + 4).attr('text-anchor', 'end').text(`${v}h`);
    });
    if (!rows.some((r) => r && (has(r.sleep_h) || has(r.energy)))) {
      svg.append('text').attr('class', 'empty-msg').attr('x', (ml + w) / 2).attr('y', h / 2).attr('text-anchor', 'middle').text('还没有睡眠记录');
      return;
    }
    days.forEach((d, i) => {
      const r = rows[i];
      if (!r) return;
      const cx = x(d) + x.bandwidth() / 2;
      if (has(r.sleep_h)) {
        const ok = goal ? r.sleep_h >= goal : true;
        svg.append('path').attr('d', barPath(cx - bw / 2, y(r.sleep_h), bw, Math.max(0, y(0) - y(r.sleep_h)), 5, true))
          .style('fill', ok ? '#9CC7EC' : '#CFE2F4').style('stroke', d === ctx.day ? COL.ink : 'none').style('stroke-width', 1.5);
      }
      if (has(r.energy)) svg.append('circle').attr('cx', cx).attr('cy', 13).attr('r', 1.5 + Number(r.energy) * 1.3).style('fill', COL.mint).style('fill-opacity', 0.25 + Number(r.energy) * 0.15);
    });
    if (goal) svg.append('line').attr('class', 'ref').attr('x1', ml).attr('x2', w).attr('y1', y(goal)).attr('y2', y(goal));
    xLabels(svg, days, x, h, w - ml, ctx.day);
    hitColumns(svg, days, x, h, (d) => {
      const r = ctx.D.dailyBy.get(d);
      const lines = [{ text: cnDate(d), head: true }];
      if (!r || (!has(r.sleep_h) && !has(r.energy))) lines.push({ text: '没有记录' });
      else {
        if (has(r.sleep_h)) lines.push({ text: `睡了 ${g1(r.sleep_h)} 小时${goal ? `（目标 ${g1(goal)}）` : ''}` });
        if (has(r.energy)) lines.push({ text: `精力 ${r.energy} / 5` });
        if (has(r.mood)) lines.push({ text: `心情 ${r.mood} / 5` });
      }
      return lines;
    });
  };

  const renderCalendar = (ctx) => {
    const box = $('#calendar-chart');
    box.replaceChildren();
    const legend = $('#calendar-legend');
    legend.replaceChildren();
    const goal = ctx.goal('kcal');
    const add = (c, t, cls) => { const s = el('span'); const i = el('i', cls); if (c) i.style.background = c; s.append(i, t); legend.append(s); };
    add(COL.empty, '没记录');
    if (goal) CAL_BINS.forEach(([, c, n]) => add(c, n));
    else { add(KCAL_HEAT(800), '吃得少'); add(KCAL_HEAT(1800), '中等'); add(KCAL_HEAT(3000), '吃得多'); }
    add(COL.ink, '有训练', 'dot');
    const w = Math.max(260, box.clientWidth);
    const left = 24;
    const gap = 4;
    const weeks = Math.max(8, Math.min(53, Math.floor((w - left) / ((w < 520 ? 22 : 26) + gap))));
    const cell = Math.max(12, Math.min(30, Math.floor((w - left) / weeks) - gap));
    $('#calendar-meta').textContent = goal
      ? `最近 ${weeks} 周，颜色是吃掉的热量和目标之比，点一格跳到那天。`
      : `最近 ${weeks} 周，颜色越深吃得越多（目标还没设置），点一格跳到那天。`;
    const end = toDate(ctx.day);
    const wk0 = d3.utcMonday.floor(end);
    const start = d3.utcMonday.offset(wk0, -(weeks - 1));
    const days = d3.utcDays(start, d3.utcDay.offset(wk0, 7));
    const top = 18;
    const h = top + 7 * (cell + gap);
    const svg = chartSvg(box, w, h, `最近 ${weeks} 周每天吃掉的热量`);
    [['一', 0], ['三', 2], ['五', 4], ['日', 6]].forEach(([t, row]) => svg.append('text').attr('x', 0).attr('y', top + row * (cell + gap) + cell * 0.7).text(t));
    const today = localToday();
    let lastLabel = -Infinity;
    for (const d of days) {
      const s = iso(d);
      const col = d3.utcMonday.count(start, d);
      const row = (d.getUTCDay() + 6) % 7;
      const cx = left + col * (cell + gap);
      const cy = top + row * (cell + gap);
      if (row === 0 && d.getUTCDate() <= 7 && cx - lastLabel > 34) {
        svg.append('text').attr('x', cx).attr('y', 11).text(`${d.getUTCMonth() + 1}月`);
        lastLabel = cx;
      }
      const r = ctx.D.dailyBy.get(s);
      const eaten = r && r.n_meals ? r.kcal_in : null;
      let fill = COL.empty;
      if (eaten !== null) fill = goal ? CAL_BINS.find(([lim]) => eaten / goal < lim)[1] : KCAL_HEAT(eaten);
      const g = svg.append('g').style('cursor', 'pointer').style('opacity', !ctx.demo && s > today ? 0.4 : 1);
      g.append('rect').attr('x', cx).attr('y', cy).attr('width', cell).attr('height', cell).attr('rx', 5).style('fill', fill)
        .style('stroke', s === ctx.day ? COL.ink : 'none').style('stroke-width', 2);
      if (r && r.n_exercises) g.append('circle').attr('cx', cx + cell / 2).attr('cy', cy + cell / 2).attr('r', Math.max(2, cell * 0.13)).style('fill', eaten === null ? COL.ink3 : COL.ink);
      g.on('mousemove', (event) => {
        const lines = [{ text: cnDate(s), head: true }];
        if (!r) lines.push({ text: '没有记录' });
        else {
          if (r.n_meals) lines.push({ text: `吃掉 ${fmt(r.kcal_in)} kcal${goal ? `，是目标的 ${Math.round((r.kcal_in / goal) * 100)}%` : ''}` });
          if (r.n_exercises) lines.push({ text: `训练 ${r.n_exercises} 个动作，消耗 ${fmt(r.kcal_out)} kcal` });
        }
        showTip(event, lines);
      }).on('mouseleave', hideTip).on('click', () => setDay(s));
    }
  };

  const renderMatrix = (ctx) => {
    const box = $('#matrix-chart');
    box.replaceChildren();
    const w = Math.max(280, box.clientWidth);
    const labelW = measure(box, MUSCLES.map(([, n]) => n)) + 14;
    const n = Math.max(7, Math.min(ctx.range, 28, Math.floor((w - labelW) / 20)));
    const days = ctx.windowDays.slice(-n);
    const cw = (w - labelW) / n;
    const ch = 20;
    const top = 20;
    const h = top + MUSCLES.length * ch + 2;
    const svg = chartSvg(box, w, h, '每个肌群每天练了几组');
    const di = days.indexOf(ctx.day);
    if (di >= 0) svg.append('rect').attr('x', labelW + di * cw).attr('y', top - 3).attr('width', cw).attr('height', MUSCLES.length * ch + 4).attr('rx', 6).style('fill', 'none').style('stroke', COL.ink).style('stroke-width', 1.5);
    const every = cw >= 18 ? 1 : 2;
    days.forEach((d, i) => {
      if ((days.length - 1 - i) % every !== 0) return;
      svg.append('text').attr('x', labelW + i * cw + cw / 2).attr('y', 12).attr('text-anchor', 'middle').attr('class', d === ctx.day ? 'strong' : null).text(toDate(d).getUTCDate());
    });
    const sel = state.sel;
    MUSCLES.forEach(([m, name], ri) => {
      const yy = top + ri * ch;
      svg.append('text').attr('x', 0).attr('y', yy + ch * 0.68).attr('class', m === sel ? 'strong' : null).style('cursor', 'pointer').text(name)
        .on('click', () => { state.sel = m; render(); });
      days.forEach((d, i) => {
        const r = ctx.D.muscleBy.get(`${d}|${m}`);
        const v = r ? r.sets_day : 0;
        svg.append('rect').attr('x', labelW + i * cw + 1.5).attr('y', yy + 1.5).attr('width', Math.max(1, cw - 3)).attr('height', ch - 3).attr('rx', 4)
          .style('fill', v > 0 ? HEAT(v) : COL.empty).style('cursor', 'pointer')
          .style('stroke', m === sel ? COL.ink3 : 'none').style('stroke-width', 1)
          .on('mousemove', (event) => showTip(event, [{ text: `${name}，${cnDate(d)}`, head: true }, { text: v > 0 ? `${g1(v)} 组` : '没练' }, ...(r && r.soreness ? [{ text: `酸痛 ${r.soreness} / 3` }] : [])]))
          .on('mouseleave', hideTip)
          .on('click', () => { state.sel = m; setDay(d); });
        if (v > 0 && cw >= 24) svg.append('text').attr('x', labelW + i * cw + cw / 2).attr('y', yy + ch * 0.68).attr('text-anchor', 'middle').style('fill', v >= 3 ? '#fff' : COL.ink).style('font-size', '10px').style('pointer-events', 'none').text(g1(v));
      });
    });
  };

  const renderProfile = (ctx) => {
    const box = $('#profile');
    box.replaceChildren();
    const p = (ctx.D.profile && ctx.D.profile.profile) || {};
    const t = ctx.D.targets || {};
    const field = (lab, v, unit) => {
      const d = el('div', 'pf');
      d.append(el('span', 'lab', lab));
      d.append(has(v) ? el('span', 'v', `${v}${unit ? ` ${unit}` : ''}`) : el('span', 'v unset', '未填写'));
      return d;
    };
    box.append(
      el('h3', 'profile-group', '关于我'),
      field('身高', p.height_cm, 'cm'), field('体重', p.weight_kg, 'kg'), field('年龄', p.age, '岁'), field('性别', p.sex),
      field('目标', p.goal), field('平时的活动量', p.activity),
      el('h3', 'profile-group', '每日目标'),
      field('每日热量', has(t.kcal) ? fmt(t.kcal) : null, 'kcal'), field('蛋白质', t.protein_g, 'g'), field('碳水', t.carb_g, 'g'), field('脂肪', t.fat_g, 'g'),
      field('睡眠', t.sleep_h, '小时'), field('每周每个肌群', has(t.sets_week_min) && has(t.sets_week_max) ? `${t.sets_week_min}–${t.sets_week_max}` : null, '组'),
    );
    const note = el('p', 'profile-note');
    if (has(ctx.D.profile.basis)) note.textContent = ctx.D.profile.basis;
    else note.textContent = '这些都还空着，Claude 不会替你猜。告诉 Claude 你的身高、体重、年龄、性别、目标（减脂、增肌或维持）和平时的活动量，Claude 会算出每日目标，并在这里写明是怎么算的。没填之前，页面上不显示任何目标线。';
    box.append(note);
    const upd = ctx.D.meta && ctx.D.meta.updated_at;
    $('#profile-meta').textContent = upd ? `数据更新于 ${d3.timeFormat('%Y-%m-%d %H:%M')(new Date(upd))}` : '';
  };

  /* ---------- main ---------- */
  const showError = (e) => {
    const n = $('#notice');
    n.hidden = false;
    n.classList.remove('is-demo');
    n.replaceChildren(el('strong', null, '数据没读出来'), el('span', null, `${e.message}。如果是直接双击打开的本地文件，浏览器不允许读取数据，需要通过网址访问。`));
    $('#lede').textContent = '';
  };

  let lastKey = '';
  async function render(opts = {}) {
    let D;
    try {
      D = await load(state.demo ? 'demo' : 'real');
    } catch (e) {
      showError(e);
      return;
    }
    const latest = D.daily.length ? D.daily[D.daily.length - 1].date : null;
    const day = state.day || (state.demo ? latest || localToday() : localToday());
    const key = `${state.demo}|${day}`;
    const ctx = {
      D, day, demo: state.demo, view: state.view, range: state.range,
      dayRow: D.dailyBy.get(day) || null,
      windowDays: d3.range(state.range - 1, -1, -1).map((i) => addDays(day, -i)),
      goal: (k) => { const v = D.targets[k]; return has(v) && Number(v) > 0 ? Number(v) : null; },
      animate: opts.animate !== false && key !== lastKey,
    };
    lastKey = key;
    ctx.vals = muscleValues(D, day);
    current = ctx;
    for (const f of [renderHeader, renderNotice, renderLede, renderPlate, renderMacros, renderBody, renderTimeline, renderMeals, renderState, renderNote, renderTraining, renderEnergy, renderWeight, renderSleep, renderCalendar, renderMatrix, renderProfile]) {
      try { f(ctx); } catch (e) { console.error(f.name, e); }
    }
  }

  buildFigure();
  render({ animate: true });

  let lastW = window.innerWidth;
  let timer = null;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(timer);
    timer = setTimeout(() => render({ animate: false }), 150);
  });
  window.addEventListener('scroll', hideTip, { passive: true });
})();
