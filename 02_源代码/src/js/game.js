/**
 * 《实验室安全官》主逻辑
 * 依赖：data/knowledge.js（KNOWLEDGE / LEVELS）
 * 无第三方依赖，原生 JS。
 */
(function () {
  'use strict';

  var TIME_PER_LEVEL = 90;
  var SCORE_CORRECT = 10;
  var SCORE_WRONG = -5;
  var COMBO_BONUS = 2;
  var COMBO_MAX = 10;

  var IMG_BASE = 'assets/';

  var S = {
    lv: 0,
    score: 0,
    correct: 0,
    wrong: 0,
    combo: 0,
    left: 0,
    timer: null,
    placed: {},
    selected: null,
    learned: [],
    learnedSet: {},
    locked: false
  };

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
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
    setTimeout(function () { d.remove(); }, 2000);
  }

  function comboPop(n) {
    var old = document.querySelector('.combo');
    if (old) old.remove();
    var d = document.createElement('div');
    d.className = 'combo';
    d.textContent = '连对 ' + n + ' 次';
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 750);
  }

  function learn(k) {
    if (k && !S.learnedSet[k]) { S.learnedSet[k] = 1; S.learned.push(k); }
  }

  /* ---------------- 关卡渲染 ---------------- */
  function curLevel() { return LEVELS[S.lv]; }

  function renderLevel() {
    var lv = curLevel();
    S.placed = {};
    S.selected = null;
    S.combo = 0;
    S.locked = false;
    S.left = TIME_PER_LEVEL;

    $('lvNum').textContent = lv.id;
    $('lvName').textContent = lv.name;
    $('scoreVal').textContent = S.score;
    $('progressBar').style.width = '0%';

    // 待归位池（打乱顺序）
    var pool = $('poolList');
    pool.innerHTML = '';
    shuffle(lv.items).forEach(function (it, i) {
      var d = document.createElement('div');
      d.className = 'pool-item';
      d.draggable = true;
      d.dataset.name = it.name;
      d.dataset.idx = i;
      d.innerHTML = '<span class="pip"></span>' + esc(it.name);
      d.addEventListener('dragstart', onDragStart);
      d.addEventListener('dragend', onDragEnd);
      d.addEventListener('click', onItemClick);
      pool.appendChild(d);
    });

    // 目标容器
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
  }

  function drawLevelImage() {
    // 关卡场景插画：置于容器区内，与容器网格并排，充分利用横向空间
    var box = document.getElementById('stageArt');
    if (!box) return;
    box.innerHTML = '';
    box.style.cssText = 'position:relative;border-radius:var(--radius);overflow:hidden;border:1px solid var(--line);background:var(--teal-50)';
    var img = document.createElement('img');
    img.alt = curLevel().name + ' 场景示意';
    img.src = assetUrl(curLevel().image);
    img.style.cssText = 'width:100%;display:block;height:100%;object-fit:cover';
    var cap = document.createElement('div');
    cap.textContent = '场景示意 · ' + curLevel().name;
    cap.style.cssText = 'position:absolute;left:0;bottom:0;right:0;padding:8px 14px;font-size:12px;color:#fff;background:linear-gradient(transparent,rgba(4,52,44,.66))';
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

  /* ---------------- 交互 ---------------- */
  function findItem(name) {
    for (var i = 0; i < curLevel().items.length; i++) {
      if (curLevel().items[i].name === name) return curLevel().items[i];
    }
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
    if (S.selected === name) {
      S.selected = null;
      clearSel();
      return;
    }
    S.selected = name;
    clearSel();
    el.style.borderColor = 'var(--teal-400)';
    el.style.background = 'var(--teal-50)';
    $('stageHint').textContent = '已选中「' + name + '」，点击目标容器';
  }

  function clearSel() {
    Array.prototype.forEach.call(document.querySelectorAll('.pool-item'), function (n) {
      n.style.borderColor = '';
      n.style.background = '';
    });
    $('stageHint').textContent = '把左边的项目拖到正确的容器';
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

    if (it.slot === slotId) {
      correctPlace(it, slotEl);
    } else {
      wrongPlace(it, slotEl, slotId);
    }
    afterAction();
  }

  // 检查是否触发"危险组合"（本不该同柜的两样东西放到了一起）
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
    var bonus = Math.min(S.combo, COMBO_MAX) * COMBO_BONUS;
    S.score += SCORE_CORRECT + bonus;
    S.placed[it.name] = it.slot;
    learn(it.k);

    // 已归位项从池中移除
    var pel = document.querySelector('.pool-item[data-name="' + cssEsc(it.name) + '"]');
    if (pel) { pel.classList.add('done'); pel.draggable = false; }

    // 加入容器
    var box = slotEl.querySelector('.slot-items');
    var chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = it.name;
    box.appendChild(chip);
    slotEl.classList.add('full');

    if (S.combo >= 3) comboPop(S.combo);

    var card = KNOWLEDGE[it.k];
    showCard(card, 'ok', '归位正确', '正确');
    updateStats();
  }

  function wrongPlace(it, slotEl, slotId) {
    S.wrong++;
    S.combo = 0;
    S.score += SCORE_WRONG;
    if (S.score < 0) S.score = 0;
    slotEl.classList.add('shake');
    setTimeout(function () { slotEl.classList.remove('shake'); }, 450);

    var trap = checkTrap(it.name, slotId);
    if (trap) {
      var tk = KNOWLEDGE[trap.k];
      learn(trap.k);
      var partner = trap.a === it.name ? trap.b : trap.a;
      showCard(tk, 'danger', '危险！这两样不能放在一起',
        esc(it.name) + ' 与 ' + esc(partner) + ' 同柜');
    } else {
      var basis = KNOWLEDGE[it.k];
      learn(it.k);
      var rightSlotName = slotNameById(it.slot);
      showCard(basis, 'warn', '放错位置了',
        '「' + esc(it.name) + '」应该放到：' + esc(rightSlotName));
    }
    updateStats();
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
    if (done >= total) { stopTimer(); setTimeout(function () { finishLevel(false); }, 420); }
  }

  function updateStats() {
    $('scoreVal').textContent = S.score;
    $('progVal').textContent = Object.keys(S.placed).length + '/' + curLevel().items.length;
    var remain = document.querySelectorAll('.pool-item:not(.done)').length;
    $('poolCnt').textContent = remain + ' 项';
  }

  /* ---------------- 知识卡 ---------------- */
  function showCard(card, kind, tagText, subText) {
    if (!card) return;
    S.locked = true;
    var mask = document.createElement('div');
    mask.className = 'kcard-mask';
    var iconChar = kind === 'ok' ? '✓' : (kind === 'danger' ? '!' : (kind === 'warn' ? '!' : 'i'));

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
    mask.querySelector('#kcardOk').addEventListener('click', function () {
      mask.remove();
      S.locked = false;
    });
    mask.addEventListener('click', function (e) {
      if (e.target === mask) { mask.remove(); S.locked = false; }
    });
  }

  /* ---------------- 关卡结束 ---------------- */
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
    if (acc >= 95 && S.wrong === 0) { title = '满分安全官'; desc = '五个关卡全部一次到位，没有一处放错。'; }
    else if (acc >= 85) { title = '优秀安全官'; desc = '隐患排查很扎实，个别位置再确认一下就完美了。'; }
    else if (acc >= 70) { title = '合格安全官'; desc = '主要规则已经掌握，细节部分建议回顾知识手册。'; }
    else { title = '见习安全官'; desc = '完成了全部关卡。建议翻一翻下面的知识点，再来一轮。'; }
    $('resTitle').textContent = title;
    $('resDesc').textContent = desc;

    var img = $('resImg');
    img.src = IMG_BASE + 'ending_pass.webp';

    // 知识点回顾
    var box = $('resList');
    box.innerHTML = '';
    S.learned.forEach(function (k) {
      var c = KNOWLEDGE[k];
      if (!c) return;
      var lvl = c.level;
      var mark = lvl === 'ok' ? 'ok' : 'err';
      var d = document.createElement('div');
      d.className = 'rev-item';
      d.innerHTML =
        '<div class="rev-mark ' + mark + '">' + (lvl === 'ok' ? '✓' : '!') + '</div>' +
        '<div class="rev-txt">' +
          '<div class="rev-name">' + esc(c.title) + '</div>' +
          '<div class="rev-sub">' + esc(c.correct) + '</div>' +
        '</div>';
      box.appendChild(d);
    });
  }

  /* ---------------- 知识手册 ---------------- */
  function buildManual() {
    var body = $('manualBody');
    body.innerHTML = '';
    LEVELS.forEach(function (lv) {
      var keys = [], seen = {};
      lv.items.forEach(function (it) { if (it.k && !seen[it.k]) { seen[it.k] = 1; keys.push(it.k); } });
      lv.traps.forEach(function (t) { if (t.k && !seen[t.k]) { seen[t.k] = 1; keys.push(t.k); } });

      var g = document.createElement('div');
      g.className = 'mgroup';
      var h = '<h3>第 ' + lv.id + ' 关 · ' + esc(lv.name) + '</h3>';
      keys.forEach(function (k) {
        var c = KNOWLEDGE[k];
        if (!c) return;
        var pipColor = c.level === 'danger' ? 'var(--red-600)' : (c.level === 'warn' ? 'var(--amber-600)' : (c.level === 'info' ? 'var(--blue-600)' : 'var(--teal-600)'));
        h += '<div class="mitem">' +
          '<div class="mt"><span class="pip" style="background:' + pipColor + '"></span>' + esc(c.title) + '</div>' +
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

  /* ---------------- 页面切换 ---------------- */
  function show(id) {
    ['startScreen', 'gameScreen', 'resultScreen', 'manualScreen'].forEach(function (s) {
      $(s).classList.toggle('hidden', s !== id);
    });
    window.scrollTo(0, 0);
  }

  function resetAll() {
    S.lv = 0; S.score = 0; S.correct = 0; S.wrong = 0;
    S.combo = 0; S.learned = []; S.learnedSet = {};
    stopTimer();
  }

  function startGame() {
    resetAll();
    show('gameScreen');
    renderLevel();
  }

  /* ---------------- 事件绑定 ---------------- */
  function init() {
    $('coverImg').src = IMG_BASE + 'cover_lab.webp';

    // 知识点数量由数据实时计算，避免文案与实际不符
    var kc = $('kCount');
    if (kc) kc.textContent = Object.keys(KNOWLEDGE).length;

    $('btnStart').addEventListener('click', startGame);
    $('btnManual').addEventListener('click', function () { buildManual(); show('manualScreen'); });
    $('btnManual2').addEventListener('click', function () { buildManual(); show('manualScreen'); });
    $('btnRestartLv').addEventListener('click', function () {
      S.score = Math.max(0, S.score); stopTimer(); renderLevel();
    });
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
