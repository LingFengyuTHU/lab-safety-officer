/**
 * 《实验室安全官》主逻辑 2.0
 * 依赖：data/knowledge.js（KNOWLEDGE / LEVELS / SCENARIOS / REACTIONS / OUTCOME_OPTIONS）
 *
 * 每关流程：归位排查 → 配伍实验 → 情境决策 → 进入下一关
 * 无第三方依赖，原生 JS。
 */
(function () {
  'use strict';

  /* ---------------- 数值配置 ---------------- */
  var TIME_PER_LEVEL = 100;
  var SCORE_CORRECT = 10;
  var SCORE_SCENARIO = 15;
  var SCORE_REACTION = 8;
  var COMBO_BONUS = 2;
  var COMBO_MAX = 5;
  var EXPERT_FROM = 5;          // 连对多少触发"规范达人"
  var EXPERT_BONUS = 3;         // 规范达人状态下每次正确的额外加分
  var RISK_WRONG = 1;           // 归位错误的隐患值
  var RISK_TRAP = 3;            // 触发禁忌组合的隐患值
  var RISK_SCENARIO = 2;        // 情境题错误的隐患值
  var RISK_MAX = 5;             // 隐患值上限，满则本关重来

  var IMG_BASE = 'assets/';

  /* ---------------- 运行状态 ---------------- */
  var S = {
    lv: 0,
    score: 0,
    correct: 0,
    wrong: 0,
    combo: 0,
    expert: false,
    risk: 0,
    left: 0,
    timer: null,
    placed: {},
    selected: null,
    learned: [],
    learnedSet: {},
    missed: [],
    missedSet: {},
    locked: false,
    pendingNext: false,   // 归位已完成，等待玩家关闭知识卡后推进
    phase: 'sort'      // sort | reaction | scenario
  };

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function fmtTime(sec) {
    sec = Math.max(0, sec);
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function toast(msg) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var d = document.createElement('div');
    d.className = 'toast';
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2200);
  }

  function floatText(txt, kind) {
    var d = document.createElement('div');
    d.className = 'float-txt ' + (kind || 'ok');
    d.textContent = txt;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 900);
  }

  function learn(k) {
    if (k && !S.learnedSet[k]) { S.learnedSet[k] = 1; S.learned.push(k); }
  }

  function miss(k) {
    if (k && !S.missedSet[k]) { S.missedSet[k] = 1; S.missed.push(k); }
  }

  /* ---------------- 关卡数据访问 ---------------- */
  function curLevel() { return LEVELS[S.lv]; }
  function curScenario() {
    for (var i = 0; i < SCENARIOS.length; i++) if (SCENARIOS[i].lv === curLevel().id) return SCENARIOS[i];
    return null;
  }
  function curReaction() {
    for (var i = 0; i < REACTIONS.length; i++) if (REACTIONS[i].lv === curLevel().id) return REACTIONS[i];
    return null;
  }

  /* ================= 第一环节：归位排查 ================= */
  function renderLevel() {
    var lv = curLevel();
    S.placed = {};
    S.selected = null;
    S.combo = 0;
    S.expert = false;
    S.risk = 0;
    S.locked = false;
    S.pendingNext = false;
    S.phase = 'sort';
    S.left = TIME_PER_LEVEL;

    $('lvNum').textContent = lv.id;
    $('lvName').textContent = lv.name;
    $('scoreVal').textContent = S.score;
    $('progressBar').style.width = '0%';
    setExpertBadge(false);

    var pool = $('poolList');
    pool.innerHTML = '';
    shuffle(lv.items).forEach(function (it) {
      var d = document.createElement('div');
      d.className = 'pool-item';
      d.draggable = true;
      d.dataset.name = it.name;
      d.innerHTML = '<span class="pip"></span>' + esc(it.name);
      d.addEventListener('dragstart', onDragStart);
      d.addEventListener('dragend', onDragEnd);
      d.addEventListener('click', onItemClick);
      pool.appendChild(d);
    });

    var grid = $('slotGrid');
    grid.innerHTML = '';
    lv.slots.forEach(function (sl) {
      var d = document.createElement('div');
      d.className = 'slot';
      d.dataset.slot = sl.id;
      d.innerHTML =
        '<div class="slot-title">' + esc(sl.name) + '</div>' +
        '<div class="slot-hint">' + esc(sl.hint) + '</div>' +
        '<div class="slot-items"></div>' +
        '<div class="slot-dropzone">拖到这里</div>';
      d.addEventListener('dragover', onDragOver);
      d.addEventListener('dragleave', onDragLeave);
      d.addEventListener('drop', onDrop);
      d.addEventListener('click', onSlotClick);
      grid.appendChild(d);
    });

    updateStats();
    startTimer();
    drawLevelImage();
    $('stageHint').textContent = '把左边的项目拖到正确的容器';
  }

  function drawLevelImage() {
    var box = $('stageArt');
    if (!box) return;
    box.innerHTML = '';
    var img = document.createElement('img');
    img.alt = curLevel().name + ' 场景示意';
    img.src = assetUrl(curLevel().image);
    var cap = document.createElement('div');
    cap.className = 'art-cap';
    cap.textContent = '场景示意 · ' + curLevel().name;
    box.appendChild(img);
    box.appendChild(cap);
  }

  /* ---------------- 计时 ---------------- */
  function startTimer() {
    stopTimer();
    updateTime();
    S.timer = setInterval(function () {
      S.left--;
      updateTime();
      if (S.left <= 0) { stopTimer(); finishLevel(true); }
    }, 1000);
  }
  function stopTimer() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }
  function updateTime() {
    var el = $('timeVal');
    el.textContent = fmtTime(S.left);
    el.className = 'val' + (S.left <= 15 ? ' warn' : '');
  }

  /* ---------------- 拖拽与点选 ---------------- */
  function findItem(name) {
    var items = curLevel().items;
    for (var i = 0; i < items.length; i++) if (items[i].name === name) return items[i];
    return null;
  }

  function onDragStart(e) {
    if (S.locked) { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.name);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  }
  function onDragEnd(e) { e.currentTarget.classList.remove('dragging'); }
  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('over');
  }
  function onDragLeave(e) { e.currentTarget.classList.remove('over'); }

  function onDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('over');
    if (S.locked) return;
    var name = e.dataTransfer.getData('text/plain');
    if (name) tryPlace(name, e.currentTarget.dataset.slot);
  }

  function onItemClick(e) {
    if (S.locked) return;
    var el = e.currentTarget;
    var name = el.dataset.name;
    if (S.selected === name) { S.selected = null; clearSel(); return; }
    S.selected = name;
    clearSel();
    el.classList.add('sel');
    $('stageHint').textContent = '已选中「' + name + '」，点击右侧目标容器';
  }

  function clearSel() {
    Array.prototype.forEach.call(document.querySelectorAll('.pool-item.sel'), function (n) {
      n.classList.remove('sel');
    });
    if (S.phase === 'sort') $('stageHint').textContent = '把左边的项目拖到正确的容器';
  }

  function onSlotClick(e) {
    if (S.locked) return;
    if (!S.selected) { toast('请先在左侧选择一项'); return; }
    var name = S.selected;
    S.selected = null;
    clearSel();
    tryPlace(name, e.currentTarget.dataset.slot);
  }

  /* ---------------- 归位判定 ---------------- */
  function tryPlace(name, slotId) {
    var it = findItem(name);
    if (!it) return;
    if (S.placed[name]) { toast('「' + name + '」已经归位了'); return; }
    var slotEl = document.querySelector('.slot[data-slot="' + slotId + '"]');
    if (!slotEl) return;

    if (it.slot === slotId) correctPlace(it, slotEl);
    else wrongPlace(it, slotEl, slotId);
    afterAction();
  }

  function checkTrap(itemName, slotId) {
    var lv = curLevel();
    var here = [];
    Object.keys(S.placed).forEach(function (n) {
      if (S.placed[n] === slotId) here.push(n);
    });
    for (var i = 0; i < lv.traps.length; i++) {
      var t = lv.traps[i];
      var pair = t.a === itemName ? t.b : (t.b === itemName ? t.a : null);
      if (pair && here.indexOf(pair) >= 0) return t;
    }
    return null;
  }

  function correctPlace(it, slotEl) {
    S.correct++;
    S.combo++;
    if (S.combo >= EXPERT_FROM && !S.expert) {
      S.expert = true;
      setExpertBadge(true);
      toast('规范达人！此后每次正确额外 +' + EXPERT_BONUS);
    }
    var gain = SCORE_CORRECT + Math.min(S.combo, COMBO_MAX) * COMBO_BONUS + (S.expert ? EXPERT_BONUS : 0);
    S.score += gain;
    S.placed[it.name] = it.slot;
    learn(it.k);

    var pel = document.querySelector('.pool-item[data-name="' + cssEsc(it.name) + '"]');
    if (pel) { pel.classList.add('done'); pel.draggable = false; }

    var box = slotEl.querySelector('.slot-items');
    var chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = it.name;
    box.appendChild(chip);
    slotEl.classList.add('okflash');
    setTimeout(function () { slotEl.classList.remove('okflash'); }, 620);

    floatText('+' + gain, 'ok');
    showCard(KNOWLEDGE[it.k], 'ok', '归位正确', null);
    updateStats();
  }

  function wrongPlace(it, slotEl, slotId) {
    S.wrong++;
    S.combo = 0;
    S.expert = false;
    setExpertBadge(false);
    var trap = checkTrap(it.name, slotId);

    slotEl.classList.add('shake');
    setTimeout(function () { slotEl.classList.remove('shake'); }, 480);

    if (trap) {
      // 触发禁忌组合：更高隐患值 + 全屏危险反馈
      addRisk(RISK_TRAP);
      var partner = trap.a === it.name ? trap.b : trap.a;
      dangerFlash('危险组合');
      learn(trap.k); miss(trap.k);
      showCard(KNOWLEDGE[trap.k], 'danger', '危险！这两样不能放在一起',
        esc(it.name) + ' 与 ' + esc(partner) + ' 同处一柜');
    } else {
      addRisk(RISK_WRONG);
      learn(it.k); miss(it.k);
      showCard(KNOWLEDGE[it.k], 'warn', '放错位置了',
        '「' + esc(it.name) + '」应该放到：' + esc(slotNameById(it.slot)));
    }
    updateStats();
  }

  function addRisk(n) {
    S.risk += n;
    if (S.risk >= RISK_MAX) {
      stopTimer();
      setTimeout(function () { levelFailed(); }, 700);
    }
  }

  function setExpertBadge(on) {
    var el = $('expertBadge');
    if (el) el.style.display = on ? 'inline-flex' : 'none';
  }

  function slotNameById(id) {
    var ss = curLevel().slots;
    for (var i = 0; i < ss.length; i++) if (ss[i].id === id) return ss[i].name;
    return '';
  }

  function cssEsc(s) { return String(s).replace(/"/g, '\\"'); }

  function afterAction() {
    var total = curLevel().items.length;
    var done = Object.keys(S.placed).length;
    $('progVal').textContent = done + '/' + total;
    $('progressBar').style.width = (done / total * 100) + '%';
    if (done < total) return;

    // 全部归位完成。知识卡弹出时 S.locked 为真，此时不能推进，
    // 需等玩家关闭卡片后再进入下一环节（见 showCard 的 close）。
    stopTimer();
    S.pendingNext = true;
    if (!S.locked) afterSort();
  }

  function updateStats() {
    $('scoreVal').textContent = S.score;
    $('progVal').textContent = Object.keys(S.placed).length + '/' + curLevel().items.length;
    var remain = document.querySelectorAll('.pool-item:not(.done)').length;
    $('poolCnt').textContent = remain + ' 项';
    var rd = $('riskDots');
    if (rd) {
      var h = '';
      for (var i = 0; i < RISK_MAX; i++) h += '<span class="rdot' + (i < S.risk ? ' on' : '') + '"></span>';
      rd.innerHTML = h;
    }
  }

  /* ---------------- 危险全屏反馈 ---------------- */
  function dangerFlash(text) {
    var d = document.createElement('div');
    d.className = 'danger-flash';
    d.innerHTML = '<div class="df-inner"><div class="df-title">' + esc(text) + '</div>' +
      '<div class="df-sub">隐患累积 · 当前 ' + Math.min(S.risk, RISK_MAX) + ' / ' + RISK_MAX + '</div></div>';
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 1400);
  }

  /* ================= 知识卡 ================= */
  function showCard(card, kind, tagText, subText) {
    if (!card) return;
    S.locked = true;
    var mask = document.createElement('div');
    mask.className = 'kcard-mask';
    var iconChar = kind === 'ok' ? '✓' : (kind === 'danger' ? '!' : '!');

    var basisHtml = (card.basis || []).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('');
    var tagLabel = { ok: '正确做法', warn: '常见错误', danger: '违规 · 危险', info: '补充说明' }[card.level] || '知识点';

    mask.innerHTML =
      '<div class="kcard k-' + card.level + '">' +
        '<div class="kcard-top">' +
          '<div class="kcard-ico">' + iconChar + '</div>' +
          '<div class="kcard-headtxt">' +
            '<span class="kcard-tag">' + esc(tagText) + ' · ' + tagLabel + '</span>' +
            '<div class="kcard-title">' + esc(card.title) + '</div>' +
            (subText ? '<div class="kcard-subline">' + subText + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="kcard-body">' +
          '<div class="kcard-fact">' + esc(card.fact) + '</div>' +
          (card.equation ? '<div class="kcard-eq">' + esc(card.equation) + '</div>' : '') +
          '<div class="kcard-sec"><h4>规范依据</h4><ul>' + basisHtml + '</ul></div>' +
          '<div class="kcard-correct"><b>正确做法　</b>' + esc(card.correct) + '</div>' +
        '</div>' +
        '<div class="kcard-foot"><button class="btn" id="kcardOk">知道了</button></div>' +
      '</div>';

    document.body.appendChild(mask);
    function close() {
      mask.remove();
      S.locked = false;
      // 若归位已全部完成且玩家正要关闭最后一张卡片，继续下一环节
      if (S.pendingNext) { S.pendingNext = false; setTimeout(afterSort, 260); }
    }
    mask.querySelector('#kcardOk').addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
  }

  /* ================= 第二环节：配伍实验 ================= */
  function afterSort() {
    S.pendingNext = false;
    S.phase = 'reaction';
    var rx = curReaction();
    if (!rx) { afterScenario(); return; }
    stopTimer();
    showReaction(rx);
  }

  function showReaction(rx) {
    S.locked = true;
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML =
      '<div class="modal reaction-box">' +
        '<div class="mo-head"><span class="mo-idx">配伍禁忌实验</span>' +
          '<h3>这两样东西放在一起，会发生什么？</h3></div>' +
        '<div class="rx-bench">' +
          '<div class="rx-vessel"><div class="rx-flask"></div><div class="rx-name">' + esc(rx.a) + '</div></div>' +
          '<div class="rx-plus">+</div>' +
          '<div class="rx-vessel"><div class="rx-flask b"></div><div class="rx-name">' + esc(rx.b) + '</div></div>' +
        '</div>' +
        '<p class="mo-q">先做出预测，再动手验证。猜错不扣分，但会记入待复习。</p>' +
        '<div class="rx-opts">' +
          OUTCOME_OPTIONS.map(function (o, i) {
            return '<button class="rx-opt" data-i="' + i + '">' + esc(o) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="mo-foot"><button class="btn" id="rxRun" disabled>开始实验</button></div>' +
      '</div>';
    document.body.appendChild(mask);

    var picked = null;
    var runBtn = mask.querySelector('#rxRun');
    Array.prototype.forEach.call(mask.querySelectorAll('.rx-opt'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(mask.querySelectorAll('.rx-opt'), function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        picked = parseInt(b.dataset.i, 10);
        runBtn.disabled = false;
      });
    });

    runBtn.addEventListener('click', function () {
      if (picked === null) return;
      runBtn.disabled = true;
      var expected = OUTCOME_OPTIONS.indexOf(rx.result);
      var right = picked === expected;

      mask.querySelectorAll('.rx-opt').forEach(function (x) {
        var i = parseInt(x.dataset.i, 10);
        if (i === expected) x.classList.add('right');
        else if (i === picked) x.classList.add('wrong');
        x.disabled = true;
      });

      S.score += right ? SCORE_REACTION : 0;
      if (right) { S.correct++; floatText('+' + SCORE_REACTION, 'ok'); }
      learn(rx.k);
      if (!right) miss(rx.k);
      $('scoreVal').textContent = S.score;

      var res = document.createElement('div');
      res.className = 'rx-result ' + (rx.outcome === 'danger' ? 'o-danger' : (rx.outcome === 'caution' ? 'o-caution' : 'o-safe'));
      res.innerHTML =
        '<div class="rx-cloud"></div>' +
        '<div class="rx-res-head">' +
          (right ? '预测正确　' : '预测与实际不符　') + '实际结果：' + esc(rx.result) +
        '</div>' +
        '<div class="rx-desc">' + esc(rx.describe) + '</div>' +
        '<div class="rx-why"><b>为什么</b>' + esc(rx.why) + '</div>' +
        '<div class="rx-note">示意图仅用于说明反应类型，实际现象随物质浓度与用量而异。</div>';
      mask.querySelector('.reaction-box').appendChild(res);
      res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      if (rx.outcome === 'danger') dangerFlash('反应演示 · 危险');

      var next = document.createElement('button');
      next.className = 'btn';
      next.textContent = '继续';
      next.addEventListener('click', function () {
        mask.remove();
        S.locked = false;
        afterScenario();
      });
      res.appendChild(next);
      next.focus();
    });
  }

  /* ================= 第三环节：情境决策 ================= */
  function afterScenario() {
    S.phase = 'scenario';
    var sc = curScenario();
    if (!sc) { finishLevel(false); return; }
    stopTimer();
    showScenario(sc);
  }

  function showScenario(sc) {
    S.locked = true;
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML =
      '<div class="modal scenario-box">' +
        '<div class="mo-head"><span class="mo-idx">情境决策</span>' +
          '<h3>现场情况</h3></div>' +
        '<div class="sc-scene">' + esc(sc.scene) + '</div>' +
        '<div class="sc-q">' + esc(sc.q) + '<span class="sc-hint">（只判断第一步该做什么）</span></div>' +
        '<div class="sc-opts">' +
          sc.opts.map(function (o, i) {
            return '<button class="sc-opt" data-i="' + i + '"><span class="sc-n">' +
              String.fromCharCode(65 + i) + '</span><span class="sc-t">' + esc(o) + '</span></button>';
          }).join('') +
        '</div>' +
        '<div class="mo-foot"><button class="btn" id="scRun" disabled>提交判断</button></div>' +
      '</div>';
    document.body.appendChild(mask);

    var picked = null;
    var runBtn = mask.querySelector('#scRun');
    Array.prototype.forEach.call(mask.querySelectorAll('.sc-opt'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(mask.querySelectorAll('.sc-opt'), function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        picked = parseInt(b.dataset.i, 10);
        runBtn.disabled = false;
      });
    });

    runBtn.addEventListener('click', function () {
      if (picked === null) return;
      runBtn.disabled = true;
      var right = picked === sc.ans;

      Array.prototype.forEach.call(mask.querySelectorAll('.sc-opt'), function (x, i) {
        if (i === sc.ans) x.classList.add('right');
        else if (i === picked) x.classList.add('wrong');
        x.classList.add('reveal');
        var t = x.querySelector('.sc-t');
        if (i === sc.ans) t.innerHTML = t.innerHTML + '<em>　✔ 正确</em>';
        else if (i === picked) t.innerHTML = t.innerHTML + '<em>　✘ 你选了这一项</em>';
      });

      if (right) { S.score += SCORE_SCENARIO; S.correct++; floatText('+' + SCORE_SCENARIO, 'ok'); }
      else { addRisk(RISK_SCENARIO); miss(sc.k); }
      learn(sc.k);
      $('scoreVal').textContent = S.score;

      var res = document.createElement('div');
      res.className = 'sc-result';
      res.innerHTML =
        '<div class="sc-res-head">' + (right ? '判断正确' : '第一步选错了') + '</div>' +
        '<div class="sc-why">' + sc.why.map(function (w, i) {
          var mark = i === sc.ans ? 'ans' : (i === picked ? 'you' : 'other');
          return '<div class="why-row ' + mark + '"><span class="why-tag">' +
            String.fromCharCode(65 + i) + '</span>' + esc(w) + '</div>';
        }).join('') + '</div>';

      var kc = KNOWLEDGE[sc.k];
      if (kc) {
        res.innerHTML += '<div class="sc-basis"><h4>规范依据</h4><ul>' +
          (kc.basis || []).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') +
          '</ul><div class="sc-correct"><b>正确做法</b>' + esc(kc.correct) + '</div></div>';
      }

      var next = document.createElement('button');
      next.className = 'btn';
      next.textContent = '进入下一环节';
      next.addEventListener('click', function () {
        mask.remove();
        S.locked = false;
        if (S.risk >= RISK_MAX) { levelFailed(); return; }
        finishLevel(false);
      });
      res.appendChild(next);
      mask.querySelector('.scenario-box').appendChild(res);
      res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      next.focus();
    });
  }

  /* ================= 关卡流转 ================= */
  function levelFailed() {
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML =
      '<div class="modal fail-box">' +
        '<div class="fail-ico">!</div>' +
        '<h3>隐患值已满 · 本关需要重来</h3>' +
        '<p>这一关累计了 ' + RISK_MAX + ' 点隐患，说明操作中的错误已经不只是"记错了分类"，而是可能造成真实事故的倾向。已经学过的知识点会保留，重新开始后可以直接用上。</p>' +
        '<div class="mo-foot"><button class="btn" id="failRetry">重新排查本关</button></div>' +
      '</div>';
    document.body.appendChild(mask);
    mask.querySelector('#failRetry').addEventListener('click', function () {
      mask.remove();
      S.locked = false;
      renderLevel();
    });
  }

  function finishLevel(timeout) {
    stopTimer();
    if (S.lv < LEVELS.length - 1) {
      var nextName = LEVELS[S.lv + 1].name;
      S.lv++;
      toast((timeout ? '时间到 · ' : '') + '进入第 ' + LEVELS[S.lv].id + ' 关：' + nextName);
      setTimeout(renderLevel, 900);
    } else {
      showResult();
    }
  }

  /* ================= 结算 ================= */
  function showResult() {
    stopTimer();
    $('gameScreen').classList.add('hidden');
    $('resultScreen').classList.remove('hidden');

    var total = S.correct + S.wrong;
    var acc = total ? Math.round(S.correct / total * 100) : 0;

    $('resScore').textContent = S.score;
    $('resAcc').textContent = acc + '%';
    $('resErr').textContent = S.wrong;
    $('resLearn').textContent = S.learned.length;

    var title, desc;
    if (acc >= 95 && S.wrong === 0) { title = '满分安全官'; desc = '六个关卡的归位、实验与决策全部一次到位，没有触发任何隐患。'; }
    else if (acc >= 85) { title = '优秀安全官'; desc = '判断整体可靠，个别处置顺序或配伍判断再确认一下就更扎实。'; }
    else if (acc >= 70) { title = '合格安全官'; desc = '主要规则已经掌握，细节部分建议对照知识手册回看依据条款。'; }
    else { title = '见习安全官'; desc = '完成了全部六个关卡。下面按掌握程度排出了你的知识手册，建议先补"必须掌握"一栏。'; }
    $('resTitle').textContent = title;
    $('resDesc').textContent = desc;

    var img = $('resImg');
    img.src = assetUrl('ending_pass.webp');

    // 结算回顾：按掌握程度分层展示
    var box = $('resList');
    box.innerHTML = '';

    function section(title, keys, cls) {
      if (!keys.length) return;
      var h = document.createElement('div');
      h.className = 'rev-sec ' + cls;
      h.innerHTML = '<h4>' + esc(title) + '<span>' + keys.length + ' 条</span></h4>';
      keys.forEach(function (k) {
        var c = KNOWLEDGE[k];
        if (!c) return;
        var d = document.createElement('div');
        d.className = 'rev-item';
        d.innerHTML =
          '<div class="rev-mark ' + (cls === 'rev-sec-miss' ? 'err' : 'ok') + '">' +
            (cls === 'rev-sec-miss' ? '!' : '✓') + '</div>' +
          '<div class="rev-txt">' +
            '<div class="rev-name">' + esc(c.title) + '</div>' +
            '<div class="rev-sub">' + esc(c.correct) + '</div>' +
          '</div>';
        h.appendChild(d);
      });
      box.appendChild(h);
    }

    var missedKeys = S.missed.slice();
    var dangerKeys = S.learned.filter(function (k) {
      return KNOWLEDGE[k] && KNOWLEDGE[k].level === 'danger' && missedKeys.indexOf(k) < 0;
    });
    var warnKeys = S.learned.filter(function (k) {
      return KNOWLEDGE[k] && KNOWLEDGE[k].level === 'warn' && missedKeys.indexOf(k) < 0;
    });
    var otherKeys = S.learned.filter(function (k) {
      if (!KNOWLEDGE[k]) return false;
      if (missedKeys.indexOf(k) >= 0 || dangerKeys.indexOf(k) >= 0 || warnKeys.indexOf(k) >= 0) return false;
      return true;
    });

    section('需要重点复习（做错过）', missedKeys, 'rev-sec-miss');
    section('必须掌握 · 违规与危险项', dangerKeys, 'rev-sec-danger');
    section('应当熟悉 · 常见错误项', warnKeys, 'rev-sec-warn');
    section('延伸阅读 · 规范做法', otherKeys, 'rev-sec-ok');

    if (!S.learned.length) {
      box.innerHTML = '<div class="rev-empty">本轮没有记录到知识点。</div>';
    }
  }

  /* ================= 知识手册（按掌握程度分层） ================= */
  function buildManual() {
    var body = $('manualBody');
    body.innerHTML = '';
    var total = Object.keys(KNOWLEDGE).length;
    var got = Object.keys(S.learnedSet).length;
    var pct = total ? Math.round(got / total * 100) : 0;
    $('manualProg').textContent = got + ' / ' + total;
    $('manualBar').style.width = pct + '%';

    var groups = { danger: [], warn: [], info: [], ok: [] };
    Object.keys(KNOWLEDGE).forEach(function (k) {
      var c = KNOWLEDGE[k];
      if (!c) return;
      (groups[c.level] || groups.ok).push(k);
    });

    var META = [
      { key: 'danger', title: '必须掌握 · 违规与危险', cls: 'mg-danger', hint: '违反这些要求会直接导致火灾、爆炸、中毒或人身伤害，属于实验室安全的红线。' },
      { key: 'warn', title: '应当熟悉 · 常见错误', cls: 'mg-warn', hint: '这些是日常操作里最容易做错、做漏的一环，单次后果未必严重，但会累积成隐患。' },
      { key: 'info', title: '概念澄清 · 判断依据', cls: 'mg-info', hint: '帮助你理解"为什么这样规定"，避免死记硬背。' },
      { key: 'ok', title: '延伸阅读 · 规范做法', cls: 'mg-ok', hint: '标准做法与日常习惯，养成之后收益长期累积。' }
    ];

    META.forEach(function (m) {
      var keys = groups[m.key] || [];
      if (!keys.length) return;
      var g = document.createElement('div');
      g.className = 'mgroup ' + m.cls;
      var h = '<h3>' + esc(m.title) + '<span class="mg-n">' + keys.length + ' 条</span></h3>' +
              '<p class="mg-hint">' + esc(m.hint) + '</p>';
      keys.forEach(function (k) {
        var c = KNOWLEDGE[k];
        var mastered = !!S.learnedSet[k];
        h += '<div class="mitem' + (mastered ? ' mastered' : '') + '">' +
          '<div class="mt"><span class="pip"></span>' + esc(c.title) +
            (mastered ? '<span class="m-check">已掌握</span>' : '') + '</div>' +
          '<div class="mf">' + esc(c.fact) + '</div>' +
          (c.equation ? '<div class="kcard-eq">' + esc(c.equation) + '</div>' : '') +
          '<div class="mb">依据：' + (c.basis || []).map(esc).join('　｜　') + '</div>' +
          '<div class="mc">正确做法：' + esc(c.correct) + '</div>' +
        '</div>';
      });
      g.innerHTML = h;
      body.appendChild(g);
    });
  }

  /* ================= 页面切换 ================= */
  function show(id) {
    ['startScreen', 'gameScreen', 'resultScreen', 'manualScreen'].forEach(function (s) {
      $(s).classList.toggle('hidden', s !== id);
    });
    window.scrollTo(0, 0);
  }

  function resetAll() {
    S.lv = 0; S.score = 0; S.correct = 0; S.wrong = 0;
    S.combo = 0; S.expert = false; S.risk = 0;
    S.learned = []; S.learnedSet = {};
    S.missed = []; S.missedSet = {};
    stopTimer();
  }

  function startGame() {
    resetAll();
    show('gameScreen');
    renderLevel();
  }

  /* ================= 事件绑定 ================= */
  function init() {
    $('coverImg').src = assetUrl('cover_lab.webp');

    var kc = $('kCount');
    if (kc) kc.textContent = Object.keys(KNOWLEDGE).length;
    var lc = $('lvCount');
    if (lc) lc.textContent = LEVELS.length;
    var sc2 = $('scCount');
    if (sc2) sc2.textContent = SCENARIOS.length;

    $('btnStart').addEventListener('click', startGame);
    $('btnManual').addEventListener('click', function () { buildManual(); show('manualScreen'); });
    $('btnManual2').addEventListener('click', function () { buildManual(); show('manualScreen'); });
    $('btnRestartLv').addEventListener('click', function () { stopTimer(); renderLevel(); });
    $('btnQuit').addEventListener('click', function () { stopTimer(); show('startScreen'); });
    $('btnAgain').addEventListener('click', startGame);
    $('btnBackHome').addEventListener('click', function () { show('startScreen'); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && S.selected) { S.selected = null; clearSel(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

})();
