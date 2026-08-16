/* ============================================================
 * 原子习惯 - PWA 应用核心逻辑
 * Author: Hyuna
 * ============================================================ */

/* ========== 数据层 ========== */
const Store = {
  KEY: 'plan_exec_data_v1',
  data: null,

  init() {
    const saved = localStorage.getItem(this.KEY);
    if (saved) {
      try {
        this.data = JSON.parse(saved);
        this.migrate();
      } catch (e) {
        this.data = this.defaults();
      }
    } else {
      this.data = this.defaults();
    }
    this.save();
  },

  save() {
    localStorage.setItem(this.KEY, JSON.stringify(this.data));
  },

  defaults() {
    return {
      personalInfo: {},
      profileSummary: '', // 自动从 personalInfo 提炼，影响 AI 推荐的简要画像
      notesExtracted: [], // AI 从补充说明中提炼的结构化条目 [{label, value}]
      plans: {
        levels: [
          { id: 'lvl-1', name: '生理需求', icon: '🍚', color: '#FF6B6B', desc: '食物、睡眠、日常生活', categories: [] },
          { id: 'lvl-2', name: '安全需求', icon: '🛡️', color: '#4ECDC4', desc: '健康、财务、工作稳定', categories: [] },
          { id: 'lvl-3', name: '社交需求', icon: '💕', color: '#FFAAA5', desc: '家庭、朋友、人际关系', categories: [] },
          { id: 'lvl-4', name: '尊重需求', icon: '🏆', color: '#6EC1E4', desc: '成就、认可、自信', categories: [] },
          { id: 'lvl-5', name: '自我实现', icon: '✨', color: '#C4A7E7', desc: '学习、创造、个人成长', categories: [] },
        ]
      },
      dailyLogs: {},
      accounting: {
        records: [], // {id, type:'expense'|'income', amount, category, note, time}
        categories: {
          expense: ['餐饮', '交通', '购物', '娱乐', '居住', '医疗', '教育', '人情', '其他'],
          income: ['工资', '奖金', '兼职', '投资', '红包', '其他'],
        },
      },
      aiCharacter: {
        name: '',
        avatar: '🤖',
        userNickname: '',   // AI 对用户的称呼
        aiNickname: '',     // 用户对 AI 的称呼
        relationship: '',   // 关系
        worldview: '',      // 世界观设定
        userPersona: '',    // 用户在世界观里的人设
        characterDesc: '',  // 角色介绍
        chatHistory: [],    // {role:'user'|'assistant', content, time}
        dailyFocus: { date: '', asked: false, collected: false, items: [], muted: false }, // 今日重点
        prefs: { tone: 'encouraging', pace: 'normal', quietHours: '', custom: '' }, // 陪伴偏好
      },
      stats: {
        level: 1, exp: 0, freePoints: 0, ap: 0, coins: 0,
        manualBonus: {}, coinLedger: []
      },
      todayPlan: { date: '', items: [] }, // 今日计划：{id,text,durMin,reward,done,rolled,rewardResult,skipped,skipReason}
      versionHistory: [],
      sopTemplates: [],
      settings: {
        reminderInterval: 30,
        reminderEnabled: true,
        soundEnabled: true,
        aiProvider: 'deepseek', // 'deepseek' | 'groq' | 'gemini'
        geminiApiKey: '',
        groqApiKey: '',
        deepseekApiKey: '',
        aiModel: 'deepseek-chat',
      },
      lastReminderTime: Date.now(),
      createdAt: Date.now(),
    };
  },

  migrate() {
    if (!this.data.plans) this.data.plans = { levels: [] };
    if (!this.data.dailyLogs) this.data.dailyLogs = {};
    if (!this.data.versionHistory) this.data.versionHistory = [];
    if (!this.data.sopTemplates) this.data.sopTemplates = [];
    if (!this.data.settings) this.data.settings = { reminderInterval: 30, reminderEnabled: true, soundEnabled: true, aiProvider: 'deepseek', geminiApiKey: '', groqApiKey: '', deepseekApiKey: '', aiModel: 'deepseek-chat' };
    if (!this.data.settings.geminiApiKey) this.data.settings.geminiApiKey = '';
    if (!this.data.settings.groqApiKey) this.data.settings.groqApiKey = '';
    if (!this.data.settings.deepseekApiKey) this.data.settings.deepseekApiKey = '';
    if (!this.data.settings.aiProvider) this.data.settings.aiProvider = 'deepseek';
    if (!this.data.settings.aiModel) this.data.settings.aiModel = 'llama-3.3-70b-versatile';
    // 给已有大类补 userNotes 字段
    this.data.plans.levels.forEach(lvl => {
      if (lvl.categories) lvl.categories.forEach(cat => {
        if (!cat.userNotes) cat.userNotes = '';
        if (cat.branches) cat.branches.forEach(br => {
          if (!br.sop) br.sop = '';
          if (!br.focusMode) br.focusMode = false;
          if (br.tasks) br.tasks.forEach(t => {
            if (!t.steps) t.steps = [];
            if (!t.stateLogs) t.stateLogs = [];
            if (!t.taskType) t.taskType = 'longterm'; // daily | weekly | longterm | oneoff
            if (!t.dailyCompleted) t.dailyCompleted = {}; // {dateStr: true} for daily/weekly tasks
          });
        });
      });
    });
    if (!this.data.personalInfo) this.data.personalInfo = {};
    if (this.data.profileSummary === undefined) this.data.profileSummary = '';
    if (!this.data.notesExtracted) this.data.notesExtracted = [];
    // accounting 迁移
    if (!this.data.accounting) this.data.accounting = { records: [], categories: { expense: ['餐饮','交通','购物','娱乐','居住','医疗','教育','人情','其他'], income: ['工资','奖金','兼职','投资','红包','其他'] } };
    if (!this.data.accounting.records) this.data.accounting.records = [];
    if (!this.data.accounting.categories) this.data.accounting.categories = { expense: ['餐饮','交通','购物','娱乐','居住','医疗','教育','人情','其他'], income: ['工资','奖金','兼职','投资','红包','其他'] };
    // aiCharacter 迁移
    if (!this.data.aiCharacter) this.data.aiCharacter = { name: '', avatar: '🤖', userNickname: '', aiNickname: '', relationship: '', worldview: '', userPersona: '', characterDesc: '', chatHistory: [], dailyFocus: { date: '', asked: false, collected: false, items: [], muted: false }, prefs: { tone: 'encouraging', pace: 'normal', quietHours: '', custom: '' } };
    if (!this.data.aiCharacter.chatHistory) this.data.aiCharacter.chatHistory = [];
    if (!this.data.aiCharacter.dailyFocus) this.data.aiCharacter.dailyFocus = { date: '', asked: false, collected: false, items: [], muted: false };
    if (!this.data.aiCharacter.prefs) this.data.aiCharacter.prefs = { tone: 'encouraging', pace: 'normal', quietHours: '', custom: '' };
    // 跑团化：数值/游戏币/行动点/骰子
    if (!this.data.stats) this.data.stats = { level: 1, exp: 0, freePoints: 0, ap: 0, coins: 0, manualBonus: {}, coinLedger: [] };
    const _st = this.data.stats;
    if (_st.level === undefined) _st.level = 1;
    if (_st.exp === undefined) _st.exp = 0;
    if (_st.freePoints === undefined) _st.freePoints = 0;
    if (_st.ap === undefined) _st.ap = 0;
    if (_st.coins === undefined) _st.coins = 0;
    if (!_st.manualBonus) _st.manualBonus = {};
    if (!_st.coinLedger) _st.coinLedger = [];
    ['con', 'int', 'cha', 'agi', 'wil'].forEach(k => { if (_st.manualBonus[k] === undefined) _st.manualBonus[k] = 0; });
    if (!this.data.todayPlan) this.data.todayPlan = { date: '', items: [] };
    if (!this.data.todayPlan.items) this.data.todayPlan.items = [];
  },

  recordVersion(action, detail) {
    this.data.versionHistory.unshift({
      time: new Date().toISOString(),
      action,
      detail,
    });
    if (this.data.versionHistory.length > 200) {
      this.data.versionHistory = this.data.versionHistory.slice(0, 200);
    }
    this.save();
  },
};

/* ========== 工具函数 ========== */
const Utils = {
  uid() { return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); },

  toast(msg, type = '') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' toast-' + type : '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  },

  modal(title, contentHTML, onMount) {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">${title}</span>
        <button class="modal-close" onclick="Utils.closeModal()">&times;</button>
      </div>
      <div class="modal-body">${contentHTML}</div>
    `;
    overlay.style.display = 'flex';
    if (onMount) onMount(container);
  },

  closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
  },

  todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    const days = ['周日','周一','周二','周三','周四','周五','周六'];
    return `${d.getMonth()+1}月${d.getDate()}日 ${days[d.getDay()]}`;
  },

  formatTime(iso) {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  },

  timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return mins + '分钟前';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + '小时前';
    const days = Math.floor(hrs / 24);
    return days + '天前';
  },

  playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  },

  escape(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

/* ========== 进度计算 ========== */
const Progress = {
  task(task) {
    return task.progress || 0;
  },

  branch(branch) {
    if (!branch.tasks || branch.tasks.length === 0) return 0;
    const confirmed = branch.tasks.filter(t => t.status !== 'uncertain');
    const list = confirmed.length > 0 ? confirmed : branch.tasks;
    return Math.round(list.reduce((s, t) => s + this.task(t), 0) / list.length);
  },

  category(cat) {
    if (!cat.branches || cat.branches.length === 0) return 0;
    const confirmed = cat.branches.filter(b => b.status === 'confirmed');
    const list = confirmed.length > 0 ? confirmed : cat.branches;
    return Math.round(list.reduce((s, b) => s + this.branch(b), 0) / list.length);
  },

  level(level) {
    if (!level.categories || level.categories.length === 0) return 0;
    return Math.round(level.categories.reduce((s, c) => s + this.category(c), 0) / level.categories.length);
  },

  total() {
    const levels = Store.data.plans.levels;
    if (levels.length === 0) return 0;
    return Math.round(levels.reduce((s, l) => s + this.level(l), 0) / levels.length);
  },

  progressBar(percent, large) {
    const cls = large ? 'progress-bar progress-bar-lg' : 'progress-bar';
    return `<div class="${cls}"><div class="progress-fill" style="width:${Math.min(100, Math.max(0, percent))}%"></div></div>`;
  },

  // 今日计划：基于已完成分钟数的专注进度（与「今日」页同源）
  todayPlanProgress() {
    const tp = (Store.data.todayPlan && Store.data.todayPlan.items) || [];
    const doneItems = tp.filter(i => i.done && !i.skipped);
    const completedMin = doneItems.reduce((s, i) => s + (i.durMin || 0), 0);
    const target = 120; // 每日建议专注分钟（软目标，仅作进度展示）
    const pct = Math.min(100, Math.round(completedMin / target * 100));
    const rollsLeft = tp.filter(i => i.reward && i.done && !i.rolled && !i.skipped).length;
    const done = tp.filter(i => i.done).length;
    const total = tp.length;
    return { completedMin, target, pct, rollsLeft, done, total };
  },

  progressWithLabel(percent, label, large) {
    return `
      <div class="progress-info">
        <span class="text-sm font-bold">${Utils.escape(label)}</span>
        <span class="progress-percent">${percent}%</span>
      </div>
      ${this.progressBar(percent, large)}
    `;
  },

  // 获取所有任务（扁平化）
  allTasks() {
    const tasks = [];
    Store.data.plans.levels.forEach(lvl => {
      lvl.categories.forEach(cat => {
        (cat.branches || []).forEach(br => {
          if (br.status === 'confirmed') {
            (br.tasks || []).forEach(t => {
              tasks.push({
                ...t,
                lvlId: lvl.id, lvlName: lvl.name, lvlIcon: lvl.icon, lvlColor: lvl.color,
                catId: cat.id, catName: cat.name,
                brId: br.id, brName: br.name,
              });
            });
          }
        });
      });
    });
    return tasks;
  },

  // 今日已关联的自定义登记（AI 归类并计入目标的那些）
  _countsAsDoneToday() {
    const today = Utils.todayStr();
    const log = Store.data.dailyLogs[today];
    if (!log || !log.activities) return [];
    return log.activities.filter(a => a.countsAsDone && a.goalCatId);
  },

  // 今日任务完成进度（含 AI 归类的自定义登记）
  todayProgress() {
    const today = Utils.todayStr();
    const tasks = this.allTasks();
    const dailyTasks = tasks.filter(t => t.taskType === 'daily' || t.taskType === 'weekly');
    const cadDone = this._countsAsDoneToday();
    if (dailyTasks.length === 0) {
      const count = cadDone.length;
      return { percent: Math.min(100, count * 20), done: count, total: count, hasDaily: false, activityCount: count };
    }
    const done = dailyTasks.filter(t => t.dailyCompleted && t.dailyCompleted[today]).length + cadDone.length;
    const total = dailyTasks.length + cadDone.length;
    return { percent: Math.min(100, Math.round(done / total * 100)), done, total, hasDaily: true };
  },

  // 今日分类进度（按活动类型 / 已归类目标分组）
  todayCategoryProgress() {
    const today = Utils.todayStr();
    const log = Store.data.dailyLogs[today];
    const activities = (log && log.activities) ? log.activities : [];
    const tasks = this.allTasks();
    const dailyTasks = tasks.filter(t => t.taskType === 'daily' || t.taskType === 'weekly');

    // 目标大类 id -> 名称
    const catNameById = {};
    (Store.data.plans.levels || []).forEach(l => (l.categories || []).forEach(c => catNameById[c.id] = c.name));

    // 按活动类型 / 已归类目标分组
    const cats = {};
    activities.forEach(a => {
      let key, label;
      if (a.countsAsDone && a.goalCatId && catNameById[a.goalCatId]) {
        key = a.goalCatId; label = catNameById[a.goalCatId];
      } else {
        key = this._activityToCategory(a.type); label = this._categoryLabel(key);
      }
      if (!cats[key]) cats[key] = { count: 0, label, items: [] };
      cats[key].count++;
      const txt = [a.name, a.note].filter(Boolean).join(' · ') || label;
      cats[key].items.push({ text: txt, done: !!(a.countsAsDone && a.goalCatId), goal: !!(a.countsAsDone && a.goalCatId) });
    });

    const result = [];
    for (const [key, val] of Object.entries(cats)) {
      const catTasks = dailyTasks.filter(t => this._taskMatchesCategory(t, val.label) || t.goalCatId === key);
      const catDone = catTasks.filter(t => t.dailyCompleted && t.dailyCompleted[today]).length;
      let percent;
      if (catTasks.length > 0) {
        percent = Math.round(catDone / catTasks.length * 100);
        const cadCount = (val.items || []).filter(it => it.goal).length;
        percent = Math.min(100, percent + cadCount * 5); // AI 语义归类的登记推动进度条
      } else {
        percent = Math.min(100, val.count * 25);
      }
      result.push({ key, label: val.label, count: val.count, taskDone: catDone, taskTotal: catTasks.length, percent, items: val.items });
    }
    return result;
  },

  _activityToCategory(type) {
    const map = { study: '学习', exercise: '运动', meal: '饮食', sleep: '睡眠', wake: '作息', work: '工作', rest: '休息', custom: '其他' };
    return map[type] || '其他';
  },

  _categoryLabel(key) { return key; },

  _taskMatchesCategory(task, catKey) {
    const name = (task.name || '').toLowerCase();
    const map = {
      '学习': ['学', '读', '书', '课', '英语', '练', '复习', '预习', '写', '笔记'],
      '运动': ['跑', '运动', '健身', '锻炼', '走', '步', '瑜伽', '拉伸'],
      '饮食': ['吃', '饭', '餐', '喝', '水', '饮食'],
      '睡眠': ['睡', '觉', '休息', '作息'],
      '作息': ['起', '睡', '作息', '早安', '晚安'],
      '工作': ['工作', '做', '完成', '写', '项目', '代码'],
    };
    const keywords = map[catKey];
    if (!keywords) return false;
    return keywords.some(k => name.includes(k));
  },

  // 长期目标进度（每个大类一个进度条）
  longtermGoals() {
    const cadToday = this._countsAsDoneToday();
    const goals = [];
    Store.data.plans.levels.forEach(lvl => {
      (lvl.categories || []).forEach(cat => {
        const confirmedBranches = (cat.branches || []).filter(b => b.status === 'confirmed');
        if (confirmedBranches.length === 0) return;
        // 计算这个大类的整体进度
        let totalTasks = 0, totalProgress = 0;
        confirmedBranches.forEach(br => {
          (br.tasks || []).forEach(t => {
            totalTasks++;
            if (t.taskType === 'longterm' || t.taskType === 'oneoff' || !t.taskType) {
              totalProgress += (t.progress || 0);
            } else {
              // daily/weekly 任务按 100% 算（已日常化）
              totalProgress += 100;
            }
          });
        });
        let percent = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;
        // 今日自定义的「已归类登记」计入该目标进度（每条 +5%，封顶 100）
        const cad = cadToday.filter(a => a.goalCatId === cat.id).length;
        percent = Math.min(100, percent + cad * 5);
        goals.push({
          lvlId: lvl.id, lvlName: lvl.name, lvlIcon: lvl.icon, lvlColor: lvl.color,
          catId: cat.id, catName: cat.name, catNotes: cat.userNotes || '',
          percent, taskCount: totalTasks, todayDone: cad,
        });
      });
    });
    return goals;
  },
};

/* ========== 路由 ========== */
/* ========== 跑团化：角色成长 / 游戏币 / 行动点 / 骰子 ========== */
const Game = {
  ATTR_KEYS: ['con', 'int', 'cha', 'agi', 'wil'],
  ATTR_NAMES: { con: '体质', int: '智力', cha: '魅力', agi: '敏捷', wil: '意志' },
  ATTR_ICONS: { con: '💪', int: '🧠', cha: '💬', agi: '⚡', wil: '🛡️' },

  ensure() {
    const d = Store.data;
    if (!d.stats) d.stats = { level: 1, exp: 0, freePoints: 0, ap: 0, coins: 0, manualBonus: {}, coinLedger: [] };
    const s = d.stats;
    if (s.level === undefined) s.level = 1;
    if (s.exp === undefined) s.exp = 0;
    if (s.freePoints === undefined) s.freePoints = 0;
    if (s.ap === undefined) s.ap = 0;
    if (s.coins === undefined) s.coins = 0;
    if (!s.manualBonus) s.manualBonus = {};
    if (!s.coinLedger) s.coinLedger = [];
    this.ATTR_KEYS.forEach(k => { if (s.manualBonus[k] === undefined) s.manualBonus[k] = 0; });
    return s;
  },

  expToNext() { return 50 + this.ensure().level * 50; },

  // 自动从计划/进度映射的属性底值（0-5 区间，初始不会太高）
  baseAttrs() {
    const plans = (Store.data.plans && Store.data.plans.levels) || [];
    const acc = { con: 0, int: 0, cha: 0, agi: 0, wil: 0 };
    const cnt = { con: 0, int: 0, cha: 0, agi: 0, wil: 0 };
    const mapAttr = (name) => {
      const n = name || '';
      if (/健康|运动|作息|睡眠|身体|健身|跑步/.test(n)) return 'con';
      if (/学习|工作|德语|阅读|写|研究|代码|专业|外语/.test(n)) return 'int';
      if (/社交|陪伴|人际|关系|沟通|朋友/.test(n)) return 'cha';
      if (/习惯|执行|专注|效率|自律/.test(n)) return 'agi';
      if (/长期|坚持|目标|意义|成长|自我/.test(n)) return 'wil';
      return null;
    };
    plans.forEach(lvl => (lvl.categories || []).forEach(cat => {
      const a = mapAttr(cat.name);
      let brAvg = 0, brN = 0;
      (cat.branches || []).forEach(br => {
        brN++;
        let p = (typeof br.progress === 'number') ? br.progress : 0;
        if (!brN && p === 0 && br.tasks && br.tasks.length) p = Math.round(br.tasks.reduce((s, t) => s + (t.progress || 0), 0) / br.tasks.length);
        brAvg += p;
        const aw = mapAttr(br.name);
        if (aw) { acc[aw] += p / 100; cnt[aw]++; }
        (br.tasks || []).forEach(t => {
          const at = mapAttr(t.name);
          if (at) { acc[at] += (t.progress || 0) / 100; cnt[at]++; }
        });
      });
      if (a) { acc[a] += brN ? brAvg / brN / 100 : 0; cnt[a]++; }
    }));
    const out = {};
    this.ATTR_KEYS.forEach(k => { out[k] = Math.min(5, Math.round((acc[k] / (cnt[k] || 1)) * 5)); });
    return out;
  },

  attrs() {
    const s = this.ensure();
    const base = this.baseAttrs();
    const out = {};
    this.ATTR_KEYS.forEach(k => { out[k] = base[k] + (s.manualBonus[k] || 0); });
    return out;
  },

  // 完成任务发奖励：游戏币(1+d6) + 行动点(1) + EXP（真实加成，接现实）
  award(context) {
    const s = this.ensure();
    const d6 = 1 + Math.floor(Math.random() * 6);
    const coins = 1 + d6;
    s.coins += coins;
    s.ap += 1;
    const expGain = (context && context.exp) ? context.exp : 20;
    s.exp += expGain;
    let leveled = 0;
    while (s.exp >= this.expToNext()) { s.exp -= this.expToNext(); s.level++; s.freePoints++; leveled++; }
    Store.save();
    return { coins, d6, ap: 1, exp: expGain, leveled, level: s.level };
  },

  spendAP(attr) {
    const s = this.ensure();
    if (s.ap < 50) return false;
    if (!this.ATTR_KEYS.includes(attr)) return false;
    s.ap -= 50;
    s.manualBonus[attr] = (s.manualBonus[attr] || 0) + 1;
    Store.save();
    return true;
  },

  // ============ 今日计划（取代一次性骰子） ============
  ensureToday() {
    const d = Store.data;
    if (!d.todayPlan) d.todayPlan = { date: '', items: [] };
    const t = Utils.todayStr();
    if (d.todayPlan.date !== t) d.todayPlan = { date: t, items: [] };
    return d.todayPlan;
  },

  todayItem(id) {
    const tp = this.ensureToday();
    return tp.items.find(i => i.id === id);
  },

  // 让 AI 估算任务所需分钟（带奖励门槛：<15 分钟无奖励）
  async estimateTaskDuration(text) {
    if (!AIClient.hasKey()) return null;
    try {
      const r = await AIClient.callChat(
        [{ role: 'user', content: `估算下面这个任务大概需要几分钟完成，只回复一个整数分钟数，不要任何解释：${text}` }],
        { system: '你是时间估算器，只输出一个整数分钟数。', temperature: 0.3, maxTokens: 24 }
      );
      const m = (r || '').match(/(\d+)/);
      if (m) return Math.max(1, parseInt(m[1], 10));
    } catch (e) {}
    return null;
  },

  // 手动掷骰领奖：双 d6（币/行动点各一），按 分钟/15 缩放，保证拆分/合并总量不变
  rollReward(durMin) {
    const s = this.ensure();
    const units = Math.max(1, durMin / 15);
    const dCoin = 1 + Math.floor(Math.random() * 6); // 2-7
    const dAP = 1 + Math.floor(Math.random() * 6);   // 2-7
    const coins = Math.max(1, Math.round(dCoin * units));
    const ap = Math.max(1, Math.round(dAP * units));
    const expGain = Math.round(20 * units);
    s.coins += coins;
    s.ap += ap;
    s.exp += expGain;
    let leveled = 0;
    while (s.exp >= this.expToNext()) { s.exp -= this.expToNext(); s.level++; s.freePoints++; leveled++; }
    Store.save();
    return { coins, ap, exp: expGain, leveled, level: s.level, units };
  },

  redeem(spent, gift) {
    const s = this.ensure();
    spent = Math.max(0, Math.floor(Number(spent) || 0));
    if (spent <= 0) return { ok: false, msg: '请输入有效币数' };
    if (s.coins < spent) return { ok: false, msg: '游戏币不足' };
    s.coins -= spent;
    s.coinLedger.unshift({ time: new Date().toISOString(), coins: spent, gift: gift || '' });
    if (s.coinLedger.length > 100) s.coinLedger = s.coinLedger.slice(0, 100);
    Store.save();
    return { ok: true, left: s.coins };
  },

  coinsToYuan() { return (this.ensure().coins / 50).toFixed(2); },
};

const Router = {
  current: 'dashboard',

  navigate(view) {
    this.current = view;
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    const titles = { dashboard: '概览', profile: '个人信息', plans: '计划体系', daily: '每日登记', companion: '陪伴', settings: '设置', stats: '数值', dice: '今日' };
    document.getElementById('page-title').textContent = titles[view] || '';
    this.render();
  },

  render() {
    const main = document.getElementById('main-content');
    main.className = 'content fade-in';
    switch (this.current) {
      case 'dashboard': Views.dashboard(main); break;
      case 'profile': Views.profile(main); break;
      case 'plans': Views.plans(main); break;
      case 'daily': Views.daily(main); break;
      case 'companion': Views.companion(main); break;
      case 'settings': Views.settings(main); break;
      case 'stats': Views.stats(main); break;
      case 'dice': Views.dice(main); break;
    }
  },
};

/* ========== 视图渲染 ========== */
const Views = {

  /* ----- 数值页（跑团化） ----- */
  stats(el) {
    const g = Game.ensure();
    const attrs = Game.attrs();
    const expNeed = Game.expToNext();
    const yuan = Game.coinsToYuan();
    const ap = g.ap;
    const attrRows = Game.ATTR_KEYS.map(k => `
      <div class="card" style="border-left:4px solid var(--c-teal); margin-bottom:10px">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-bold">${Game.ATTR_ICONS[k]} ${Game.ATTR_NAMES[k]}</span>
            <span class="text-sm text-light ml-2">${attrs[k]}</span>
          </div>
          <button class="btn btn-secondary btn-sm" ${ap >= 50 ? '' : 'disabled style="opacity:.5;cursor:not-allowed"'} onclick="Game.spendAP('${k}'); Views.stats(document.getElementById('main-content'));">+1（满 50 行动点）</button>
        </div>
      </div>
    `).join('');
    const ledger = (g.coinLedger || []).slice(0, 8).map(r => `
      <div class="text-xs" style="padding:4px 0; border-bottom:1px solid var(--border)">- ${r.coins} 币 ${r.gift ? '· ' + Utils.escape(r.gift) : ''} <span class="text-light">${Utils.formatDate(r.time)}</span></div>
    `).join('') || '<div class="text-xs text-light">还没有兑换记录</div>';

    el.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg,#6EC1E4,#C4A7E7); color:#fff">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm" style="opacity:.85">角色等级</div>
            <div style="font-size:32px; font-weight:800">Lv.${g.level}</div>
          </div>
          <div style="text-align:right">
            <div class="text-sm" style="opacity:.85">行动点 AP</div>
            <div style="font-size:32px; font-weight:800">${ap}</div>
          </div>
        </div>
        <div style="margin-top:8px">${Progress.progressBar(Math.round(g.exp / expNeed * 100), true)}</div>
        <div class="text-xs mt-1" style="opacity:.85">EXP ${g.exp}/${expNeed}${g.freePoints > 0 ? ' · 可分配点 ' + g.freePoints : ''}</div>
      </div>

      <div class="card" style="border-left:4px solid var(--c-coral)">
        <div class="flex items-center justify-between">
          <div class="card-title" style="margin:0">🪙 游戏币</div>
          <div style="font-size:24px; font-weight:800; color:var(--c-coral)">${g.coins}</div>
        </div>
        <div class="text-sm text-light mt-1">≈ ¥${yuan}（50 币 = 1 元，礼品你现实自买后在此登记扣除）</div>
      </div>

      <div class="section-title">属性（攒满 50 行动点 +1，对应身份认同投票）</div>
      ${attrRows}

      <div class="card">
        <div class="card-title" style="margin:0 0 10px">🎁 兑换登记（扣游戏币）</div>
        <div class="form-group">
          <input class="form-input" id="redeem-coins" type="number" min="1" placeholder="花费游戏币数">
        </div>
        <div class="form-group">
          <input class="form-input" id="redeem-gift" placeholder="礼品名（如：一杯奶茶）">
        </div>
        <button class="btn btn-primary btn-block" onclick="Views._redeem()">登记扣除</button>
        <div class="section-title" style="margin-top:14px">兑换记录</div>
        ${ledger}
      </div>
    `;
  },

  _redeem() {
    const coins = document.getElementById('redeem-coins').value;
    const gift = (document.getElementById('redeem-gift').value || '').trim();
    const res = Game.redeem(coins, gift);
    if (res.ok) Utils.toast('已扣除，剩余 ' + res.left + ' 币 🪙', 'success');
    else Utils.toast(res.msg, 'error');
    Views.stats(document.getElementById('main-content'));
  },

  /* ----- 今日计划 + 掷骰（取代一次性骰子） ----- */
  dice(el) {
    const tp = Game.ensureToday();
    const doneItems = tp.items.filter(i => i.done && !i.skipped);
    const completedMin = doneItems.reduce((s, i) => s + (i.durMin || 0), 0);
    const target = 120; // 每日建议专注分钟（软目标，仅作进度展示）
    const pct = Math.min(100, Math.round(completedMin / target * 100));
    const rollsLeft = tp.items.filter(i => i.reward && i.done && !i.rolled && !i.skipped).length;

    const itemsHTML = tp.items.length ? tp.items.map(it => {
      const rewardBadge = it.reward
        ? `<span style="color:var(--c-teal);font-size:12px">🎲 可掷骰</span>`
        : `<span style="color:var(--c-coral);font-size:12px">＜15分·仅进度</span>`;
      const action = it.skipped
        ? `<span class="text-xs text-light">已跳过（${Utils.escape(it.skipReason || '')}）</span>`
        : (it.done && it.reward && !it.rolled)
          ? `<button class="btn btn-primary btn-sm" onclick="Views._todayRoll('${it.id}')">🎲 掷骰领奖励</button>`
          : (it.done && it.reward && it.rolled)
            ? `<span class="text-xs" style="color:var(--c-teal)">已领 🪙${it.rewardResult.coins} · 行动点${it.rewardResult.ap}</span>`
            : (it.done && !it.reward)
              ? `<span class="text-xs text-light">已计入进度</span>`
              : `<button class="btn btn-secondary btn-sm" onclick="Views._todaySkip('${it.id}')">放弃</button>`;
      return `
        <div class="card" style="margin-bottom:10px; ${it.done ? 'opacity:.7' : ''}">
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2" style="flex:1; cursor:pointer">
              <input type="checkbox" ${it.done ? 'checked' : ''} onchange="Views._todayToggle('${it.id}')" style="width:18px;height:18px">
              <span class="${it.done ? 'line-through' : ''}">${Utils.escape(it.text)}</span>
            </label>
            <button class="icon-btn" onclick="Views._todayRemove('${it.id}')" title="删除" style="font-size:14px;opacity:.6">✕</button>
          </div>
          <div class="flex items-center justify-between mt-1">
            <span class="text-xs text-light">${it.durMin} 分钟 · ${rewardBadge}</span>
            ${action}
          </div>
        </div>`;
    }).join('') : '<div class="text-xs text-light" style="padding:8px 0">今天还没有计划，下面加一个吧～</div>';

    el.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg,#FF6B6B,#C4A7E7); color:#fff">
        <div class="text-sm" style="opacity:.85">今日计划</div>
        <div class="font-bold mt-1" style="font-size:18px">做完打勾 → 再自己掷骰领奖励</div>
        <div class="text-xs mt-1" style="opacity:.85">≥15 分钟的任务完成才能掷骰；奖励按"分钟÷15"缩放，做多久发多少</div>
        <div style="margin-top:8px">${Progress.progressBar(pct, true)}</div>
        <div class="text-xs mt-1" style="opacity:.85">已专注 ${completedMin} 分钟${rollsLeft ? ' · 还可掷骰 ' + rollsLeft + ' 次 🎲' : ''}</div>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="card-title" style="margin:0 0 8px">➕ 添加今日任务</div>
        <input id="tp-text" class="form-input" placeholder="今天要做什么？（如：背德语单词 / 跑个步）">
        <div class="flex gap-2 mt-2">
          <select id="tp-dur" class="form-input" style="flex:1">
            <option value="5">≤15分钟（仅进度·无奖励）</option>
            <option value="15">15分钟（可掷骰）</option>
            <option value="30" selected>30分钟</option>
            <option value="45">45分钟</option>
            <option value="60">60分钟+</option>
          </select>
          <button class="btn btn-primary" onclick="Views._todayAdd()">添加</button>
        </div>
        <button class="btn btn-secondary btn-sm mt-2" style="width:100%" onclick="Views._todayEstimate()">🤖 让 AI 估算时长</button>
      </div>

      <div class="section-title" style="margin-top:16px">今日清单（${tp.items.length}）</div>
      ${itemsHTML}
    `;
  },

  _todayNewId() {
    return 'tp_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  },

  _todayAdd() {
    const text = (document.getElementById('tp-text') || {}).value;
    const dur = parseInt((document.getElementById('tp-dur') || {}).value, 10) || 30;
    if (!text || !text.trim()) { Utils.toast('先写点什么吧', 'error'); return; }
    const tp = Game.ensureToday();
    tp.items.push({
      id: this._todayNewId(), text: text.trim(), durMin: dur,
      reward: dur >= 15, done: false, rolled: false, rewardResult: null, skipped: false, skipReason: ''
    });
    Store.save();
    Views.dice(document.getElementById('main-content'));
  },

  async _todayEstimate() {
    const text = (document.getElementById('tp-text') || {}).value;
    if (!text || !text.trim()) { Utils.toast('先写任务再让 AI 估', 'error'); return; }
    if (!AIClient.hasKey()) { Utils.toast('未配置 Key，无法估算，请手动选时长', 'info'); return; }
    Utils.toast('AI 估算中…', 'info');
    const est = await Game.estimateTaskDuration(text.trim());
    if (!est) { Utils.toast('估算失败，请手动选时长', 'error'); return; }
    const sel = document.getElementById('tp-dur');
    const v = est <= 10 ? 5 : est <= 22 ? 15 : est <= 37 ? 30 : est <= 52 ? 45 : 60;
    if (sel) sel.value = String(v);
    Utils.toast(`AI 估算约 ${est} 分钟${v >= 15 ? '（可掷骰）' : '（＜15分·仅进度）'}`, 'success');
  },

  _todayToggle(id) {
    const it = Game.todayItem(id);
    if (!it) return;
    it.done = !it.done;
    Store.save();
    Views.dice(document.getElementById('main-content'));
  },

  _todayRoll(id) {
    const it = Game.todayItem(id);
    if (!it || it.rolled || !it.done || !it.reward || it.skipped) return;
    const res = Game.rollReward(it.durMin);
    it.rolled = true;
    it.rewardResult = res;
    Store.save();
    Utils.toast(`🎲 掷骰！游戏币+${res.coins} 行动点+${res.ap}${res.leveled ? ' · 升级 Lv' + res.level + '!' : ''}`, 'success');
    Views.dice(document.getElementById('main-content'));
  },

  _todaySkip(id) {
    const it = Game.todayItem(id);
    if (!it) return;
    Utils.modal('放弃这个任务？', `
      <p class="text-sm">说说为什么今天做不了「${Utils.escape(it.text)}」：</p>
      <textarea id="skip-reason" class="form-input" rows="3" placeholder="如：突然发烧了 / 老板临时安排加班"></textarea>
      <button class="btn btn-primary btn-block mt-3" onclick="Views._todaySubmitSkip('${id}')">提交</button>
      <button class="btn btn-secondary btn-block mt-2" onclick="Utils.closeModal()">再想想</button>
    `);
  },

  async _todaySubmitSkip(id) {
    const it = Game.todayItem(id);
    if (!it) { Utils.closeModal(); return; }
    const reason = ((document.getElementById('skip-reason') || {}).value || '').trim();
    if (!reason) { Utils.toast('请先填理由', 'error'); return; }
    let ok = true; // 无 Key 时默认允许用户诚实跳过
    if (AIClient.hasKey()) {
      try {
        const r = await AIClient.callChat(
          [{ role: 'user', content: `用户今日计划任务是「${it.text}」，理由是「${reason}」所以无法完成。请判断这个理由是否真实且不可抗拒（如生病、突发紧急事件）。只回复JSON：{"skip":true} 或 {"skip":false}，不要任何解释。` }],
          { system: '你是严格的借口审查官，只有真实不可抗拒的理由才允许跳过，水理由一律 false。', temperature: 0.2, maxTokens: 40 }
        );
        const m = (r || '').match(/\{[\s\S]*\}/);
        if (m) { const j = JSON.parse(m[0]); ok = !!j.skip; }
      } catch (e) { /* 网络异常则保守允许跳过并记录理由 */ }
    }
    it.skipReason = reason;
    if (ok) {
      it.skipped = true;
      it.done = true;
      Utils.closeModal();
      Utils.toast('已跳过，本次无奖励（理由已记录）', 'info');
    } else {
      it.done = false;
      Utils.closeModal();
      Utils.toast('AI 认为理由不充分，这个任务还是得完成哦（已记录你的说明）', 'warning');
    }
    Store.save();
    Views.dice(document.getElementById('main-content'));
  },

  _todayRemove(id) {
    const tp = Game.ensureToday();
    tp.items = tp.items.filter(i => i.id !== id);
    Store.save();
    Views.dice(document.getElementById('main-content'));
  },


  /* ----- 概览 ----- */
  dashboard(el) {
    const info = Store.data.personalInfo;
    const name = info.name || 'Ricky';
    const hour = new Date().getHours();
    const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : hour < 22 ? '晚上好' : '夜深了';
    const totalProgress = Progress.total();
    const todayLog = Store.data.dailyLogs[Utils.todayStr()] || { activities: [] };
    const taskCount = this._countAllTasks();
    const confirmedBranches = this._countBranches('confirmed');
    const todayActivities = todayLog.activities ? todayLog.activities.length : 0;
    const todaySpend = Companion.getTodaySpending();
    const hasChar = Companion.hasCharacter();

    const todayInfo = Progress.todayProgress();
    const todayPlanP = Progress.todayPlanProgress();
    const catProg = Progress.todayCategoryProgress();
    let catHTML = '';
    if (catProg.length > 0) {
      catHTML = catProg.map(c => `
        <div style="margin-bottom:10px">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm">${Utils.escape(c.label)}</span>
            <span class="text-xs text-light">${c.percent}%</span>
          </div>
          ${Progress.progressBar(c.percent)}
          ${(c.items || []).map(it => `<div class="text-xs text-light mt-1" style="padding-left:2px">${it.goal ? '✅' : '•'} ${Utils.escape(it.text)}</div>`).join('')}
        </div>
      `).join('');
    }
    const longTerm = Progress.longtermGoals();
    let goalsHTML = '';
    if (longTerm.length > 0) {
      goalsHTML = longTerm.map(g => `
        <div class="card" style="border-left:4px solid ${g.lvlColor}">
          <div class="flex items-center justify-between mb-2">
            <span class="font-bold text-sm">${g.lvlIcon} ${Utils.escape(g.catName)}</span>
            <span class="progress-percent">${g.percent}%</span>
          </div>
          ${Progress.progressBar(g.percent)}
          ${g.todayDone ? '<div class="text-xs text-light mt-1">今日已登记 ' + g.todayDone + ' 项 ✅</div>' : ''}
        </div>
      `).join('');
    }

    el.innerHTML = `
      <div class="dashboard-greeting">${greeting}，${Utils.escape(name)} 👋</div>
      <div class="dashboard-subtitle">${Utils.formatDate(new Date().toISOString())}</div>

      <div class="card" style="background:linear-gradient(135deg, #FF6B6B, #FF8FAB); color:#fff">
        <div class="text-sm" style="opacity:0.85; margin-bottom:4px">今日进度</div>
        <div style="font-size:36px; font-weight:800; line-height:1.2">${todayInfo.percent}<span style="font-size:18px">%</span></div>
        <div style="margin-top:8px">${Progress.progressBar(todayInfo.percent, true)}</div>
        <div class="flex gap-3 mt-3" style="font-size:12px; opacity:0.85">
          <span>✅ 今日完成 ${todayInfo.done}/${todayInfo.total}</span>
          <span>📝 今日${todayActivities}条记录</span>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value" style="color:var(--c-coral)">${confirmedBranches}</div>
          <div class="stat-label">确认分支</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--c-teal)">${taskCount}</div>
          <div class="stat-label">总任务数</div>
        </div>
      </div>

      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-card"><div class="stat-value" style="color:var(--c-lavender)">Lv.${Game.ensure().level}</div><div class="stat-label">等级</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--c-coral)">${Game.ensure().coins}</div><div class="stat-label">🪙 游戏币</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--c-teal)">${Game.ensure().ap}</div><div class="stat-label">⚡ 行动点</div></div>
      </div>

      ${todaySpend.count > 0 ? `
        <div class="card" style="border-left:4px solid var(--c-coral)">
          <div class="flex items-center justify-between">
            <div class="card-title" style="margin:0">💸 今日支出</div>
            <span style="font-size:24px; font-weight:800; color:var(--c-coral)">-${todaySpend.expense}</span>
          </div>
          ${todaySpend.income > 0 ? `<div class="text-sm text-light mt-2">收入 +${todaySpend.income} · 净额 ${todaySpend.net >= 0 ? '+' : ''}${todaySpend.net}</div>` : ''}
        </div>
      ` : ''}

      ${hasChar ? `
        <div class="card" style="border-left:4px solid var(--c-lavender); cursor:pointer" onclick="Router.navigate('companion')">
          <div class="flex items-center gap-3">
            <div style="font-size:32px">${this.renderAvatar(Store.data.aiCharacter.avatar, 32)}</div>
            <div style="flex:1">
              <div class="font-bold">${Utils.escape(Store.data.aiCharacter.name)}</div>
              <div class="text-sm text-light">点击和TA聊天、记账</div>
            </div>
            <span style="font-size:18px; color:var(--text-light)">›</span>
          </div>
        </div>
      ` : `
        <div class="card" style="border:1.5px dashed var(--c-lavender); cursor:pointer" onclick="Router.navigate('companion')">
          <div class="flex items-center gap-3">
            <div style="font-size:32px">💬</div>
            <div style="flex:1">
              <div class="font-bold" style="color:var(--c-lavender)">设定你的 AI 伙伴</div>
              <div class="text-sm text-light">陪你聊天、监督记账和学习</div>
            </div>
            <span style="font-size:18px; color:var(--text-light)">›</span>
          </div>
        </div>
      `}

      <div class="card" style="border-left:4px solid var(--c-teal); cursor:pointer" onclick="Router.navigate('dice')">
        <div class="flex items-center justify-between mb-2">
          <div class="card-title" style="margin:0">🎯 今日计划</div>
          <span class="text-xs text-light">${todayPlanP.pct}% · 去添加 ›</span>
        </div>
        <div style="font-size:26px; font-weight:800; color:var(--c-teal)">${todayPlanP.completedMin}<span style="font-size:14px; font-weight:500; color:var(--text-light)"> / ${todayPlanP.target} 分钟</span></div>
        ${Progress.progressBar(todayPlanP.pct, true)}
        <div class="flex gap-3 mt-2" style="font-size:12px; opacity:.85">
          <span>✅ ${todayPlanP.done}/${todayPlanP.total} 项已勾</span>
          ${todayPlanP.rollsLeft ? `<span style="color:var(--c-coral)">🎲 还可掷骰 ${todayPlanP.rollsLeft} 次</span>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-title">📊 今日分类进度</div>
        ${catHTML || '<div class="empty-state-text">今天还没有登记记录</div>'}
      </div>

      <div class="card">
        <div class="card-title">🎯 长期目标进度</div>
        ${goalsHTML || '<div class="empty-state-text">去「计划」页创建目标吧</div>'}
      </div>

      ${todayActivities > 0 ? `
        <div class="card">
          <div class="card-title">📝 今日记录</div>
          ${todayLog.activities.slice(-3).reverse().map(a => `
            <div class="log-item">
              <div class="log-icon" style="background:${this._activityColor(a.type)}">${this._activityIcon(a.type)}</div>
              <div class="log-info">
                <div class="log-type">${this._activityLabel(a.type)}</div>
                <div class="log-time">${a.time || ''}</div>
                ${(a.note || a.desc) ? `<div class="log-desc">${Utils.escape((a.note || a.desc))}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <div class="empty-state-text">今天还没记录，去「登记」一下吧</div>
            <button class="btn btn-primary btn-sm empty-state-btn" onclick="Router.navigate('daily')">去登记</button>
          </div>
        </div>
      `}
    `;
  },

  _countAllTasks() {
    let n = 0;
    Store.data.plans.levels.forEach(l => l.categories.forEach(c => c.branches.forEach(b => n += (b.tasks || []).length)));
    return n;
  },

  _countBranches(status) {
    let n = 0;
    Store.data.plans.levels.forEach(l => l.categories.forEach(c => c.branches.forEach(b => { if (!status || b.status === status) n++; })));
    return n;
  },

  _activityIcon(type) {
    return { sleep: '😴', wake: '☀️', meal: '🍽️', work: '💼', rest: '☕', exercise: '🏃', study: '📚', plan: '📋', custom: '✏️' }[type] || '✏️';
  },

  _activityLabel(type) {
    return { sleep: '睡觉', wake: '起床', meal: '用餐', work: '工作', rest: '休息', exercise: '运动', study: '学习', plan: '今日计划', custom: '其他' }[type] || '其他';
  },

  _activityColor(type) {
    return { sleep: '#C4A7E7', wake: '#FFD93D', meal: '#FFAAA5', work: '#6EC1E4', rest: '#95E1D3', exercise: '#FF6B6B', study: '#4ECDC4', plan: '#FF8FAB', custom: '#B2BEC3' }[type] || '#B2BEC3';
  },

  /* ----- 个人信息 ----- */
  _profileSections: [
    {
      title: '👤 基本信息',
      fields: [
        { key: 'name', label: '姓名', type: 'text', placeholder: '你的名字' },
        { key: 'gender', label: '性别', type: 'select', options: ['男', '女', '其他'] },
        { key: 'age', label: '年龄', type: 'number', placeholder: '岁' },
        { key: 'birthday', label: '生日', type: 'date' },
        { key: 'height', label: '身高(cm)', type: 'number', placeholder: 'cm' },
        { key: 'weight', label: '体重(kg)', type: 'number', placeholder: 'kg' },
        { key: 'bloodType', label: '血型', type: 'select', options: ['A型', 'B型', 'AB型', 'O型', '不确定'] },
        { key: 'ethnicity', label: '民族', type: 'text', placeholder: '如：汉族' },
        { key: 'personality', label: '性格类型', type: 'chip', options: ['内向', '外向', '中间型', 'INTJ', 'ENFP', '其他'] },
        { key: 'productiveTime', label: '高效时段', type: 'chip', options: ['清晨', '上午', '下午', '晚上', '深夜'] },
      ]
    },
    {
      title: '💼 工作与财务',
      fields: [
        { key: 'workStatus', label: '工作状态', type: 'select', options: ['在职', '自由职业', '创业', '求职中', '学生', '退休', '其他'] },
        { key: 'occupation', label: '职业类型', type: 'text', placeholder: '如：程序员、教师' },
        { key: 'workHours', label: '每日工作时长', type: 'select', options: ['<8小时', '8小时', '9-10小时', '10小时以上', '不固定'] },
        { key: 'incomeRange', label: '月收入范围', type: 'select', options: ['5千以下', '5千-1万', '1万-2万', '2万-5万', '5万以上', '无收入'] },
        { key: 'expenseRange', label: '月支出范围', type: 'select', options: ['2千以下', '2千-5千', '5千-1万', '1万-2万', '2万以上'] },
        { key: 'savings', label: '存款情况', type: 'select', options: ['无存款', '1万以下', '1-10万', '10-50万', '50万以上'] },
        { key: 'debt', label: '债务情况', type: 'select', options: ['无债务', '少量房贷', '大额房贷', '有消费贷', '多笔债务'] },
        { key: 'insurance', label: '保险情况', type: 'chip', options: ['社保', '商业医疗', '重疾险', '意外险', '寿险', '无'], multi: true },
        { key: 'education', label: '最高学历', type: 'select', options: ['初中及以下', '高中/中专', '大专', '本科', '硕士', '博士'] },
        { key: 'major', label: '专业', type: 'text', placeholder: '你的专业' },
        { key: 'skills', label: '技能特长', type: 'text', placeholder: '逗号分隔' },
      ]
    },
    {
      title: '🏥 健康状况',
      fields: [
        { key: 'healthCondition', label: '健康状况', type: 'select', options: ['良好', '一般', '亚健康', '有慢性病', '需要治疗'] },
        { key: 'vision', label: '视力状况', type: 'text', placeholder: '如：近视500度' },
        { key: 'chronicConditions', label: '慢性病/健康问题', type: 'text', placeholder: '没有填"无"' },
        { key: 'medication', label: '用药情况', type: 'text', placeholder: '没有填"无"' },
        { key: 'exerciseHabits', label: '运动习惯', type: 'chip', options: ['从不运动', '偶尔运动', '每周1-2次', '每周3-5次', '每天运动'] },
        { key: 'sleepQuality', label: '睡眠质量', type: 'select', options: ['很好', '较好', '一般', '较差', '失眠'] },
        { key: 'checkupFreq', label: '体检频率', type: 'select', options: ['每年', '每2年', '偶尔', '从未'] },
        { key: 'dietaryHabits', label: '饮食偏好/限制', type: 'text', placeholder: '如：素食、不吃辣等' },
      ]
    },
    {
      title: '🏠 生活状态',
      fields: [
        { key: 'city', label: '所在城市', type: 'text', placeholder: '如：深圳' },
        { key: 'livingSituation', label: '居住情况', type: 'select', options: ['独居', '合租', '与家人住', '与伴侣住', '宿舍', '其他'] },
        { key: 'commute', label: '通勤方式', type: 'select', options: ['步行', '自行车', '公交/地铁', '自驾', '远程办公', '其他'] },
        { key: 'dailyRoutine', label: '作息规律', type: 'select', options: ['早睡早起', '晚睡晚起', '不规律', '轮班制'] },
        { key: 'screenTime', label: '每日屏幕时间', type: 'select', options: ['<2小时', '2-4小时', '4-6小时', '6-8小时', '8小时以上'] },
        { key: 'emotionalStatus', label: '情感状态', type: 'select', options: ['单身', '恋爱中', '已婚', '分居', '离异', '其他'] },
        { key: 'socialFreq', label: '社交频率', type: 'select', options: ['几乎不社交', '每月几次', '每周一次', '每周多次', '每天'] },
        { key: 'pet', label: '宠物', type: 'select', options: ['无', '猫', '狗', '其他', '多只'] },
        { key: 'emergencyContact', label: '紧急联系人', type: 'text', placeholder: '姓名+电话' },
        { key: 'hobbies', label: '兴趣爱好', type: 'text', placeholder: '逗号分隔' },
      ]
    },
    {
      title: '🎯 目标与压力',
      fields: [
        { key: 'mainGoal', label: '当前最优先目标', type: 'text', placeholder: '你现在最想实现什么？' },
        { key: 'shortTermGoals', label: '短期目标(3个月内)', type: 'textarea', placeholder: '近期想完成的事情' },
        { key: 'longTermGoals', label: '长期目标(1年以上)', type: 'textarea', placeholder: '长远想实现的目标' },
        { key: 'stressSources', label: '主要压力来源', type: 'text', placeholder: '工作/经济/关系等' },
        { key: 'stressLevel', label: '压力等级', type: 'chip', options: ['很低', '较低', '中等', '较高', '很高'] },
        { key: 'supportSystem', label: '支持系统', type: 'text', placeholder: '家人/朋友/导师等' },
        { key: 'notes', label: '补充说明', type: 'textarea', placeholder: '任何你觉得对制定计划有帮助的信息' },
      ]
    },
  ],

  profile(el) {
    const info = Store.data.personalInfo;
    const summary = AIGuide._buildProfileSummary();
    const hasSummary = summary && summary.trim().length > 0;
    const summaryHTML = hasSummary ? `
      <div class="card" style="border-left:4px solid var(--c-lavender); background:linear-gradient(135deg, #fdfbff 0%, #f6f0ff 100%)">
        <div class="card-title" style="display:flex; align-items:center; justify-content:space-between">
          <span>🧬 影响计划的画像摘要</span>
          <span style="font-size:11px; color:var(--text-light); font-weight:400">AI 分类时会自动参考</span>
        </div>
        <div style="font-size:13px; line-height:1.7; color:var(--text-primary); white-space:pre-wrap; background:rgba(255,255,255,0.7); border-radius:8px; padding:10px 12px">${Utils.escape(summary)}</div>
        <div class="text-sm text-light mt-2">📌 上面这些是 AI 在为你做分类建议时会"看到"的信息。如果不希望 AI 读到某项，把那项设为「不必要」并保存。</div>
      </div>
    ` : `
      <div class="card" style="border-left:4px solid var(--c-yellow); background:#fffbea">
        <div class="text-sm">📌 填写下方信息后，AI 在帮你做计划分类时会参考这些画像（比如年龄、职业、健康状态、压力来源等），让推荐更贴合你。<br><br>
        没填的部分 AI 会按通用情况处理。</div>
      </div>
    `;

    const renderField = (cfg) => {
      const val = info[cfg.key];
      const isSkipped = val === '不必要';
      const skipCls = isSkipped ? 'skipped' : '';
      const disabled = isSkipped ? 'disabled' : '';

      // 解析「其他: xxx」的拆分
      const isOtherValue = (v) => typeof v === 'string' && v.startsWith('其他');
      const otherText = (() => {
        if (!val || !isOtherValue(val)) return '';
        const m = val.match(/^其他[:：]\s*(.*)$/);
        return m ? m[1] : '';
      })();
      const isOtherActive = isOtherValue(val);

      let inputHTML = '';
      if (cfg.type === 'select') {
        const opts = cfg.options.filter(o => o !== '其他');
        inputHTML = `
          <select class="form-select" data-key="${cfg.key}" ${disabled}>
            <option value="">请选择</option>
            ${opts.map(o => `<option value="${o}" ${val === o ? 'selected' : ''}>${o}</option>`).join('')}
            <option value="其他" ${isOtherActive ? 'selected' : ''}>其他...</option>
            <option value="不必要" ${isSkipped ? 'selected' : ''}>不必要</option>
          </select>
          <input class="form-input mt-1 other-input" data-key="${cfg.key}" data-other="1"
            style="display:${isOtherActive ? 'block' : 'none'}"
            value="${Utils.escape(otherText)}" placeholder="补充说明：${cfg.placeholder || cfg.label}" ${disabled}>
        `;
      } else if (cfg.type === 'chip') {
        const cleanOptions = cfg.options.filter(o => o !== '其他');
        const selected = val ? (cfg.multi ? val.split(',') : [val]) : [];
        const isOtherSelected = selected.includes('其他') || isOtherActive;
        // 「其他」项作为独立选项时，存的值是 「其他: xxx」，单选要把 selected 过滤掉
        const normalSelected = selected.filter(s => !isOtherValue(s) && s !== '其他');
        const otherDisplayStyle = isOtherSelected ? '' : 'display:none';
        const otherChipActive = isOtherSelected;

        inputHTML = `<div class="${cfg.multi ? 'check-group' : 'radio-group'}" data-key="${cfg.key}" data-multi="${cfg.multi || false}">
          ${cleanOptions.map(o => `<span class="${cfg.multi ? 'check-chip' : 'radio-chip'} ${normalSelected.includes(o) ? 'active' : ''}" data-val="${o}">${o}</span>`).join('')}
          <span class="${cfg.multi ? 'check-chip' : 'radio-chip'} ${otherChipActive ? 'active' : ''}" data-val="其他" data-other="true">其他</span>
          <input class="form-input mt-1 other-input" data-key="${cfg.key}" data-other="1"
            style="${otherDisplayStyle}"
            value="${Utils.escape(otherText)}" placeholder="补充说明：${cfg.placeholder || cfg.label}">
          <span class="${cfg.multi ? 'check-chip' : 'radio-chip'} skip-chip ${isSkipped ? 'active' : ''}" data-val="不必要" data-skip="true">不必要</span>
        </div>`;
      } else if (cfg.type === 'textarea') {
        inputHTML = `<textarea class="form-textarea" data-key="${cfg.key}" placeholder="${cfg.placeholder || ''}" ${disabled}>${Utils.escape(isSkipped ? '' : (val || ''))}</textarea>`;
      } else {
        inputHTML = `<input class="form-input" type="${cfg.type}" data-key="${cfg.key}" value="${Utils.escape(isSkipped ? '' : (val || ''))}" placeholder="${cfg.placeholder || ''}" ${disabled}>`;
      }

      const showSkipBtn = cfg.type === 'text' || cfg.type === 'number' || cfg.type === 'date' || cfg.type === 'textarea';

      return `
        <div class="form-group ${skipCls}" data-fg="${cfg.key}">
          <div class="form-label-row">
            <label class="form-label">${cfg.label}</label>
            ${showSkipBtn ? `<button class="skip-btn ${isSkipped ? 'active' : ''}" onclick="Views.toggleSkip('${cfg.key}')">不必要</button>` : ''}
          </div>
          ${inputHTML}
        </div>
      `;
    };

        const planLevels = (Store.data.plans && Store.data.plans.levels) || [];
    const planCatCount = planLevels.reduce((s, l) => s + ((l.categories && l.categories.length) || 0), 0);
    const linkHTML = planCatCount > 0
      ? `<div class="card" style="border-left:4px solid var(--c-teal); background:#f0faf8"><div class="card-title">🔗 画像与计划的关联</div><div style="font-size:13px; line-height:1.6">你的个人画像已参与 <b>${planCatCount}</b> 个计划分类的 AI 建议。填好画像后，每次用「AI 计划助手」分类都会自动参考这些信息。</div></div>`
      : `<div class="card" style="border-left:4px solid var(--c-yellow); background:#fffbea"><div style="font-size:13px">📌 你的画像将用于「AI 计划助手」的分类建议。完成首次计划分类后，这里会显示画像如何影响计划。</div></div>`;
    el.innerHTML = summaryHTML + linkHTML + this._profileSections.map(section => `
      <div class="card">
        <div class="card-title">${section.title}</div>
        ${section.fields.map(f => renderField(f)).join('')}
      </div>
    `).join('') + `
      <button class="btn btn-primary btn-block mt-3" onclick="Views.saveProfile()">💾 保存信息</button>
      <div style="height:8px"></div>
    `;

    // 绑定 chip 选择（含"不必要"互斥逻辑 + 「其他」联动输入框）
    el.querySelectorAll('.radio-group, .check-group').forEach(group => {
      const multi = group.dataset.multi === 'true';
      const otherInput = group.querySelector('.other-input');
      group.querySelectorAll('.radio-chip, .check-chip').forEach(chip => {
        chip.onclick = () => {
          const isSkip = chip.dataset.skip === 'true';
          const isOther = chip.dataset.other === 'true';
          if (isSkip) {
            group.querySelectorAll('.radio-chip, .check-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            if (otherInput) otherInput.style.display = 'none';
          } else if (isOther) {
            // 切换「其他」chip：激活则显示输入框；multi 时叠加；single 时单选激活
            const skipChip = group.querySelector('[data-skip="true"]');
            if (skipChip) skipChip.classList.remove('active');
            if (multi) {
              chip.classList.toggle('active');
              if (otherInput) otherInput.style.display = chip.classList.contains('active') ? '' : 'none';
            } else {
              group.querySelectorAll('.radio-chip:not([data-skip]):not([data-other]), .check-chip:not([data-skip]):not([data-other])').forEach(c => c.classList.remove('active'));
              const willActive = !chip.classList.contains('active');
              chip.classList.toggle('active', willActive);
              if (otherInput) otherInput.style.display = willActive ? '' : 'none';
            }
          } else {
            const skipChip = group.querySelector('[data-skip="true"]');
            const otherChip = group.querySelector('[data-other="true"]');
            if (skipChip) skipChip.classList.remove('active');
            if (otherChip) otherChip.classList.remove('active');
            if (otherInput) otherInput.style.display = 'none';
            if (multi) {
              chip.classList.toggle('active');
            } else {
              group.querySelectorAll('.radio-chip:not([data-skip]):not([data-other]), .check-chip:not([data-skip]):not([data-other])').forEach(c => c.classList.remove('active'));
              chip.classList.add('active');
            }
          }
        };
      });
    });

    // 绑定 select 的「其他」联动 + 「不必要」互斥
    el.querySelectorAll('select[data-key]').forEach(sel => {
      sel.onchange = () => {
        const group = sel.closest('.form-group');
        const otherInput = group ? group.querySelector('.other-input') : null;
        if (sel.value === '不必要') {
          sel.style.opacity = '0.5';
          if (otherInput) otherInput.style.display = 'none';
        } else {
          sel.style.opacity = '';
          if (otherInput) otherInput.style.display = sel.value === '其他' ? '' : 'none';
        }
      };
      // 初始 visibility
      const group = sel.closest('.form-group');
      const otherInput = group ? group.querySelector('.other-input') : null;
      if (otherInput && sel.value !== '其他' && sel.value !== '不必要') otherInput.style.display = 'none';
    });
  },

  toggleSkip(key) {
    const group = document.querySelector(`[data-fg="${key}"]`);
    if (!group) return;
    const btn = group.querySelector('.skip-btn');
    const inputs = group.querySelectorAll('input, textarea, select');
    const isSkipping = !btn.classList.contains('active');
    btn.classList.toggle('active', isSkipping);
    group.classList.toggle('skipped', isSkipping);
    inputs.forEach(inp => {
      inp.disabled = isSkipping;
      if (isSkipping) {
        inp.value = '';
      }
    });
  },

  saveProfile() {
    const info = {};
    // 处理 input/textarea/select
    document.querySelectorAll('#main-content [data-key]').forEach(el => {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        if (el.disabled) {
          info[el.dataset.key] = '不必要';
          return;
        }
        // 「其他」联动输入框：单独 data-key，但保存时合并到对应字段
        if (el.dataset.other === '1') return; // 由 select/chip 统一收集
        let v = el.value.trim();
        // select 选了「其他」：拼接下面的 other-input
        if (el.tagName === 'SELECT' && v === '其他') {
          const group = el.closest('.form-group');
          const otherInput = group ? group.querySelector('.other-input') : null;
          const txt = otherInput ? otherInput.value.trim() : '';
          v = txt ? `其他：${txt}` : '其他';
        }
        info[el.dataset.key] = v;
      }
    });
    // 处理 chip 选择（含「其他」chip + 文本拼接）
    document.querySelectorAll('#main-content .radio-group[data-key], #main-content .check-group[data-key]').forEach(group => {
      const key = group.dataset.key;
      const multi = group.dataset.multi === 'true';
      const otherInput = group.querySelector('.other-input');
      const otherText = otherInput ? otherInput.value.trim() : '';
      const activeVals = Array.from(group.querySelectorAll('.radio-chip.active, .check-chip.active')).map(c => c.dataset.val);
      if (activeVals.length === 0) {
        info[key] = '';
      } else if (activeVals.includes('不必要')) {
        info[key] = '不必要';
      } else {
        const hasOther = activeVals.includes('其他');
        const normalVals = activeVals.filter(v => v !== '其他' && v !== '不必要');
        let v;
        if (multi) {
          const parts = [...normalVals];
          if (hasOther) parts.push(otherText ? `其他：${otherText}` : '其他');
          v = parts.join(',');
        } else {
          if (hasOther) v = otherText ? `其他：${otherText}` : '其他';
          else v = normalVals[0] || '';
        }
        info[key] = v;
      }
    });

    const oldInfo = JSON.stringify(Store.data.personalInfo);
    Store.data.personalInfo = Object.assign(Store.data.personalInfo, info);
    const newInfo = JSON.stringify(Store.data.personalInfo);

    if (oldInfo !== newInfo) {
      Store.recordVersion('更新个人信息', '修改了个人资料');
      Store.save();
    }

    // === 补充说明提炼：不受 oldInfo !== newInfo 限制，每次保存都检查 ===
    const notesText = Store.data.personalInfo.notes;
    if (notesText && notesText.trim() && AIClient.hasKey()) {
      Utils.toast('正在用 AI 分析补充说明...', 'info');
      AIGuide._extractNotesWithAI(notesText).then(extracted => {
        if (extracted && extracted.length > 0) {
          Store.data.notesExtracted = extracted;
        } else {
          // AI 返回空，用原文兜底
          Store.data.notesExtracted = [{ label: '补充说明', value: notesText.trim().substring(0, 80) }];
        }
        Store.data.profileSummary = AIGuide._buildProfileSummary(true);
        Store.save();
        Utils.toast('补充说明已提炼为画像条目', 'success');
        // 刷新显示
        if (Router.current === 'profile') {
          const el = document.getElementById('main-content');
          if (el) Views.profile(el);
        }
      }).catch(err => {
        console.error('notes extraction failed:', err);
        // 失败了也用原文兜底，不能让补充说明完全消失
        Store.data.notesExtracted = [{ label: '补充说明', value: notesText.trim().substring(0, 80) }];
        Store.data.profileSummary = AIGuide._buildProfileSummary(true);
        Store.save();
        Utils.toast('AI 提炼失败，补充说明已按原文保留: ' + (err.message || ''), 'warning');
        if (Router.current === 'profile') {
          const el = document.getElementById('main-content');
          if (el) Views.profile(el);
        }
      });
    } else if (notesText && notesText.trim()) {
      // 没有 API Key，直接用原文作为兜底条目
      Store.data.notesExtracted = [{ label: '补充说明', value: notesText.trim().substring(0, 80) }];
      Store.data.profileSummary = AIGuide._buildProfileSummary(true);
      Store.save();
    } else {
      // 补充说明为空，清空之前的提炼
      Store.data.notesExtracted = [];
      Store.data.profileSummary = AIGuide._buildProfileSummary(true);
      Store.save();
    }
    Utils.toast('保存成功！', 'success');

    // 录入/更新个人信息后，自动让 AI 基于新画像在现有计划上做增量调整（需 API；弹预览需确认）
    const planExists = Store.data.plans.levels.some(l => l.categories.length > 0);
    const profileHasContent = AIGuide._buildProfileSummary(true).trim().length > 0;
    if (AIClient.hasKey() && planExists && profileHasContent && oldInfo !== newInfo) {
      AIGuide.autoUpdateFromProfile();
    }

    Router.navigate('dashboard');
  },

  /* ----- 计划体系 ----- */
  plans(el) {
    let html = '';
    const hasPlan = Store.data.plans.levels.some(l => l.categories.length > 0);

    Store.data.plans.levels.forEach((lvl, lvlIdx) => {
      const lvlProgress = Progress.level(lvl);
      const catCount = lvl.categories.length;

      html += `
        <div class="maslow-level expanded" id="lvl-${lvl.id}" data-idx="${lvlIdx}">
          <div class="maslow-level-header" onclick="Views.toggleLevel('${lvl.id}')">
            <div class="maslow-level-icon" style="background:${lvl.color}22">${lvl.icon}</div>
            <div class="maslow-level-info">
              <div class="maslow-level-name" style="color:${lvl.color}">${lvl.name}</div>
              <div class="maslow-level-desc">${lvl.desc} · ${catCount}个大类 · ${lvlProgress}%</div>
            </div>
            <span class="maslow-level-arrow">▶</span>
          </div>
          <div class="maslow-level-body">
            ${Progress.progressWithLabel(lvlProgress, '层级总进度', true)}

            ${lvl.categories.map((cat, catIdx) => this._renderCategory(lvl, cat, catIdx)).join('')}

            <button class="btn btn-outline btn-sm btn-block mt-3" onclick="Views.addCategory('${lvl.id}')">
              ➕ 添加大类
            </button>
            ${catCount === 0 ? '' : ''}
            ${catCount > 0 ? `<button class="btn btn-secondary btn-sm btn-block mt-2" onclick="Views.startAIGuide('${lvl.id}')">🤖 AI引导创建</button>` : ''}
          </div>
        </div>
      `;
    });

    el.innerHTML = `
      <div class="card" style="background:linear-gradient(135deg, #4ECDC4, #95E1D3); color:#fff">
        <div class="flex items-center justify-between">
          <div>
            <div style="font-size:14px; opacity:0.85">总体进度</div>
            <div style="font-size:28px; font-weight:800">${Progress.total()}%</div>
          </div>
          <div style="font-size:40px; opacity:0.5">🌳</div>
        </div>
      </div>

      <button class="btn btn-primary btn-block" style="font-size:16px; padding:14px; background:linear-gradient(135deg, #FF6B6B, #FF8E53); box-shadow:0 4px 12px rgba(255,107,107,0.3)" onclick="AIGuide.startGlobal()">
        🤖 AI 帮我制定计划
      </button>

      ${hasPlan ? `<button class="btn btn-block" style="font-size:15px; padding:13px; background:linear-gradient(135deg, #4ECDC4, #56CCF2); color:#fff; box-shadow:0 4px 12px rgba(78,205,196,0.3)" onclick="AIGuide.startUpdate()">
        🔄 用 AI 更新已有计划
      </button>` : ''}

      <div class="card" style="border:1.5px dashed var(--c-teal); background:rgba(78,205,196,0.05)">
        <div style="font-size:13px; color:var(--text-secondary); line-height:1.8">
          <strong style="color:var(--c-teal)">💡 使用说明</strong><br>
          1. 点上方「AI帮我制定计划」通过对话录入计划<br>
          2. 也可以手动操作：每层点「➕ 添加大类」<br>
          3. 大类下添加分支（5个槽位：3确认+2备选）<br>
          4. 确认分支下添加任务，记录进度
        </div>
      </div>

      <div class="maslow-pyramid">
        ${html}
      </div>

      <div class="card">
        <div class="card-title">📜 修改历史</div>
        ${this._renderVersionHistory()}
      </div>
    `;
  },

  _renderCategory(lvl, cat, catIdx) {
    const catProgress = Progress.category(cat);
    const branchCount = cat.branches.length;
    const confirmedCount = cat.branches.filter(b => b.status === 'confirmed').length;

    let branchesHTML = '';
    if (branchCount > 0) {
      branchesHTML = cat.branches.map((br, brIdx) => this._renderBranch(lvl, cat, br, catIdx, brIdx)).join('');
    }

    // 5个槽位显示
    const slots = [];
    for (let i = 0; i < 5; i++) {
      const br = cat.branches[i];
      if (br) {
        const cls = br.status === 'confirmed' ? 'filled-confirmed' : 'filled-uncertain';
        slots.push(`<div class="branch-slot ${cls}" onclick="Views.editBranch('${lvl.id}','${cat.id}','${br.id}')">${Utils.escape(br.name.slice(0, 6))}</div>`);
      } else {
        slots.push(`<div class="branch-slot" onclick="Views.addBranch('${lvl.id}','${cat.id}')">+</div>`);
      }
    }

    return `
      <div class="tree-item" style="margin-top:12px">
        <div class="tree-item-header">
          <span class="tree-item-name">${Utils.escape(cat.name)}</span>
          <span class="progress-percent">${catProgress}%</span>
        </div>
        ${Progress.progressBar(catProgress)}
        <div class="flex gap-2 mt-2 text-sm text-light">
          <span>🌿 ${confirmedCount}确认/${branchCount}总</span>
        </div>
        <div class="branch-slots">${slots.join('')}</div>
        <div class="flex gap-2 mt-2">
          <button class="btn btn-secondary btn-sm" onclick="Views.addBranch('${lvl.id}','${cat.id}')">➕ 分支</button>
          <button class="btn btn-secondary btn-sm" onclick="Views.startAIGuideForCategory('${lvl.id}','${cat.id}')">🤖 AI引导</button>
          <button class="btn btn-secondary btn-sm" onclick="Views.renameCategory('${lvl.id}','${cat.id}')">✏️ 改名</button>
          <button class="btn btn-secondary btn-sm" onclick="Views.deleteCategory('${lvl.id}','${cat.id}')">🗑️</button>
        </div>
        ${branchesHTML}
      </div>
    `;
  },

  _renderBranch(lvl, cat, br, catIdx, brIdx) {
    if (br.status !== 'confirmed') return '';
    const brProgress = Progress.branch(br);
    let tasksHTML = '';
    if (br.tasks && br.tasks.length > 0) {
      tasksHTML = br.tasks.map(t => this._renderTask(lvl, cat, br, t)).join('');
    }

    return `
      <div class="tree-node mt-2">
        <div class="tree-item" style="background:#fff; border:1px solid var(--border)">
          <div class="tree-item-header">
            <span class="tree-item-name" style="color:var(--c-teal)">🌿 ${Utils.escape(br.name)}</span>
            <span class="progress-percent">${brProgress}%</span>
          </div>
          ${Progress.progressBar(brProgress)}
          <div class="flex gap-2 mt-2 flex-wrap">
            <button class="btn btn-secondary btn-sm" onclick="Views.addTask('${lvl.id}','${cat.id}','${br.id}')">➕ 任务</button>
            <button class="btn btn-secondary btn-sm" onclick="Views.recordProgress('${lvl.id}','${cat.id}','${br.id}')">📈 记录</button>
            <button class="btn btn-secondary btn-sm" onclick="AIGuide.saveSOP('${lvl.id}','${cat.id}','${br.id}')">📋 存SOP</button>
            <button class="btn btn-secondary btn-sm" onclick="AIGuide.applySOP('${lvl.id}','${cat.id}','${br.id}')">📋 用SOP</button>
            <button class="btn btn-secondary btn-sm" onclick="Views.editBranch('${lvl.id}','${cat.id}','${br.id}')">✏️</button>
          </div>
          ${tasksHTML}
        </div>
      </div>
    `;
  },

  _renderTask(lvl, cat, br, task) {
    const p = task.progress || 0;
    const recordCount = task.records ? task.records.length : 0;
    const stateCount = task.stateLogs ? task.stateLogs.length : 0;
    const isFromSplit = task.splitFrom ? true : false;
    return `
      <div class="tree-node mt-2">
        <div class="tree-item" style="background:var(--bg-soft); padding:10px; ${isFromSplit ? 'border-left:3px solid var(--c-yellow)' : ''}">
          <div class="tree-item-header">
            <span class="text-sm font-bold">📌 ${Utils.escape(task.name)}${isFromSplit ? ' <span style="font-size:10px; color:var(--c-yellow)">↳拆解</span>' : ''}</span>
            <span class="progress-percent">${p}%</span>
          </div>
          ${Progress.progressBar(p)}
          <div class="flex gap-2 mt-2 flex-wrap">
            <span class="text-sm text-light">${recordCount}条记录${stateCount > 0 ? ` · ${stateCount}条状态` : ''}</span>
          </div>
          <div class="flex gap-2 mt-2 flex-wrap" style="align-items:center">
            <span class="text-xs text-light">类型</span>
            <select class="form-input" style="width:auto; padding:4px 8px; font-size:12px" onchange="Views.setTaskType('${lvl.id}','${cat.id}','${br.id}','${task.id}', this.value)">
              ${['daily','weekly','longterm','oneoff'].map(tp => `<option value="${tp}" ${(task.taskType||'longterm') === tp ? 'selected' : ''}>${tp==='daily'?'每日':tp==='weekly'?'每周':tp==='longterm'?'长期':'单次'}</option>`).join('')}
            </select>
          </div>
          <div class="flex gap-2 mt-2 flex-wrap">
            <button class="btn btn-secondary btn-sm" onclick="Views.recordProgress('${lvl.id}','${cat.id}','${br.id}','${task.id}')">📈 记录</button>
            <button class="btn btn-secondary btn-sm" onclick="AIGuide.recordState('${lvl.id}','${cat.id}','${br.id}','${task.id}','before')">🏃 开始前</button>
            <button class="btn btn-secondary btn-sm" onclick="AIGuide.recordState('${lvl.id}','${cat.id}','${br.id}','${task.id}','after')">✅ 结束后</button>
            <button class="btn btn-secondary btn-sm" style="color:var(--c-coral); border-color:var(--c-coral)" onclick="AIGuide.reSplitTask('${lvl.id}','${cat.id}','${br.id}','${task.id}')">🆘 遇到困难</button>
            <button class="btn btn-secondary btn-sm" onclick="Views.editTask('${lvl.id}','${cat.id}','${br.id}','${task.id}')">✏️</button>
          </div>
        </div>
      </div>
    `;
  },

  setTaskType(lvlId, catId, brId, taskId, type) {
    const task = this._getTask(lvlId, catId, brId, taskId);
    if (!task) return;
    task.taskType = type;
    Store.recordVersion('设置任务类型', `${task.name} → ${type}`);
    Store.save();
    const label = type === 'daily' ? '每日' : type === 'weekly' ? '每周' : type === 'longterm' ? '长期' : '单次';
    Utils.toast('已设为「' + label + '」', 'success');
    Router.render();
  },

  _renderVersionHistory() {
    const history = Store.data.versionHistory.slice(0, 10);
    if (history.length === 0) {
      return '<div class="text-sm text-light text-center" style="padding:12px">暂无修改记录</div>';
    }
    return history.map(v => `
      <div class="version-item">
        <div class="version-time">${Utils.timeAgo(v.time)} · ${Utils.formatTime(v.time)}</div>
        <div class="version-action">${Utils.escape(v.action)}</div>
        <div class="version-detail">${Utils.escape(v.detail)}</div>
      </div>
    `).join('');
  },

  toggleLevel(id) {
    const el = document.getElementById('lvl-' + id);
    el.classList.toggle('expanded');
  },

  addCategory(lvlId) {
    Utils.modal('添加大类', `
      <div class="form-group">
        <label class="form-label">大类名称</label>
        <input class="form-input" id="cat-name-input" placeholder="如：饮食管理、职业发展" autofocus>
      </div>
      <button class="btn btn-primary btn-block" onclick="Views._confirmAddCategory('${lvlId}')">添加</button>
    `, (c) => {
      c.querySelector('#cat-name-input').focus();
      c.querySelector('#cat-name-input').onkeydown = (e) => {
        if (e.key === 'Enter') Views._confirmAddCategory(lvlId);
      };
    });
  },

  _confirmAddCategory(lvlId) {
    const name = document.getElementById('cat-name-input').value.trim();
    if (!name) { Utils.toast('请输入名称', 'warning'); return; }
    const lvl = Store.data.plans.levels.find(l => l.id === lvlId);
    lvl.categories.push({ id: Utils.uid(), name, branches: [] });
    Store.recordVersion('添加大类', `${lvl.name} → ${name}`);
    Store.save();
    Utils.closeModal();
    Router.render();
    Utils.toast('添加成功', 'success');
  },

  renameCategory(lvlId, catId) {
    const cat = this._getCategory(lvlId, catId);
    Utils.modal('重命名大类', `
      <div class="form-group">
        <label class="form-label">大类名称</label>
        <input class="form-input" id="cat-rename-input" value="${Utils.escape(cat.name)}">
      </div>
      <button class="btn btn-primary btn-block" onclick="Views._confirmRenameCategory('${lvlId}','${catId}')">保存</button>
    `, (c) => {
      c.querySelector('#cat-rename-input').focus();
      c.querySelector('#cat-rename-input').select();
    });
  },

  _confirmRenameCategory(lvlId, catId) {
    const name = document.getElementById('cat-rename-input').value.trim();
    if (!name) { Utils.toast('请输入名称', 'warning'); return; }
    const cat = this._getCategory(lvlId, catId);
    const oldName = cat.name;
    cat.name = name;
    Store.recordVersion('重命名大类', `${oldName} → ${name}`);
    Store.save();
    Utils.closeModal();
    Router.render();
    Utils.toast('已更新', 'success');
  },

  deleteCategory(lvlId, catId) {
    const cat = this._getCategory(lvlId, catId);
    if (!confirm(`确定删除「${cat.name}」及其所有分支和任务？`)) return;
    const lvl = Store.data.plans.levels.find(l => l.id === lvlId);
    lvl.categories = lvl.categories.filter(c => c.id !== catId);
    Store.recordVersion('删除大类', cat.name);
    Store.save();
    Router.render();
    Utils.toast('已删除', 'success');
  },

  addBranch(lvlId, catId) {
    const cat = this._getCategory(lvlId, catId);
    Utils.modal('添加分支', `
      <div class="form-group">
        <label class="form-label">分支名称</label>
        <input class="form-input" id="br-name-input" placeholder="如：自己做饭、外卖控制">
      </div>
      <div class="form-group">
        <label class="form-label">状态</label>
        <div class="radio-group" id="br-status-group">
          <span class="radio-chip active" data-val="confirmed">✅ 确认执行</span>
          <span class="radio-chip" data-val="uncertain">❓ 备选方案</span>
        </div>
      </div>
      <button class="btn btn-primary btn-block" onclick="Views._confirmAddBranch('${lvlId}','${catId}')">添加</button>
    `, (c) => {
      c.querySelectorAll('#br-status-group .radio-chip').forEach(chip => {
        chip.onclick = () => {
          c.querySelectorAll('#br-status-group .radio-chip').forEach(x => x.classList.remove('active'));
          chip.classList.add('active');
        };
      });
      c.querySelector('#br-name-input').focus();
    });
  },

  _confirmAddBranch(lvlId, catId) {
    const name = document.getElementById('br-name-input').value.trim();
    if (!name) { Utils.toast('请输入名称', 'warning'); return; }
    const status = document.querySelector('#br-status-group .active').dataset.val;
    const cat = this._getCategory(lvlId, catId);
    cat.branches.push({ id: Utils.uid(), name, status, tasks: [] });
    const lvl = Store.data.plans.levels.find(l => l.id === lvlId);
    Store.recordVersion('添加分支', `${lvl.name} > ${cat.name} → ${name} (${status === 'confirmed' ? '确认' : '备选'})`);
    Store.save();
    Utils.closeModal();
    Router.render();
    Utils.toast('分支已添加', 'success');
  },

  editBranch(lvlId, catId, brId) {
    const br = this._getBranch(lvlId, catId, brId);
    const cat = this._getCategory(lvlId, catId);
    Utils.modal('编辑分支', `
      <div class="form-group">
        <label class="form-label">分支名称</label>
        <input class="form-input" id="br-edit-name" value="${Utils.escape(br.name)}">
      </div>
      <div class="form-group">
        <label class="form-label">状态</label>
        <div class="radio-group" id="br-edit-status">
          <span class="radio-chip ${br.status === 'confirmed' ? 'active' : ''}" data-val="confirmed">✅ 确认执行</span>
          <span class="radio-chip ${br.status === 'uncertain' ? 'active' : ''}" data-val="uncertain">❓ 备选方案</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">进度: <span id="br-progress-val">${br.progress || 0}</span>%</label>
        <input type="range" min="0" max="100" value="${br.progress || 0}" id="br-edit-progress" style="width:100%">
      </div>
      <div class="flex gap-2">
        <button class="btn btn-primary" style="flex:1" onclick="Views._confirmEditBranch('${lvlId}','${catId}','${brId}')">保存</button>
        <button class="btn btn-outline" style="color:var(--c-coral); border-color:var(--c-coral)" onclick="Views._deleteBranch('${lvlId}','${catId}','${brId}')">🗑️ 删除</button>
      </div>
    `, (c) => {
      c.querySelectorAll('#br-edit-status .radio-chip').forEach(chip => {
        chip.onclick = () => {
          c.querySelectorAll('#br-edit-status .radio-chip').forEach(x => x.classList.remove('active'));
          chip.classList.add('active');
        };
      });
      const slider = c.querySelector('#br-edit-progress');
      slider.oninput = () => { c.querySelector('#br-progress-val').textContent = slider.value; };
    });
  },

  _confirmEditBranch(lvlId, catId, brId) {
    const name = document.getElementById('br-edit-name').value.trim();
    const status = document.querySelector('#br-edit-status .active').dataset.val;
    const progress = parseInt(document.getElementById('br-edit-progress').value);
    const br = this._getBranch(lvlId, catId, brId);
    const oldName = br.name;
    br.name = name;
    br.status = status;
    br.progress = progress;
    Store.recordVersion('修改分支', `${oldName} → ${name}`);
    Store.save();
    Utils.closeModal();
    Router.render();
    Utils.toast('已更新', 'success');
  },

  _deleteBranch(lvlId, catId, brId) {
    const br = this._getBranch(lvlId, catId, brId);
    if (!confirm(`确定删除分支「${br.name}」？`)) return;
    const cat = this._getCategory(lvlId, catId);
    cat.branches = cat.branches.filter(b => b.id !== brId);
    Store.recordVersion('删除分支', br.name);
    Store.save();
    Utils.closeModal();
    Router.render();
    Utils.toast('已删除', 'success');
  },

  addTask(lvlId, catId, brId) {
    Utils.modal('添加任务', `
      <div class="form-group">
        <label class="form-label">任务名称</label>
        <input class="form-input" id="task-name-input" placeholder="如：每天做早餐">
      </div>
      <div class="form-group">
        <label class="form-label">初始进度: <span id="task-progress-val">0</span>%</label>
        <input type="range" min="0" max="100" value="0" id="task-progress-input" style="width:100%">
      </div>
      <button class="btn btn-primary btn-block" onclick="Views._confirmAddTask('${lvlId}','${catId}','${brId}')">添加</button>
    `, (c) => {
      c.querySelector('#task-name-input').focus();
      c.querySelector('#task-progress-input').oninput = (e) => {
        c.querySelector('#task-progress-val').textContent = e.target.value;
      };
    });
  },

  _confirmAddTask(lvlId, catId, brId) {
    const name = document.getElementById('task-name-input').value.trim();
    if (!name) { Utils.toast('请输入名称', 'warning'); return; }
    const progress = parseInt(document.getElementById('task-progress-input').value);
    const br = this._getBranch(lvlId, catId, brId);
    if (!br.tasks) br.tasks = [];
    br.tasks.push({ id: Utils.uid(), name, progress, records: [] });
    Store.recordVersion('添加任务', name);
    Store.save();
    Utils.closeModal();
    Router.render();
    Utils.toast('任务已添加', 'success');
  },

  editTask(lvlId, catId, brId, taskId) {
    const task = this._getTask(lvlId, catId, brId, taskId);
    let recordsHTML = '';
    if (task.records && task.records.length > 0) {
      recordsHTML = task.records.map(r => `
        <div class="log-item">
          <div class="log-info">
            <div class="log-time">${Utils.formatTime(r.time)} · ${Utils.timeAgo(r.time)}</div>
            ${r.amount ? `<div class="log-desc">完成量: ${Utils.escape(r.amount)}</div>` : ''}
            ${r.note ? `<div class="log-desc">${Utils.escape(r.note)}</div>` : ''}
          </div>
        </div>
      `).join('');
    }

    let stateHTML = '';
    if (task.stateLogs && task.stateLogs.length > 0) {
      stateHTML = task.stateLogs.map(s => `
        <div class="log-item">
          <div class="log-info">
            <div class="log-time">${s.phase === 'before' ? '🏃 开始前' : '✅ 结束后'} · ${Utils.formatTime(s.time)}</div>
            <div class="log-desc">${s.mood || ''} · 能量值 ${s.energy}/10</div>
            ${s.note ? `<div class="log-desc">${Utils.escape(s.note)}</div>` : ''}
          </div>
        </div>
      `).join('');
    }

    Utils.modal('编辑任务', `
      <div class="form-group">
        <label class="form-label">任务名称</label>
        <input class="form-input" id="task-edit-name" value="${Utils.escape(task.name)}">
      </div>
      <div class="form-group">
        <label class="form-label">进度: <span id="task-edit-pval">${task.progress || 0}</span>%</label>
        <input type="range" min="0" max="100" value="${task.progress || 0}" id="task-edit-progress" style="width:100%">
      </div>
      <div class="flex gap-2">
        <button class="btn btn-primary" style="flex:1" onclick="Views._confirmEditTask('${lvlId}','${catId}','${brId}','${taskId}')">保存</button>
        <button class="btn btn-outline" style="color:var(--c-coral); border-color:var(--c-coral)" onclick="Views._deleteTask('${lvlId}','${catId}','${brId}','${taskId}')">🗑️</button>
      </div>
      ${stateHTML ? `
      <div class="mt-3">
        <div class="card-title text-sm">📊 状态记录</div>
        ${stateHTML}
      </div>` : ''}
      <div class="mt-3">
        <div class="card-title text-sm">📋 记录历史</div>
        ${recordsHTML || '<div class="text-sm text-light text-center" style="padding:8px">暂无记录</div>'}
      </div>
    `, (c) => {
      c.querySelector('#task-edit-progress').oninput = (e) => {
        c.querySelector('#task-edit-pval').textContent = e.target.value;
      };
    });
  },

  _confirmEditTask(lvlId, catId, brId, taskId) {
    const name = document.getElementById('task-edit-name').value.trim();
    const progress = parseInt(document.getElementById('task-edit-progress').value);
    const task = this._getTask(lvlId, catId, brId, taskId);
    task.name = name;
    task.progress = progress;
    Store.recordVersion('修改任务', name);
    Store.save();
    Utils.closeModal();
    Router.render();
    Utils.toast('已更新', 'success');
  },

  _deleteTask(lvlId, catId, brId, taskId) {
    const task = this._getTask(lvlId, catId, brId, taskId);
    if (!confirm(`确定删除任务「${task.name}」？`)) return;
    const br = this._getBranch(lvlId, catId, brId);
    br.tasks = br.tasks.filter(t => t.id !== taskId);
    Store.recordVersion('删除任务', task.name);
    Store.save();
    Utils.closeModal();
    Router.render();
    Utils.toast('已删除', 'success');
  },

  recordProgress(lvlId, catId, brId, taskId) {
    const br = this._getBranch(lvlId, catId, brId);
    let task = taskId ? this._getTask(lvlId, catId, brId, taskId) : null;
    let taskSelectHTML = '';

    if (!taskId && br.tasks && br.tasks.length > 0) {
      taskSelectHTML = `
        <div class="form-group">
          <label class="form-label">选择任务</label>
          <select class="form-select" id="record-task-select">
            ${br.tasks.map(t => `<option value="${t.id}">${Utils.escape(t.name)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    Utils.modal('记录进度', `
      ${taskSelectHTML}
      <div class="form-group">
        <label class="form-label">完成量/描述</label>
        <input class="form-input" id="record-amount" placeholder="如：做了30分钟运动、读了20页书">
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" id="record-note" placeholder="可选"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">更新进度: <span id="record-progress-val">${task ? (task.progress || 0) : 0}</span>%</label>
        <input type="range" min="0" max="100" value="${task ? (task.progress || 0) : 0}" id="record-progress" style="width:100%">
      </div>
      <button class="btn btn-primary btn-block" onclick="Views._confirmRecord('${lvlId}','${catId}','${brId}','${taskId || ''}')">记录</button>
    `, (c) => {
      c.querySelector('#record-progress').oninput = (e) => {
        c.querySelector('#record-progress-val').textContent = e.target.value;
      };
      c.querySelector('#record-amount').focus();
    });
  },

  _confirmRecord(lvlId, catId, brId, taskId) {
    const amount = document.getElementById('record-amount').value.trim();
    const note = document.getElementById('record-note').value.trim();
    const progress = parseInt(document.getElementById('record-progress').value);

    let actualTaskId = taskId;
    if (!taskId) {
      const select = document.getElementById('record-task-select');
      if (!select || !select.value) { Utils.toast('请选择任务', 'warning'); return; }
      actualTaskId = select.value;
    }

    const task = this._getTask(lvlId, catId, brId, actualTaskId);
    if (!task.records) task.records = [];
    task.records.push({ time: new Date().toISOString(), amount, note });
    task.progress = progress;
    Store.recordVersion('记录进度', `${task.name} → ${progress}% ${amount ? '(' + amount + ')' : ''}`);
    Store.save();
    Utils.closeModal();
    Router.render();
    Utils.toast('已记录！', 'success');
  },

  _getLevel(lvlId) { return Store.data.plans.levels.find(l => l.id === lvlId); },
  _getCategory(lvlId, catId) { return this._getLevel(lvlId).categories.find(c => c.id === catId); },
  _getBranch(lvlId, catId, brId) { return this._getCategory(lvlId, catId).branches.find(b => b.id === brId); },
  _getTask(lvlId, catId, brId, taskId) { return this._getBranch(lvlId, catId, brId).tasks.find(t => t.id === taskId); },

  /* ----- AI 引导 ----- */
  startAIGuide(lvlId) {
    const lvl = this._getLevel(lvlId);
    AIGuide.start(lvl, null);
  },

  startAIGuideForCategory(lvlId, catId) {
    const lvl = this._getLevel(lvlId);
    const cat = this._getCategory(lvlId, catId);
    AIGuide.start(lvl, cat);
  },

  /* ----- 每日登记（滚雪球执行引导） ----- */
  daily(el) {
    const today = Utils.todayStr();
    const log = Store.data.dailyLogs[today] || { activities: [] };

    // 收集所有未完成任务
    const incompleteTasks = [];
    Store.data.plans.levels.forEach(lvl => {
      lvl.categories.forEach(cat => {
        (cat.branches || []).forEach(br => {
          if (br.status === 'confirmed') {
            (br.tasks || []).forEach(task => {
              if ((task.progress || 0) < 100) {
                incompleteTasks.push({
                  lvlId: lvl.id, lvlName: lvl.name,
                  catId: cat.id, catName: cat.name,
                  brId: br.id, brName: br.name,
                  taskId: task.id, taskName: task.name,
                  progress: task.progress || 0,
                });
              }
            });
          }
        });
      });
    });

    // 执行引导卡片
    let guideHTML = '';
    if (incompleteTasks.length > 0 && ExecGuide.currentTask) {
      const stillValid = incompleteTasks.find(t => t.taskId === ExecGuide.currentTask.taskId);
      const task = stillValid || null;
      if (task) {
      guideHTML = `
        <div class="card exec-guide-card">
          <div class="exec-guide-header">
            <span class="exec-guide-badge">🎯 当前任务</span>
            <span class="text-sm text-light">${incompleteTasks.length}个待完成</span>
          </div>
          <div class="exec-guide-task">
            <div class="exec-guide-path">${Utils.escape(task.lvlName)} › ${Utils.escape(task.catName)} › ${Utils.escape(task.brName)}</div>
            <div class="exec-guide-name">${Utils.escape(task.taskName)}</div>
            <div style="margin-top:6px">${Progress.progressBar(task.progress)}</div>
          </div>
          <div class="exec-guide-ai-tip" id="exec-ai-tip">
            ${ExecGuide.aiTip ? Utils.escape(ExecGuide.aiTip).replace(/\n/g,'<br>') : '点击下方按钮，AI 会给你执行建议。'}
          </div>
          <div class="exec-guide-actions">
            <button class="btn btn-primary exec-btn-done" onclick="ExecGuide.askAI()">💡 AI 给我提示</button>
            <button class="btn btn-secondary exec-btn-done" style="border-color:var(--c-teal); color:var(--c-teal)" onclick="ExecGuide.completeTask()">✅ 完成了</button>
            <button class="btn btn-secondary exec-btn-stuck" style="border-color:var(--c-coral); color:var(--c-coral)" onclick="ExecGuide.openDifficultyChat()">🆘 遇到困难</button>
            <button class="btn btn-secondary btn-sm" style="border-color:var(--c-lavender); color:var(--c-lavender)" onclick="ExecGuide.switchTask()">🔄 换任务</button>
          </div>
        </div>
      `;
      }
    }

    if (!guideHTML) {
      // 没有选中任务，显示选择界面
      guideHTML = `
        <div class="card exec-guide-card">
          <div class="exec-guide-header">
            <span class="exec-guide-badge">🎯 执行引导</span>
            ${incompleteTasks.length > 0 ? `<span class="text-sm text-light">${incompleteTasks.length}个待完成</span>` : ''}
          </div>
          ${incompleteTasks.length > 0 ? `
            <div class="text-sm text-light mb-2">今天想做什么？选一个任务开始，或者直接在下面登记。</div>
            <div style="max-height:200px; overflow-y:auto">
              ${incompleteTasks.slice(0, 10).map((t, i) => `
                <button class="btn btn-secondary btn-sm btn-block mb-2" style="text-align:left" onclick="ExecGuide._selectFromList(${i})">
                  <div class="font-bold text-sm">${Utils.escape(t.taskName)}</div>
                  <div class="text-sm text-light">${Utils.escape(t.lvlName)} › ${Utils.escape(t.catName)} (${t.progress}%)</div>
                </button>
              `).join('')}
            </div>
            ${incompleteTasks.length > 10 ? `<div class="text-sm text-light text-center mt-2">还有 ${incompleteTasks.length - 10} 个任务...</div>` : ''}
          ` : `
            <div class="empty-state">
              <div class="empty-state-icon">🎉</div>
              <div class="empty-state-text">所有任务都完成了！去计划页面添加新任务吧</div>
            </div>
          `}
        </div>
      `;
    }

    el.innerHTML = `
      <div class="daily-date">${Utils.formatDate(today)}</div>

      ${guideHTML}

      <div class="card">
        <div class="card-title">📋 今日计划</div>
        <textarea class="form-textarea" id="today-plan" placeholder="今天打算做什么？">${Utils.escape(log.plan || '')}</textarea>
        <div style="display:flex; gap:8px; margin-top:8px">
          <button class="btn btn-primary btn-sm" style="flex:1" onclick="Views.saveTodayPlan()">保存计划</button>
          ${Companion.hasCharacter() && AIClient.hasKey() ? `<button class="btn btn-secondary btn-sm" style="flex:1" onclick="Views.aiPlanToday()" id="ai-plan-btn">🤖 AI帮我规划</button>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-title">⚡ 快速登记</div>
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="Views.quickLog('wake')">☀️ 起床</button>
          <button class="btn btn-secondary btn-sm" onclick="Views.quickLog('meal')">🍽️ 用餐</button>
          <button class="btn btn-secondary btn-sm" onclick="Views.quickLog('work')">💼 工作</button>
          <button class="btn btn-secondary btn-sm" onclick="Views.quickLog('rest')">☕ 休息</button>
          <button class="btn btn-secondary btn-sm" onclick="Views.quickLog('exercise')">🏃 运动</button>
          <button class="btn btn-secondary btn-sm" onclick="Views.quickLog('study')">📚 学习</button>
          <button class="btn btn-secondary btn-sm" onclick="Views.quickLog('sleep')">😴 睡觉</button>
          <button class="btn btn-secondary btn-sm" onclick="Views.quickLog('custom')">✏️ 自定义</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">📝 今日记录 (${log.activities ? log.activities.length : 0})</div>
        ${log.activities && log.activities.length > 0 ? `
          ${log.activities.slice().reverse().map((a, i) => `
            <div class="log-item">
              <div class="log-icon" style="background:${this._activityColor(a.type)}">${this._activityIcon(a.type)}</div>
              <div class="log-info">
                <div class="log-type">${this._activityLabel(a.type)}</div>
                <div class="log-time">${a.mode === 'period' ? `${a.startTime||''}~${a.endTime||''} (${this._formatDuration(a.duration)})` : (a.time || '')}</div>
                ${(a.note || a.desc) ? `<div class="log-desc">${Utils.escape((a.note || a.desc))}</div>` : ''}
              </div>
              <button class="log-delete" onclick="Views.deleteActivity(${log.activities.length - 1 - i})">×</button>
            </div>
          `).join('')}
        ` : `
          <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <div class="empty-state-text">还没有记录，点击上方按钮开始</div>
          </div>
        `}
      </div>
    `;
  },

  /* ----- 陪伴（AI角色聊天 + 记账） ----- */
  companion(el) {
    const char = Store.data.aiCharacter;
    const hasChar = Companion.hasCharacter();
    const hasKey = AIClient.hasKey();
    const todaySpend = Companion.getTodaySpending();
    const today = Utils.todayStr();
    const log = Store.data.dailyLogs[today] || { activities: [] };
    const todayRecords = Companion.getTodayRecords();

    // 未设定角色时，引导设定
    if (!hasChar) {
      el.innerHTML = `
        <div class="card" style="text-align:center; padding:30px 20px">
          <div style="font-size:48px; margin-bottom:12px">${this.renderAvatar(char.avatar, 48)}</div>
          <div class="font-bold" style="font-size:18px; margin-bottom:8px">还没有设定 AI 伙伴</div>
          <div class="text-sm text-light mb-3">设定一个专属的 AI 角色，她会陪你聊天、监督你记账、学习和执行计划。</div>
          <button class="btn btn-primary btn-block" onclick="Views.openCharacterSetup()">✨ 设定我的 AI 伙伴</button>
          ${!hasKey ? `<div class="text-sm mt-3" style="color:var(--c-coral)">⚠️ 需要先在设置页配置 DeepSeek API Key</div>` : ''}
        </div>
      `;
      return;
    }

    // 进入页面时，若今天还没问过「今日重点」，先抛提问（写入历史，重渲染不会重复）
    Companion.maybeAskFocus();

    // 聊天历史
    const history = char.chatHistory || [];
    const chatHTML = history.length === 0 ? `
      <div class="companion-empty">
        <div style="font-size:36px; margin-bottom:8px">${this.renderAvatar(char.avatar, 36)}</div>
        <div class="text-sm text-light">和 ${Utils.escape(char.name)} 聊聊天吧～</div>
        <div class="text-sm text-light" style="margin-top:4px">告诉她你花了什么钱、学了什么、做了什么</div>
      </div>
    ` : history.slice(-50).map(m => this._renderChatBubble(m, char)).join('');

    el.innerHTML = `
      <!-- 角色信息条 -->
      <div class="companion-header">
        <div class="companion-avatar">${this.renderAvatar(char.avatar, 26)}</div>
        <div class="companion-info">
          <div class="companion-name">${Utils.escape(char.name)} ${char.relationship ? `<span class="companion-rel">${Utils.escape(char.relationship)}</span>` : ''}</div>
          <div class="companion-status">${hasKey ? '在线' : '⚠️ 未配置API'}</div>
        </div>
        <button class="icon-btn" onclick="Views.openCharacterSetup()" title="角色设定">⚙️</button>
      </div>

      <!-- 今日财务概览 -->
      <div class="companion-finance">
        <div class="companion-fin-item">
          <div class="companion-fin-val" style="color:var(--c-coral)" data-type="expense">-${todaySpend.expense}</div>
          <div class="companion-fin-label">今日支出</div>
        </div>
        <div class="companion-fin-item">
          <div class="companion-fin-val" style="color:var(--c-teal)" data-type="income">+${todaySpend.income}</div>
          <div class="companion-fin-label">今日收入</div>
        </div>
        <div class="companion-fin-item">
          <div class="companion-fin-val" style="color:${todaySpend.net >= 0 ? 'var(--c-teal)' : 'var(--c-coral)'}" data-type="net">${todaySpend.net >= 0 ? '+' : ''}${todaySpend.net}</div>
          <div class="companion-fin-label">净额</div>
        </div>
      </div>

      <!-- 今日重点 -->
      <div class="card mt-2">
        <div class="card-title">🎯 今日重点</div>
        ${this._focusCardHTML(char)}
      </div>

      <!-- 陪伴偏好 -->
      <div class="card mt-2">
        <div class="card-title">⚙️ 陪伴偏好</div>
        ${this._prefsCardHTML(char)}
      </div>

      <!-- 聊天区 -->
      <div class="companion-chat" id="companion-chat">
        ${chatHTML}
        <div id="companion-typing" style="display:none">
          <div class="ai-msg ai-msg-bot">
            <span class="ai-typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
          </div>
        </div>
      </div>

      <!-- 快捷按钮 -->
      <div class="companion-quickbar">
        <button class="companion-quick-btn" onclick="Views.quickExpense()">💸 记账</button>
        <button class="companion-quick-btn" onclick="Views.quickLog('meal')">🍽️ 用餐</button>
        <button class="companion-quick-btn" onclick="Views.quickLog('study')">📚 学习</button>
        <button class="companion-quick-btn" onclick="Views.quickLog('exercise')">🏃 运动</button>
        <button class="companion-quick-btn" onclick="Views.quickLog('sleep')">😴 睡觉</button>
        <button class="companion-quick-btn" onclick="Views.clearChat()">🗑️</button>
      </div>

      <!-- 输入栏 -->
      <div class="companion-input-bar">
        <input class="companion-input" id="companion-input" placeholder="对 ${Utils.escape(char.name)} 说点什么..." 
          onkeydown="if(event.key==='Enter')Views.sendCompanionMsg()">
        <button class="companion-send" onclick="Views.sendCompanionMsg()">➤</button>
      </div>

      <!-- 今日记账明细 -->
      ${todayRecords.length > 0 ? `
        <div class="card mt-3">
          <div class="card-title">💸 今日记账 (${todayRecords.length})</div>
          ${todayRecords.slice().reverse().map(r => `
            <div class="expense-item">
              <div class="expense-icon" style="background:${r.type === 'expense' ? 'rgba(255,107,107,0.1)' : 'rgba(78,205,196,0.1)'}">
                ${r.type === 'expense' ? '💸' : '💰'}
              </div>
              <div class="expense-info">
                <div class="expense-cat">${Utils.escape(r.category)}${r.note ? ' · ' + Utils.escape(r.note) : ''}</div>
                <div class="expense-time">${Utils.formatTime(r.time)}</div>
              </div>
              <div class="expense-amount" style="color:${r.type === 'expense' ? 'var(--c-coral)' : 'var(--c-teal)'}">
                ${r.type === 'expense' ? '-' : '+'}${r.amount}
              </div>
              <button class="log-delete" onclick="Views.deleteExpense('${r.id}')">×</button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- 今日活动记录 -->
      ${log.activities && log.activities.length > 0 ? `
        <div class="card">
          <div class="card-title">📝 今日活动 (${log.activities.length})</div>
          ${log.activities.slice().reverse().map((a, i) => `
            <div class="log-item">
              <div class="log-icon" style="background:${this._activityColor(a.type)}">${this._activityIcon(a.type)}</div>
              <div class="log-info">
                <div class="log-type">${this._activityLabel(a.type)}</div>
                <div class="log-time">${a.time || ''}</div>
                ${(a.note || a.desc) ? `<div class="log-desc">${Utils.escape((a.note || a.desc))}</div>` : ''}
              </div>
              <button class="log-delete" onclick="Views.deleteActivity(${log.activities.length - 1 - i})">×</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    // 滚到底部
    this._scrollChatToBottom();
    // 聚焦输入框
    setTimeout(() => {
      const input = document.getElementById('companion-input');
      if (input && history.length === 0) input.focus();
    }, 300);
  },

  _renderChatBubble(msg, char) {
    const isUser = msg.role === 'user';
    const time = Utils.formatTime(msg.time);
    if (isUser) {
      return `
        <div class="ai-msg ai-msg-user-wrap">
          <div class="ai-msg-user">${Utils.escape(msg.content)}</div>
          <div class="chat-time">${time}</div>
        </div>
      `;
    } else {
      return `
        <div class="ai-msg ai-msg-bot-wrap">
          <div class="chat-avatar">${this.renderAvatar(char.avatar, 18)}</div>
          <div>
            <div class="ai-msg-bot">${Utils.escape(msg.content).replace(/\n/g, '<br>')}</div>
            <div class="chat-time">${time}</div>
          </div>
        </div>
      `;
    }
  },

  _focusCardHTML(char) {
    const f = char.dailyFocus || {};
    const today = Utils.todayStr();
    if (!f.date || f.date !== today || !f.collected || !f.items || f.items.length === 0) {
      if (f.muted && f.date === today) return `<div class="text-sm text-light">今天已设为安静模式，不主动盯重点。</div>`;
      return `<div class="text-sm text-light">还没设定，在下面聊聊「今天想搞定什么」即可。</div>`;
    }
    return `<div>${f.items.map((x, i) => `<div class="focus-item">${i + 1}. ${Utils.escape(x)}</div>`).join('')}</div>`
      + (f.muted ? `<div class="text-xs text-light mt-1">（已静音，将不再主动追问）</div>` : '');
  },

  _prefsCardHTML(char) {
    const p = char.prefs || { tone: 'encouraging', pace: 'normal', quietHours: '', custom: '' };
    const toneOpt = (v, l) => `<option value="${v}" ${p.tone === v ? 'selected' : ''}>${l}</option>`;
    const paceOpt = (v, l) => `<option value="${v}" ${p.pace === v ? 'selected' : ''}>${l}</option>`;
    return `
      <div class="form-group">
        <label class="form-label">语气</label>
        <select class="form-input" id="pref-tone">
          ${toneOpt('encouraging', '鼓励打气')}${toneOpt('casual', '轻松随意')}${toneOpt('strict', '直接严格')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">节奏</label>
        <select class="form-input" id="pref-pace">
          ${paceOpt('normal', '正常')}${paceOpt('frequent', '多聊多提醒')}${paceOpt('quiet', '保持安静')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">勿扰时段（如 14:00-16:00，可选）</label>
        <input class="form-input" id="pref-quiet" value="${Utils.escape(p.quietHours || '')}" placeholder="14:00-16:00">
      </div>
      <div class="form-group">
        <label class="form-label">特别说明（可选）</label>
        <input class="form-input" id="pref-custom" value="${Utils.escape(p.custom || '')}" placeholder="比如：下午效率低别催">
      </div>
      <button class="btn btn-primary btn-block btn-sm" onclick="Views.saveCompanionPrefs()">保存偏好</button>
    `;
  },

  async saveCompanionPrefs() {
    const tone = document.getElementById('pref-tone');
    const pace = document.getElementById('pref-pace');
    const quiet = document.getElementById('pref-quiet');
    const custom = document.getElementById('pref-custom');
    if (!tone || !pace) return;
    Companion.setPrefs({
      tone: tone.value,
      pace: pace.value,
      quietHours: quiet ? quiet.value.trim() : '',
      custom: custom ? custom.value.trim() : '',
    });
    Utils.toast('陪伴偏好已保存', 'success');
    this._refreshCompanionStats();
  },

  _scrollChatToBottom() {
    const chat = document.getElementById('companion-chat');
    if (chat) chat.scrollTop = chat.scrollHeight;
  },

  async sendCompanionMsg() {
    const input = document.getElementById('companion-input');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg || Companion.sending) return;

    if (!AIClient.hasKey()) {
      Utils.toast('请先在设置页配置 API Key', 'warning');
      return;
    }

    input.value = '';

    // 立即渲染用户消息
    const char = Store.data.aiCharacter;
    let chat = document.getElementById('companion-chat');
    if (chat) {
      const userBubble = document.createElement('div');
      userBubble.innerHTML = this._renderChatBubble({ role: 'user', content: msg, time: new Date().toISOString() }, char);
      chat.appendChild(userBubble.firstElementChild);
      this._scrollChatToBottom();
    }

    // 显示 typing
    let typing = document.getElementById('companion-typing');
    if (typing) typing.style.display = 'block';
    this._scrollChatToBottom();

    // 发送
    try {
      const result = await Companion.send(msg);

      // 重新获取 DOM 元素（await 期间可能被重建）
      typing = document.getElementById('companion-typing');
      if (typing) typing.style.display = 'none';

      if (result) {
        // 统一从聊天历史重渲染：历史是唯一真相源，避免手动 append 的 bubble
        // 被后续 Router.render（如动作触发）冲掉导致「回复不弹出」
        this._refreshCompanionStats();
        // 动作结果提示（重渲染后追加，短暂展示）
        if (result.actionResults && result.actionResults.length > 0) {
          const chat2 = document.getElementById('companion-chat');
          if (chat2) {
            for (const a of result.actionResults) {
              const actionEl = document.createElement('div');
              actionEl.className = 'chat-action-notice';
              actionEl.innerHTML = `<span>${a.icon}</span> ${Utils.escape(a.text)}`;
              chat2.appendChild(actionEl);
            }
            this._scrollChatToBottom();
          }
        }
      }
    } catch (err) {
      typing = document.getElementById('companion-typing');
      if (typing) typing.style.display = 'none';
      chat = document.getElementById('companion-chat');
      if (chat) {
        const errBubble = document.createElement('div');
        errBubble.className = 'ai-msg ai-msg-bot-wrap';
        errBubble.innerHTML = `
          <div class="chat-avatar">${this.renderAvatar(Store.data.aiCharacter.avatar, 18)}</div>
          <div>
            <div class="ai-msg-bot" style="color:var(--c-coral)">（连接出了点问题：${Utils.escape(err.message)}）</div>
          </div>
        `;
        chat.appendChild(errBubble);
        this._scrollChatToBottom();
      }
    }
  },

  _refreshCompanionStats() {
    // 轻量刷新：重新渲染整个companion视图
    const el = document.getElementById('main-content');
    if (el && Router.current === 'companion') {
      // 保存当前输入框内容
      const input = document.getElementById('companion-input');
      const savedInput = input ? input.value : '';
      const chat = document.getElementById('companion-chat');
      const savedScroll = chat ? chat.scrollTop : 0;
      this.companion(el);
      const newInput = document.getElementById('companion-input');
      if (newInput && savedInput) newInput.value = savedInput;
      const newChat = document.getElementById('companion-chat');
      if (newChat) newChat.scrollTop = newChat.scrollHeight;
    }
  },

  quickExpense() {
    const cats = Store.data.accounting.categories.expense;
    Utils.modal('快速记账', `
      <div class="form-group">
        <label class="form-label">金额</label>
        <input class="form-input" type="number" id="exp-amount" placeholder="花了多少？" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">分类</label>
        <div class="radio-group" id="exp-cat-group">
          ${cats.map(c => `<span class="radio-chip" data-val="${c}">${c}</span>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">备注（可选）</label>
        <input class="form-input" id="exp-note" placeholder="买了什么？">
      </div>
      <button class="btn btn-primary btn-block" onclick="Views._confirmQuickExpense()">记录</button>
    `, (c) => {
      // 绑定分类选择
      c.querySelectorAll('#exp-cat-group .radio-chip').forEach(chip => {
        chip.onclick = () => {
          c.querySelectorAll('#exp-cat-group .radio-chip').forEach(x => x.classList.remove('active'));
          chip.classList.add('active');
        };
      });
      c.querySelector('#exp-amount').onkeydown = (e) => {
        if (e.key === 'Enter') Views._confirmQuickExpense();
      };
    });
  },

  async _confirmQuickExpense() {
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const catChip = document.querySelector('#exp-cat-group .active');
    const category = catChip ? catChip.dataset.val : '其他';
    const note = document.getElementById('exp-note').value.trim();

    if (!amount || amount <= 0) {
      Utils.toast('请输入金额', 'warning');
      return;
    }

    Utils.closeModal();
    Companion.addRecord('expense', amount, category, note);
    Utils.toast(`已记账 -${amount}元 ${category}`, 'success');

    // 如果有API，让AI评论
    if (AIClient.hasKey() && Companion.hasCharacter()) {
      const chatMsg = `（快捷记账）${category} ${amount}元${note ? '，'+note : ''}`;
      // 直接渲染用户消息
      const char = Store.data.aiCharacter;
      const chat = document.getElementById('companion-chat');
      if (chat) {
        const userBubble = document.createElement('div');
        userBubble.innerHTML = this._renderChatBubble({ role: 'user', content: chatMsg, time: new Date().toISOString() }, char);
        chat.appendChild(userBubble.firstElementChild);
        this._scrollChatToBottom();
      }
      const typing = document.getElementById('companion-typing');
      if (typing) typing.style.display = 'block';
      this._scrollChatToBottom();

      try {
        const result = await Companion.send(chatMsg);
        if (typing) typing.style.display = 'none';
        if (result && chat) {
          const botBubble = document.createElement('div');
          botBubble.innerHTML = this._renderChatBubble({ role: 'assistant', content: result.reply, time: new Date().toISOString() }, char);
          chat.appendChild(botBubble.firstElementChild);
          this._scrollChatToBottom();
        }
      } catch (e) {
        if (typing) typing.style.display = 'none';
      }
      this._refreshCompanionStats();
    } else {
      this._refreshCompanionStats();
    }
  },

  deleteExpense(id) {
    Companion.deleteRecord(id);
    this._refreshCompanionStats();
    Utils.toast('已删除', 'success');
  },

  clearChat() {
    if (confirm('确定清空聊天记录吗？')) {
      Companion.clearHistory();
      Router.render();
    }
  },

  /* ----- 渲染头像（emoji 或图片） ----- */
  renderAvatar(avatar, size) {
    if (!avatar) avatar = '🤖';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) {
      const sz = size || 26;
      return `<img src="${avatar}" class="avatar-img" style="width:${sz}px;height:${sz}px;border-radius:50%;object-fit:cover" alt="头像">`;
    }
    return avatar;
  },

  /* ----- 角色设定 ----- */
  openCharacterSetup() {
    const char = Store.data.aiCharacter;
    const avatars = ['🤖', '👧', '👦', '👩', '👨', '🐱', '🐰', '🦊', '🐻', '🐼', '🌟', '🌙', '🌸', '💎', '🔥', '⚡', '🎯', '🦄', '🐧', '🦉'];
    const isImg = char.avatar && (char.avatar.startsWith('data:') || char.avatar.startsWith('http'));

    Utils.modal('AI 伙伴设定', `
      <div class="form-group">
        <label class="form-label">头像</label>
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px">
          <div class="avatar-preview-box" id="avatar-preview-box">
            ${isImg ? `<img src="${char.avatar}" class="avatar-img" style="width:48px;height:48px;border-radius:50%;object-fit:cover">` : `<span style="font-size:32px">${char.avatar || '🤖'}</span>`}
          </div>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('avatar-file-input').click()">📷 上传图片</button>
          <input type="file" id="avatar-file-input" accept="image/*" style="display:none" onchange="Views.handleAvatarUpload(this)">
        </div>
        <div style="font-size:12px; color:var(--text-light); margin-bottom:6px">或选择 emoji：</div>
        <div class="avatar-picker" id="avatar-picker">
          ${avatars.map(a => `<span class="avatar-option ${!isImg && char.avatar === a ? 'active' : ''}" data-val="${a}">${a}</span>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">名字</label>
        <input class="form-input" id="char-name" value="${Utils.escape(char.name)}" placeholder="给她起个名字">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">她称呼你为</label>
          <input class="form-input" id="char-user-nick" value="${Utils.escape(char.userNickname)}" placeholder="如：主人、哥哥、同学">
        </div>
        <div class="form-group">
          <label class="form-label">你称呼她为</label>
          <input class="form-input" id="char-ai-nick" value="${Utils.escape(char.aiNickname)}" placeholder="如：小可爱、学姐">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">你们的关系</label>
        <input class="form-input" id="char-rel" value="${Utils.escape(char.relationship)}" placeholder="如：青梅竹马、学姐学弟、同居室友">
      </div>
      <div class="form-group">
        <label class="form-label">世界观设定</label>
        <textarea class="form-textarea" id="char-world" placeholder="你和角色所处的世界观背景，不是现实世界。如：这是一个魔法学院的世界，你是学生，她是你的学姐...">${Utils.escape(char.worldview)}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">你在世界观里的人设</label>
        <textarea class="form-textarea" id="char-user-persona" placeholder="你在上面那个世界观里是谁？性格、身份、特点等">${Utils.escape(char.userPersona)}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">角色介绍</label>
        <textarea class="form-textarea" id="char-desc" placeholder="详细描述角色的性格、说话方式、行为习惯等。AI会根据这个来扮演角色">${Utils.escape(char.characterDesc)}</textarea>
      </div>
      <button class="btn btn-primary btn-block" onclick="Views.saveCharacter()">保存角色</button>
      ${char.chatHistory && char.chatHistory.length > 0 ? `<button class="btn btn-outline btn-block mt-2" style="color:var(--c-coral); border-color:var(--c-coral)" onclick="Views.clearChat()">清空聊天记录</button>` : ''}
    `, (c) => {
      // 绑定 emoji 头像选择
      c.querySelectorAll('.avatar-option').forEach(opt => {
        opt.onclick = () => {
          c.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
          // 清除上传的图片预览
          c.querySelector('#avatar-preview-box').innerHTML = `<span style="font-size:32px">${opt.dataset.val}</span>`;
          c.dataset.uploadedAvatar = '';
        };
      });
    });
  },

  handleAvatarUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      Utils.toast('图片太大了，请选 1MB 以内的图片', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      // 更新预览
      const box = document.getElementById('avatar-preview-box');
      if (box) box.innerHTML = `<img src="${dataUrl}" class="avatar-img" style="width:48px;height:48px;border-radius:50%;object-fit:cover">`;
      // 取消 emoji 选中
      document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('active'));
      // 暂存到 modal 容器上
      const modal = document.getElementById('modal-container');
      if (modal) modal.dataset.uploadedAvatar = dataUrl;
    };
    reader.readAsDataURL(file);
  },

  saveCharacter() {
    const c = Store.data.aiCharacter;
    const modal = document.getElementById('modal-container');
    const uploadedAvatar = modal ? modal.dataset.uploadedAvatar : '';
    if (uploadedAvatar) {
      c.avatar = uploadedAvatar;
    } else {
      const avatarEl = document.querySelector('.avatar-option.active');
      c.avatar = avatarEl ? avatarEl.dataset.val : (c.avatar || '🤖');
    }
    c.name = document.getElementById('char-name').value.trim();
    c.userNickname = document.getElementById('char-user-nick').value.trim();
    c.aiNickname = document.getElementById('char-ai-nick').value.trim();
    c.relationship = document.getElementById('char-rel').value.trim();
    c.worldview = document.getElementById('char-world').value.trim();
    c.userPersona = document.getElementById('char-user-persona').value.trim();
    c.characterDesc = document.getElementById('char-desc').value.trim();
    Store.save();
    Utils.closeModal();
    Utils.toast('角色已保存！', 'success');
    Router.render();
  },

  saveTodayPlan() {
    const today = Utils.todayStr();
    if (!Store.data.dailyLogs[today]) Store.data.dailyLogs[today] = { activities: [] };
    Store.data.dailyLogs[today].plan = document.getElementById('today-plan').value.trim();
    Store.save();
    Utils.toast('计划已保存', 'success');
  },

  async aiPlanToday() {
    const btn = document.getElementById('ai-plan-btn');
    if (btn) { btn.disabled = true; btn.textContent = '🤖 规划中...'; }

    const tasks = ExecGuide.getIncompleteTasks();
    if (tasks.length === 0) {
      Utils.toast('没有未完成的任务可以规划', 'warning');
      if (btn) { btn.disabled = false; btn.textContent = '🤖 AI帮我规划'; }
      return;
    }

    const now = new Date();
    const hour = now.getHours();
    const taskList = tasks.map(t => `- ${t.taskName}（${t.brName}，进度${t.progress}%）`).join('\n');

    const today = Utils.todayStr();
    const todayLog = Store.data.dailyLogs[today] || {};
    const doneActivities = (todayLog.activities || []).map(a => {
      const label = this._activityLabel(a.type);
      return `- ${a.time} ${label}${(a.note || a.desc) ? '：'+(a.note || a.desc) : ''}`;
    }).join('\n');

    const prompt = `现在是${hour}点。以下是用户未完成的任务：
${taskList}

${doneActivities ? `今天已经做过的事：\n${doneActivities}\n` : '今天还没有任何记录。\n'}
请根据剩余时间和任务优先级，生成一个简洁的今日计划。格式要求：
- 每行一个任务，格式为"时间 任务名"
- 只排还没做的，已完成的不要排
- 考虑用户精力：上午适合高强度脑力，下午适合中等强度，晚上适合轻松的
- 不要排超过4个任务，少即是多
- 直接输出计划，不要解释，不要加标题`;

    try {
      const result = await AIClient.callChat([{ role: 'user', content: prompt }], '你是一个简洁的日程规划助手，只输出计划本身，不废话。');
      const textarea = document.getElementById('today-plan');
      if (textarea && result) {
        textarea.value = result;
        // 自动保存
        if (!Store.data.dailyLogs[today]) Store.data.dailyLogs[today] = { activities: [] };
        Store.data.dailyLogs[today].plan = result;
        Store.save();
        Utils.toast('AI规划完成，已自动保存', 'success');
      }
    } catch (e) {
      console.error('AI plan error:', e);
      Utils.toast('AI规划失败：' + (e.message || '未知错误'), 'error');
    }
    if (btn) { btn.disabled = false; btn.textContent = '🤖 AI帮我规划'; }
  },

  // AI 语义归类：把用户自定义登记文本归到最贴合的计划大类（需 DeepSeek Key）
  async classifyActivity(text) {
    if (!AIClient.hasKey()) return null;
    const levels = Store.data.plans.levels || [];
    if (levels.length === 0) return null;
    const summary = levels.map(l => ({
      lvlId: l.id, lvlName: l.name,
      categories: (l.categories || []).map(c => ({ catId: c.id, catName: c.name, notes: c.userNotes || '' }))
    }));
    const prompt = `你是一个计划分类助手。以下是用户的计划体系（马斯洛五层，每层含若干大类）：\n${JSON.stringify(summary, null, 2)}\n\n用户刚登记了一条自定义活动："${text}"。\n请判断这条活动最贴合上述哪个大类（category）。\n严格只输出一个 JSON 对象，格式：{"lvlId":"层id","catId":"类id","reason":"一句话依据"}。\n若无法匹配任何已有大类，输出 {"lvlId":null,"catId":null,"reason":"未匹配"}。`;
    try {
      const raw = await AIClient.callChat([{ role: 'user', content: prompt }], { system: '你是计划分类助手，严格只输出JSON，不要任何解释文字。', temperature: 0.3, maxTokens: 200 });
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return null;
      const obj = JSON.parse(m[0]);
      if (!obj.catId) return null;
      const lvl = levels.find(l => l.id === obj.lvlId);
      const cat = lvl && (lvl.categories || []).find(c => c.id === obj.catId);
      if (!cat) return null;
      return { lvlId: obj.lvlId, catId: obj.catId, catName: cat.name, reason: obj.reason || '' };
    } catch (e) {
      return null;
    }
  },

  quickLog(type) {
    const today = Utils.todayStr();
    if (!Store.data.dailyLogs[today]) Store.data.dailyLogs[today] = { activities: [] };

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const labels = { sleep:'😴 睡觉', wake:'☀️ 起床', meal:'🍽️ 用餐', work:'💼 工作', rest:'☕ 休息', exercise:'🏃 运动', study:'📚 学习', custom:'✏️ 自定义' };
    const title = labels[type] || '记录';
    const plainNames = { sleep:'睡觉', wake:'起床', meal:'用餐', work:'工作', rest:'休息', exercise:'运动', study:'学习', custom:'' };

    // 项目类登记（学习/工作/XX）显示「项目统称 + 补充」；睡眠/起床仅显示备注
    const isProject = ['study','work','meal','exercise','rest','custom'].includes(type);
    let fieldsHTML;
    if (isProject) {
      fieldsHTML = `
      <div class="form-group">
        <label class="form-label">项目统称</label>
        <input class="form-input" id="custom-name" value="${Utils.escape(plainNames[type] || '')}" placeholder="例如：学习 / 工作 / 项目名">
      </div>
      <div class="form-group">
        <label class="form-label">补充（可选，输入具体细节）</label>
        <input class="form-input" id="custom-note" placeholder="例如：高数复习 / 项目方案初稿">
      </div>`;
    } else {
      fieldsHTML = `
      <div class="form-group">
        <label class="form-label">备注（可选）</label>
        <input class="form-input" id="custom-note" placeholder="补充说明...">
      </div>`;
    }

    Utils.modal(title, `
      ${fieldsHTML}
      <div class="form-group">
        <label class="form-label">时间</label>
        <div style="display:flex; gap:8px">
          <button class="btn btn-secondary btn-sm time-mode-btn active" data-mode="point" style="flex:1" onclick="Views._switchTimeMode('point')">⏰ 时间点</button>
          <button class="btn btn-secondary btn-sm time-mode-btn" data-mode="period" style="flex:1" onclick="Views._switchTimeMode('period')">⏱️ 时间段</button>
        </div>
      </div>
      <div id="time-point-group" class="form-group">
        <input class="form-input" type="time" id="custom-time" value="${timeStr}">
      </div>
      <div id="time-period-group" class="form-group hidden">
        <div style="display:flex; gap:8px; align-items:center">
          <input class="form-input" type="time" id="custom-time-start" value="${timeStr}">
          <span class="text-light">~</span>
          <input class="form-input" type="time" id="custom-time-end" value="${timeStr}">
        </div>
        <div class="text-sm text-light mt-2" id="period-duration"></div>
      </div>
      <button class="btn btn-primary btn-block" onclick="Views._confirmQuickLog('${type}')">记录</button>
    `, (c) => {
      const noteEl = c.querySelector('#custom-note');
      if (noteEl) noteEl.onkeydown = (e) => {
        if (e.key === 'Enter') Views._confirmQuickLog(type);
      };
      const updateDuration = () => {
        const start = c.querySelector('#custom-time-start').value;
        const end = c.querySelector('#custom-time-end').value;
        const durEl = c.querySelector('#period-duration');
        if (start && end) {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          let mins = (eh * 60 + em) - (sh * 60 + sm);
          if (mins < 0) mins += 24 * 60;
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          durEl.textContent = `时长：${h > 0 ? h + '小时' : ''}${m > 0 ? m + '分钟' : ''}`;
        }
      };
      c.querySelector('#custom-time-start').onchange = updateDuration;
      c.querySelector('#custom-time-end').onchange = updateDuration;
    });
  },

  _switchTimeMode(mode) {
    document.querySelectorAll('.time-mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.time-mode-btn[data-mode="${mode}"]`).classList.add('active');
    const pointGroup = document.getElementById('time-point-group');
    const periodGroup = document.getElementById('time-period-group');
    if (mode === 'point') {
      pointGroup.classList.remove('hidden');
      periodGroup.classList.add('hidden');
    } else {
      pointGroup.classList.add('hidden');
      periodGroup.classList.remove('hidden');
    }
  },

  async _confirmQuickLog(type) {
    const nameEl = document.getElementById('custom-name');
    const noteEl = document.getElementById('custom-note');
    const name = (nameEl && nameEl.value || '').trim();
    const note = (noteEl && noteEl.value || '').trim();
    const desc = `${name} ${note}`.trim() || name || note || '自定义活动';
    const today = Utils.todayStr();
    if (!Store.data.dailyLogs[today]) Store.data.dailyLogs[today] = { activities: [] };
    const log = Store.data.dailyLogs[today];
    if (!log.activities) log.activities = [];

    const periodGroup = document.getElementById('time-period-group');
    const isPeriod = periodGroup && !periodGroup.classList.contains('hidden');
    const labels = { sleep:'睡觉', wake:'起床', meal:'用餐', work:'工作', rest:'休息', exercise:'运动', study:'学习', plan:'计划', custom:'其他' };

    // 先抓取时间/描述，避免 closeModal 后 DOM 失效
    let timeVal = '', startVal = '', endVal = '';
    if (isPeriod) {
      startVal = document.getElementById('custom-time-start').value;
      endVal = document.getElementById('custom-time-end').value;
      timeVal = startVal + '~' + endVal;
    } else {
      timeVal = document.getElementById('custom-time').value;
    }

    let activity;
    if (isPeriod) {
      const [sh, sm] = startVal.split(':').map(Number);
      const [eh, em2] = endVal.split(':').map(Number);
      let mins = (eh2 * 60 + em2) - (sh * 60 + sm);
      if (mins < 0) mins += 24 * 60;
      activity = { type, mode: 'period', time: timeVal, startTime: startVal, endTime: endVal, duration: mins, name, note, desc };
    } else {
      activity = { type, mode: 'point', time: timeVal, name, note, desc };
    }
    log.activities.push(activity);

    // 项目类登记（学习/工作/自定义等）：有 Key -> AI 理解语义并归入对应目标进度；无 Key -> 仅记录并提示
    const aiTypes = ['study','work','meal','exercise','rest','custom'];
    if (aiTypes.includes(type)) {
      if (AIClient.hasKey()) {
        const cls = await this.classifyActivity(desc);
        if (cls) {
          activity.goalLvlId = cls.lvlId;
          activity.goalCatId = cls.catId;
          activity.countsAsDone = true;
          activity.goalReason = cls.reason;
          const detail = note ? `（${note}）` : '';
          Utils.toast('已归类到「' + cls.catName + '」' + detail + ' 并计入进度 🎯', 'success');
        } else {
          Utils.toast('已记录（未匹配到合适目标，可去计划页手动关联）', 'success');
        }
      } else {
        Utils.toast('已记录（未配置 Key：登记暂未计入进度。去设置填 DeepSeek Key 后可自动归类）', 'info');
      }
    }

    Store.save();
    Utils.closeModal();

    if (Companion.hasCharacter() && AIClient.hasKey()) {
      const detail = [labels[type] || type, note].filter(Boolean).join('：');
      const activityDesc = isPeriod
        ? '（快捷记录）' + detail + '，' + startVal + '到' + endVal
        : '（快捷记录）' + detail;
      Views._notifyCompanion(activityDesc);
    } else {
      Router.render();
    }
  },



  async _notifyCompanion(msg) {
    const char = Store.data.aiCharacter;
    // 不做全量 Router.render()，只更新统计数字
    this._refreshCompanionStatsLight();
    // 渲染用户消息
    let chat = document.getElementById('companion-chat');
    if (!chat) return;
    const userBubble = document.createElement('div');
    userBubble.innerHTML = this._renderChatBubble({ role: 'user', content: msg, time: new Date().toISOString() }, char);
    chat.appendChild(userBubble.firstElementChild);
    this._scrollChatToBottom();

    let typing = document.getElementById('companion-typing');
    if (typing) typing.style.display = 'block';
    this._scrollChatToBottom();

    try {
      const result = await Companion.send(msg);
      // 重新获取元素
      typing = document.getElementById('companion-typing');
      if (typing) typing.style.display = 'none';
      chat = document.getElementById('companion-chat');
      if (result && chat) {
        const botBubble = document.createElement('div');
        botBubble.innerHTML = this._renderChatBubble({ role: 'assistant', content: result.reply, time: new Date().toISOString() }, Store.data.aiCharacter);
        chat.appendChild(botBubble.firstElementChild);

        // 渲染动作结果
        if (result.actionResults && result.actionResults.length > 0) {
          for (const a of result.actionResults) {
            const actionEl = document.createElement('div');
            actionEl.className = 'chat-action-notice';
            actionEl.innerHTML = `<span>${a.icon}</span> ${Utils.escape(a.text)}`;
            chat.appendChild(actionEl);
          }
        }

        this._scrollChatToBottom();

        // 延迟刷新统计
        if (result.actionResults && result.actionResults.length > 0) {
          setTimeout(() => { this._refreshCompanionStatsLight(); }, 1000);
        }
      }
    } catch (e) {
      typing = document.getElementById('companion-typing');
      if (typing) typing.style.display = 'none';
    }
  },

  // 轻量刷新统计数字（不重建DOM）
  _refreshCompanionStatsLight() {
    const todaySpend = Companion.getTodaySpending();
    const finExpense = document.querySelector('.companion-fin-val[data-type="expense"]');
    const finIncome = document.querySelector('.companion-fin-val[data-type="income"]');
    const finNet = document.querySelector('.companion-fin-val[data-type="net"]');
    if (finExpense) finExpense.textContent = `-${todaySpend.expense}`;
    if (finIncome) finIncome.textContent = `+${todaySpend.income}`;
    if (finNet) {
      finNet.textContent = `${todaySpend.net >= 0 ? '+' : ''}${todaySpend.net}`;
      finNet.style.color = todaySpend.net >= 0 ? 'var(--c-teal)' : 'var(--c-coral)';
    }
  },

  _formatDuration(mins) {
    if (!mins || mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h${m}min`;
    if (h > 0) return `${h}h`;
    return `${m}min`;
  },

  deleteActivity(idx) {
    const today = Utils.todayStr();
    const log = Store.data.dailyLogs[today];
    if (log && log.activities) {
      log.activities.splice(idx, 1);
      Store.save();
      Router.render();
      Utils.toast('已删除', 'success');
    }
  },

  /* ----- 设置 ----- */
  settings(el) {
    const s = Store.data.settings;
    const char = Store.data.aiCharacter;
    el.innerHTML = `
      <div class="card" style="border:1.5px solid var(--c-lavender); background:rgba(196,167,231,0.05)">
        <div class="card-title">💬 AI 伙伴设定</div>
        <div class="flex items-center gap-3 mb-2">
          <div style="font-size:36px">${this.renderAvatar(char.avatar, 36)}</div>
          <div>
            <div class="font-bold">${char.name ? Utils.escape(char.name) : '未设定'}</div>
            <div class="text-sm text-light">${char.relationship ? Utils.escape(char.relationship) : '点击下方按钮设定你的AI伙伴'}</div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm btn-block" onclick="Views.openCharacterSetup()">✨ ${char.name ? '修改角色设定' : '设定 AI 伙伴'}</button>
        <p class="text-sm text-light mt-2">设定头像、名字、称呼、关系、世界观、人设等。AI 会根据设定扮演角色，陪你聊天、监督记账和学习。</p>
      </div>

      <div class="card" style="border:1.5px solid var(--c-teal); background:rgba(78,205,196,0.05)">
        <div class="card-title">🤖 AI 引擎设置</div>
        <p class="text-sm text-light mb-2">选择 AI 服务商并配置 API Key，即可使用真正的 AI 语义分析。</p>

        <div class="form-group">
          <label class="form-label">服务商</label>
          <select class="form-select" id="ai-provider" onchange="Views.onProviderChange()">
            <option value="deepseek" ${s.aiProvider === 'deepseek' ? 'selected' : ''}>DeepSeek（国内直连，推荐）</option>
            <option value="groq" ${s.aiProvider === 'groq' ? 'selected' : ''}>Groq（免费额度大）</option>
            <option value="gemini" ${s.aiProvider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" id="key-label">Groq API Key</label>
          <input class="form-input" id="ai-key" type="password" value="${Utils.escape(s.aiProvider === 'gemini' ? (s.geminiApiKey||'') : s.aiProvider === 'deepseek' ? (s.deepseekApiKey||'') : (s.groqApiKey||''))}" placeholder="粘贴你的 API Key">
        </div>

        <div class="form-group">
          <label class="form-label">模型</label>
          <select class="form-select" id="ai-model">
          </select>
        </div>

        <button class="btn btn-primary btn-sm btn-block" onclick="Views.saveAIKey()">保存 API 设置</button>
        <button class="btn btn-secondary btn-sm btn-block mt-2" onclick="Views.testAIKey()">测试连接</button>
        <p class="text-sm mt-2" id="ai-test-result"></p>

        <details class="mt-2">
          <summary class="text-sm text-light">如何获取 API Key？</summary>
          <div class="text-sm text-light" style="padding:8px 0; line-height:1.8" id="key-help">
          </div>
        </details>
      </div>

      <div class="card">
        <div class="card-title">🔔 提醒设置</div>
        <div class="form-group">
          <label class="form-label">提醒间隔</label>
          <div class="radio-group" id="interval-group">
            ${[15, 30, 60, 120].map(v => `
              <span class="radio-chip ${s.reminderInterval === v ? 'active' : ''}" data-val="${v}">${v < 60 ? v + '分钟' : (v/60) + '小时'}</span>
            `).join('')}
          </div>
        </div>
        <div class="flex items-center justify-between" style="padding:8px 0">
          <span class="text-sm font-bold">启用提醒</span>
          <label class="switch">
            <input type="checkbox" id="reminder-enabled" ${s.reminderEnabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        <div class="flex items-center justify-between" style="padding:8px 0">
          <span class="text-sm font-bold">提醒声音</span>
          <label class="switch">
            <input type="checkbox" id="sound-enabled" ${s.soundEnabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        <button class="btn btn-primary btn-sm btn-block mt-2" onclick="Views.saveSettings()">保存设置</button>
      </div>

      <div class="card">
        <div class="card-title">🔔 通知权限</div>
        <p class="text-sm text-light mb-2">需要授权通知权限才能收到提醒</p>
        <button class="btn btn-secondary btn-sm btn-block" onclick="Views.requestNotifyPermission()">请求通知权限</button>
        <p class="text-sm mt-2" id="notify-status"></p>
      </div>

      <div class="card">
        <div class="card-title">💾 数据管理</div>
        <button class="btn btn-secondary btn-sm btn-block mb-2" onclick="Views.exportData()">📤 导出数据</button>
        <button class="btn btn-secondary btn-sm btn-block mb-2" onclick="Views.importData()">📥 导入数据</button>
        <button class="btn btn-outline btn-sm btn-block" style="color:var(--c-coral); border-color:var(--c-coral)" onclick="Views.clearData()">🗑️ 清空所有数据</button>
      </div>

      <div class="card">
        <div class="card-title">📱 安装应用</div>
        <p class="text-sm text-light mb-2">将本应用安装到手机主屏幕，像原生APP一样使用</p>
        <button class="btn btn-primary btn-sm btn-block" id="install-btn" onclick="App.install()">安装到主屏幕</button>
      </div>

      <div class="card text-center">
        <div style="font-size:24px; margin-bottom:4px">🎯</div>
        <div class="text-sm font-bold">原子习惯 v1.0</div>
        <div class="text-sm text-light">由 Hyuna 为 Ricky 打造</div>
      </div>
    `;

    // 绑定间隔选择
    el.querySelectorAll('#interval-group .radio-chip').forEach(chip => {
      chip.onclick = () => {
        el.querySelectorAll('#interval-group .radio-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      };
    });

    // 通知状态
    if ('Notification' in window) {
      const status = Notification.permission === 'granted' ? '✅ 已授权' : Notification.permission === 'denied' ? '❌ 已拒绝' : '⏳ 未授权';
      document.getElementById('notify-status').textContent = '当前状态: ' + status;
    } else {
      document.getElementById('notify-status').textContent = '⚠️ 浏览器不支持通知';
    }

    // 初始化 AI 引擎下拉（模型列表 + 帮助文本）
    this.onProviderChange();
    // 选中当前保存的模型
    const modelSel = document.getElementById('ai-model');
    if (modelSel && s.aiModel) modelSel.value = s.aiModel;
  },

  saveSettings() {
    const s = Store.data.settings;
    const intervalChip = document.querySelector('#interval-group .active');
    s.reminderInterval = intervalChip ? parseInt(intervalChip.dataset.val) : 30;
    s.reminderEnabled = document.getElementById('reminder-enabled').checked;
    s.soundEnabled = document.getElementById('sound-enabled').checked;
    Store.save();
    Reminder.restart();
    Utils.toast('设置已保存', 'success');
  },

  // 切换服务商时更新模型列表和帮助文本
  onProviderChange() {
    const provider = document.getElementById('ai-provider').value;
    const cfg = AIClient.PROVIDERS[provider];
    // 更新模型下拉
    const modelSel = document.getElementById('ai-model');
    modelSel.innerHTML = cfg.models.map(m => `<option value="${m.id}">${m.label}</option>`).join('');
    // 更新 key label
    document.getElementById('key-label').textContent = `${cfg.name} API Key`;
    // 更新帮助文本
    const help = document.getElementById('key-help');
    if (provider === 'deepseek') {
      help.innerHTML = `1. 打开 <a href="https://platform.deepseek.com/api_keys" target="_blank">https://platform.deepseek.com/api_keys</a><br>
        2. 注册/登录（手机号或微信扫码）<br>
        3. 点「创建 API Key」→ 复制<br>
        4. 粘贴到上方输入框<br>
        5. 新用户送 ¥10 余额，DeepSeek-V3 约 ¥1/百万 tokens<br>
        6. 国内直连，不需要翻墙`;
    } else if (provider === 'groq') {
      help.innerHTML = `1. 打开 <a href="https://console.groq.com/keys" target="_blank">https://console.groq.com/keys</a><br>
        2. 登录（支持 Google 账号）<br>
        3. 点「Create API Key」<br>
        4. 复制 Key 粘贴到上方<br>
        5. 免费额度：Llama 3.3 70B 每天 1000 次，8B 无限`;
    } else {
      help.innerHTML = `1. 打开 <a href="https://aistudio.google.com/apikey" target="_blank">Google AI Studio</a><br>
        2. 登录 Google 账号<br>
        3. 点「Get API Key」→ 创建<br>
        4. 复制 Key 粘贴到上方<br>
        5. Gemini 2.0 Flash 免费，每天 1500 次`;
    }
    // 切换时回填已存的 key
    const keyInput = document.getElementById('ai-key');
    const savedKey = provider === 'gemini' ? Store.data.settings.geminiApiKey : provider === 'deepseek' ? Store.data.settings.deepseekApiKey : Store.data.settings.groqApiKey;
    keyInput.value = savedKey || '';
  },

  saveAIKey() {
    const provider = document.getElementById('ai-provider').value;
    const key = document.getElementById('ai-key').value.trim();
    const model = document.getElementById('ai-model').value;
    Store.data.settings.aiProvider = provider;
    Store.data.settings.aiModel = model;
    if (provider === 'gemini') {
      Store.data.settings.geminiApiKey = key;
    } else if (provider === 'deepseek') {
      Store.data.settings.deepseekApiKey = key;
    } else {
      Store.data.settings.groqApiKey = key;
    }
    Store.save();
    Utils.toast(key ? `${AIClient.PROVIDERS[provider].name} 引擎已配置` : 'AI 引擎已清除', 'success');
  },

  async testAIKey() {
    const provider = document.getElementById('ai-provider').value;
    const key = document.getElementById('ai-key').value.trim();
    const model = document.getElementById('ai-model').value;
    if (!key) { Utils.toast('请先填写 API Key', 'warning'); return; }
    // 临时设置当前选择的值，以便 AIClient 使用
    const oldProvider = Store.data.settings.aiProvider;
    const oldModel = Store.data.settings.aiModel;
    Store.data.settings.aiProvider = provider;
    Store.data.settings.aiModel = model;
    if (provider === 'gemini') Store.data.settings.geminiApiKey = key;
    else if (provider === 'deepseek') Store.data.settings.deepseekApiKey = key;
    else Store.data.settings.groqApiKey = key;

    const el = document.getElementById('ai-test-result');
    if (el) el.textContent = `⏳ 正在测试 ${AIClient.PROVIDERS[provider].name} 连接...`;
    try {
      const resp = await AIClient.call('回复"OK"两个字符即可', { temperature: 0 });
      if (el) el.textContent = `✅ ${AIClient.PROVIDERS[provider].name} 连接成功！AI 引擎已就绪`;
      Utils.toast('连接成功', 'success');
      // 测试成功，保存设置
      Views.saveAIKey();
    } catch (err) {
      if (el) el.textContent = '❌ ' + err.message;
      Utils.toast('连接失败', 'error');
      // 恢复旧设置
      Store.data.settings.aiProvider = oldProvider;
      Store.data.settings.aiModel = oldModel;
    }
  },

  async requestNotifyPermission() {
    if (!('Notification' in window)) { Utils.toast('浏览器不支持通知', 'error'); return; }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      Utils.toast('通知已授权', 'success');
      new Notification('提醒已开启', { body: '我会每' + Store.data.settings.reminderInterval + '分钟提醒你记录进度' });
    } else {
      Utils.toast('通知被拒绝', 'warning');
    }
    Router.render();
  },

  exportData() {
    const blob = new Blob([JSON.stringify(Store.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-exec-backup-${Utils.todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Utils.toast('数据已导出', 'success');
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (confirm('导入将覆盖当前数据，确定？')) {
            Store.data = data;
            Store.save();
            Router.render();
            Utils.toast('导入成功', 'success');
          }
        } catch (err) {
          Utils.toast('文件格式错误', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  clearData() {
    if (!confirm('⚠️ 确定清空所有数据？此操作不可恢复！')) return;
    if (!confirm('再次确认：所有计划、记录、个人信息都将被删除！')) return;
    Store.data = Store.defaults();
    Store.save();
    Router.navigate('dashboard');
    Utils.toast('数据已清空', 'success');
  },
};

/* ========== AI 引擎 (多 Provider: Groq / Gemini) ========== */
const AIClient = {
  // 各 Provider 配置
  PROVIDERS: {
    deepseek: {
      name: 'DeepSeek',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      models: [
        { id: 'deepseek-chat', label: 'DeepSeek-V3（便宜，推荐）' },
        { id: 'deepseek-reasoner', label: 'DeepSeek-R1（推理更强）' },
      ],
    },
    groq: {
      name: 'Groq',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      models: [
        { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B（免费，推荐）' },
        { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B（快速）' },
        { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B（长上下文）' },
        { id: 'gemma2-9b-it', label: 'Gemma2 9B（轻量）' },
      ],
    },
    gemini: {
      name: 'Google Gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      models: [
        { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash（免费）' },
        { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash（更强）' },
        { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro（最强）' },
      ],
    },
  },

  get provider() {
    return Store.data.settings.aiProvider || 'groq';
  },

  get apiKey() {
    if (this.provider === 'gemini') return Store.data.settings.geminiApiKey?.trim() || '';
    if (this.provider === 'deepseek') return Store.data.settings.deepseekApiKey?.trim() || '';
    return Store.data.settings.groqApiKey?.trim() || '';
  },

  hasKey() {
    return !!this.apiKey;
  },

  async call(prompt, opts = {}) {
    const key = this.apiKey;
    if (!key) throw new Error('未配置 API Key，请到设置页填写');

    const temperature = opts.temperature ?? 0.7;
    const system = opts.system || '';
    const maxTokens = opts.maxTokens || 2048;

    if (this.provider === 'gemini') {
      return this._callGemini(key, prompt, { temperature, system, maxTokens });
    } else {
      // deepseek 和 groq 都是 OpenAI 兼容格式
      return this._callOpenAICompatible(key, prompt, { temperature, system, maxTokens });
    }
  },

  // OpenAI 兼容格式（DeepSeek / Groq 共用）
  async _callOpenAICompatible(key, prompt, { temperature, system, maxTokens }) {
    const cfg = this.PROVIDERS[this.provider];
    const model = Store.data.settings.aiModel || cfg.models[0].id;
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const resp = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  },

  // Groq 旧方法保留兼容（已用 _callOpenAICompatible 替代）
  async _callGroq(key, prompt, opts) {
    return this._callOpenAICompatible(key, prompt, opts);
  },

  // Gemini (原生格式)
  async _callGemini(key, prompt, { temperature, system, maxTokens }) {
    const model = Store.data.settings.aiModel || 'gemini-2.0-flash';
    const url = `${this.PROVIDERS.gemini.endpoint}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] };
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },

  // 返回 JSON 数组的封装方法
  async callJSON(prompt, opts = {}) {
    const text = await this.call(prompt, { ...opts, temperature: 0.3 });
    // 提取 JSON
    let jsonStr = text;
    const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/);
    if (m) jsonStr = m[1];
    // 找第一个 [ 和最后一个 ]
    const start = jsonStr.indexOf('[');
    const end = jsonStr.lastIndexOf(']');
    if (start >= 0 && end > start) jsonStr = jsonStr.substring(start, end + 1);
    return JSON.parse(jsonStr);
  },

  // 多轮对话（用于 Companion 角色聊天）
  async callChat(messages, opts = {}) {
    const key = this.apiKey;
    if (!key) throw new Error('未配置 API Key，请到设置页填写');

    const temperature = opts.temperature ?? 0.8;
    const system = opts.system || '';
    const maxTokens = opts.maxTokens || 1024;

    if (this.provider === 'gemini') {
      return this._callGeminiChat(key, messages, { temperature, system, maxTokens });
    } else {
      return this._callOpenAIChat(key, messages, { temperature, system, maxTokens });
    }
  },

  async _callOpenAIChat(key, messages, { temperature, system, maxTokens }) {
    const cfg = this.PROVIDERS[this.provider];
    const model = Store.data.settings.aiModel || cfg.models[0].id;
    const fullMessages = [];
    if (system) fullMessages.push({ role: 'system', content: system });
    fullMessages.push(...messages);

    const resp = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  },

  async _callGeminiChat(key, messages, { temperature, system, maxTokens }) {
    const model = Store.data.settings.aiModel || 'gemini-2.0-flash';
    const url = `${this.PROVIDERS.gemini.endpoint}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

    // Gemini 用 user/model 交替，system 放 systemInstruction
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body = {
      contents,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] };
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },
};

/* ========== AI 引导系统 ========== */
const AIGuide = {
  level: null,
  category: null,
  stage: 0,
  history: [],
  suggestions: [],

  // 每个层级的预设问题
  questionBank: {
    'lvl-1': {
      intro: '让我们来规划你的【生理需求】。这是最基础的需求层级，包括饮食、睡眠、运动、日常生活等。',
      questions: [
        '你目前在饮食方面的情况如何？有没有想改善的地方？',
        '你的睡眠质量怎么样？每天大概睡几个小时？',
        '你有运动的习惯吗？如果有，频率和类型是什么？',
        '在日常生活中，有没有什么让你觉得不太舒服或者想改变的？',
      ],
      categorySuggestions: ['饮食管理', '睡眠改善', '运动健身', '日常作息', '个人卫生', '居住环境'],
    },
    'lvl-2': {
      intro: '让我们来规划你的【安全需求】。这包括健康保障、财务安全、工作稳定等。',
      questions: [
        '你目前的经济状况是否稳定？有没有存款目标？',
        '你的健康状况如何？有没有需要关注的健康问题？',
        '你对现在的工作/收入是否满意？有什么想改善的？',
        '你有没有保险或者其他安全保障措施？',
      ],
      categorySuggestions: ['财务管理', '健康保障', '职业稳定', '风险管理', '应急储备', '保险规划'],
    },
    'lvl-3': {
      intro: '让我们来规划你的【社交需求】。这涉及家庭、朋友、人际关系等。',
      questions: [
        '你和家人的关系怎么样？有没有想改善的地方？',
        '你有比较亲密的朋友吗？社交频率如何？',
        '在感情方面，你目前的状态和期望是什么？',
        '有没有什么社交场合让你感到不自在或者想提升？',
      ],
      categorySuggestions: ['家庭关系', '朋友社交', '感情生活', '社交技能', '社区参与', '人际沟通'],
    },
    'lvl-4': {
      intro: '让我们来规划你的【尊重需求】。这包括成就感、获得认可、自信心等。',
      questions: [
        '你最近有什么感到自豪的成就吗？',
        '在工作或学习中，你希望获得怎样的认可？',
        '你对自己的能力自信吗？哪些方面想提升？',
        '有没有什么目标是你一直想做但还没开始的？',
      ],
      categorySuggestions: ['职业成就', '技能提升', '个人品牌', '社会认可', '自信建设', '目标达成'],
    },
    'lvl-5': {
      intro: '让我们来规划你的【自我实现】。这是最高层次的需求，涉及学习、创造、个人成长。',
      questions: [
        '你有什么一直想学但还没开始的东西吗？',
        '如果时间和金钱不是问题，你最想做什么？',
        '你觉得自己的潜力在哪些方面还没有充分发挥？',
        '有没有什么创造性的想法或项目你想实现的？',
      ],
      categorySuggestions: ['持续学习', '创造项目', '兴趣深耕', '哲学思考', '人生使命', '知识体系'],
    },
  },

  start(level, category) {
    this.level = level;
    this.category = category;
    this.stage = 0;
    this.history = [];
    this.suggestions = [];

    const bank = this.questionBank[level.id] || this.questionBank['lvl-1'];
    const info = Store.data.personalInfo;

    // 个性化开场白
    let intro = bank.intro;
    if (info.name) intro = `${info.name}，${intro}`;
    if (info.workStatus) intro += ` 了解到你目前${info.workStatus}，我会据此给你建议。`;

    this.history.push({ role: 'bot', text: intro });

    if (category) {
      // 为已有大类创建分支
      this.history.push({ role: 'bot', text: `我们来为「${category.name}」规划具体分支。基于你的个人信息，我建议以下方向：` });
      this.suggestions = this._generateBranchSuggestions(level, category);
      this.stage = 'branches';
    } else {
      // 创建新大类
      this.suggestions = bank.categorySuggestions;
      this.history.push({ role: 'bot', text: bank.questions[0] });
      this.stage = 'questions';
    }

    this._renderModal();
  },

  _generateBranchSuggestions(level, category) {
    // 基于层级和类别生成5个分支建议
    const branchTemplates = {
      '饮食管理': ['自己做饭计划', '外卖健康选择', '营养搭配方案', '规律饮食', '饮食预算控制'],
      '睡眠改善': ['固定睡眠时间', '睡前习惯优化', '午休安排', '睡眠环境改善', '睡眠质量追踪'],
      '运动健身': ['每日步行目标', '居家健身计划', '健身房/户外运动', '柔韧性训练', '运动伙伴'],
      '财务管理': ['月度预算', '记账习惯', '储蓄计划', '投资入门', '消费控制'],
      '健康保障': ['定期体检', '日常保健', '心理健康', '急救知识', '健康习惯'],
      '职业稳定': ['技能提升', '人脉拓展', '副业探索', '职业规划', '工作生活平衡'],
      '家庭关系': ['定期联系家人', '家庭活动', '沟通改善', '节日安排', '情感表达'],
      '朋友社交': ['主动联系老友', '参加社交活动', '维护关系', '结识新朋友', '社交质量提升'],
      '持续学习': ['读书计划', '在线课程', '语言学习', '专业认证', '知识输出'],
      '创造项目': ['个人博客/自媒体', '开源项目', '手工/DIY', '写作创作', '商业创意'],
    };

    return branchTemplates[category.name] || [
      `${category.name}方案A`, `${category.name}方案B`, `${category.name}方案C`,
      `${category.name}方案D`, `${category.name}方案E`
    ];
  },

  _renderModal() {
    const bank = this.questionBank[this.level.id] || this.questionBank['lvl-1'];

    let chatHTML = this.history.map(m => `
      <div class="ai-msg ai-msg-${m.role}">${Utils.escape(m.text)}</div>
    `).join('');

    let quickOptions = '';
    let inputBar = '';

    if (this.stage === 'branches') {
      // 显示5个建议
      chatHTML += `
        <div class="ai-msg ai-msg-bot">
          以下是基于你的情况推荐的5个方向，请选择3个作为「确认执行」，2个作为「备选」：
        </div>
        <div class="ai-quick-options" id="branch-suggestions">
          ${this.suggestions.map((s, i) => `
            <span class="ai-quick-btn" data-idx="${i}" data-name="${Utils.escape(s)}" onclick="AIGuide.toggleSuggestion(${i})">${Utils.escape(s)}</span>
          `).join('')}
        </div>
        <div class="text-sm text-light mt-2" id="selection-info">点击选择：0/5（需选3确认+2备选）</div>
      `;

      inputBar = `
        <div class="ai-input-bar">
          <input class="ai-input" id="ai-custom-branch" placeholder="或者输入自定义方向">
          <button class="ai-send" onclick="AIGuide.addCustomBranch()">＋</button>
        </div>
        <button class="btn btn-primary btn-block mt-2" id="confirm-branches-btn" onclick="AIGuide.confirmBranches()" disabled>确认创建分支</button>
      `;
    } else if (this.stage === 'questions') {
      const qIdx = this.history.filter(m => m.role === 'bot' && bank.questions.includes(m.text)).length;
      if (qIdx < bank.questions.length) {
        quickOptions = `
          <div class="ai-quick-options">
            <span class="ai-quick-btn" onclick="AIGuide.quickAnswer('还好')">还好</span>
            <span class="ai-quick-btn" onclick="AIGuide.quickAnswer('想改善')">想改善</span>
            <span class="ai-quick-btn" onclick="AIGuide.quickAnswer('不太满意')">不太满意</span>
            <span class="ai-quick-btn" onclick="AIGuide.skipQuestion()">跳过</span>
          </div>
        `;
      }
      inputBar = `
        <div class="ai-input-bar">
          <input class="ai-input" id="ai-input" placeholder="输入你的回答..." onkeydown="if(event.key==='Enter')AIGuide.sendInput()">
          <button class="ai-send" onclick="AIGuide.sendInput()">➤</button>
        </div>
      `;
    } else if (this.stage === 'suggest-categories') {
      // 显示大类建议
      chatHTML += `
        <div class="ai-msg ai-msg-bot">
          基于你的回答，我建议以下大类，选择你想创建的：
        </div>
        <div class="ai-quick-options" id="category-suggestions">
          ${this.suggestions.map((s, i) => `
            <span class="ai-quick-btn" data-idx="${i}" data-name="${Utils.escape(s)}" onclick="AIGuide.toggleCategory(${i})">${Utils.escape(s)}</span>
          `).join('')}
        </div>
      `;
      inputBar = `
        <div class="ai-input-bar">
          <input class="ai-input" id="ai-custom-cat" placeholder="自定义大类名称">
          <button class="ai-send" onclick="AIGuide.addCustomCategory()">＋</button>
        </div>
        <button class="btn btn-primary btn-block mt-2" id="confirm-categories-btn" onclick="AIGuide.confirmCategories()" disabled>确认创建</button>
      `;
    }

    const title = this.category ? `AI引导 · ${this.category.name}` : `AI引导 · ${this.level.name}`;
    Utils.modal(title, `
      <div class="ai-chat" id="ai-chat">${chatHTML}</div>
      ${quickOptions}
      ${inputBar}
    `, (c) => {
      this._scrollChat();
      const input = c.querySelector('#ai-input');
      if (input) input.focus();
    });
  },

  _scrollChat() {
    setTimeout(() => {
      const chat = document.getElementById('ai-chat');
      if (chat) chat.scrollTop = chat.scrollHeight;
    }, 50);
  },

  selectedBranches: [],
  selectedCategories: [],

  toggleSuggestion(idx) {
    const btn = document.querySelector(`#branch-suggestions [data-idx="${idx}"]`);
    if (!btn) return;

    const name = btn.dataset.name;
    const existing = this.selectedBranches.find(b => b.idx === idx);

    if (existing) {
      this.selectedBranches = this.selectedBranches.filter(b => b.idx !== idx);
      btn.classList.remove('active');
      btn.style.background = '';
      btn.style.color = 'var(--c-coral)';
    } else {
      if (this.selectedBranches.length >= 5) {
        Utils.toast('最多选5个', 'warning');
        return;
      }
      const status = this.selectedBranches.filter(b => b.status === 'confirmed').length < 3 ? 'confirmed' : 'uncertain';
      this.selectedBranches.push({ idx, name, status });
      if (status === 'confirmed') {
        btn.style.background = 'var(--c-teal)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'var(--c-teal)';
      } else {
        btn.style.background = 'var(--c-yellow)';
        btn.style.color = '#c9a800';
        btn.style.borderColor = 'var(--c-yellow)';
      }
    }

    const confirmed = this.selectedBranches.filter(b => b.status === 'confirmed').length;
    const uncertain = this.selectedBranches.filter(b => b.status === 'uncertain').length;
    document.getElementById('selection-info').textContent = `已选 ${this.selectedBranches.length}/5（${confirmed}确认 + ${uncertain}备选）`;
    document.getElementById('confirm-branches-btn').disabled = this.selectedBranches.length < 5;
  },

  addCustomBranch() {
    const val = document.getElementById('ai-custom-branch').value.trim();
    if (!val) return;
    if (this.selectedBranches.length >= 5) { Utils.toast('最多5个', 'warning'); return; }
    const status = this.selectedBranches.filter(b => b.status === 'confirmed').length < 3 ? 'confirmed' : 'uncertain';
    this.selectedBranches.push({ idx: -1, name: val, status });
    document.getElementById('ai-custom-branch').value = '';
    this._updateBranchSelectionUI();
  },

  _updateBranchSelectionUI() {
    const confirmed = this.selectedBranches.filter(b => b.status === 'confirmed').length;
    const uncertain = this.selectedBranches.filter(b => b.status === 'uncertain').length;
    document.getElementById('selection-info').textContent = `已选 ${this.selectedBranches.length}/5（${confirmed}确认 + ${uncertain}备选）`;
    document.getElementById('confirm-branches-btn').disabled = this.selectedBranches.length < 5;
  },

  confirmBranches() {
    if (this.selectedBranches.length < 5) { Utils.toast('需要选满5个', 'warning'); return; }
    if (!this.category) return;

    this.selectedBranches.forEach(b => {
      this.category.branches.push({
        id: Utils.uid(),
        name: b.name,
        status: b.status,
        tasks: [],
      });
    });

    const lvlName = this.level.name;
    const catName = this.category.name;
    Store.recordVersion('AI引导创建分支', `${lvlName} > ${catName} → ${this.selectedBranches.length}个分支 (3确认+2备选)`);
    Store.save();
    Utils.closeModal();
    Router.render();
    Utils.toast(`已创建${this.selectedBranches.length}个分支！`, 'success');
    this.selectedBranches = [];
  },

  sendInput() {
    const input = document.getElementById('ai-input');
    const text = input.value.trim();
    if (!text) return;
    this.history.push({ role: 'user', text });
    input.value = '';

    const bank = this.questionBank[this.level.id];
    const qCount = this.history.filter(m => m.role === 'bot' && bank.questions.includes(m.text)).length;

    if (qCount < bank.questions.length) {
      // 继续问下一个问题
      setTimeout(() => {
        this.history.push({ role: 'bot', text: bank.questions[qCount] });
        this._renderModal();
      }, 300);
    } else {
      // 所有问题问完，建议大类
      setTimeout(() => {
        this.history.push({ role: 'bot', text: '好的，根据你的回答，我觉得可以从以下几个大类入手：' });
        this.stage = 'suggest-categories';
        this._renderModal();
      }, 300);
    }
  },

  quickAnswer(text) {
    document.getElementById('ai-input').value = text;
    this.sendInput();
  },

  skipQuestion() {
    const bank = this.questionBank[this.level.id];
    const qCount = this.history.filter(m => m.role === 'bot' && bank.questions.includes(m.text)).length;
    if (qCount < bank.questions.length) {
      this.history.push({ role: 'user', text: '(跳过)' });
      setTimeout(() => {
        this.history.push({ role: 'bot', text: bank.questions[qCount] });
        this._renderModal();
      }, 300);
    } else {
      this.history.push({ role: 'user', text: '(跳过)' });
      this.history.push({ role: 'bot', text: '好的，根据你之前的信息，我建议以下大类：' });
      this.stage = 'suggest-categories';
      this._renderModal();
    }
  },

  toggleCategory(idx) {
    const btn = document.querySelector(`#category-suggestions [data-idx="${idx}"]`);
    if (!btn) return;
    const name = btn.dataset.name;
    const existing = this.selectedCategories.indexOf(name);
    if (existing >= 0) {
      this.selectedCategories.splice(existing, 1);
      btn.style.background = '';
      btn.style.color = 'var(--c-coral)';
      btn.style.borderColor = 'var(--c-coral)';
    } else {
      this.selectedCategories.push(name);
      btn.style.background = 'var(--c-teal)';
      btn.style.color = '#fff';
      btn.style.borderColor = 'var(--c-teal)';
    }
    const confirmBtn = document.getElementById('confirm-categories-btn');
    if (confirmBtn) confirmBtn.disabled = this.selectedCategories.length === 0;
  },

  addCustomCategory() {
    const val = document.getElementById('ai-custom-cat').value.trim();
    if (!val) return;
    this.selectedCategories.push(val);
    document.getElementById('ai-custom-cat').value = '';
    const btn = document.getElementById('confirm-categories-btn');
    if (btn) btn.disabled = false;
    Utils.toast(`已添加: ${val}`, 'success');
  },

  confirmCategories() {
    if (this.selectedCategories.length === 0) return;
    this.selectedCategories.forEach(name => {
      this.level.categories.push({
        id: Utils.uid(),
        name,
        branches: [],
      });
    });
    Store.recordVersion('AI引导创建大类', `${this.level.name} → ${this.selectedCategories.join(', ')}`);
    Store.save();
    Utils.closeModal();
    Router.render();
    Utils.toast(`已创建${this.selectedCategories.length}个大类！`, 'success');
    this.selectedCategories = [];
  },

  // ===== 全局 AI 问答模式 =====

  // === 层级语义指示器（宽泛匹配，不是固定关键词列表）===
  levelIndicators: {
    'lvl-1': {
      name: '生理需求', icon: '🍚',
      patterns: /吃|睡|运动|健身|体重|饮食|作息|身体|健康|减肥|跑步|做饭|起床|睡眠|营养|卫生|生活|喝水|体检|治病|早睡|早起|熬夜|体态|锻炼|拉伸|散步|戒烟|戒酒|吃饭|买菜|清洁|整理房间|做饭|料理|护肤|理发|洗澡/,
    },
    'lvl-2': {
      name: '安全需求', icon: '🛡️',
      patterns: /钱|收入|存款|工作|保险|安全|稳定|财务|职业|工资|理财|投资|储蓄|债务|还贷|买房|租房|应急|副业|跳槽|预算|记账|开销|还钱|贷款|信用卡|社保|医保|求职|面试|涨薪|存钱|赚钱|花销|开支|房|车|保险/,
    },
    'lvl-3': {
      name: '社交需求', icon: '💕',
      patterns: /朋友|家人|社交|恋爱|感情|关系|沟通|聚会|父母|亲情|爱情|脱单|相亲|聊天|圈子|孤独|人际|同事|交友|约会|伴侣|婚姻|家庭|说话|表达情感|联系|看望|陪伴/,
    },
    'lvl-4': {
      name: '尊重需求', icon: '🏆',
      patterns: /成就|认可|自信|提升|技能|品牌|地位|荣誉|晋升|加薪|影响力|声誉|面子|尊重|领导力|表达|演讲|展示|竞争|获奖|证书|职称|升职|被看见|被认可|证明|实力/,
    },
    'lvl-5': {
      name: '自我实现', icon: '✨',
      patterns: /学习|创造|梦想|潜力|写作|创业|哲学|使命|读书|画画|音乐|编程|研究|发明|意义|人生|成长|自我|知识|思考|自媒体|博客|视频|播客|摄影|设计|艺术|手工艺|语言|考试|考研|考证|冥想|灵性|读书|写作|创作|画画|拍|剪|运营|公众号|小红书|抖音|B站|油管|YouTube|UP主|博主|内容|输出|分享|教|带| mentor/,
    },
  },

  // === 兜底提取目标（无 Key / AI 失败时）===
  // 关键：本地兜底只能做"粗分组"，无法语义整体理解——所以这里只按换行/句末标点分块，
  // 尊重用户用条目（换行/句号）表达的输入；逗号、顿号、分号不再拆分，避免一段话碎成几十条。
  // 同时强制每层 ≤3、总数 ≤15，杜绝"237 个类"。真正的整体语义理解请填 DeepSeek Key 走 AI 路径。
  _extractGoals(inputs) {
    const raw = [];
    inputs.forEach(input => {
      // 优先按换行/句末分块（尊重用户条目化输入）；块内若含逗号且较长，再按逗号/顿号/分号拆成条目
      // ——既不把整段当一个，也不逐词碎拆；最终受每层<=3、总数<=15 约束
      const rawBlocks = input.split(/[\n。.!?！？]+/).map(b => b.trim()).filter(b => b.length > 2);
      const blocks = [];
      rawBlocks.forEach(b => {
        if (/[，、；;]/.test(b) && b.length > 8) {
          b.split(/[，、；;]+/).forEach(x => { const t = x.trim(); if (t.length > 2) blocks.push(t); });
        } else {
          blocks.push(b);
        }
      });
      if (blocks.length === 0) blocks.push(input.trim());
      blocks.forEach(block => {
        // 去掉常见前缀，提取核心动作
        let action = block;
        action = action.replace(/^(我想|我要|我打算|我计划|我希望|准备|开始|坚持|努力|需要|应该|想|要|打算|计划|希望|一直|最近|今年|这个月|下周|明天|今天|开始|尝试|练习|学习|去|搞|弄)/g, '');
        action = action.replace(/[了的着吧啊呢哦哈呀咯嘛]/g, '');
        action = action.trim();
        if (action.length === 0) action = block;
        raw.push({ original: block, action, levelId: '', categoryName: '' });
      });
    });

    // 本地粗分组：按层级归类，每层最多 3 个，总数最多 15 个
    const levelCount = {};
    const out = [];
    raw.forEach(g => {
      const lid = this._matchLevel(g.action) || 'lvl-5';
      levelCount[lid] = (levelCount[lid] || 0);
      if (levelCount[lid] >= 3) return; // 每层上限 3
      levelCount[lid]++;
      g.levelId = lid;
      g.categoryName = this._makeCategoryName(g.action, lid);
      out.push(g);
    });
    return out.slice(0, 15);
  },

  // === 匹配 Maslow 层级 ===
  _matchLevel(text) {
    for (const [levelId, data] of Object.entries(this.levelIndicators)) {
      if (data.patterns.test(text)) return levelId;
    }
    return 'lvl-5';
  },

  // === 从用户文本生成分类名 ===
  _makeCategoryName(action, levelId) {
    if (action.length <= 8) return action;
    let name = action.replace(/^(做|学|练|看|写|去|买|存|减|增|改|提|找|交|培|开|建|创|坚持|保持|开始|继续|搞|弄|整)/, '');
    if (name.length < 2) name = action;
    if (name.length > 12) name = name.substring(0, 12);
    return name;
  },

  // === 更新目标字段 ===
  updateGoalField(idx, field, value) {
    const s = this.globalState;
    if (s && s.goals && s.goals[idx]) s.goals[idx][field] = value;
  },

  // === 构建给 AI 用的「画像摘要」，从 personalInfo 浓缩 ===
  // 优先使用 Store 已缓存的 profileSummary；否则现算
  _buildProfileSummary(force) {
    // force=true 时跳过缓存，强制从 personalInfo 重新构建（保存信息后调用）
    if (!force && Store.data.profileSummary && Store.data.profileSummary.trim()) {
      return Store.data.profileSummary;
    }
    const info = Store.data.personalInfo || {};
    const lines = [];
    const skip = v => !v || v === '不必要' || v === '' || v === '无';
    const pick = (label, val) => { if (!skip(val)) lines.push(`· ${label}: ${val}`); };

    pick('姓名', info.name);
    pick('性别/年龄', info.gender && info.age ? `${info.gender} / ${info.age}岁` : (info.age ? `${info.age}岁` : info.gender));
    pick('职业/身份', info.occupation || info.workStatus);
    pick('收入水平', info.incomeRange);
    pick('存款', info.savings);
    pick('健康状况', info.healthCondition);
    pick('慢病/用药', info.chronicConditions || info.medication);
    pick('作息', info.dailyRoutine);
    pick('睡眠', info.sleepQuality);
    pick('饮食偏好', info.dietaryHabits);
    pick('运动习惯', info.exerciseHabits);
    pick('性格类型', info.personality);
    pick('高效时段', info.productiveTime);
    pick('情感状态', info.emotionalStatus);
    pick('生活压力', info.stressLevel);
    pick('主要压力来源', info.stressSources);
    pick('支持系统', info.supportSystem);
    pick('主要目标', info.mainGoal);
    pick('短期目标', info.shortTermGoals);
    pick('长期目标', info.longTermGoals);
    pick('兴趣', info.hobbies);
    pick('技能', info.skills);
    // 补充说明：优先用 AI 提炼的结构化条目，没有则不输出原文
    const extracted = Store.data.notesExtracted || [];
    if (extracted.length > 0) {
      extracted.forEach(item => {
        if (item.label && item.value) lines.push(`· ${item.label}: ${item.value}`);
      });
    }

    return lines.join('\n');
  },

  // === 用 AI 把补充说明提炼成结构化条目 ===
  async _extractNotesWithAI(notes) {
    if (!notes || !notes.trim() || !AIClient.hasKey()) return [];

    const prompt = `你是一个个人信息分析助手。用户在个人信息表单的"补充说明"里写了一段自由文本，请从中提炼出结构化的关键信息条目。

用户写的补充说明：
"""
${notes}
"""

请提取出所有有价值的个人信息，每条提炼成 {label, value} 格式：
- label: 2-6字的信息维度名（如"专业背景"、"心理状态"、"家庭情况"、"经济压力"等，不要用已有的字段名如"职业""健康"等）
- value: 简洁的描述（10字以内）

规则：
1. 只提取对制定个人计划有帮助的信息
2. 如果补充说明里提到了已有字段的信息（如职业、年龄等），也提取出来但 label 用不同的表述
3. 忽略无意义的寒暄或与计划无关的内容
4. 最多提取 10 条

只返回纯JSON数组，不要加任何额外文字。格式：
[{"label":"维度名","value":"描述"}]`;

    try {
      const result = await AIClient.callJSON(prompt, { temperature: 0.2, maxTokens: 1024 });
      console.log('[Hyuna] notes extraction result:', result);
      if (Array.isArray(result)) {
        return result.filter(item => item.label && item.value).slice(0, 10);
      }
      return [];
    } catch (e) {
      console.error('notes extraction failed:', e);
      return [];
    }
  },

  // === 切换目标选中（checkbox 风格：✓ 表示保留，留空表示排除）===
  toggleGoalSelect(idx, checked) {
    const s = this.globalState;
    if (!s || !s.goals) return;
    if (!s.selectedGoals) s.selectedGoals = new Set();
    if (checked) s.selectedGoals.add(idx);
    else s.selectedGoals.delete(idx);

    // 更新对应行的视觉状态
    const row = document.getElementById(`goal-row-${idx}`);
    if (row) {
      if (checked) row.classList.add('goal-kept');
      else row.classList.remove('goal-kept');
    }

    const count = s.selectedGoals.size;
    const info = document.getElementById('global-selection-info');
    if (info) {
      const total = s.goals.length;
      info.innerHTML = `已选 <b style="color:var(--c-teal)">${count}</b> / ${total} 个目标（不要的取消勾选）`;
    }
    const cbtn = document.getElementById('global-confirm-btn');
    if (cbtn) cbtn.disabled = count === 0;
  },

  // === subTask 编辑 ===
  updateSubTask(goalIdx, subIdx, value) {
    const s = this.globalState;
    if (s && s.goals && s.goals[goalIdx] && s.goals[goalIdx].subTasks) {
      s.goals[goalIdx].subTasks[subIdx] = value;
    }
  },
  removeSubTask(goalIdx, subIdx) {
    const s = this.globalState;
    if (s && s.goals && s.goals[goalIdx] && s.goals[goalIdx].subTasks) {
      s.goals[goalIdx].subTasks.splice(subIdx, 1);
      // 重新渲染这个 goal 的 subTasks 区域
      this._rerenderSubTasks(goalIdx);
    }
  },
  addSubTask(goalIdx) {
    const s = this.globalState;
    if (s && s.goals && s.goals[goalIdx]) {
      if (!s.goals[goalIdx].subTasks) s.goals[goalIdx].subTasks = [];
      s.goals[goalIdx].subTasks.push('新小目标');
      this._rerenderSubTasks(goalIdx);
    }
  },
  _rerenderSubTasks(goalIdx) {
    const s = this.globalState;
    if (!s || !s.goals || !s.goals[goalIdx]) return;
    const g = s.goals[goalIdx];
    const container = document.querySelector(`#goal-row-${goalIdx} [data-subtasks]`);
    if (!container) return;
    const subs = g.subTasks || [];
    container.innerHTML = subs.map((st, si) => `
      <div style="display:flex; align-items:center; gap:4px; margin-bottom:4px">
        <input class="form-input" style="flex:1; font-size:12px; padding:3px 6px"
          value="${Utils.escape(st)}"
          onchange="AIGuide.updateSubTask(${goalIdx}, ${si}, this.value)">
        <button class="btn btn-sm" style="padding:2px 6px; font-size:11px; color:#e74c3c" onclick="AIGuide.removeSubTask(${goalIdx}, ${si})">✕</button>
      </div>
    `).join('') + `<button class="btn btn-sm" style="padding:2px 8px; font-size:11px; color:var(--c-teal); border:1px dashed var(--c-teal); border-radius:4px" onclick="AIGuide.addSubTask(${goalIdx})">+ 加小目标</button>`;
  },

  branchTemplates: {
    '饮食管理':['自己做饭计划','外卖健康选择','营养搭配方案','规律饮食','饮食预算控制'],
    '睡眠改善':['固定睡眠时间','睡前习惯优化','午休安排','睡眠环境改善','睡眠质量追踪'],
    '运动健身':['每日步行目标','居家健身计划','健身房/户外运动','柔韧性训练','运动伙伴'],
    '日常作息':['早起计划','时间块管理','休息提醒','周末规划','习惯养成'],
    '居住环境':['房间整理','收纳优化','环境清洁','氛围布置','搬家规划'],
    '财务管理':['月度预算','记账习惯','储蓄计划','投资入门','消费控制'],
    '职业发展':['技能提升','人脉拓展','副业探索','职业规划','工作生活平衡'],
    '应急储备':['紧急基金','备用金计划','风险预案','证件整理','紧急联系'],
    '风险管理':['法律意识','信息安全','防诈骗','健康监测','应急预案'],
    '保险规划':['社保了解','商业保险','医疗保险','意外保险','保险复盘'],
    '家庭关系':['定期联系家人','家庭活动','沟通改善','节日安排','情感表达'],
    '朋友社交':['主动联系老友','参加社交活动','维护关系','结识新朋友','社交质量提升'],
    '感情生活':['扩大交友圈','提升吸引力','沟通技巧','约会计划','情感认知'],
    '社交技能':['表达训练','倾听技巧','冲突处理','公众表达','网络社交'],
    '社区参与':['志愿活动','兴趣社群','邻里关系','社区活动','公益参与'],
    '职业成就':['项目目标','绩效提升','成果展示','晋升路径','行业影响力'],
    '技能提升':['核心技能','辅助技能','证书考取','实战项目','学习计划'],
    '个人品牌':['专业形象','社交展示','内容输出','行业口碑','形象管理'],
    '自信建设':['小目标达成','正面肯定','接受挑战','克服恐惧','自我认知'],
    '目标达成':['目标拆解','进度追踪','奖励机制','反思复盘','环境优化'],
    '持续学习':['读书计划','在线课程','语言学习','专业认证','知识输出'],
    '创造项目':['个人博客/自媒体','开源项目','手工/DIY','写作创作','商业创意'],
    '兴趣深耕':['乐器学习','摄影进阶','烹饪研究','旅行探索','艺术培养'],
    '知识体系':['笔记系统','知识管理','思维导图','复盘习惯','跨界学习'],
    '人生使命':['价值观梳理','人生愿景','哲学思考','传承计划','意义探索'],
  },

  globalState: null,

  startGlobal() {
    const info = Store.data.personalInfo;
    this.globalState = {
      chatHistory: [],
      userInputs: [],
      selectedCategories: [],
      stage: 'chat',
      chatCount: 0,
      goals: [],
      selectedGoals: new Set(),
      createdCategories: [],
      branchIdx: 0,
      allBranches: [],
      allConfirmedBranches: [],
      taskSplitIdx: 0,
      selectedTasks: [],
    };

    let greeting = '你好！我是你的计划助手\n\n';
    if (info.name && info.name !== '不必要') greeting += `${info.name}，`;
    greeting += '告诉我，你最近想做什么？想改变什么？有什么目标？\n\n';
    greeting += '你可以随便说，比如：\n';
    greeting += '"我想做自媒体"、"想减肥"、"想存钱"、"想多交朋友"、"想学画画"……\n\n';
    greeting += '说多少条都行，我会从你的话里提取目标，帮你分类到马斯洛层次。说完点「就这些，帮我分类」。';

    this.globalState.chatHistory.push({ role: 'bot', text: greeting });
    this._renderGlobalModal();
  },

  _renderGlobalModal() {
    const s = this.globalState;
    let chatHTML = s.chatHistory.map(m =>
      `<div class="ai-msg ai-msg-${m.role}">${Utils.escape(m.text).replace(/\n/g, '<br>')}</div>`
    ).join('');

    let bottomHTML = '';

    if (s.stage === 'chat') {
      if (s.chatCount === 0) {
        bottomHTML += `
          <div class="ai-quick-options">
            <span class="ai-quick-btn" onclick="AIGuide.globalQuickAnswer('我想改善健康和作息')">改善健康作息</span>
            <span class="ai-quick-btn" onclick="AIGuide.globalQuickAnswer('想存钱和提升工作能力')">存钱提升工作</span>
            <span class="ai-quick-btn" onclick="AIGuide.globalQuickAnswer('想多交朋友、扩大社交圈')">扩大社交圈</span>
            <span class="ai-quick-btn" onclick="AIGuide.globalQuickAnswer('想学习新技能、自我提升')">学习自我提升</span>
          </div>
        `;
      }
      bottomHTML += `
        <div class="ai-input-bar">
          <input class="ai-input" id="ai-global-input" placeholder="输入你想做的事..." onkeydown="if(event.key==='Enter')AIGuide.globalSendInput()">
          <button class="ai-send" onclick="AIGuide.globalSendInput()">➤</button>
        </div>
        ${s.chatCount > 0 ? `<button class="btn btn-primary btn-block mt-2" onclick="AIGuide.globalAnalyze()">✅ 就这些，帮我分类</button>` : ''}
      `;
    }

    Utils.modal('AI 计划助手', `
      <div class="ai-chat" id="ai-chat">${chatHTML}</div>
      ${bottomHTML}
    `, (c) => {
      this._scrollChat();
      const input = c.querySelector('#ai-global-input');
      if (input) input.focus();
    });
  },

  globalQuickAnswer(text) {
    const input = document.getElementById('ai-global-input');
    if (input) input.value = text;
    this.globalSendInput();
  },

  globalSendInput() {
    const input = document.getElementById('ai-global-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const s = this.globalState;
    s.chatHistory.push({ role: 'user', text });
    s.userInputs.push(text);
    s.chatCount++;
    input.value = '';

    setTimeout(() => {
      const responses = [
        '好的，记下了。还有什么想做的吗？',
        '了解了！继续说，还有什么目标？',
        '收到。你还可以告诉我更多，或者说"就这些"让我开始分类。',
        '明白了。还有别的吗？没有的话点下方按钮让我帮你分类整理。',
        '好的，都记下了。还有补充的吗？',
      ];
      const resp = responses[Math.min(s.chatCount - 1, responses.length - 1)];
      s.chatHistory.push({ role: 'bot', text: resp });
      this._renderGlobalModal();
    }, 400);
  },

  async globalAnalyze() {
    const s = this.globalState;
    s.chatHistory.push({ role: 'user', text: '就这些，帮我分类' });
    s.stage = 'analyzing';

    // 显示加载中
    Utils.modal('AI 计划助手', `
      <div class="ai-chat" id="ai-chat">
        ${s.chatHistory.map(m => `<div class="ai-msg ai-msg-${m.role}">${Utils.escape(m.text).replace(/\n/g,'<br>')}</div>`).join('')}
        <div class="ai-msg ai-msg-bot"><div class="ai-typing">AI 正在分析你的目标<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div></div>
      </div>
    `);

    let goals;
    if (AIClient.hasKey()) {
      try {
        const profile = this._buildProfileSummary();
        // ★ 把用户所有输入拼成一段完整文本，让 AI 整体理解
        const fullText = s.userInputs.join('\n');
        const prompt = `你是一个基于马斯洛需求层次理论的个人计划助手。

【用户画像摘要】（用于个性化推荐，不是新的目标）
${profile || '（用户尚未填写个人信息）'}

【用户写的完整内容】（这是用户的一段完整表达，请整体理解其意图，不要逐句拆分）
"""
${fullText}
"""

【核心原则——整体语义理解】
用户写的是一段完整的话，可能很长。你必须：
1. 把这段话当作一个整体来理解，把握用户到底想做什么、想过什么样的人生
2. 从整体意图中推断出用户的几个大目标（不是每句话一个目标！）
3. 如果用户说"做自媒体涨粉变现，顺便学剪辑，还想存钱理财"——这是 2-3 个大目标（自媒体运营、技能学习、财务管理），不是把每个词拆成一个目标
4. 严禁把用户的一句话拆成多个碎片目标

【分类规则】
1. **提炼短句**——categoryName 必须是从语义中提炼的 2-8 字短语/短句（如"自媒体运营"、"减脂塑形"），严禁把用户的长句原话直接当分类名；不得包含逗号、句号、分号等长句标点
2. **总数硬上限 15**——马斯洛 5 层，每层最多 3 个大类，总计最多 15 个。若你初稿超过，必须主动合并语义相近项，绝不罗列
3. **语义合并**——同一件事的不同表述合并为一个大类
4. **联想补全（提到用户想不到的点）**——基于马斯洛框架，主动补齐用户可能没想到但重要的方向（如用户只说"学德语"，可联想到"留学财务储备"、"作息适应"），每个联想大类要在 reason 里说明依据，不要硬凑
5. **层级**：lvl-1 生理(饮食/睡眠/运动/作息) | lvl-2 安全(财务/工作/健康保障) | lvl-3 社交(家人/朋友/感情) | lvl-4 尊重(成就/技能/认可) | lvl-5 自我实现(学习/创造/创业/艺术)

【自动细分小目标】
每个大类必须附带 3-5 个小目标（subTasks），这些是构成这个大目标的具体方向。
小目标要：具体、可执行、5-15字、有逻辑递进（从准备到进阶）

【严格 JSON 格式】
[
  {
    "original": "与这个目标相关的用户原话片段",
    "categoryName": "提炼的短句名",
    "levelId": "lvl-x",
    "reason": "为什么归到这层",
    "subTasks": ["小目标1", "小目标2", "小目标3"]
  }
]

【反例——绝对不要这样做】
用户写："我想做自媒体，主要是做短视频和图文，目标是涨粉到1万然后接广告变现，同时我想学习视频剪辑技能，还想每月存2000块钱作为应急基金"
- ❌ 错误：把"做短视频""做图文""涨粉到1万""接广告变现""学习视频剪辑""每月存2000"拆成 6 个独立目标
- ✅ 正确：提取为 2 个大类——"自媒体运营"(lvl-5, subTasks:["确定内容方向","学习剪辑技能","涨粉到1万","接广告变现"]) + "应急储蓄"(lvl-2, subTasks:["设定月存目标","开专用账户","3个月达标"])`;

        const result = await AIClient.callJSON(prompt, { temperature: 0.3 });
        // 过滤 + 按"层级+分类名"去重
        const seen = new Map();
        (result || []).forEach((g, i) => {
          if (!g || !g.categoryName) return;
          const key = (g.levelId || 'lvl-5') + '|' + g.categoryName.trim();
          if (!seen.has(key)) {
            seen.set(key, {
              original: g.original || '',
              action: g.categoryName.trim(),
              categoryName: g.categoryName.trim(),
              levelId: g.levelId || 'lvl-5',
              reason: g.reason || '',
              subTasks: Array.isArray(g.subTasks) ? g.subTasks.filter(t => t && t.trim()).map(t => t.trim()) : [],
            });
          }
        });
        goals = Array.from(seen.values());
        // ★ 每层最多 3 个
        const levelCount = {};
        goals = goals.filter(g => {
          const lid = g.levelId || 'lvl-5';
          levelCount[lid] = (levelCount[lid] || 0) + 1;
          return levelCount[lid] <= 3;
        });
        // ★ 硬约束：总数 <=15（每层<=3 已保证，再保险 AI 膨胀）
        if (goals.length > 15) goals = goals.slice(0, 15);
        // ★ categoryName 超长截断（防 AI 照搬原话长句当分类名）+ levelId 合法性校验
        goals.forEach(g => {
          if (!g.levelId || !String(g.levelId).startsWith('lvl-')) g.levelId = 'lvl-5';
          if (g.categoryName && g.categoryName.length > 12) g.categoryName = g.categoryName.slice(0, 12);
        });
      } catch (err) {
        Utils.toast('AI 分析失败，使用规则匹配: ' + err.message, 'warning');
        goals = this._extractGoals(s.userInputs);
        goals.forEach(g => { g.levelId = this._matchLevel(g.action); g.categoryName = this._makeCategoryName(g.action, g.levelId); });
      }
    } else {
      // 无 API Key，使用规则匹配
      goals = this._extractGoals(s.userInputs);
      goals.forEach(g => { g.levelId = this._matchLevel(g.action); g.categoryName = this._makeCategoryName(g.action, g.levelId); });
    }

    if (!goals || goals.length === 0) {
      s.stage = 'chat';
      s.chatHistory.push({ role: 'bot', text: '没有提取到目标，请再告诉我你想做什么。' });
      this._renderGlobalModal();
      return;
    }

    s.goals = goals;
    s.selectedGoals = new Set(goals.map((_, i) => i));

    const levelNames = { 'lvl-1':'生理需求','lvl-2':'安全需求','lvl-3':'社交需求','lvl-4':'尊重需求','lvl-5':'自我实现' };
    const levelIcons = { 'lvl-1':'🍚','lvl-2':'🛡️','lvl-3':'💕','lvl-4':'🏆','lvl-5':'✨' };
    const levelOrder = ['lvl-1','lvl-2','lvl-3','lvl-4','lvl-5'];

    const byLevel = {};
    goals.forEach((g, i) => { g.idx = i; if (!byLevel[g.levelId]) byLevel[g.levelId] = []; byLevel[g.levelId].push(g); });

    let itemsHTML = '';
    const profInfo = Store.data.personalInfo || {};
    const profKeys = Object.keys(profInfo).filter(k => profInfo[k] && profInfo[k] !== '不必要');
    const profBanner = profKeys.length > 0
      ? `<div class="card" style="margin:8px 0; border-left:3px solid var(--c-lavender); background:#f6f0ff"><div style="font-size:13px">🧬 <b>本次分类已参考你的个人画像</b>（共 ${profKeys.length} 项，如职业/健康/压力等），让推荐更贴合你。</div></div>`
      : '';
    itemsHTML = profBanner + itemsHTML;
    levelOrder.forEach(levelId => {
      if (!byLevel[levelId]) return;
      const count = byLevel[levelId].length;
      itemsHTML += `
        <div class="card" style="margin:8px 0; border-left:3px solid var(--c-teal)">
          <div style="font-weight:700; margin-bottom:8px">${levelIcons[levelId]} ${levelNames[levelId]} <span style="font-size:11px; color:var(--text-secondary)">(${count}/3)</span></div>
          ${byLevel[levelId].map(g => `
            <div id="goal-row-${g.idx}" class="goal-row goal-kept" style="background:#f0faf8; border-radius:8px; padding:8px 10px; margin-bottom:6px">
              <div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px">你说的：${Utils.escape(g.original)}</div>
              <div class="flex items-center gap-2">
                <input class="form-input" style="flex:1; font-size:13px; padding:4px 8px"
                  value="${Utils.escape(g.categoryName)}"
                  onchange="AIGuide.updateGoalField(${g.idx}, 'categoryName', this.value)">
                <select class="form-select" style="width:auto; font-size:12px; padding:4px"
                  onchange="AIGuide.updateGoalField(${g.idx}, 'levelId', this.value)">
                  ${levelOrder.map(lid => `<option value="${lid}" ${g.levelId === lid ? 'selected' : ''}>${levelIcons[lid]} ${levelNames[lid]}</option>`).join('')}
                </select>
                <label style="display:flex; align-items:center; gap:4px; cursor:pointer; padding:4px 8px; border:1px solid var(--c-teal); border-radius:6px; background:#fff; user-select:none">
                  <input type="checkbox" checked id="goal-check-${g.idx}" onchange="AIGuide.toggleGoalSelect(${g.idx}, this.checked)" style="width:16px; height:16px; accent-color:var(--c-teal); cursor:pointer">
                  <span style="font-size:12px; color:var(--c-teal); font-weight:600">要</span>
                </label>
              </div>
              ${g.subTasks && g.subTasks.length > 0 ? `
                <div style="margin-top:6px; padding-top:6px; border-top:1px dashed #ccc">
                  <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px">AI 细分的小目标（可编辑）：</div>
                  <div data-subtasks>
                  ${g.subTasks.map((st, si) => `
                    <div style="display:flex; align-items:center; gap:4px; margin-bottom:4px">
                      <input class="form-input" style="flex:1; font-size:12px; padding:3px 6px"
                        value="${Utils.escape(st)}"
                        onchange="AIGuide.updateSubTask(${g.idx}, ${si}, this.value)">
                      <button class="btn btn-sm" style="padding:2px 6px; font-size:11px; color:#e74c3c" onclick="AIGuide.removeSubTask(${g.idx}, ${si})">✕</button>
                    </div>
                  `).join('')}
                  <button class="btn btn-sm" style="padding:2px 8px; font-size:11px; color:var(--c-teal); border:1px dashed var(--c-teal); border-radius:4px" onclick="AIGuide.addSubTask(${g.idx})">+ 加小目标</button>
                  </div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    });

    s.stage = 'confirm';
    s.chatHistory.push({ role: 'bot', text: `我从你的整体描述中提取了 ${goals.length} 个大目标，每个已经自动细分了小目标。\n请检查：\n• 改分类名/小目标：直接改输入框\n• 不要的：点右侧「要」取消\n确认后自动创建分支，进入任务拆分。` });

    let chatHTML = s.chatHistory.map(m =>
      `<div class="ai-msg ai-msg-${m.role}">${Utils.escape(m.text).replace(/\n/g, '<br>')}</div>`
    ).join('');

    Utils.modal('AI 计划助手', `
      <div class="ai-chat" id="ai-chat">${chatHTML}</div>
      ${itemsHTML}
      <div class="text-sm text-light mt-2" id="global-selection-info">已选 ${goals.length} 个目标</div>
      <button class="btn btn-primary btn-block mt-2" id="global-confirm-btn" onclick="AIGuide.globalConfirmCategories()">✅ 确认，进入任务拆分</button>
    `, () => { this._scrollChat(); });
  },

  globalConfirmCategories() {
    const s = this.globalState;
    if (!s || !s.goals || s.selectedGoals.size === 0) return;

    // 创建大类 + 直接用 subTasks 创建分支，跳过逐个分支问答
    s.createdCategories = [];
    s.allBranches = [];
    Array.from(s.selectedGoals).sort((a, b) => a - b).forEach(idx => {
      const g = s.goals[idx];
      const level = Store.data.plans.levels.find(l => l.id === g.levelId);
      if (!level) return;
      let cat = level.categories.find(c => c.name === g.categoryName);
      if (!cat) {
        cat = { id: Utils.uid(), name: g.categoryName, branches: [], userNotes: g.original };
        level.categories.push(cat);
      } else if (!cat.userNotes) {
        cat.userNotes = g.original;
      }
      s.createdCategories.push({ levelId: g.levelId, levelName: level.name, catId: cat.id, catName: cat.name, userNotes: g.original });

      // ★ 用 AI 生成的 subTasks 直接创建分支
      const subs = g.subTasks || [];
      const branchList = [];
      subs.forEach((st, si) => {
        const branchName = st.trim();
        if (!branchName) return;
        if (!cat.branches.find(br => br.name === branchName)) {
          const status = si < 3 ? 'confirmed' : 'uncertain';
          cat.branches.push({ id: Utils.uid(), name: branchName, status, tasks: [] });
          branchList.push({ name: branchName, status });
        }
      });
      s.allBranches.push({ levelId: g.levelId, levelName: level.name, catId: cat.id, catName: cat.name, branches: branchList });
    });

    Store.save();
    s.chatHistory.push({ role: 'bot', text: `已创建 ${s.createdCategories.length} 个大类，分支已自动生成。现在进入任务拆分——把每个分支拆成可执行的小步骤。` });
    // ★ 跳过分支问答，直接进入任务拆分
    this._globalStartTaskSplit();
  },

  /* ===== 在已有计划基础上用 AI 增量更新（不推倒重来）===== */
  updateState: null,

  startUpdate() {
    const hasPlan = Store.data.plans.levels.some(l => l.categories.length > 0);
    if (!hasPlan) {
      Utils.toast('还没有计划，请先点「🤖 AI 帮我制定计划」创建', 'warning');
      return;
    }
    this.updateState = {
      chatHistory: [],
      request: '',
      stage: 'input',
      returned: null,
      diff: null,
    };
    const greeting = '🔄 这是在你<b>已有计划</b>的基础上更新，不会推倒重来。\n\n'
      + '告诉我你想怎么调整，例如：\n'
      + '• "加一个关于运动的长期目标"\n'
      + '• "把存钱应急那个分类删掉"\n'
      + '• "给德语学习加几个分支方向"\n'
      + '• "把学画画从自我实现挪到尊重需求"\n\n'
      + '我会保留你没说要改的部分，只动你提到的地方。确认无误后再落地。';
    this.updateState.chatHistory.push({ role: 'bot', text: greeting });
    this._renderUpdateModal();
  },

  _serializePlan() {
    const levelNames = { 'lvl-1':'生理需求','lvl-2':'安全需求','lvl-3':'社交需求','lvl-4':'尊重需求','lvl-5':'自我实现' };
    const lines = [];
    Store.data.plans.levels.forEach(l => {
      l.categories.forEach(c => {
        const branchNames = (c.branches || []).map(b => b.name).join('、');
        const subInfo = branchNames ? `（已有分支：${branchNames}）` : '（暂无分支）';
        lines.push(`[id=${c.id}][${levelNames[l.id] || l.id}] ${c.name} ${subInfo}`);
      });
    });
    return lines.join('\n');
  },

  _renderUpdateModal() {
    const s = this.updateState;
    const fmt = m => m.role === 'bot'
      ? m.text.replace(/\n/g, '<br>')
      : Utils.escape(m.text).replace(/\n/g, '<br>');
    const chatHTML = s.chatHistory.map(m => `<div class="ai-msg ai-msg-${m.role}">${fmt(m)}</div>`).join('');

    let body = '';
    if (s.stage === 'input') {
      const suggestions = ['加一个运动相关的目标', '删掉存钱应急分类', '给德语学习加分支', '把学画画挪到尊重需求'];
      body = `
        <div class="ai-quick-options">
          ${suggestions.map(t => `<span class="ai-quick-btn" onclick="AIGuide.updateQuick('${Utils.escape(t)}')">${Utils.escape(t)}</span>`).join('')}
        </div>
        <textarea id="ai-update-input" class="form-input" rows="3" placeholder="描述你想做的调整..." style="width:100%; margin-top:8px; font-size:13px">${Utils.escape(s.request)}</textarea>
        ${!AIClient.hasKey() ? `<div style="font-size:12px; color:#e67e22; margin-top:6px">⚠️ 未检测到 DeepSeek Key，更新需联网调用 AI，请先在设置中配置 Key。</div>` : ''}
        <button class="btn btn-primary btn-block mt-2" onclick="AIGuide.updateAnalyze()">🤖 让 AI 更新计划</button>`;
    } else if (s.stage === 'thinking') {
      body = `<div class="ai-msg ai-msg-bot"><div class="ai-typing">AI 正在基于你的现有计划做增量更新<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div></div>`;
    } else if (s.stage === 'preview') {
      body = this._renderUpdatePreview();
    }

    Utils.modal('🔄 AI 更新计划', `
      <div class="ai-chat" id="ai-chat">${chatHTML}</div>
      ${body}
    `, () => {
      if (this._scrollChat) this._scrollChat();
      const ta = document.getElementById('ai-update-input');
      if (ta) ta.focus();
    });
  },

  updateQuick(t) {
    this.updateState.request = t;
    this._renderUpdateModal();
  },

  async updateAnalyze() {
    const s = this.updateState;
    const ta = document.getElementById('ai-update-input');
    const text = (ta ? ta.value : s.request || '').trim();
    if (!text) { Utils.toast('请先描述你想做的调整', 'warning'); return; }
    if (!AIClient.hasKey()) {
      Utils.toast('更新计划需联网调用 AI，请先在设置中配置 DeepSeek Key', 'warning');
      return;
    }
    s.request = text;
    s.chatHistory.push({ role: 'user', text });
    s.stage = 'thinking';
    this._renderUpdateModal();

    try {
      const profile = this._buildProfileSummary();
      const planText = this._serializePlan();
      const prompt = `你是一个基于马斯洛需求层次理论的个人计划助手，任务是<b>在用户已有计划的基础上做增量更新</b>，绝不能推倒重来。

【用户个人画像摘要】
${profile || '（未填写）'}

【用户当前已有计划（这是必须保留的基础）】
${planText}

【用户的更新需求】
"""
${text}
"""

【你的任务】
根据用户需求，对上面的计划做<b>最小必要改动</b>，返回更新后的<b>完整计划清单</b>（JSON 数组）。规则：
1. <b>保留所有用户没要求改/删的分类</b>，原样保留它们的 id、名称和层级，绝对不要遗漏或丢掉。
2. 用户要求<b>新增</b>的分类：id 设为空字符串 ""，并给出 3-5 个 subTasks（具体可执行的小目标）。
3. 用户要求<b>删除</b>的分类：直接从数组里去掉（不要返回它）。
4. 用户要求<b>修改</b>的分类（改名/换层级）：必须保留其原有 id，只改 categoryName 或 levelId（改名时 id 绝不能丢）。
5. 每个分类返回字段：{"id":"原有id或空串","levelId":"lvl-x","categoryName":"2-8字短句","reason":"为什么这样改/加","subTasks":["小目标1","小目标2",...]}
6. 总数仍 ≤15，每层 ≤3；层级：lvl-1 生理 | lvl-2 安全 | lvl-3 社交 | lvl-4 尊重 | lvl-5 自我实现。

【严格 JSON 格式】
[
  {"id":"...","levelId":"lvl-x","categoryName":"...","reason":"...","subTasks":[...]},
  ...
]`;

      const result = await AIClient.callJSON(prompt, { temperature: 0.3 });
      let list = Array.isArray(result) ? result : [];
      list = list.filter(g => g && g.categoryName && String(g.categoryName).trim());
      list = list.map(g => ({
        id: (g.id && String(g.id).trim()) || '',
        levelId: (g.levelId && String(g.levelId).startsWith('lvl-')) ? g.levelId : 'lvl-5',
        categoryName: String(g.categoryName).trim().slice(0, 12),
        reason: g.reason || '',
        subTasks: Array.isArray(g.subTasks) ? g.subTasks.filter(t => t && String(t).trim()).map(t => String(t).trim()) : [],
      }));
      const levelCount = {};
      list = list.filter(g => { const lid = g.levelId; levelCount[lid] = (levelCount[lid] || 0) + 1; return levelCount[lid] <= 3; });
      if (list.length > 15) list = list.slice(0, 15);

      s.returned = list;
      s.diff = this._computeUpdateDiff(list);
      s.stage = 'preview';
      this._renderUpdateModal();
    } catch (err) {
      Utils.toast('AI 更新失败：' + err.message, 'error');
      s.stage = 'input';
      this._renderUpdateModal();
    }
  },

  // 录入/更新个人信息后，自动让 AI 基于最新画像在现有计划上做增量调整（弹预览，需确认才落地）
  async autoUpdateFromProfile() {
    const hasPlan = Store.data.plans.levels.some(l => l.categories.length > 0);
    if (!hasPlan) return;
    if (!AIClient.hasKey()) return;
    this.updateState = { chatHistory: [], request: '', stage: 'thinking', returned: null, diff: null };
    this._renderUpdateModal();
    try {
      const profile = this._buildProfileSummary(true);
      const planText = this._serializePlan();
      const text = `用户刚刚更新了个人信息，最新个人画像如下：\n${profile}\n\n请基于这份最新个人信息，判断现有计划是否需要调整——例如新增更贴合当前状态的目标或分支、调整已不合适的内容。只做必要的最小改动，未提及的分类保持不变。`;
      const prompt = `你是一个基于马斯洛需求层次理论的个人计划助手，任务是<b>在用户已有计划的基础上做增量更新</b>，绝不能推倒重来。

【用户个人画像摘要】
${profile || '（未填写）'}

【用户当前已有计划（这是必须保留的基础）】
${planText}

【用户的更新需求】
"""
${text}
"""

【你的任务】
根据用户需求，对上面的计划做<b>最小必要改动</b>，返回更新后的<b>完整计划清单</b>（JSON 数组）。规则：
1. <b>保留所有用户没要求改/删的分类</b>，原样保留它们的 id、名称和层级，绝对不要遗漏或丢掉。
2. 用户要求<b>新增</b>的分类：id 设为空字符串 ""，并给出 3-5 个 subTasks（具体可执行的小目标）。
3. 用户要求<b>删除</b>的分类：直接从数组里去掉（不要返回它）。
4. 用户要求<b>修改</b>的分类（改名/换层级）：必须保留其原有 id，只改 categoryName 或 levelId（改名时 id 绝不能丢）。
5. 每个分类返回字段：{"id":"原有id或空串","levelId":"lvl-x","categoryName":"2-8字短句","reason":"为什么这样改/加","subTasks":["小目标1","小目标2",...]}
6. 总数仍 ≤15，每层 ≤3；层级：lvl-1 生理 | lvl-2 安全 | lvl-3 社交 | lvl-4 尊重 | lvl-5 自我实现。

【严格 JSON 格式】
[
  {"id":"...","levelId":"lvl-x","categoryName":"...","reason":"...","subTasks":[...]},
  ...
]`;
      const result = await AIClient.callJSON(prompt, { temperature: 0.3 });
      let list = Array.isArray(result) ? result : [];
      list = list.filter(g => g && g.categoryName && String(g.categoryName).trim());
      list = list.map(g => ({
        id: (g.id && String(g.id).trim()) || '',
        levelId: (g.levelId && String(g.levelId).startsWith('lvl-')) ? g.levelId : 'lvl-5',
        categoryName: String(g.categoryName).trim().slice(0, 12),
        reason: g.reason || '',
        subTasks: Array.isArray(g.subTasks) ? g.subTasks.filter(t => t && String(t).trim()).map(t => String(t).trim()) : [],
      }));
      const levelCount = {};
      list = list.filter(g => { const lid = g.levelId; levelCount[lid] = (levelCount[lid] || 0) + 1; return levelCount[lid] <= 3; });
      if (list.length > 15) list = list.slice(0, 15);

      this.updateState.returned = list;
      this.updateState.diff = this._computeUpdateDiff(list);
      this.updateState.stage = 'preview';
      this._renderUpdateModal();
    } catch (err) {
      Utils.closeModal();
      Utils.toast('AI 自动调整计划失败：' + (err.message || err), 'error');
    }
  },

  _computeUpdateDiff(list) {
    const existingById = {};
    const existingByName = {};
    Store.data.plans.levels.forEach(l => l.categories.forEach(c => {
      existingById[c.id] = { cat: c, levelId: l.id };
      existingByName[String(c.name).trim().toLowerCase()] = c.id;
    }));
    const levelNames = { 'lvl-1':'生理需求','lvl-2':'安全需求','lvl-3':'社交需求','lvl-4':'尊重需求','lvl-5':'自我实现' };
    const added = [], changed = [], kept = [], removed = [];
    const consumedIds = new Set();

    list.forEach(item => {
      let found = item.id ? existingById[item.id] : null;
      if (!found && item.categoryName) {
        const nid = existingByName[String(item.categoryName).trim().toLowerCase()];
        if (nid) found = existingById[nid];
      }
      if (found) {
        consumedIds.add(found.cat.id);
        const lvlChanged = found.levelId !== item.levelId;
        const nameChanged = String(found.cat.name).trim() !== item.categoryName;
        if (lvlChanged || nameChanged) {
          changed.push({ from: `${levelNames[found.levelId] || ''}·${found.cat.name}`, to: `${levelNames[item.levelId] || ''}·${item.categoryName}`, reason: item.reason });
        } else {
          kept.push(item.categoryName);
        }
      } else {
        added.push({ name: item.categoryName, level: levelNames[item.levelId] || item.levelId, reason: item.reason, subTasks: item.subTasks });
      }
    });

    Store.data.plans.levels.forEach(l => l.categories.forEach(c => { if (!consumedIds.has(c.id)) removed.push(c.name); }));
    return { added, changed, kept, removed };
  },

  _renderUpdatePreview() {
    const s = this.updateState;
    const d = s.diff;
    let html = `<div style="font-size:13px; margin:8px 0">AI 将做以下改动（<b>未列出的分类保持不变</b>）：</div>`;
    if (d.added.length) {
      html += `<div class="card" style="border-left:3px solid var(--c-teal); margin:6px 0"><div style="font-weight:700; font-size:13px">➕ 新增 ${d.added.length} 个</div>`
        + d.added.map(a => `<div style="font-size:12px; margin-top:4px">· ${Utils.escape(a.name)} <span style="color:var(--text-secondary)">(${Utils.escape(a.level)})</span>${a.subTasks && a.subTasks.length ? ` — 分支：${Utils.escape(a.subTasks.slice(0, 5).join('、'))}` : ''}</div>`).join('')
        + `</div>`;
    }
    if (d.changed.length) {
      html += `<div class="card" style="border-left:3px solid var(--c-yellow); margin:6px 0"><div style="font-weight:700; font-size:13px">✏️ 修改 ${d.changed.length} 个</div>`
        + d.changed.map(c => `<div style="font-size:12px; margin-top:4px">· ${Utils.escape(c.from)} → <b>${Utils.escape(c.to)}</b></div>`).join('')
        + `</div>`;
    }
    if (d.removed.length) {
      html += `<div class="card" style="border-left:3px solid #e74c3c; margin:6px 0"><div style="font-weight:700; font-size:13px; color:#e74c3c">🗑️ 删除 ${d.removed.length} 个</div>`
        + d.removed.map(n => `<div style="font-size:12px; margin-top:4px; color:#e74c3c">· ${Utils.escape(n)}</div>`).join('')
        + `</div>`;
    }
    if (!d.added.length && !d.changed.length && !d.removed.length) {
      html += `<div style="font-size:13px; color:var(--text-secondary); margin:6px 0">看起来没有需要改动的地方 🤔 你可以换个说法再试试。</div>`;
    }
    html += `
      <div class="flex gap-2 mt-2">
        <button class="btn btn-outline flex-1" onclick="AIGuide.updateCancel()">取消</button>
        <button class="btn btn-primary flex-1" onclick="AIGuide.applyPlanUpdate()">✅ 确认更新</button>
      </div>`;
    return html;
  },

  updateCancel() {
    Utils.closeModal();
    this.updateState = null;
    Router.navigate('plans');
  },

  applyPlanUpdate() {
    const s = this.updateState;
    const list = s.returned || [];
    const existingById = {};
    const existingByName = {};
    Store.data.plans.levels.forEach(l => l.categories.forEach(c => {
      existingById[c.id] = { cat: c, levelId: l.id };
      existingByName[String(c.name).trim().toLowerCase()] = c.id;
    }));
    const levelOrder = ['lvl-1','lvl-2','lvl-3','lvl-4','lvl-5'];
    const consumedIds = new Set();

    list.forEach(item => {
      let found = item.id ? existingById[item.id] : null;
      if (!found && item.categoryName) {
        const nid = existingByName[String(item.categoryName).trim().toLowerCase()];
        if (nid) found = existingById[nid];
      }
      if (found) {
        consumedIds.add(found.cat.id);
        found.cat.name = item.categoryName;
        if (found.levelId !== item.levelId && levelOrder.includes(item.levelId)) {
          const oldLevel = Store.data.plans.levels.find(l => l.id === found.levelId);
          const newLevel = Store.data.plans.levels.find(l => l.id === item.levelId);
          if (oldLevel && newLevel && oldLevel !== newLevel) {
            oldLevel.categories = oldLevel.categories.filter(x => x.id !== found.cat.id);
            if (!newLevel.categories.find(x => x.id === found.cat.id)) newLevel.categories.push(found.cat);
          }
        }
      } else {
        const lvl = Store.data.plans.levels.find(l => l.id === item.levelId) || Store.data.plans.levels[4];
        const newCat = { id: Utils.uid(), name: item.categoryName, branches: [], userNotes: item.reason };
        (item.subTasks || []).forEach((st, si) => {
          if (!st) return;
          newCat.branches.push({ id: Utils.uid(), name: st, status: si < 3 ? 'confirmed' : 'uncertain', tasks: [] });
        });
        lvl.categories.push(newCat);
        consumedIds.add(newCat.id);
      }
    });

    Store.data.plans.levels.forEach(l => { l.categories = l.categories.filter(c => consumedIds.has(c.id)); });

    Store.save();
    Utils.toast('计划已更新！', 'success');
    this.updateState = null;
    Router.navigate('plans');
  },

  // ===== 分支级 AI 问答 =====
  async _globalStartBranchChat() {
    const s = this.globalState;
    if (s.branchIdx >= s.createdCategories.length) { this._globalStartTaskSplit(); return; }
    const cat = s.createdCategories[s.branchIdx];
    s.currentBranches = [];
    s.branchChatHistory = [];

    // 显示加载中
    Utils.modal('AI 分支细化', `
      <div class="ai-chat" id="ai-chat">
        <div class="ai-msg ai-msg-bot"><div class="ai-typing">AI 正在为「${Utils.escape(cat.catName)}」生成分支建议<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div></div>
      </div>
    `);

    s.branchSuggestions = await this._generateBranchSuggestions(cat.catName, cat.userNotes);
    s.branchChatHistory.push({ role: 'bot', text: `📌 ${s.branchIdx + 1}/${s.createdCategories.length} 大类：「${cat.catName}」\n你之前说：${cat.userNotes}\n\n建议分支方向（选3确认+2备选，也可自己输入）：` });
    this._globalRenderBranchChat();
  },

  async _generateBranchSuggestions(catName, userNotes) {
    if (AIClient.hasKey()) {
      try {
        const info = Store.data.personalInfo;
        const profile = Object.entries(info).filter(([k,v]) => v && v !== '不必要').map(([k,v]) => `${k}: ${v}`).join('\n');
        const prompt = `你是个人计划助手。用户想在大类「${catName}」下创建5个分支方向。
用户原始想法：${userNotes || '（无）'}
用户信息：
${profile || '（未填写）'}

请生成5个分支方向，要具体、可执行、有针对性。前3个是推荐确认的方向，后2个是备选方向。
严格返回 JSON 数组：["分支1","分支2","分支3","分支4","分支5"]`;
        const result = await AIClient.callJSON(prompt, { temperature: 0.5 });
        if (result && result.length >= 5) return result.slice(0, 5);
        if (result && result.length > 0) {
          while (result.length < 5) result.push(`${catName}补充方向${result.length + 1}`);
          return result;
        }
      } catch (err) {
        // 回退到模板
      }
    }
    const t = this.branchTemplates;
    if (t[catName]) return t[catName];
    for (const [key, branches] of Object.entries(t)) {
      if (catName.includes(key) || key.includes(catName)) return branches;
    }
    return [`${catName}基础准备`, `${catName}日常实践`, `${catName}进阶提升`, `${catName}资源积累`, `${catName}长期规划`];
  },

  _globalRenderBranchChat() {
    const s = this.globalState;
    const cat = s.createdCategories[s.branchIdx];
    let chatHTML = s.branchChatHistory.map(m => `<div class="ai-msg ai-msg-${m.role}">${Utils.escape(m.text).replace(/\n/g, '<br>')}</div>`).join('');
    chatHTML += `
      <div class="ai-quick-options" id="branch-suggestions">
        ${s.branchSuggestions.map((name, i) => `<span class="ai-quick-btn" data-idx="${i}" data-name="${Utils.escape(name)}" onclick="AIGuide.toggleBranchSelect(${i})">${Utils.escape(name)}</span>`).join('')}
      </div>
      <div class="text-sm text-light mt-2" id="branch-selection-info">点击选择（3确认+2备选=5个）</div>`;
    Utils.modal('AI 分支细化', `
      <div class="ai-chat" id="ai-chat">${chatHTML}</div>
      <div class="ai-input-bar">
        <input class="ai-input" id="ai-branch-input" placeholder="补充说明或自定义分支..." onkeydown="if(event.key==='Enter')AIGuide.globalBranchSend()">
        <button class="ai-send" onclick="AIGuide.globalBranchSend()">➤</button>
      </div>
      <button class="btn btn-primary btn-block mt-2" id="branch-confirm-btn" onclick="AIGuide.globalBranchConfirm()" disabled>✅ 确认分支，继续</button>
    `, () => { this._scrollChat(); const i = document.getElementById('ai-branch-input'); if (i) i.focus(); });
  },

  toggleBranchSelect(idx) {
    const s = this.globalState;
    if (!s) return;
    const btn = document.querySelector(`#branch-suggestions [data-idx="${idx}"]`);
    if (!btn) return;
    const name = btn.dataset.name;
    const existing = s.currentBranches.find(b => b.idx === idx);
    if (existing) {
      s.currentBranches = s.currentBranches.filter(b => b.idx !== idx);
      btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = '';
    } else {
      if (s.currentBranches.length >= 5) { Utils.toast('最多选5个', 'warning'); return; }
      const cc = s.currentBranches.filter(b => b.status === 'confirmed').length;
      const status = cc < 3 ? 'confirmed' : 'uncertain';
      s.currentBranches.push({ idx, name, status });
      if (status === 'confirmed') { btn.style.background = 'var(--c-teal)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--c-teal)'; }
      else { btn.style.background = 'var(--c-yellow)'; btn.style.color = '#c9a800'; btn.style.borderColor = 'var(--c-yellow)'; }
    }
    const c = s.currentBranches.filter(b => b.status === 'confirmed').length;
    const u = s.currentBranches.filter(b => b.status === 'uncertain').length;
    const info = document.getElementById('branch-selection-info');
    if (info) info.textContent = `已选 ${s.currentBranches.length}/5（${c}确认 + ${u}备选）`;
    const cbtn = document.getElementById('branch-confirm-btn');
    if (cbtn) cbtn.disabled = s.currentBranches.length < 5;
  },

  globalBranchSend() {
    const input = document.getElementById('ai-branch-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const s = this.globalState;
    s.branchChatHistory.push({ role: 'user', text });
    input.value = '';
    setTimeout(() => { s.branchChatHistory.push({ role: 'bot', text: '记下了。你可以继续补充，或从上方选分支。选满5个后点确认。' }); this._globalRenderBranchChat(); }, 400);
  },

  globalBranchConfirm() {
    const s = this.globalState;
    if (!s || s.currentBranches.length < 5) { Utils.toast('需要选满5个', 'warning'); return; }
    const cat = s.createdCategories[s.branchIdx];
    const level = Store.data.plans.levels.find(l => l.id === cat.levelId);
    const category = level.categories.find(c => c.id === cat.catId);
    s.currentBranches.forEach(b => {
      if (!category.branches.find(br => br.name === b.name)) {
        category.branches.push({ id: Utils.uid(), name: b.name, status: b.status, tasks: [] });
      }
    });
    s.allBranches.push({ levelId: cat.levelId, levelName: cat.levelName, catId: cat.catId, catName: cat.catName, branches: s.currentBranches.map(b => ({ name: b.name, status: b.status })) });
    Store.save();
    s.branchIdx++;
    this._globalStartBranchChat();
  },

  // ===== 任务拆分（滚雪球风格）=====
  _globalStartTaskSplit() {
    const s = this.globalState;
    s.allConfirmedBranches = [];
    s.allBranches.forEach(cd => {
      cd.branches.forEach(br => {
        if (br.status === 'confirmed') s.allConfirmedBranches.push({ ...br, levelId: cd.levelId, levelName: cd.levelName, catId: cd.catId, catName: cd.catName });
      });
    });
    if (s.allConfirmedBranches.length === 0) {
      Store.recordVersion('AI对话创建计划', `创建${s.createdCategories.length}个大类，已生成分支`);
      Store.save(); Utils.closeModal(); Router.render();
      Utils.toast('计划创建完成！', 'success'); this.globalState = null; return;
    }
    s.taskSplitIdx = 0; s.selectedTasks = [];
    s.chatHistory.push({ role: 'bot', text: `分支全部确认！现在把每个分支拆成可执行的小任务，这样你就知道每天具体做什么了。` });
    this._globalNextTaskSplit();
  },

  async _globalNextTaskSplit() {
    const s = this.globalState;
    if (s.taskSplitIdx >= s.allConfirmedBranches.length) {
      const total = s.allConfirmedBranches.reduce((sum, b) => sum + (b.tasks ? b.tasks.length : 0), 0);
      Store.recordVersion('AI对话创建计划', `创建${s.createdCategories.length}个大类、${s.allConfirmedBranches.length}个确认分支、约${total}个任务`);
      Store.save(); Utils.closeModal(); Router.render();
      Utils.toast(`计划创建完成！${s.createdCategories.length}大类 / ${s.allConfirmedBranches.length}分支 / ~${total}任务`, 'success');
      this.globalState = null; return;
    }
    const br = s.allConfirmedBranches[s.taskSplitIdx];
    s.taskChatHistory = []; s.selectedTasks = [];

    // 显示加载中
    Utils.modal('AI 任务拆分', `
      <div class="ai-chat" id="ai-chat">
        <div class="ai-msg ai-msg-bot"><div class="ai-typing">AI 正在拆分「${Utils.escape(br.name)}」为可执行步骤<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div></div>
      </div>
    `);

    s.taskSuggestions = await this._generateTaskSuggestions(br.name, br.catName);
    s.taskChatHistory.push({ role: 'bot', text: `🔧 ${s.taskSplitIdx + 1}/${s.allConfirmedBranches.length} 分支：「${br.catName} > ${br.name}」\n\n建议拆成以下步骤（可多选，可自己加）：` });
    this._globalRenderTaskSplit();
  },

  async _generateTaskSuggestions(branchName, catName) {
    if (AIClient.hasKey()) {
      try {
        const info = Store.data.personalInfo;
        const profile = Object.entries(info).filter(([k,v]) => v && v !== '不必要').map(([k,v]) => `${k}: ${v}`).join('\n');
        const prompt = `你是个人计划助手。请将分支「${branchName}」（属于大类「${catName}」）拆分成3-6个具体的、可执行的小步骤。

用户信息：
${profile || '（未填写）'}

要求：
- 每个步骤要具体、可执行、有时间感
- 从准备阶段到完成阶段，有逻辑顺序
- 步骤名称简短（5-15字）

严格返回 JSON 数组：["步骤1","步骤2","步骤3"]`;
        const result = await AIClient.callJSON(prompt, { temperature: 0.5 });
        if (result && result.length > 0) return result;
      } catch (err) {
        // 回退到模板
      }
    }
    const taskTemplates = {
      '自己做饭计划': ['收集5个简单菜谱', '每周列菜单', '周末集中采购', '学会3道拿手菜', '提前备餐存冰箱'],
      '固定睡眠时间': ['设定固定就寝时间', '设定固定起床时间', '睡前1小时不看手机', '建立睡前放松仪式', '记录睡眠质量'],
      '每日步行目标': ['设定每日步数目标', '选择固定走路时间', '买舒适运动鞋', '记录每日步数', '每周复盘步数'],
      '月度预算': ['列出固定开支', '设定每月预算上限', '下载记账APP', '每日记录支出', '月底复盘超支项'],
      '读书计划': ['选3本想读的书', '设定每日阅读时间', '准备阅读环境', '做读书笔记', '每周分享读后感'],
      '主动联系老友': ['列出想联系的朋友名单', '每周联系1人', '约线下见面', '建立定期联系习惯', '参加朋友聚会'],
    };
    if (taskTemplates[branchName]) return taskTemplates[branchName];
    for (const [key, tasks] of Object.entries(taskTemplates)) {
      if (branchName.includes(key) || key.includes(branchName)) return tasks;
    }
    return [`了解${branchName}基础知识`, `制定${branchName}周计划`, `每天执行核心行动`, `每周复盘进展`, `寻找同伴或资源`];
  },

  _globalRenderTaskSplit() {
    const s = this.globalState;
    const br = s.allConfirmedBranches[s.taskSplitIdx];
    let chatHTML = s.taskChatHistory.map(m => `<div class="ai-msg ai-msg-${m.role}">${Utils.escape(m.text).replace(/\n/g, '<br>')}</div>`).join('');
    chatHTML += `
      <div class="ai-quick-options" id="task-suggestions">
        ${s.taskSuggestions.map((name, i) => `<span class="ai-quick-btn" data-idx="${i}" data-name="${Utils.escape(name)}" onclick="AIGuide.toggleTaskSelect(${i})">${Utils.escape(name)}</span>`).join('')}
      </div>
      <div class="text-sm text-light mt-2" id="task-selection-info">点击选择要执行的任务</div>`;
    const isLast = s.taskSplitIdx >= s.allConfirmedBranches.length - 1;
    Utils.modal('AI 任务拆分', `
      <div class="ai-chat" id="ai-chat">${chatHTML}</div>
      <div class="ai-input-bar">
        <input class="ai-input" id="ai-task-input" placeholder="自定义任务..." onkeydown="if(event.key==='Enter')AIGuide.globalTaskSend()">
        <button class="ai-send" onclick="AIGuide.globalTaskSend()">➤</button>
      </div>
      <button class="btn btn-primary btn-block mt-2" onclick="AIGuide.globalTaskConfirm()">✅ ${isLast ? '完成' : '确认，下一个分支'}</button>
    `, () => { this._scrollChat(); const i = document.getElementById('ai-task-input'); if (i) i.focus(); });
  },

  toggleTaskSelect(idx) {
    const s = this.globalState;
    if (!s) return;
    const btn = document.querySelector(`#task-suggestions [data-idx="${idx}"]`);
    if (!btn) return;
    const name = btn.dataset.name;
    const existing = s.selectedTasks.find(t => t.idx === idx);
    if (existing) {
      s.selectedTasks = s.selectedTasks.filter(t => t.idx !== idx);
      btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = '';
    } else {
      s.selectedTasks.push({ idx, name });
      btn.style.background = 'var(--c-teal)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--c-teal)';
    }
    const info = document.getElementById('task-selection-info');
    if (info) info.textContent = `已选 ${s.selectedTasks.length} 个任务`;
  },

  globalTaskSend() {
    const input = document.getElementById('ai-task-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const s = this.globalState;
    s.taskChatHistory.push({ role: 'user', text });
    input.value = '';
    setTimeout(() => { s.taskChatHistory.push({ role: 'bot', text: '好的，可以继续补充或从上方选择。' }); this._globalRenderTaskSplit(); }, 400);
  },

  globalTaskConfirm() {
    const s = this.globalState;
    const br = s.allConfirmedBranches[s.taskSplitIdx];
    const level = Store.data.plans.levels.find(l => l.id === br.levelId);
    const category = level.categories.find(c => c.id === br.catId);
    const branch = category.branches.find(b => b.name === br.name);
    if (!branch) return;
    // 选中的任务
    s.selectedTasks.forEach(t => {
      if (!branch.tasks.find(tk => tk.name === t.name)) {
        branch.tasks.push({ id: Utils.uid(), name: t.name, progress: 0, records: [] });
      }
    });
    // 自定义任务
    s.taskChatHistory.filter(m => m.role === 'user').forEach(m => {
      if (!branch.tasks.find(tk => tk.name === m.text)) {
        branch.tasks.push({ id: Utils.uid(), name: m.text, progress: 0, records: [] });
      }
    });
    Store.save();
    s.taskSplitIdx++;
    this._globalNextTaskSplit();
  },

  // ===== 滚雪球功能 =====

  // 遇到困难 → AI 重新拆分任务
  async reSplitTask(lvlId, catId, brId, taskId, prefillDifficulty) {
    const task = Views._getTask(lvlId, catId, brId, taskId);
    if (!task) return;

    Utils.modal('遇到困难？', `
      <div class="form-group">
        <label class="form-label">描述你遇到的困难</label>
        <textarea class="form-textarea" id="difficulty-desc" placeholder="比如：找不到时间、没有设备、不知道怎么做...">${Utils.escape(prefillDifficulty || '')}</textarea>
      </div>
      <p class="text-sm text-light">AI 会根据你的困难重新拆解这个任务，帮你找到突破口。</p>
      <button class="btn btn-primary btn-block mt-2" onclick="AIGuide._doReSplit('${lvlId}','${catId}','${brId}','${taskId}')">🤖 让 AI 帮我拆解</button>
    `, (c) => {
      c.querySelector('#difficulty-desc').focus();
    });
  },

  async _doReSplit(lvlId, catId, brId, taskId) {
    const task = Views._getTask(lvlId, catId, brId, taskId);
    const difficulty = document.getElementById('difficulty-desc').value.trim();

    Utils.modal('AI 拆解', `
      <div class="ai-chat" id="ai-chat">
        <div class="ai-msg ai-msg-bot"><div class="ai-typing">AI 正在分析困难并拆解<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div></div>
      </div>
    `);

    if (!AIClient.hasKey()) {
      // 无 API key，给通用建议
      const generic = [
        `把「${task.name}」拆成更小的第一步`,
        `找一个最低门槛的起始动作`,
        `设定一个5分钟就能做的微行动`,
        `找一个同伴或工具帮忙`,
        `先做最简单版本再说`,
      ];
      this._showReSplitResult(lvlId, catId, brId, taskId, generic, difficulty);
      return;
    }

    try {
      const info = Store.data.personalInfo;
      const profile = Object.entries(info).filter(([k,v]) => v && v !== '不必要').map(([k,v]) => `${k}: ${v}`).join('\n');
      const prompt = `你是个人计划助手。用户在执行任务「${task.name}」时遇到了困难。

困难描述：${difficulty || '（未具体描述）'}
用户信息：
${profile || '（未填写）'}

请帮用户把「${task.name}」重新拆解成3-5个更小、更具体的步骤，让他能从最容易的开始。
要考虑用户描述的困难，给出有针对性的拆解。

严格返回 JSON 数组：["步骤1","步骤2","步骤3"]`;

      const result = await AIClient.callJSON(prompt, { temperature: 0.6 });
      this._showReSplitResult(lvlId, catId, brId, taskId, result, difficulty);
    } catch (err) {
      Utils.toast('AI 拆解失败: ' + err.message, 'error');
      Utils.closeModal();
    }
  },

  _showReSplitResult(lvlId, catId, brId, taskId, steps, difficulty) {
    const task = Views._getTask(lvlId, catId, brId, taskId);
    let stepsHTML = steps.map((s, i) => `
      <label class="check-item" style="display:flex; align-items:center; gap:8px; padding:8px; background:#f9f9f9; border-radius:8px; margin-bottom:6px; cursor:pointer">
        <input type="checkbox" checked style="width:18px; height:18px" data-name="${Utils.escape(s)}">
        <span style="font-size:14px">${Utils.escape(s)}</span>
      </label>
    `).join('');

    Utils.modal('AI 拆解完成', `
      <div class="ai-chat" id="ai-chat">
        <div class="ai-msg ai-msg-bot">${difficulty ? `你遇到的困难：${Utils.escape(difficulty)}<br><br>` : ''}我把「${Utils.escape(task.name)}」拆成了更小的步骤，选你要添加为新任务的：</div>
      </div>
      ${stepsHTML}
      <button class="btn btn-primary btn-block mt-2" onclick="AIGuide._confirmReSplit('${lvlId}','${catId}','${brId}','${taskId}')">添加选中的步骤为新任务</button>
      <button class="btn btn-secondary btn-block mt-2" onclick="Utils.closeModal()">取消</button>
    `);
  },

  _confirmReSplit(lvlId, catId, brId, taskId) {
    const br = Views._getBranch(lvlId, catId, brId);
    const checks = document.querySelectorAll('[data-name]');
    let added = 0;
    checks.forEach(c => {
      if (c.checked) {
        const name = c.dataset.name;
        if (!br.tasks.find(t => t.name === name)) {
          br.tasks.push({ id: Utils.uid(), name, progress: 0, records: [], splitFrom: taskId });
          added++;
        }
      }
    });
    if (added > 0) {
      Store.recordVersion('AI困难拆解', `${br.name} → 新增${added}个任务`);
      Store.save();
    }
    Utils.closeModal();
    Router.render();
    Utils.toast(`新增了 ${added} 个任务`, 'success');
  },

  // 状态记录（执行前后）
  recordState(lvlId, catId, brId, taskId, phase) {
    const task = Views._getTask(lvlId, catId, brId, taskId);
    const phaseLabel = phase === 'before' ? '开始前' : '结束后';
    const moods = ['💪 充满动力', '😐 一般', '😰 有点焦虑', '😴 疲惫', '😊 开心', '😤 挫败', '🤔 犹豫'];

    Utils.modal(`${phaseLabel}状态记录`, `
      <div class="form-group">
        <label class="form-label">心情状态</label>
        <div class="radio-group" id="state-mood-group">
          ${moods.map((m, i) => `<span class="radio-chip ${i===0?'active':''}" data-val="${m}">${m}</span>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">能量值: <span id="state-energy-val">5</span>/10</label>
        <input type="range" min="1" max="10" value="5" id="state-energy" style="width:100%">
      </div>
      <div class="form-group">
        <label class="form-label">备注（可选）</label>
        <textarea class="form-textarea" id="state-note" placeholder="现在的感受、注意力状态等"></textarea>
      </div>
      <button class="btn btn-primary btn-block" onclick="AIGuide._confirmState('${lvlId}','${catId}','${brId}','${taskId}','${phase}')">记录</button>
    `, (c) => {
      c.querySelectorAll('#state-mood-group .radio-chip').forEach(chip => {
        chip.onclick = () => {
          c.querySelectorAll('#state-mood-group .radio-chip').forEach(x => x.classList.remove('active'));
          chip.classList.add('active');
        };
      });
      c.querySelector('#state-energy').oninput = (e) => {
        c.querySelector('#state-energy-val').textContent = e.target.value;
      };
    });
  },

  _confirmState(lvlId, catId, brId, taskId, phase) {
    const task = Views._getTask(lvlId, catId, brId, taskId);
    if (!task.stateLogs) task.stateLogs = [];
    const moodChip = document.querySelector('#state-mood-group .active');
    const mood = moodChip ? moodChip.dataset.val : '';
    const energy = parseInt(document.getElementById('state-energy').value);
    const note = document.getElementById('state-note').value.trim();

    task.stateLogs.push({
      time: new Date().toISOString(),
      phase,
      mood,
      energy,
      note,
    });
    Store.save();
    Utils.closeModal();
    Utils.toast(`${phase === 'before' ? '开始前' : '结束后'}状态已记录`, 'success');
  },

  // 保存 SOP 模板
  saveSOP(lvlId, catId, brId) {
    const br = Views._getBranch(lvlId, catId, brId);
    if (!br.tasks || br.tasks.length === 0) {
      Utils.toast('没有任务可保存为SOP', 'warning');
      return;
    }
    Utils.modal('保存为 SOP 模板', `
      <p class="text-sm text-light">把当前分支的所有任务保存为一个固定流程模板，以后可以快速复制到其他分支。</p>
      <div class="form-group">
        <label class="form-label">SOP 名称</label>
        <input class="form-input" id="sop-name" value="${Utils.escape(br.name)}流程" autofocus>
      </div>
      <div class="text-sm text-light mt-2">将保存 ${br.tasks.length} 个任务步骤</div>
      <button class="btn btn-primary btn-block mt-2" onclick="AIGuide._confirmSaveSOP('${lvlId}','${catId}','${brId}')">保存模板</button>
    `, (c) => {
      c.querySelector('#sop-name').focus();
    });
  },

  _confirmSaveSOP(lvlId, catId, brId) {
    const br = Views._getBranch(lvlId, catId, brId);
    const name = document.getElementById('sop-name').value.trim();
    if (!name) { Utils.toast('请输入名称', 'warning'); return; }

    if (!Store.data.sopTemplates) Store.data.sopTemplates = [];
    Store.data.sopTemplates.push({
      id: Utils.uid(),
      name,
      tasks: br.tasks.map(t => t.name),
      fromBranch: br.name,
      createdAt: new Date().toISOString(),
    });
    br.sop = name;
    Store.save();
    Utils.closeModal();
    Utils.toast('SOP 模板已保存', 'success');
  },

  // 应用 SOP 模板
  applySOP(lvlId, catId, brId) {
    if (!Store.data.sopTemplates || Store.data.sopTemplates.length === 0) {
      Utils.toast('还没有SOP模板', 'warning');
      return;
    }
    const templates = Store.data.sopTemplates;
    Utils.modal('选择 SOP 模板', `
      ${templates.map(t => `
        <div class="card" style="margin-bottom:8px; cursor:pointer" onclick="AIGuide._confirmApplySOP('${lvlId}','${catId}','${brId}','${t.id}')">
          <div style="font-weight:700; font-size:14px">${Utils.escape(t.name)}</div>
          <div class="text-sm text-light mt-1">${t.tasks.length} 个步骤 · 来自「${Utils.escape(t.fromBranch || '')}」</div>
        </div>
      `).join('')}
    `);
  },

  _confirmApplySOP(lvlId, catId, brId, sopId) {
    const br = Views._getBranch(lvlId, catId, brId);
    const tpl = Store.data.sopTemplates.find(t => t.id === sopId);
    if (!tpl) return;
    tpl.tasks.forEach(name => {
      if (!br.tasks.find(t => t.name === name)) {
        br.tasks.push({ id: Utils.uid(), name, progress: 0, records: [] });
      }
    });
    br.sop = tpl.name;
    Store.recordVersion('应用SOP', `${br.name} → ${tpl.name} (${tpl.tasks.length}个任务)`);
    Store.save();
    Utils.closeModal();
    Router.render();
    Utils.toast(`已应用「${tpl.name}」，新增任务`, 'success');
  },
};

/* ========== 执行引导系统 ========== */
const ExecGuide = {
  currentTask: null,
  aiTip: '',
  chatHistory: [],

  // 收集所有未完成任务
  getIncompleteTasks() {
    const tasks = [];
    Store.data.plans.levels.forEach(lvl => {
      lvl.categories.forEach(cat => {
        (cat.branches || []).forEach(br => {
          if (br.status === 'confirmed') {
            (br.tasks || []).forEach(task => {
              if ((task.progress || 0) < 100) {
                tasks.push({
                  lvlId: lvl.id, lvlName: lvl.name,
                  catId: cat.id, catName: cat.name,
                  brId: br.id, brName: br.name,
                  taskId: task.id, taskName: task.name,
                  progress: task.progress || 0,
                });
              }
            });
          }
        });
      });
    });
    return tasks;
  },

  // AI 给执行提示
  async askAI() {
    const task = this.currentTask;
    if (!task) return;

    const tipEl = document.getElementById('exec-ai-tip');
    if (tipEl) tipEl.innerHTML = '<div class="ai-typing">AI 正在思考<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>';

    const info = Store.data.personalInfo;
    const profile = Object.entries(info).filter(([k,v]) => v && v !== '不必要').map(([k,v]) => `${k}: ${v}`).join('\n');
    const hour = new Date().getHours();
    const timeCtx = hour < 6 ? '凌晨' : hour < 12 ? '上午' : hour < 14 ? '中午' : hour < 18 ? '下午' : hour < 22 ? '晚上' : '深夜';

    if (!AIClient.hasKey()) {
      this.aiTip = `现在是${timeCtx}，建议你现在就开始做「${task.taskName}」。\n\n第一步：把任务拆成5分钟能开始的小动作。\n第二步：不管做多少，先开始。\n第三步：做完一点就记录进度。\n\n如果你不知道怎么开始，点「遇到困难」告诉我具体卡在哪里。`;
      if (tipEl) tipEl.innerHTML = Utils.escape(this.aiTip).replace(/\n/g, '<br>');
      return;
    }

    try {
      const prompt = `你是一个个人执行教练。用户现在要执行这个任务：

任务：${task.taskName}
所属：${task.lvlName} › ${task.catName} › ${task.brName}
当前进度：${task.progress}%
当前时间：${timeCtx}

用户信息：
${profile || '（未填写）'}

请给出一个具体的、可操作的执行建议。要求：
1. 告诉用户现在第一步具体做什么（越具体越好）
2. 预估这步需要多长时间
3. 如果用户可能遇到困难，提前提醒
4. 语气鼓励但不啰嗦，总共不超过150字

直接回复建议内容，不要加引号或标记。`;

      const result = await AIClient.call(prompt, { temperature: 0.7, maxTokens: 512 });
      this.aiTip = result.trim();
      if (tipEl) tipEl.innerHTML = Utils.escape(this.aiTip).replace(/\n/g, '<br>');
    } catch (err) {
      this.aiTip = `建议你现在就开始做「${task.taskName}」。先做第一步，哪怕只做5分钟。如果遇到困难，点「遇到困难」按钮告诉我。`;
      if (tipEl) tipEl.innerHTML = Utils.escape(this.aiTip).replace(/\n/g, '<br>');
      Utils.toast('AI 暂时不可用，已给通用建议', 'warning');
    }
  },

  // 完成当前任务
  completeTask() {
    const task = this.currentTask;
    if (!task) return;

    // 更新任务进度到100%
    const t = Views._getTask(task.lvlId, task.catId, task.brId, task.taskId);
    if (t) {
      t.progress = 100;
      if (!t.records) t.records = [];
      t.records.push({
        time: new Date().toISOString(),
        amount: '完成',
        note: '通过执行引导完成',
      });
      Store.save();
      Store.recordVersion('执行引导-完成任务', `${task.brName} > ${task.taskName}`);
    }

    // 记录到今日活动
    const today = Utils.todayStr();
    if (!Store.data.dailyLogs[today]) Store.data.dailyLogs[today] = { activities: [] };
    Store.data.dailyLogs[today].activities.push({
      type: 'work',
      time: `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`,
      desc: `✅ 完成: ${task.taskName}`,
    });
    Store.save();

    this.aiTip = '';
    Utils.toast(`完成「${task.taskName}」！🎉 去「今日」页勾选并掷骰领奖励吧`, 'success');

    // 切到下一个任务
    const remaining = this.getIncompleteTasks();
    if (remaining.length > 0) {
      this.currentTask = remaining[0];
      Utils.toast(`下一个：${remaining[0].taskName}`, 'info');
    } else {
      this.currentTask = null;
      Utils.toast('所有任务都完成了！🎉', 'success');
    }
    Router.render();
  },

  // 打开困难对话
  openDifficultyChat() {
    const task = this.currentTask;
    if (!task) return;

    this.chatHistory = [];
    this.chatHistory.push({
      role: 'bot',
      text: `你正在做「${task.taskName}」。\n\n遇到了困难？还是想跳过、换个任务？直接告诉我，或者点下方按钮。`,
    });

    this._renderDifficultyChat();
  },

  _renderDifficultyChat() {
    const task = this.currentTask;
    let chatHTML = this.chatHistory.map(m =>
      `<div class="ai-msg ai-msg-${m.role}">${Utils.escape(m.text).replace(/\n/g, '<br>')}</div>`
    ).join('');

    Utils.modal('🆘 执行困难对话', `
      <div class="exec-chat-context">
        <span class="text-sm text-light">当前任务：</span>
        <span class="text-sm font-bold">${Utils.escape(task.taskName)}</span>
      </div>
      <div class="ai-chat" id="ai-chat">${chatHTML}</div>
      <div class="ai-input-bar">
        <textarea class="ai-input" id="difficulty-input" placeholder="告诉AI你想做什么..." rows="2"></textarea>
        <button class="btn btn-primary ai-send-btn" onclick="ExecGuide.sendDifficulty()">发送</button>
      </div>
      <div class="exec-chat-actions">
        <button class="btn btn-secondary btn-sm" style="flex:1; border-color:var(--c-teal); color:var(--c-teal)" onclick="ExecGuide.resolveDifficulty()">✅ 解决了</button>
        <button class="btn btn-secondary btn-sm" style="flex:1; border-color:var(--c-yellow); color:#B8860B" onclick="ExecGuide.skipTask()">⏭️ 跳过此任务</button>
        <button class="btn btn-secondary btn-sm" style="flex:1; border-color:var(--c-lavender); color:var(--c-lavender)" onclick="ExecGuide.switchTask()">🔄 换个任务</button>
        <button class="btn btn-secondary btn-sm" style="flex:1; border-color:var(--c-coral); color:var(--c-coral)" onclick="ExecGuide.exitGuide()">🚪 退出</button>
      </div>
    `, (c) => {
      this._scrollChat();
      const input = c.querySelector('#difficulty-input');
      if (input) {
        input.focus();
        input.onkeydown = (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendDifficulty();
          }
        };
      }
    });
  },

  async sendDifficulty() {
    const input = document.getElementById('difficulty-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    this.chatHistory.push({ role: 'user', text });
    input.value = '';

    // 显示 AI 思考中
    const chatEl = document.getElementById('ai-chat');
    if (chatEl) {
      chatEl.innerHTML = this.chatHistory.map(m =>
        `<div class="ai-msg ai-msg-${m.role}">${Utils.escape(m.text).replace(/\n/g, '<br>')}</div>`
      ).join('') + '<div class="ai-msg ai-msg-bot"><div class="ai-typing">AI 正在思考<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div></div>';
      this._scrollChat();
    }

    const task = this.currentTask;
    const info = Store.data.personalInfo;
    const profile = Object.entries(info).filter(([k,v]) => v && v && v !== '不必要').map(([k,v]) => `${k}: ${v}`).join('\n');

    // 构建对话历史
    const historyText = this.chatHistory.filter(m => m.role === 'user').map((m, i) => `用户第${i+1}次说：${m.text}`).join('\n');

    if (!AIClient.hasKey()) {
      const tips = [
        '试试把任务拆成更小的步骤，先做最简单的那一步。',
        '如果卡住了，可以先跳过这个任务，做别的，等有灵感了再回来。',
        '考虑一下是不是方法不对？换个思路试试。',
        '找个朋友或网上社区问问，也许有人遇到过类似问题。',
        '设定一个5分钟的计时器，只做5分钟，做完再决定要不要继续。',
      ];
      const tip = tips[Math.floor(Math.random() * tips.length)];
      this.chatHistory.push({ role: 'bot', text: tip });
      this._updateChatDisplay();
      return;
    }

    try {
      const prompt = `你是一个个人执行教练，正在和用户对话。用户正在执行任务时遇到了困难或者想调整计划。

当前任务：${task.taskName}（${task.catName} > ${task.brName}，进度${task.progress}%）

用户信息：
${profile || '（未填写）'}

对话历史：
${historyText}

用户刚刚说了：${text}

【重要：你必须真正听用户的话】
- 如果用户说"跳过""先不做了""换个任务"，你就要尊重用户的决定，不要强行挽留或重新解释任务
- 如果用户说"我想做XXX"，你就帮用户分析如何做XXX，而不是继续当前任务
- 如果用户在描述困难，你才给出解决困难的建议
- 如果用户在问问题，你直接回答
- 不要自作主张地重新解释任务或简化任务，除非用户明确要求

请给出简短、有针对性的回复。不超过150字。直接回复内容。`;

      const result = await AIClient.call(prompt, { temperature: 0.7, maxTokens: 512 });
      this.chatHistory.push({ role: 'bot', text: result.trim() });
      this._updateChatDisplay();
    } catch (err) {
      this.chatHistory.push({ role: 'bot', text: '抱歉，AI 暂时不可用。你可以先跳过这个任务，或者退出。' });
      this._updateChatDisplay();
    }
  },

  _updateChatDisplay() {
    const chatEl = document.getElementById('ai-chat');
    if (!chatEl) return;
    chatEl.innerHTML = this.chatHistory.map(m =>
      `<div class="ai-msg ai-msg-${m.role}">${Utils.escape(m.text).replace(/\n/g, '<br>')}</div>`
    ).join('');
    this._scrollChat();
  },

  _scrollChat() {
    setTimeout(() => {
      const chatEl = document.getElementById('ai-chat');
      if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
    }, 50);
  },

  // 困难解决，继续
  resolveDifficulty() {
    Utils.closeModal();
    Utils.toast('继续加油！💪', 'success');
    // 记录到今日活动
    const today = Utils.todayStr();
    if (!Store.data.dailyLogs[today]) Store.data.dailyLogs[today] = { activities: [] };
    Store.data.dailyLogs[today].activities.push({
      type: 'work',
      time: `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`,
      desc: `💬 解决困难: ${this.currentTask.taskName}`,
    });
    Store.save();
    this.chatHistory = [];
  },

  // 从困难中拆分任务
  splitFromDifficulty() {
    const task = this.currentTask;
    const lastDifficulty = this.chatHistory.filter(m => m.role === 'user').map(m => m.text).join('; ');

    Utils.closeModal();
    this.chatHistory = [];

    // 调用 AIGuide 的困难拆分，预填困难描述
    setTimeout(() => {
      AIGuide.reSplitTask(task.lvlId, task.catId, task.brId, task.taskId, lastDifficulty);
    }, 300);
  },

  // 跳过当前任务，切到下一个
  skipTask() {
    const task = this.currentTask;
    if (!task) return;
    Utils.closeModal();
    this.chatHistory = [];

    // 记录跳过
    const today = Utils.todayStr();
    if (!Store.data.dailyLogs[today]) Store.data.dailyLogs[today] = { activities: [] };
    Store.data.dailyLogs[today].activities.push({
      type: 'rest',
      time: `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`,
      desc: `⏭️ 跳过: ${task.taskName}`,
    });
    Store.save();

    // 切到下一个未完成任务
    const remaining = this.getIncompleteTasks().filter(t => t.taskId !== task.taskId);
    if (remaining.length > 0) {
      this.currentTask = remaining[0];
      this.aiTip = '';
      Utils.toast(`已跳过「${task.taskName}」，下一个：${remaining[0].taskName}`, 'info');
    } else {
      this.currentTask = null;
      this.aiTip = '';
      Utils.toast(`已跳过「${task.taskName}」，没有其他未完成任务了`, 'info');
    }
    Router.render();
  },

  // 换一个任务
  switchTask() {
    const task = this.currentTask;
    if (!task) return;
    Utils.closeModal();
    this.chatHistory = [];

    const remaining = this.getIncompleteTasks().filter(t => t.taskId !== task.taskId);
    if (remaining.length === 0) {
      Utils.toast('没有其他未完成任务了', 'info');
      return;
    }

    // 弹出任务选择列表
    const taskOptions = remaining.map((t, i) =>
      `<button class="btn btn-secondary btn-sm btn-block mb-2" onclick="ExecGuide._selectTask(${i})" style="text-align:left">
        <div class="font-bold text-sm">${Utils.escape(t.taskName)}</div>
        <div class="text-sm text-light">${Utils.escape(t.lvlName)} › ${Utils.escape(t.catName)} › ${Utils.escape(t.brName)} (${t.progress}%)</div>
      </button>`
    ).join('');

    Utils.modal('选择任务', `
      <div class="text-sm text-light mb-3">选择你想做的任务：</div>
      ${taskOptions}
    `);
    this._switchCandidates = remaining;
  },

  _selectTask(idx) {
    const task = this._switchCandidates[idx];
    if (!task) return;
    this.currentTask = task;
    this.aiTip = '';
    Utils.closeModal();
    Utils.toast(`已切换到：${task.taskName}`, 'success');
    Router.render();
  },

  // 退出执行引导
  exitGuide() {
    Utils.closeModal();
    this.chatHistory = [];
    this.currentTask = null;
    this.aiTip = '';
    Utils.toast('已退出执行引导', 'info');
    Router.render();
  },

  // 从登记页列表选择任务
  _selectFromList(idx) {
    const tasks = this.getIncompleteTasks();
    if (tasks[idx]) {
      this.currentTask = tasks[idx];
      this.aiTip = '';
      Utils.toast(`已选择：${tasks[idx].taskName}`, 'success');
      Router.render();
    }
  },
};

/* ========== 提醒系统 ========== */
const Reminder = {
  timer: null,

  start() {
    this.stop();
    if (!Store.data.settings.reminderEnabled) return;
    const interval = Store.data.settings.reminderInterval * 60 * 1000;
    this.timer = setInterval(() => this.fire(), interval);
    Store.data.lastReminderTime = Date.now();
    Store.save();
  },

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },

  restart() {
    this.start();
  },

  fire() {
    const now = Date.now();
    Store.data.lastReminderTime = now;
    Store.save();

    // 浏览器通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⏰ 时间记录提醒', {
        body: '你刚才在做什么？花10秒记录一下吧！',
        icon: 'icon-192.png',
        tag: 'plan-reminder',
      });
    }

    // 声音
    if (Store.data.settings.soundEnabled) {
      Utils.playBeep();
    }

    // 页面内横幅
    this.showBanner();

    // 更新图标
    const badge = document.getElementById('reminder-badge');
    if (badge) badge.style.display = 'block';
  },

  showBanner() {
    const existing = document.querySelector('.reminder-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'reminder-banner';
    banner.innerHTML = `
      <span class="reminder-banner-icon">⏰</span>
      <div class="reminder-banner-text">
        <div class="reminder-banner-title">该记录了！</div>
        <div class="reminder-banner-desc">你刚才在做什么？点击登记</div>
      </div>
      <button class="reminder-banner-close" onclick="this.parentElement.remove()">×</button>
    `;
    banner.onclick = (e) => {
      if (e.target.tagName !== 'BUTTON') Router.navigate('companion');
      banner.remove();
      const badge = document.getElementById('reminder-badge');
      if (badge) badge.style.display = 'none';
    };
    document.body.appendChild(banner);

    setTimeout(() => { if (banner.parentElement) banner.remove(); }, 30000);
  },
};

/* ========== AI 伙伴系统 (Companion) ========== */
const Companion = {
  sending: false,

  /* --- 记账数据操作 --- */
  addRecord(type, amount, category, note) {
    Store.data.accounting.records.push({
      id: Utils.uid(),
      type, // 'expense' | 'income'
      amount: parseFloat(amount) || 0,
      category: category || '其他',
      note: note || '',
      time: new Date().toISOString(),
    });
    Store.save();
  },

  deleteRecord(id) {
    Store.data.accounting.records = Store.data.accounting.records.filter(r => r.id !== id);
    Store.save();
  },

  getTodayRecords() {
    const today = Utils.todayStr();
    return Store.data.accounting.records.filter(r => {
      const d = new Date(r.time);
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return ds === today;
    });
  },

  getTodaySpending() {
    const records = this.getTodayRecords();
    let expense = 0, income = 0;
    const details = [];
    records.forEach(r => {
      if (r.type === 'expense') {
        expense += r.amount;
        details.push({ category: r.category, amount: r.amount, note: r.note });
      } else {
        income += r.amount;
      }
    });
    return { expense, income, net: income - expense, details, count: records.length };
  },

  getMonthSpending() {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    let expense = 0, income = 0;
    Store.data.accounting.records.forEach(r => {
      const d = new Date(r.time);
      if (d.getFullYear() === y && d.getMonth() === m) {
        if (r.type === 'expense') expense += r.amount;
        else income += r.amount;
      }
    });
    return { expense, income, net: income - expense };
  },

  /* --- 活动记录（复用 dailyLogs） --- */
  logActivity(type, desc) {
    const today = Utils.todayStr();
    if (!Store.data.dailyLogs[today]) Store.data.dailyLogs[today] = { activities: [] };
    if (!Store.data.dailyLogs[today].activities) Store.data.dailyLogs[today].activities = [];
    const now = new Date();
    Store.data.dailyLogs[today].activities.push({
      type,
      desc: desc || '',
      time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
    });
    Store.save();
  },

  /* --- 计划进度更新 --- */
  updatePlanProgress(taskName, progress) {
    let found = false;
    Store.data.plans.levels.forEach(lvl => {
      lvl.categories.forEach(cat => {
        (cat.branches || []).forEach(br => {
          (br.tasks || []).forEach(task => {
            if (task.name === taskName || task.name.includes(taskName)) {
              task.progress = Math.min(100, Math.max(0, parseInt(progress) || 0));
              if (!task.records) task.records = [];
              task.records.push({ time: new Date().toISOString(), amount: `AI更新进度${progress}%`, note: '' });
              found = true;
            }
          });
        });
      });
    });
    if (found) Store.save();
    return found;
  },

  /* --- 今日重点（Daily Focus）--- */
  // 进入 Companion 页面时调用：若今天尚未问过，先抛一条「今日重点」提问
  maybeAskFocus() {
    const char = Store.data.aiCharacter;
    const today = Utils.todayStr();
    if (!char.dailyFocus || char.dailyFocus.date !== today) {
      char.dailyFocus = { date: today, asked: false, collected: false, items: [], muted: false };
    }
    const f = char.dailyFocus;
    if (!f.asked && !f.muted) {
      f.asked = true;
      char.chatHistory.push({
        role: 'assistant',
        content: '今天最想搞定的 1-3 件事是？比如「高数复习 背单词 跑步」，直接发给我就行～（想跳过就回「跳过」）',
        time: new Date().toISOString(),
      });
      Store.save();
    }
  },

  // 解析用户发来的重点条目（本地规则，离线可用）：按换行/顿号/逗号/分号拆分，最多 3 条
  parseFocusItems(msg) {
    if (!msg) return [];
    let s = msg.trim();
    // 去掉常见前缀
    s = s.replace(/^(我想搞定|我想|我想要|我要搞定|我要|今日|今天|我的重点|重点|帮我盯|搞定)/, '');
    const parts = s.split(/[\s、，,；;。.]+/).map(x => x.trim()).filter(Boolean);
    // 去掉像「跳过」「没有」「无」这类
    const skipWords = ['跳过', '没有', '无', '算了', '先不', '不用', '不需要', '没有重点', '没什么'];
    const items = parts.filter(p => !skipWords.includes(p) && p.length <= 30);
    return items.slice(0, 3);
  },

  // 采集模式下，从计划体系兜底取未完成任务名作为重点
  _collectFromPlans() {
    const items = [];
    (Store.data.plans.levels || []).forEach(lvl => {
      (lvl.categories || []).forEach(cat => {
        (cat.branches || []).forEach(br => {
          (br.tasks || []).forEach(t => {
            if ((t.progress || 0) < 100 && items.length < 3) items.push(t.name);
          });
        });
      });
    });
    return items;
  },

  // 是否「跳过」意图（在采集重点时）
  _isSkipIntent(msg) {
    return /^(跳过|算了|先不|不用|不需要|没有重点|没什么|没有|暂时不|先不说了)$/.test(msg.trim()) || /(跳过|算了|先不|不用管|暂时不)/.test(msg);
  },

  // 是否「退出/安静」意图（让用户别再追问/推送）
  _isMuteIntent(msg) {
    return /(别问了|不用管|别催了|别说了|安静点|安静|别烦|别打扰|退出|不用了|不用推|别推|让我自己|别管我|shut)/.test(msg);
  },

  // 在 Companion.send 里拦截：处理「今日重点采集」与「退出/安静」意图（离线可用，不调 AI）
  _tryHandleFocusOrMute(message) {
    const char = Store.data.aiCharacter;
    const f = char.dailyFocus;
    const today = Utils.todayStr();
    if (!f || f.date !== today) return null;

    // 采集模式
    if (f.asked && !f.collected) {
      if (this._isMuteIntent(message)) {
        f.collected = true; f.muted = true; Store.save();
        return { reply: '好，那我先不盯了，需要时随时叫我 🤫' };
      }
      if (this._isSkipIntent(message)) {
        const fallback = this._collectFromPlans();
        f.collected = true; f.items = fallback; Store.save();
        return {
          reply: fallback.length
            ? `行，那我按你现有的计划来盯：${fallback.map((x, i) => `${i + 1}. ${x}`).join(' ')}`
            : '好，那我先不设定具体目标，你随时找我～',
        };
      }
      const items = this.parseFocusItems(message);
      if (items.length === 0) {
        return { reply: '没太 get 到重点～直接发我就行，比如「高数复习 背单词 跑步」，或者回「跳过」' };
      }
      f.collected = true; f.items = items; Store.save();
      return { reply: `收到！今天我帮你盯紧：\n${items.map((x, i) => `${i + 1}. ${x}`).join('\n')}` };
    }

    // 退出 / 安静意图（非采集）
    if (this._isMuteIntent(message)) {
      f.muted = true; Store.save();
      return { reply: '好，我安静啦 🤫 需要时随时叫我。' };
    }
    return null;
  },

  setPrefs(prefs) {
    const char = Store.data.aiCharacter;
    char.prefs = Object.assign(char.prefs || { tone: 'encouraging', pace: 'normal', quietHours: '', custom: '' }, prefs);
    Store.save();
  },

  /* --- 构建 system prompt --- */
  buildSystemPrompt() {
    const char = Store.data.aiCharacter;
    const profile = AIGuide._buildProfileSummary();
    const todaySpend = this.getTodaySpending();
    const monthSpend = this.getMonthSpending();
    const today = Utils.todayStr();
    const todayLog = Store.data.dailyLogs[today] || { activities: [] };
    const activities = (todayLog.activities || []).slice(-5).reverse();

    let p = '';

    // === 角色设定 ===
    p += '【你的角色设定】\n';
    if (char.characterDesc) {
      p += `${char.characterDesc}\n\n`;
    } else {
      p += '你是一个温暖、关心用户的AI伙伴。\n\n';
    }

    if (char.worldview) {
      p += `【世界观背景】\n${char.worldview}\n\n`;
    }
    if (char.userPersona) {
      p += `【用户在这个世界观里的人设】\n${char.userPersona}\n\n`;
    }
    if (char.relationship) {
      p += `【你们的关系】${char.relationship}\n\n`;
    }

    p += `【称呼】\n`;
    p += `- 你的名字：${char.name || 'Hyuna'}\n`;
    p += `- 你称呼用户为：${char.userNickname || 'Ricky'}\n`;
    p += `- 用户称呼你为：${char.aiNickname || 'Hyuna'}\n\n`;

    // === 用户真实信息（现实世界，非世界观设定）===
    p += `【用户的真实生活信息】（以下是你监督用户时需要了解的现实情况，与上面的世界观设定分开）\n`;

    // 画像摘要（AI提炼版）
    if (profile && profile.trim()) {
      p += `${profile}\n`;
    }

    // 补充：直接从 personalInfo 补充画像摘要可能遗漏的字段
    const info = Store.data.personalInfo || {};
    const skip = v => !v || v === '不必要' || v === '' || v === '无';
    const extraLines = [];
    if (!skip(info.notes)) extraLines.push(`· 补充说明: ${info.notes}`);
    if (extraLines.length > 0) p += extraLines.join('\n') + '\n';
    p += '\n';

    // === 今日财务 ===
    p += `【今日财务】\n`;
    p += `- 今日支出：${todaySpend.expense}元`;
    if (todaySpend.details.length > 0) {
      p += `（${todaySpend.details.map(d => `${d.category}${d.amount}元`).join('、')}）`;
    }
    p += `\n`;
    if (todaySpend.income > 0) p += `- 今日收入：${todaySpend.income}元\n`;
    p += `- 本月支出：${monthSpend.expense}元，收入：${monthSpend.income}元\n\n`;

    // === 今日活动 ===
    if (activities.length > 0) {
      const labels = { sleep:'睡觉', wake:'起床', meal:'用餐', work:'工作', rest:'休息', exercise:'运动', study:'学习', plan:'计划', custom:'其他' };
      p += `【今日活动记录】\n`;
      p += activities.map(a => `- ${labels[a.type]||a.type} ${a.time}${(a.note || a.desc) ? ' '+(a.note || a.desc) : ''}`).join('\n') + '\n\n';
    }

    // === 完整计划体系 ===
    p += `【用户的完整计划体系】（基于马斯洛需求层次，这是你需要监督用户执行的目标）\n`;
    const incompleteTasks = [];
    let hasAnyPlan = false;
    Store.data.plans.levels.forEach(lvl => {
      const confirmedCats = lvl.categories.filter(cat => (cat.branches || []).some(br => br.status === 'confirmed'));
      if (confirmedCats.length === 0 && lvl.categories.length === 0) return;
      hasAnyPlan = true;
      p += `\n■ ${lvl.icon} ${lvl.name}\n`;
      if (confirmedCats.length === 0 && lvl.categories.length > 0) {
        p += `  （暂无已确认目标）\n`;
      }
      lvl.categories.forEach(cat => {
        const branches = (cat.branches || []).filter(br => br.status === 'confirmed');
        if (branches.length === 0) return;
        p += `  ▸ ${cat.name}\n`;
        branches.forEach(br => {
          const tasks = br.tasks || [];
          if (tasks.length === 0) {
            p += `    - ${br.name}（无具体任务）\n`;
          } else {
            const avgProgress = Math.round(tasks.reduce((s,t) => s + (t.progress||0), 0) / tasks.length);
            p += `    - ${br.name}（${avgProgress}%）\n`;
            tasks.forEach(task => {
              const prog = task.progress || 0;
              const mark = prog >= 100 ? '✓' : '○';
              p += `      ${mark} ${task.name} (${prog}%)\n`;
              if (prog < 100) {
                incompleteTasks.push(`${lvl.name}/${cat.name}/${br.name}/${task.name}(${prog}%)`);
              }
            });
          }
        });
      });
    });
    if (!hasAnyPlan) {
      p += `（用户还没有建立任何计划）\n`;
    }
    p += '\n';
    if (incompleteTasks.length > 0) {
      p += `【重点监督】以上标 ○ 的任务尚未完成，共${incompleteTasks.length}个。在聊天中自然地关心这些任务的进度。\n\n`;
    }

    // === 今日重点（Daily Focus）：优先围绕它聚焦监督，而非泛泛谈所有计划 ===
    const f = char.dailyFocus;
    const todayStr = Utils.todayStr();
    if (f && f.date === todayStr && f.collected && f.items && f.items.length > 0) {
      p += `【今日重点】（今天用户最想搞定的事，请优先围绕这些聚焦监督与提醒，而不是泛泛谈所有计划）\n`;
      p += f.items.map((x, i) => `${i + 1}. ${x}`).join('\n') + '\n\n';
    } else if (f && f.date === todayStr && !f.collected && !f.muted) {
      p += `【今日重点】用户今天还没告诉我今日重点，请自然地先问一下今天最想搞定什么（1-3件事）。\n\n`;
    }

    // === 用户偏好的陪伴方式 ===
    const prefs = char.prefs;
    if (prefs) {
      const toneMap = { encouraging: '鼓励为主，多肯定、多打气', casual: '轻松随意，像朋友闲聊', strict: '直接严格，少寒暄、直奔重点' };
      const paceMap = { normal: '正常节奏，时不时说一句即可', frequent: '可以多主动聊、多提醒、多关心', quiet: '保持安静，只在用户主动说话时才回应' };
      p += `【用户偏好的陪伴方式】（请严格遵守）\n`;
      p += `- 语气：${toneMap[prefs.tone] || '鼓励为主'}\n`;
      p += `- 节奏：${paceMap[prefs.pace] || '正常节奏'}\n`;
      if (prefs.quietHours && prefs.quietHours.trim()) p += `- 勿扰时段：${prefs.quietHours.trim()} 之间不要主动发起新话题或追问\n`;
      if (prefs.custom && prefs.custom.trim()) p += `- 用户特别说明：${prefs.custom.trim()}\n`;
      p += '\n';
    }

    // === 安静模式 ===
    if (f && f.date === todayStr && f.muted) {
      p += `【安静模式】用户今天说了「别问了/退出/安静」，请只回应用户主动说的话，不要主动提议新任务、不要追问、不要提醒。保持简短。\n\n`;
    }

    // === 当前执行任务 ===
    if (ExecGuide.currentTask) {
      const ct = ExecGuide.currentTask;
      p += `【当前正在执行的任务】\n`;
      p += `任务名：${ct.taskName}\n`;
      p += `路径：${ct.lvlName} › ${ct.catName} › ${ct.brName}\n`;
      p += `进度：${ct.progress}%\n`;
      p += `用户可以通过聊天控制这个任务：跳过、换任务、完成、退出执行。见下方action格式。\n\n`;
    } else if (incompleteTasks.length > 0) {
      p += `【执行状态】用户当前没有选中任务。如果用户说想做某个任务，可以用 start_task 帮用户开始。\n\n`;
    }

    // === 行为指令 ===
    p += `【你的任务】
你是用户的AI伙伴，始终保持角色性格和世界观设定。你了解用户的真实生活状况（上面的「用户的真实生活信息」）和完整目标体系（上面的「用户的完整计划体系」）。主要职责：
1. 记账监督：用户提到消费/收入时，自动提取并记录。提醒用户记账。
2. 学习监督：鼓励用户学习，记录学习活动，催促学习进度。
3. 原子习惯监督：根据用户的计划体系，提醒用户执行未完成任务（标○的），用户提到完成进度时帮忙更新。可以主动问用户某个任务的进展。
4. 日常陪伴：以角色身份聊天，关心用户生活，保持有趣有温度。
5. 结合用户画像：根据用户的性格、压力、作息等信息，用适合用户的方式沟通和督促。

【回复格式】
你必须返回 JSON，格式如下，不要输出 JSON 以外的内容：
{"reply":"你的回复","actions":[]}

reply 是你以角色语气说的回复内容。
actions 是要执行的动作数组，可为空。每个动作格式：
- 记账支出：{"type":"expense","amount":25.5,"category":"餐饮","note":"午饭"}
- 记账收入：{"type":"income","amount":5000,"category":"工资","note":""}
- 记录活动：{"type":"activity","activityType":"study","desc":"学了2小时英语"}
  activityType 可选：wake,meal,work,rest,exercise,study,sleep,custom
- 更新计划：{"type":"plan_progress","taskName":"学英语","progress":50}
- 跳过当前任务：{"type":"skip_task"}（仅当用户正在执行某任务时可用）
- 完成当前任务：{"type":"complete_task"}（用户明确说做完了/完成了当前任务时触发）
- 换任务：{"type":"switch_task"}（用户想换一个别的任务做）
- 开始某任务：{"type":"start_task","taskName":"任务名"}（用户说想做某个具体任务时，用模糊匹配找最接近的任务名）
- 退出执行：{"type":"exit_exec"}（用户说不想做了/今天算了/退出）

【重要规则】
- 回复像微信聊天一样简短自然，1-3句话，不要太长。
- 始终用角色语气说话，保持世界观沉浸感。
- 如果用户只是聊天没提到记账/学习/计划，actions 设为空数组。
- 只有明确提到金额和消费时才记账，不要过度解读。
- 监督计划时，具体提到任务名称，让用户感受到你真的了解TA的目标。
- 主动关心和督促，但不要每句话都说教。
- 【任务控制规则】用户说"跳过""下一个""换个任务""不想做了""做完了"等意图时，用对应的action。skip_task/complete_task/exit_exec只在有当前执行任务时才用。start_task的taskName要尽量匹配用户计划体系里已有的任务名（可以模糊匹配）。不要在用户没表达这些意图时自作主张触发任务控制。
- 【生活常识】成年人正常睡眠时间通常在22:00-24:00之间，建议睡前不要太早。不要催用户9点多就睡觉，除非用户自己提到想早睡。一般建议23:00左右准备睡觉即可。`;

    return p;
  },

  /* --- 发送消息 --- */
  async send(message) {
    if (this.sending) return;
    if (!message || !message.trim()) return;
    this.sending = true;

    const char = Store.data.aiCharacter;

    // 用户消息入历史
    char.chatHistory.push({
      role: 'user',
      content: message,
      time: new Date().toISOString(),
    });

    // 今日重点采集 / 退出·安静意图：本地拦截，离线可用，不调 AI
    const focusHandled = this._tryHandleFocusOrMute(message);
    if (focusHandled) {
      char.chatHistory.push({
        role: 'assistant',
        content: focusHandled.reply,
        time: new Date().toISOString(),
      });
      if (char.chatHistory.length > 200) char.chatHistory = char.chatHistory.slice(-200);
      Store.save();
      this.sending = false;
      return { reply: focusHandled.reply, actionResults: [] };
    }

    // 构建对话消息（保留最近 20 条）
    const recentHistory = char.chatHistory.slice(-20);
    const messages = recentHistory.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    try {
      const systemPrompt = this.buildSystemPrompt();
      const rawResponse = await AIClient.callChat(messages, {
        system: systemPrompt,
        temperature: 0.85,
        maxTokens: 1024,
      });

      // 解析 JSON 响应
      let reply = rawResponse;
      let actions = [];
      try {
        // 尝试提取 JSON
        let jsonStr = rawResponse;
        const m = rawResponse.match(/```json\s*([\s\S]*?)```/) || rawResponse.match(/```\s*([\s\S]*?)```/);
        if (m) jsonStr = m[1];
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start >= 0 && end > start) jsonStr = jsonStr.substring(start, end + 1);
        const parsed = JSON.parse(jsonStr);
        reply = parsed.reply || rawResponse;
        actions = Array.isArray(parsed.actions) ? parsed.actions : [];
      } catch (e) {
        // JSON 解析失败，用原始文本作为回复
        reply = rawResponse;
      }

      // AI 回复入历史
      char.chatHistory.push({
        role: 'assistant',
        content: reply,
        time: new Date().toISOString(),
      });

      // 限制历史长度
      if (char.chatHistory.length > 200) {
        char.chatHistory = char.chatHistory.slice(-200);
      }
      Store.save();

      // 执行动作
      const actionResults = [];
      for (const action of actions) {
        const result = this.executeAction(action);
        if (result) actionResults.push(result);
      }

      this.sending = false;
      return { reply, actionResults };
    } catch (err) {
      this.sending = false;
      // 错误消息不入历史，避免污染对话
      throw err;
    }
  },

  executeAction(action) {
    if (!action || !action.type) return null;
    switch (action.type) {
      case 'expense':
        this.addRecord('expense', action.amount, action.category, action.note);
        return { icon: '💸', text: `已记账 -${action.amount}元 ${action.category}${action.note ? ' '+action.note : ''}` };
      case 'income':
        this.addRecord('income', action.amount, action.category, action.note);
        return { icon: '💰', text: `已记账 +${action.amount}元 ${action.category}${action.note ? ' '+action.note : ''}` };
      case 'activity':
        this.logActivity(action.activityType, action.desc);
        const labels = { sleep:'睡觉', wake:'起床', meal:'用餐', work:'工作', rest:'休息', exercise:'运动', study:'学习', plan:'计划', custom:'其他' };
        return { icon: '📝', text: `已记录 ${labels[action.activityType]||action.activityType}${action.desc ? ' '+action.desc : ''}` };
      case 'plan_progress':
        const ok = this.updatePlanProgress(action.taskName, action.progress);
        return { icon: ok ? '📊' : '⚠️', text: ok ? `已更新 ${action.taskName} → ${action.progress}%` : `未找到任务「${action.taskName}」` };
      case 'skip_task':
        return this._execSkipTask();
      case 'complete_task':
        return this._execCompleteTask();
      case 'switch_task':
        return this._execSwitchTask();
      case 'start_task':
        return this._execStartTask(action.taskName);
      case 'exit_exec':
        return this._execExit();
      default:
        return null;
    }
  },

  /* --- 任务控制action实现 --- */
  _execSkipTask() {
    if (!ExecGuide.currentTask) return { icon: '⚠️', text: '当前没有正在执行的任务' };
    const taskName = ExecGuide.currentTask.taskName;
    // 记录跳过到今日活动
    const today = Utils.todayStr();
    if (!Store.data.dailyLogs[today]) Store.data.dailyLogs[today] = { activities: [] };
    Store.data.dailyLogs[today].activities.push({
      type: 'rest',
      time: `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`,
      desc: `⏭️ 跳过: ${taskName}`,
    });
    Store.save();
    // 切到下一个
    const remaining = ExecGuide.getIncompleteTasks().filter(t => t.taskId !== ExecGuide.currentTask.taskId);
    if (remaining.length > 0) {
      ExecGuide.currentTask = remaining[0];
      ExecGuide.aiTip = '';
      setTimeout(() => Router.render(), 100);
      return { icon: '⏭️', text: `已跳过「${taskName}」→ 下一个：${remaining[0].taskName}` };
    } else {
      ExecGuide.currentTask = null;
      ExecGuide.aiTip = '';
      setTimeout(() => Router.render(), 100);
      return { icon: '⏭️', text: `已跳过「${taskName}」，没有其他待完成任务了` };
    }
  },

  _execCompleteTask() {
    if (!ExecGuide.currentTask) return { icon: '⚠️', text: '当前没有正在执行的任务' };
    const task = ExecGuide.currentTask;
    const taskName = task.taskName;
    // 更新进度到100%
    const t = Views._getTask(task.lvlId, task.catId, task.brId, task.taskId);
    if (t) {
      t.progress = 100;
      if (!t.records) t.records = [];
      t.records.push({ time: new Date().toISOString(), amount: '完成', note: '通过聊天完成' });
      Store.save();
      Store.recordVersion('聊天-完成任务', `${task.brName} > ${taskName}`);
    }
    // 记录到今日活动
    const today = Utils.todayStr();
    if (!Store.data.dailyLogs[today]) Store.data.dailyLogs[today] = { activities: [] };
    Store.data.dailyLogs[today].activities.push({
      type: 'work',
      time: `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`,
      desc: `✅ 完成: ${taskName}`,
    });
    Store.save();
    // 切到下一个
    const remaining = ExecGuide.getIncompleteTasks();
    if (remaining.length > 0) {
      ExecGuide.currentTask = remaining[0];
      ExecGuide.aiTip = '';
      setTimeout(() => Router.render(), 100);
      return { icon: '✅', text: `完成「${taskName}」🎉 下一个：${remaining[0].taskName}` };
    } else {
      ExecGuide.currentTask = null;
      ExecGuide.aiTip = '';
      setTimeout(() => Router.render(), 100);
      return { icon: '✅', text: `完成「${taskName}」🎉 所有任务都完成了！` };
    }
  },

  _execSwitchTask() {
    if (!ExecGuide.currentTask) return { icon: '⚠️', text: '当前没有正在执行的任务' };
    const oldName = ExecGuide.currentTask.taskName;
    const remaining = ExecGuide.getIncompleteTasks().filter(t => t.taskId !== ExecGuide.currentTask.taskId);
    if (remaining.length === 0) return { icon: '⚠️', text: '没有其他未完成任务可以切换' };
    // 随机选一个不同的
    const next = remaining[Math.floor(Math.random() * remaining.length)];
    ExecGuide.currentTask = next;
    ExecGuide.aiTip = '';
    setTimeout(() => Router.render(), 100);
    return { icon: '🔄', text: `已从「${oldName}」切换到「${next.taskName}」` };
  },

  _execStartTask(taskName) {
    if (!taskName) return { icon: '⚠️', text: '没有指定任务名' };
    const allTasks = ExecGuide.getIncompleteTasks();
    if (allTasks.length === 0) return { icon: '⚠️', text: '没有未完成的任务' };
    // 模糊匹配：优先完全包含，其次部分匹配
    const lower = taskName.toLowerCase();
    let match = allTasks.find(t => t.taskName.toLowerCase() === lower);
    if (!match) match = allTasks.find(t => t.taskName.toLowerCase().includes(lower));
    if (!match) match = allTasks.find(t => lower.includes(t.taskName.toLowerCase()));
    if (!match) {
      // 逐字匹配得分
      let bestScore = 0;
      allTasks.forEach(t => {
        const chars = lower.split('');
        const score = chars.filter(c => t.taskName.toLowerCase().includes(c)).length / chars.length;
        if (score > bestScore) { bestScore = score; match = t; }
      });
      if (bestScore < 0.4) return { icon: '⚠️', text: `未找到匹配「${taskName}」的任务` };
    }
    ExecGuide.currentTask = match;
    ExecGuide.aiTip = '';
    setTimeout(() => Router.render(), 100);
    return { icon: '🎯', text: `已开始执行「${match.taskName}」(${match.progress}%)` };
  },

  _execExit() {
    if (!ExecGuide.currentTask) return { icon: 'ℹ️', text: '当前没有正在执行的任务' };
    const taskName = ExecGuide.currentTask.taskName;
    ExecGuide.currentTask = null;
    ExecGuide.aiTip = '';
    ExecGuide.chatHistory = [];
    setTimeout(() => Router.render(), 100);
    return { icon: '🚪', text: `已退出「${taskName}」的执行` };
  },

  /* --- 快速记账（不走AI，直接记录后通知AI评论） --- */
  async quickExpense(amount, category, note) {
    this.addRecord('expense', amount, category, note);
    // 让AI评论一句
    if (AIClient.hasKey()) {
      try {
        const msg = `我刚记了一笔：${category} ${amount}元${note ? '（'+note+'）' : ''}`;
        return await this.send(msg);
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  /* --- 清空聊天历史 --- */
  clearHistory() {
    Store.data.aiCharacter.chatHistory = [];
    Store.save();
  },

  /* --- 是否已设定角色 --- */
  hasCharacter() {
    const c = Store.data.aiCharacter;
    return !!(c.name && c.characterDesc);
  },
};

/* ========== App 主控 ========== */
const App = {
  deferredPrompt: null,

  init() {
    Store.init();
    this.bindNav();
    this.registerSW();
    this.bindInstallPrompt();
    Router.navigate('dashboard');
    Reminder.start();

    // 每分钟检查一次是否到了提醒时间（防止setInterval不准确）
    setInterval(() => {
      if (!Store.data.settings.reminderEnabled) return;
      const elapsed = Date.now() - (Store.data.lastReminderTime || Date.now());
      if (elapsed >= Store.data.settings.reminderInterval * 60 * 1000) {
        Reminder.fire();
      }
    }, 60000);
  },

  bindNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.onclick = () => Router.navigate(btn.dataset.view);
    });
    document.getElementById('reminder-quick-btn').onclick = () => {
      const badge = document.getElementById('reminder-badge');
      if (badge) badge.style.display = 'none';
      Router.navigate('companion');
    };
    // 点击遮罩关闭模态框
    document.getElementById('modal-overlay').onclick = (e) => {
      if (e.target.id === 'modal-overlay') Utils.closeModal();
    };
  },

  async registerSW() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('sw.js');
        // 新版本可用时：新 SW 接管控制即自动刷新页面（桌面图标点开也能拿到最新）
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
        // 主动检查更新：打开时一次 + 之后每分钟一次
        reg.update();
        setInterval(() => { try { reg.update(); } catch (e) {} }, 60000);
      } catch (e) {
        console.log('SW registration failed', e);
      }
    }
  },

  bindInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
    });
  },

  install() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then(() => {
        this.deferredPrompt = null;
      });
    } else {
      Utils.toast('请使用浏览器的"添加到主屏幕"功能安装', 'warning');
    }
  },
};

// 启动
document.addEventListener('DOMContentLoaded', () => App.init());
