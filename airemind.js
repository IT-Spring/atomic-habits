/* ---------- AI 提醒 / 推进：对话式，一次聚焦一件事，做完再推下一件 ----------
   不是"一次性列出所有未完成"——是和 AI 聊，AI 帮收敛到一件具体事，
   你去做，回来说"好了"，AI 再引下一件。填了 DeepSeek Key 才有角色口吻对话。 */
(function () {
  const AIReprompt = {
    get data() {
      if (!Store.data.aiReprompt) Store.data.aiReprompt = { chat: [] };
      return Store.data.aiReprompt;
    },

    /* 内部扫描：返回今天未完成的项（只给 AI 当上下文，不展示给用户列清单） */
    collect() {
      const t = Utils.todayStr();
      const items = [];

      const hb = Store.data.habits;
      if (hb && hb.levers) {
        hb.levers.forEach(l => {
          if (!(l.done && l.done[t]))
            items.push({ icon: '⚡', text: l.name, note: '今日最低剂量还没点完成', kind: 'lever' });
        });
      }
      const ev = (hb && hb.evidence) ? hb.evidence : [];
      if (!ev.some(e => e.date === t))
        items.push({ icon: '📸', text: '拍照留证', note: '今天还没收一个可见面并拍照', kind: 'evidence' });

      const log = (Store.data.dailyLogs && Store.data.dailyLogs[t]) || { activities: [] };
      const acts = log.activities || [];
      const has = type => acts.some(a => a.type === type);
      [['wake', '☀️', '记录起床'], ['meal', '🍽️', '记录用餐'], ['sleep', '😴', '记录睡觉']]
        .forEach(([type, icon, label]) => {
          if (!has(type)) items.push({ icon, text: label, note: '今日登记还没记', kind: 'reg:' + type });
        });

      const f = Store.data.focus;
      if (f && f.current && f.current.steps && f.current.steps.length) {
        const idx = (f.current.idx != null) ? f.current.idx : 0;
        const step = f.current.steps[idx];
        if (step && step.status !== 'done')
          items.push({ icon: '🎯', text: '聚焦：' + (f.current.goal || '未命名目标'), note: '当前步「' + (step.text || '') + '」还没完成', kind: 'focus' });
      }
      return items;
    },

    pendingSummary() {
      const items = this.collect();
      if (!items.length) return '（今天没有未完成的项）';
      return items.map(it => `- ${it.text}（${it.note || ''}）`).join('\n');
    },

    charSystem() {
      const c = Store.data.aiCharacter || {};
      const name = c.name || '助手';
      const rel = c.relationship || '伙伴';
      const wv = c.worldview || '';
      const cd = c.characterDesc || '';
      const up = c.userPersona || '';
      const aiNick = c.aiNickname || name;
      const userNick = c.userNickname || '你';
      const pending = this.pendingSummary();
      return `你是${name}（${rel}）。世界观：${wv}。你与用户的关系：${rel}。你的设定：${cd}。用户在你世界观中的人设：${up}。你用「${aiNick}」自称，用「${userNick}」称呼用户。

你的任务：通过简短对话，帮用户一次聚焦到【一件事】并做完它，做完再推下一件。铁律：
1. 绝不一次性列出所有未完成事项。只挑当前最该做的一件开口，聊清楚让用户去执行。
2. 每轮最多推进一件事，用你的口吻自然聊，不要像机器人列清单，不要出现"作为AI""我可以帮你"之类话术。
3. 用户说"好了/做完了/搞定了"→ 确认完成，再自然引出下一件（同样只一件）。
4. 用户想换事就跟着走，别硬拽。
5. 保持极短，像真人在微信上催朋友，一两句就够。

仅供你内部判断（不要整段念给用户）：用户今天未完成的项：
${pending}`;
    },

    push(role, content) {
      this.data.chat.push({ role, content, ts: Date.now() });
      Store.save();
    },

    renderChat(container) {
      const box = container.querySelector('#air-chat');
      if (!box) return;
      box.innerHTML = this.data.chat.map(m =>
        `<div class="air-msg air-${m.role}"><div class="air-bubble">${Utils.escape(m.content)}</div></div>`
      ).join('');
      box.scrollTop = box.scrollHeight;
    },

    async open() {
      const charName = (Store.data.aiCharacter && Store.data.aiCharacter.name) || 'AI';
      const html = `
        <div class="air-chat" id="air-chat"></div>
        <div class="air-input-row">
          <input id="air-input" class="air-input" placeholder="和${Utils.escape(charName)}聊，比如：先搞定哪个？" />
          <button id="air-send" class="btn btn-primary">发送</button>
        </div>
        <div class="air-foot">
          <button id="air-done" class="btn btn-ghost btn-sm">✅ 我做完一件了</button>
          <span class="air-foot-hint">聊到一件事 → 去做 → 回来说"好了"</span>
        </div>`;
      Utils.modal('🤖 和 ' + charName + ' 推进一件事', html, (container) => {
        this.renderChat(container);
        const input = container.querySelector('#air-input');
        const send = container.querySelector('#air-send');
        const done = container.querySelector('#air-done');
        const submit = () => this.send(container, input.value);
        send.onclick = submit;
        input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
        done.onclick = () => this.markDone(container);
        if (!this.data.chat.length) {
          if (this.hasKey()) this.greet(container);
          else this.greetNoKey(container);
        }
      });
    },

    hasKey() { return (typeof AIClient !== 'undefined' && AIClient.hasKey && AIClient.hasKey()); },

    async greet(container) {
      const box = container.querySelector('#air-chat');
      if (box) {
        const t = document.createElement('div');
        t.className = 'air-msg air-assistant';
        t.innerHTML = '<div class="air-bubble air-typing">正在想先聊哪件…</div>';
        box.appendChild(t); box.scrollTop = box.scrollHeight;
      }
      const firstUser = '嗨，我现在有点不知道从哪开始，你帮我挑一件今天该做的事，咱们一件一件来。';
      try {
        const raw = await AIClient.callChat([{ role: 'user', content: firstUser }],
          { system: this.charSystem(), temperature: 0.85, maxTokens: 160 });
        const reply = (typeof raw === 'string') ? raw : (raw && raw.reply) ? raw.reply : JSON.stringify(raw);
        this.push('user', firstUser);
        this.push('assistant', reply);
        this.renderChat(container);
      } catch (e) {
        this.greetNoKey(container);
      }
    },

    greetNoKey(container) {
      this.push('assistant', '咱们一件一件来。你直接说"先搞定睡觉前关机键"之类的一句话，我帮你锁定到一件事；做完回来说"好了"，再推下一件。\n（想在「设置」填 DeepSeek Key，我就能用你的人设口吻和你聊。）');
      this.renderChat(container);
    },

    async send(container, text) {
      text = (text || '').trim();
      if (!text) return;
      const input = container.querySelector('#air-input');
      if (input) input.value = '';
      this.push('user', text);
      this.renderChat(container);

      if (!this.hasKey()) {
        this.push('assistant', '（没填 Key，我先不替你做决定）你刚说的事，去做就好；做完回来说"好了"。想让我用角色口吻聊，去「设置」填 Key。');
        this.renderChat(container);
        return;
      }
      const box = container.querySelector('#air-chat');
      const typing = document.createElement('div');
      typing.className = 'air-msg air-assistant';
      typing.innerHTML = '<div class="air-bubble air-typing">…</div>';
      if (box) { box.appendChild(typing); box.scrollTop = box.scrollHeight; }
      try {
        const history = this.data.chat.map(m => ({ role: m.role, content: m.content }));
        const raw = await AIClient.callChat(history, { system: this.charSystem(), temperature: 0.85, maxTokens: 200 });
        const reply = (typeof raw === 'string') ? raw : (raw && raw.reply) ? raw.reply : JSON.stringify(raw);
        if (typing.parentNode) typing.parentNode.removeChild(typing);
        this.push('assistant', reply);
        this.renderChat(container);
      } catch (e) {
        if (typing.parentNode) typing.parentNode.removeChild(typing);
        this.push('assistant', '⚠️ ' + ((e && e.message) || '调用失败') + '。稍后再试，或检查 Key/网络。');
        this.renderChat(container);
      }
    },

    markDone(container) {
      const items = this.collect();
      if (!items.length) { Utils.toast('今天没有可标记的了 🎉'); return; }
      const chips = items.map((it, i) => `<button class="air-chip" data-i="${i}">${it.icon} ${Utils.escape(it.text)}</button>`).join('');
      Utils.modal('✅ 标记完成', `<div class="air-done-title">刚做完的是哪件？</div><div class="air-chips">${chips}</div>`, (c2) => {
        c2.querySelectorAll('.air-chip').forEach(b => {
          b.onclick = async () => {
            const it = items[+b.dataset.i];
            this.applyDone(it);
            Utils.closeModal();
            this.push('user', '我做完「' + it.text + '」了');
            if (this.hasKey()) {
              try {
                const raw = await AIClient.callChat(this.data.chat.map(m => ({ role: m.role, content: m.content })),
                  { system: this.charSystem(), temperature: 0.8, maxTokens: 160 });
                const reply = (typeof raw === 'string') ? raw : (raw && raw.reply) ? raw.reply : '';
                if (reply) this.push('assistant', reply);
              } catch (e) { this.push('assistant', '搞定 ✅ 下一件咱们接着聊。'); }
            } else {
              this.push('assistant', '搞定 ✅ 下一件咱们接着聊。');
            }
            this.open();
          };
        });
      });
    },

    applyDone(it) {
      const t = Utils.todayStr();
      const hb = Store.data.habits;
      if (hb && hb.levers) {
        const l = hb.levers.find(l => l.name === it.text);
        if (l) { l.done = l.done || {}; l.done[t] = true; }
      }
      if (it.kind === 'evidence' && hb) {
        hb.evidence = hb.evidence || [];
        if (!hb.evidence.some(e => e.date === t)) hb.evidence.push({ date: t, img: '', note: 'AI推进标记' });
      }
      if (it.kind && it.kind.startsWith('reg:')) {
        const type = it.kind.slice(4);
        const log = Store.data.dailyLogs[t] || (Store.data.dailyLogs[t] = { activities: [] });
        if (!log.activities.some(a => a.type === type))
          log.activities.push({ type, mode: 'point', time: this.now(), desc: '' });
      }
      if (it.kind === 'focus') {
        const f = Store.data.focus;
        if (f && f.current && f.current.steps) {
          const idx = (f.current.idx != null) ? f.current.idx : 0;
          if (f.current.steps[idx]) f.current.steps[idx].status = 'done';
        }
      }
      Store.save();
    },

    now() {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    },
  };

  if (typeof window !== 'undefined') window.AIReprompt = AIReprompt;
})();
