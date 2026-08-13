/* ============================================================
 * 习惯层模块（原子习惯 · 剂量锚 · 不挂钟）
 * 以非侵入方式扩展 plan-exec：习惯视图 / 时间线倒计时 / 升级提醒弹窗
 * 依赖：Store, Views, Router, Reminder, Utils（均在 app.js 中定义）
 * ============================================================ */

/* ---------- 默认数据（首次或缺失时播种） ---------- */
const HABIT_DEFAULTS = {
  levers: [
    { id: 'sleep',   name: '睡眠断电', anchor: '阿戈美拉汀 9:30 + 小夜灯，关机键', freq: 'daily' },
    { id: 'env',     name: '环境收面', anchor: '每天只收 1 个可见面（床边/书桌/门口轮换）', freq: 'daily' },
    { id: 'yogurt',  name: '增重·酸奶', anchor: '每天 1 杯', freq: 'daily' },
    { id: 'iron',    name: '补铁·多闹钟', anchor: '药+铁剂+VC 放床头，设多个闹钟', freq: 'daily' },
    { id: 'spend',   name: '支出≤1500/月', anchor: '每日看余额，周结余奖赏', freq: 'weekly' },
    { id: 'exercise',name: '运动·哑铃', anchor: '最低 1 组，不追求量', freq: 'daily' },
    { id: 'german',  name: '德语降门槛', anchor: '1 个语法点 + 30min Anki', freq: 'daily' },
    { id: 'rest',    name: '休息锚', anchor: '固定放松时段，看动漫/听歌', freq: 'daily' },
  ],
  items: [
    { name: '酸奶', place: '冰箱门' },
    { name: '铁剂+VC', place: '床头伸手够到' },
    { name: '小夜灯', place: '床头' },
    { name: '哑铃', place: '床边' },
    { name: '德语书签', place: '书桌' },
    { name: '垃圾桶', place: '门口' },
  ],
  evidence: [],
};

const TIMELINE_DEFAULTS = [
  { id: 'a2end',   name: 'A2 课结课（莱茵春天）',    date: '2026-08-28', note: '7.15-8.28 直播 周一三五日 19:00-21:30' },
  { id: 'b1start', name: 'B1 网课开（莱茵春天晚班）', date: '2026-09-11', note: '周一三五日，可连报优惠' },
  { id: 'b1end',   name: 'B1 课结课',               date: '2026-11-02', note: '' },
  { id: 'b1sign',  name: 'B1 考试报名起',           date: '2026-11-11', note: '备好 2000 元' },
  { id: 'b1exam',  name: '歌德 B1 考试（北京）',      date: '2026-12-03', note: '单点故障！考听说读写四项，需退路' },
  { id: 'grade',   name: '出成绩+预约签证+准备材料',  date: '2026-12-31', note: '' },
  { id: 'visa',    name: '拿签证',                 date: '2027-01-10', note: '' },
  { id: 'germany', name: '到亚琛，进合作语言班 B2.1', date: '2027-03-01', note: '' },
  { id: 'b2c1',    name: 'B2.1→C1.2 密集班',         date: '2027-06-01', note: '630欧/月，每月一级' },
  { id: 'testdaf', name: 'TestDaF / DSH（C1）',       date: '2027-06-15', note: 'C1 即可，非 C2' },
  { id: 'apply',   name: '申请 2027 冬季学期',        date: '2027-07-15', note: '' },
  { id: 'enroll',  name: '入学（冬季学期）',          date: '2027-10-01', note: '' },
];

function seedHabitData() {
  if (!Store.data.habits) {
    const d = JSON.parse(JSON.stringify(HABIT_DEFAULTS));
    d.levers.forEach(l => l.done = {});
    Store.data.habits = d;
  } else {
    if (!Store.data.habits.levers) Store.data.habits.levers = [];
    if (!Store.data.habits.items) Store.data.habits.items = [];
    if (!Store.data.habits.evidence) Store.data.habits.evidence = [];
    Store.data.habits.levers.forEach(l => { if (!l.done) l.done = {}; });
  }
  if (!Store.data.timeline) Store.data.timeline = JSON.parse(JSON.stringify(TIMELINE_DEFAULTS));
  if (Store.data.userAvatar === undefined) Store.data.userAvatar = '';
  Store.save();
}

/* ---------- 工具 ---------- */
function timelineHTML() {
  const tl = Store.data.timeline || [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const nodes = tl.map(n => {
    const d = new Date(n.date + 'T00:00:00');
    const days = Math.round((d - today) / 86400000);
    const cls = days < 0 ? 'tl-past' : (days <= 7 ? 'tl-soon' : 'tl-normal');
    return `<div class="tl-node ${cls}">
      <div><div class="tl-name">${Utils.escape(n.name)}</div><div class="tl-date">${n.date}</div></div>
      <div class="tl-days">${days >= 0 ? days + ' 天' : '已过去'}</div>
    </div>`;
  }).join('');
  return `<div class="card timeline-card"><div class="card-title">🗓️ 关键时间线（倒计时）</div><div class="tl-list">${nodes}</div></div>`;
}

/* ---------- 习惯视图 ---------- */
Views.habit = function (el) {
  document.getElementById('page-title').textContent = '习惯';
  const h = Store.data.habits;
  const today = Utils.todayStr();
  const doneCount = h.levers.filter(l => l.done && l.done[today]).length;

  const levers = h.levers.map(l => {
    const done = !!(l.done && l.done[today]);
    return `<div class="lever-item ${done ? 'lever-done' : ''}" onclick="Views._habitToggle('${l.id}')">
      <div class="lever-check">${done ? '✅' : '⬜'}</div>
      <div class="lever-body"><div class="lever-name">${Utils.escape(l.name)}</div><div class="lever-anchor">${Utils.escape(l.anchor)}</div></div>
    </div>`;
  }).join('');

  const items = h.items.map(it =>
    `<div class="item-row"><span class="item-name">${Utils.escape(it.name)}</span><span class="item-place">📍 ${Utils.escape(it.place)}</span></div>`
  ).join('');

  const ev = (h.evidence || []).slice(0, 8).map(e =>
    `<div class="evidence-thumb"><img src="${e.img}" alt=""><div class="evidence-date">${e.date}</div></div>`
  ).join('');

  el.innerHTML = `
    <div class="dashboard-greeting">习惯系统 🎯</div>
    <div class="dashboard-subtitle">底层行为改造 · 剂量锚 · 不挂钟</div>
    ${timelineHTML()}
    <div class="card">
      <div class="card-title">🎯 今日最低剂量 <span class="progress-percent">${doneCount}/${h.levers.length}</span></div>
      <div class="lever-list">${levers}</div>
      <div class="text-sm text-light mt-2">点一下即记，不用多想。漏了补点也行。</div>
    </div>
    <div class="card">
      <div class="card-title">📦 杠杆物品（固定可见处）</div>
      <div class="item-list">${items}</div>
    </div>
    <div class="card">
      <div class="card-title">📸 证据留证</div>
      <div class="evidence-grid">${ev || '<div class="empty-state-text">还没有留证，拍一张吧</div>'}</div>
      <label class="btn btn-secondary btn-sm mt-2" style="display:inline-block">＋ 拍照留证
        <input type="file" accept="image/*" capture="environment" id="habit-photo" style="display:none" onchange="Views._habitPhoto(event)">
      </label>
    </div>
  `;
};

Views._habitToggle = function (id) {
  const h = Store.data.habits;
  const l = h.levers.find(x => x.id === id);
  if (!l) return;
  const t = Utils.todayStr();
  if (!l.done) l.done = {};
  l.done[t] = !l.done[t];
  Store.save();
  Views.habit(document.getElementById('main-content'));
};

Views._habitPhoto = function (e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 480;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL('image/jpeg', 0.7);
      if (!Store.data.habits.evidence) Store.data.habits.evidence = [];
      Store.data.habits.evidence.unshift({ date: Utils.todayStr(), img: data, note: '' });
      Store.save();
      Views.habit(document.getElementById('main-content'));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
};

/* ---------- 升级：30 分钟提醒弹窗（选择 + 简答 + 跳过） ---------- */
Views.reminderLog = function (type, note) {
  const today = Utils.todayStr();
  if (!Store.data.dailyLogs[today]) Store.data.dailyLogs[today] = { activities: [] };
  const log = Store.data.dailyLogs[today];
  if (!log.activities) log.activities = [];
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  log.activities.push({ type, mode: 'point', time: t, desc: note || '' });
  Store.save();
  Utils.toast('已记录 ✓');
  const badge = document.getElementById('reminder-badge');
  if (badge) badge.style.display = 'none';
};

Reminder.showBanner = function () {
  const existing = document.querySelector('.reminder-popup');
  if (existing) existing.remove();
  const p = document.createElement('div');
  p.className = 'reminder-popup';
  p.innerHTML = `
    <div class="reminder-popup-head">⏰ 该记录了 · 你刚在做啥？</div>
    <div class="reminder-chips">
      <button class="reminder-chip" data-t="sleep">😴 睡</button>
      <button class="reminder-chip" data-t="meal">🍽️ 吃</button>
      <button class="reminder-chip" data-t="study">📚 学</button>
      <button class="reminder-chip" data-t="work">💻 竞</button>
      <button class="reminder-chip" data-t="exercise">🏃 动</button>
      <button class="reminder-chip" data-t="rest">☕ 休</button>
      <button class="reminder-chip" data-t="play">🎮 玩</button>
      <button class="reminder-chip" data-t="custom">✏️ 其他</button>
    </div>
    <input class="form-input reminder-note" id="reminder-note" placeholder="补充说明（可选）">
    <div class="reminder-popup-foot">
      <button class="btn btn-ghost btn-sm" id="reminder-skip">跳过</button>
      <button class="btn btn-primary btn-sm" id="reminder-ok">记一下</button>
    </div>`;
  document.body.appendChild(p);
  const note = () => (document.getElementById('reminder-note').value || '').trim();
  p.querySelectorAll('.reminder-chip').forEach(b => {
    b.onclick = () => { Views.reminderLog(b.dataset.t, note()); p.remove(); };
  });
  document.getElementById('reminder-ok').onclick = () => {
    const n = note();
    Views.reminderLog(n ? 'custom' : 'custom', n || '记录');
    p.remove();
  };
  document.getElementById('reminder-skip').onclick = () => p.remove();
  setTimeout(() => { if (p.parentElement) p.remove(); }, 60000);
};

/* ---------- 把时间线挂到概览底部（不改动原 dashboard） ---------- */
const _origDashboard = Views.dashboard.bind(Views);
Views.dashboard = function (el) {
  _origDashboard(el);
  if (Store.data.timeline && Store.data.timeline.length) {
    el.insertAdjacentHTML('beforeend', timelineHTML());
  }
};

/* ---------- 接管 habit 路由 ---------- */
const _origRender = Router.render.bind(Router);
Router.render = function () {
  seedHabitData();
  if (this.current === 'habit') {
    Views.habit(document.getElementById('main-content'));
    return;
  }
  _origRender();
};

/* ---------- 启动：首屏由 App.init 接管；数据在首次 Router.render 时懒播种（避免 Store.data 尚未初始化时访问） ---------- */
