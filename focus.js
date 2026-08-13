/* ============================================================
 * 单步聚焦模块（滚雪球式 · 接入原子习惯）
 * 以非侵入方式扩展 plan-exec：一次只显示当前碎屑步 + 倒计时
 *   遇到困难 → AI 再拆；执行前后记心情；完成可存 SOP 模板
 * 依赖：Store, Views, Router, AIClient, Utils（app.js 全局）
 * ============================================================ */

/* ---------- 数据播种 ---------- */
function seedFocusData() {
  if (!Store.data.focus) {
    Store.data.focus = { current: null, templates: [] };
    Store.save();
  } else {
    if (!Store.data.focus.current) Store.data.focus.current = null;
    if (!Store.data.focus.templates) Store.data.focus.templates = [];
  }
}

/* ---------- AI 系统提示：角色口吻 + 聚焦指令 ---------- */
function focusSystem() {
  const c = Store.data.aiCharacter || {};
  const hasChar = c && c.name;
  if (hasChar) {
    let s = `你是「${c.name}」，${c.aiNickname || c.name}是用户对你的称呼。\n`;
    if (c.characterDesc) s += `你的性格/职责：${c.characterDesc}\n`;
    if (c.worldview) s += `世界观：${c.worldview}\n`;
    if (c.relationship) s += `关系：${c.relationship}\n`;
    s += `用你的角色口吻说话，中文，简短（1-4句）。\n`;
    return s;
  }
  return `你是一个专注执行教练，用中文简短（1-4句）督促用户。\n`;
}

/* ---------- 调 AI（统一返回字符串，失败降级） ---------- */
function parseSteps(reply) {
  if (!reply || typeof reply !== 'string') return [];
  let s = reply.trim();
  const tryJson = (str) => {
    try { const j = JSON.parse(str); if (Array.isArray(j)) return j.map(x => String(x).trim()).filter(Boolean); } catch (e) {}
    return null;
  };
  let arr = tryJson(s);
  if (!arr) {
    const m = s.match(/\[[\s\S]*\]/);
    if (m) arr = tryJson(m[0]);
  }
  if (arr) return arr.slice(0, 10);
  return s.split(/\n+/).map(x => x.replace(/^[\d\.\-\*\s`]+/, '').trim()).filter(Boolean).slice(0, 10);
}

async function focusBreakGoal(goal) {
  try {
    const system = focusSystem() + `
把下面这个目标拆成"碎屑级"可执行小步。要求：
- 每步极具体、可立即动手（如"打开文档写下标题"），不要解释
- 不超过 8 步
- 严格只输出 JSON 数组字符串：["步骤1","步骤2",...]`;
    const reply = await AIClient.callChat(
      [{ role: 'user', content: `目标：${goal}\n请拆成碎屑级步骤，只输出 JSON 数组。` }],
      { system, temperature: 0.9, maxTokens: 800 }
    );
    return parseSteps(reply);
  } catch (e) { console.error('focusBreakGoal', e); return [goal]; }
}

async function focusBreakStep(stepText, difficulty) {
  try {
    const system = focusSystem() + `
把下面这个"卡住的步骤"拆成 2-4 个更小的子步骤，输出 JSON 数组字符串：["子步1","子步2",...]。不要解释。`;
    const reply = await AIClient.callChat(
      [{ role: 'user', content: `当前步骤："${stepText}"\n遇到问题：${difficulty}\n请把这一步拆得更小，只输出 JSON 数组。` }],
      { system, temperature: 0.9, maxTokens: 600 }
    );
    return parseSteps(reply);
  } catch (e) { console.error('focusBreakStep', e); return [difficulty]; }
}

async function focusCharLine(stepText) {
  try {
    const reply = await AIClient.callChat(
      [{ role: 'user', content: `用户正在执行："${stepText}"。给一句推动 ta 的话。` }],
      { system: focusSystem() + `\n用你的口吻给用户一句极短催促/鼓励（1-2句，中文），不要解释，不要加引号。`, temperature: 0.95, maxTokens: 120 }
    );
    return (reply && reply.trim()) ? reply.trim() : '专注这一步，做完就离目标近一点。';
  } catch (e) { return '专注这一步，做完就离目标近一点。'; }
}

/* ---------- session 级倒计时 ---------- */
const focusTimer = { id: null, remaining: 1500, running: false };
function fmtTime(s) { s = Math.max(0, s); const m = Math.floor(s / 60), r = s % 60; return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`; }
function focusTimerStart() {
  if (focusTimer.running) return;
  focusTimer.running = true;
  focusTimer.id = setInterval(() => {
    focusTimer.remaining--;
    const el = document.getElementById('focus-timer');
    if (el) el.textContent = fmtTime(focusTimer.remaining);
    if (focusTimer.remaining <= 0) { clearInterval(focusTimer.id); focusTimer.running = false; }
  }, 1000);
}
function focusTimerPause() { if (focusTimer.id) clearInterval(focusTimer.id); focusTimer.running = false; }
function focusTimerReset() { focusTimerPause(); focusTimer.remaining = 1500; const el = document.getElementById('focus-timer'); if (el) el.textContent = fmtTime(1500); }

/* ---------- 全局 Focus（供 onclick 调用） ---------- */
const Focus = {
  async start() {
    const goal = (document.getElementById('focus-goal')?.value || '').trim();
    if (!goal) { Utils.toast('先写个目标'); return; }
    Utils.toast('AI 拆解中…');
    const steps = AIClient.hasKey() ? await focusBreakGoal(goal) : [goal];
    const list = steps.length ? steps : [goal];
    Store.data.focus.current = {
      goal,
      steps: list.map(t => ({ id: Store.uid(), text: t, status: 'todo', moodBefore: null, moodAfter: null })),
      idx: 0, startedAt: Date.now()
    };
    Store.save(); focusTimerReset(); Views.focus(document.getElementById('main-content')); this.charLine();
  },
  useTemplate(i) {
    const t = Store.data.focus.templates[i];
    if (!t) return;
    Store.data.focus.current = {
      goal: t.goal,
      steps: t.steps.map(t2 => ({ id: Store.uid(), text: t2, status: 'todo', moodBefore: null, moodAfter: null })),
      idx: 0, startedAt: Date.now()
    };
    Store.save(); focusTimerReset(); Views.focus(document.getElementById('main-content')); this.charLine();
  },
  deleteTemplate(i) {
    Store.data.focus.templates.splice(i, 1);
    Store.save(); Views.focus(document.getElementById('main-content'));
  },
  completeStep() {
    const cur = Store.data.focus.current; if (!cur) return;
    const step = cur.steps[cur.idx];
    if (step && !step.moodAfter) step.moodAfter = { energy: '中', mood: '😐' };
    step.status = 'done';
    if (cur.idx < cur.steps.length - 1) { cur.idx++; }
    Store.save(); Views.focus(document.getElementById('main-content')); this.charLine();
  },
  skipStep() {
    const cur = Store.data.focus.current; if (!cur) return;
    cur.steps[cur.idx].status = 'skip';
    if (cur.idx < cur.steps.length - 1) { cur.idx++; }
    Store.save(); Views.focus(document.getElementById('main-content')); this.charLine();
  },
  async difficulty() {
    const cur = Store.data.focus.current; if (!cur) return;
    const diff = (document.getElementById('focus-diff')?.value || '').trim();
    if (!diff) { Utils.toast('写一下遇到的困难'); return; }
    Utils.toast('AI 再拆中…');
    const subs = AIClient.hasKey() ? await focusBreakStep(cur.steps[cur.idx].text, diff) : [diff];
    const newSteps = subs.map(t => ({ id: Store.uid(), text: t, status: 'todo', moodBefore: null, moodAfter: null }));
    cur.steps.splice(cur.idx + 1, 0, ...newSteps);
    Store.save(); Views.focus(document.getElementById('main-content')); this.charLine();
  },
  setMoodBefore(energy, mood) {
    const cur = Store.data.focus.current; if (!cur) return;
    const step = cur.steps[cur.idx];
    if (step) { step.moodBefore = { energy, mood }; Store.save(); }
    const box = document.getElementById('mood-before-box'); if (box) box.style.display = 'none';
  },
  setMoodAfter(energy, mood) {
    const cur = Store.data.focus.current; if (!cur) return;
    const step = cur.steps[cur.idx];
    if (step) { step.moodAfter = { energy, mood }; Store.save(); }
    const box = document.getElementById('mood-after-box'); if (box) box.style.display = 'none';
  },
  saveTemplate() {
    const cur = Store.data.focus.current; if (!cur) return;
    const name = (document.getElementById('focus-tpl-name')?.value || '').trim();
    if (!name) { Utils.toast('给模板起个名'); return; }
    Store.data.focus.templates.push({ name, goal: cur.goal, steps: cur.steps.map(s => s.text) });
    Store.save(); Utils.toast('已存为模板 ✓'); Views.focus(document.getElementById('main-content'));
  },
  newGoal() { Store.data.focus.current = null; Store.save(); focusTimerReset(); Views.focus(document.getElementById('main-content')); },
  async charLine() {
    const cur = Store.data.focus.current; if (!cur) return;
    const step = cur.steps[cur.idx]; if (!step) return;
    const el = document.getElementById('focus-char-line'); if (!el) return;
    el.textContent = '…';
    if (AIClient.hasKey()) {
      const line = await focusCharLine(step.text);
      if (el) el.textContent = line;
    } else {
      el.textContent = '专注这一步，做完就离目标近一点。';
    }
  },
  timerStart() { focusTimerStart(); },
  timerPause() { focusTimerPause(); },
  timerReset() { focusTimerReset(); },
  toggleDiff() { const b = document.getElementById('diff-box'); if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none'; },
};

/* ---------- 聚焦视图 ---------- */
Views.focus = function (el) {
  document.getElementById('page-title').textContent = '聚焦';
  const f = Store.data.focus || { current: null, templates: [] };

  if (!f.current) {
    const tpls = (f.templates || []).map((t, i) => `
      <div class="tpl-item">
        <span class="tpl-name">${Utils.escape(t.name)}</span>
        <span class="tpl-sub">${t.steps.length} 步</span>
        <button class="btn btn-sm btn-secondary" onclick="Focus.useTemplate(${i})">套用</button>
        <button class="btn btn-sm btn-ghost" onclick="Focus.deleteTemplate(${i})">删</button>
      </div>`).join('');
    el.innerHTML = `
      <div class="dashboard-greeting">单步聚焦 🎯</div>
      <div class="dashboard-subtitle">一次只做当前这一步 · 滚雪球式推进</div>
      <div class="card">
        <div class="card-title">🎯 输入一个目标</div>
        <textarea id="focus-goal" class="form-input" rows="3" placeholder="例如：复习今天直播课的语法 / 把屋子收一下 / 写竞赛报告"></textarea>
        <button class="btn btn-primary btn-block mt-2" onclick="Focus.start()">🤖 AI 拆解并开始</button>
        <div class="text-sm text-light mt-2">没填 API Key 也能用：直接把目标当唯一一步开始。</div>
      </div>
      ${tpls ? `<div class="card"><div class="card-title">📋 我的 SOP 模板</div>${tpls}</div>` : ''}
    `;
    return;
  }

  const cur = f.current;
  const step = cur.steps[cur.idx];
  const total = cur.steps.length;
  const doneCount = cur.steps.filter(s => s.status === 'done').length;
  const allDone = cur.steps.every(s => s.status === 'done');

  const mb = (e, m) => `<button class="mood-btn" onclick="Focus.setMoodBefore('${e}','${m}')">${m} ${e}</button>`;
  const ma = (e, m) => `<button class="mood-btn" onclick="Focus.setMoodAfter('${e}','${m}')">${m} ${e}</button>`;

  if (allDone) {
    el.innerHTML = `
      <div class="dashboard-greeting">🎉 完成！</div>
      <div class="card">
        <div class="card-title">目标达成：${Utils.escape(cur.goal)}</div>
        <div class="text-sm">共 ${total} 步，已完成 ${doneCount} 步。</div>
        <div class="mt-2"><input id="focus-tpl-name" class="form-input" placeholder="给这套步骤起个名（存为 SOP 模板）"></div>
        <button class="btn btn-primary btn-block mt-2" onclick="Focus.saveTemplate()">💾 保存为模板</button>
        <button class="btn btn-ghost btn-block mt-2" onclick="Focus.newGoal()">＋ 新目标</button>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="dashboard-greeting">聚焦中 🎯</div>
    <div class="focus-progress"><div class="focus-progress-bar" style="width:${Math.round(cur.idx / total * 100)}%"></div></div>
    <div class="text-sm text-light">第 ${cur.idx + 1} / ${total} 步 · 已完成 ${doneCount}</div>

    <div class="card focus-char-card"><div class="focus-char-line" id="focus-char-line">正在生成提醒…</div></div>

    <div class="card focus-step-card">
      <div class="focus-step-text">${Utils.escape(step.text)}</div>
      <div class="focus-timer-box">
        <div class="focus-timer" id="focus-timer">${fmtTime(focusTimer.remaining)}</div>
        <div class="focus-timer-btns">
          <button class="btn btn-sm btn-secondary" onclick="Focus.timerStart()">开始</button>
          <button class="btn btn-sm btn-ghost" onclick="Focus.timerPause()">暂停</button>
          <button class="btn btn-sm btn-ghost" onclick="Focus.timerReset()">重置</button>
        </div>
      </div>
    </div>

    ${!step.moodBefore ? `<div class="card" id="mood-before-box"><div class="card-title">😶 执行前状态</div>
      <div class="mood-row">${mb('低', '😞')}${mb('中', '😐')}${mb('高', '😄')}</div></div>` : ''}

    <div class="focus-actions">
      <button class="btn btn-primary flex-1" onclick="Focus.completeStep()">✅ 确定完成</button>
      <button class="btn btn-secondary" onclick="Focus.skipStep()">⏭ 跳过</button>
      <button class="btn btn-secondary" onclick="Focus.toggleDiff()">😣 困难</button>
    </div>

    <div class="card" id="diff-box" style="display:none">
      <div class="card-title">😣 遇到什么困难？</div>
      <textarea id="focus-diff" class="form-input" rows="2" placeholder="写下来，AI 帮这步拆更小"></textarea>
      <button class="btn btn-primary btn-block mt-2" onclick="Focus.difficulty()">🤖 AI 再拆这一步</button>
    </div>

    ${!step.moodAfter && step.status === 'done' ? `<div class="card" id="mood-after-box"><div class="card-title">😊 执行后状态</div>
      <div class="mood-row">${ma('低', '😞')}${ma('中', '😐')}${ma('高', '😄')}</div></div>` : ''}

    <button class="btn btn-ghost btn-block mt-2" onclick="Focus.newGoal()">放弃 / 换目标</button>
  `;
  Focus.charLine();
};

/* ---------- 接管 focus 路由（在 habit 包装版之上再包一层） ---------- */
const _focusOrigRender = Router.render.bind(Router);
Router.render = function () {
  seedFocusData();
  if (this.current === 'focus') {
    Views.focus(document.getElementById('main-content'));
    return;
  }
  _focusOrigRender();
};

/* ---------- 启动 ---------- */
if (typeof window !== 'undefined') window.Focus = Focus;
