/**
 * 端到端自动通关测试
 * 用 Playwright 驱动真实浏览器，把六个关卡全部打通，
 * 验证归位、配伍实验、情境决策三个环节都能走通，并检查移动端布局。
 *
 * 用法：node build/e2e.js
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const FILE = 'file:///' + path.join(ROOT, '01_可执行文件', '实验室安全官.html').replace(/\\/g, '/');
const SHOT = path.join(ROOT, 'build', 'shots');

let failed = 0;
function check(cond, msg) {
  if (cond) console.log('  [ok] ' + msg);
  else { console.log('  [FAIL] ' + msg); failed++; }
}

(async () => {
  const { chromium } = require('playwright');
  if (!fs.existsSync(SHOT)) fs.mkdirSync(SHOT, { recursive: true });

  // 复用本机已安装的 Chromium，避免重复下载浏览器内核
  const LOCAL_CHROME = 'C:/Users/lenovo/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const launchOpts = { };
  if (fs.existsSync(LOCAL_CHROME)) launchOpts.executablePath = LOCAL_CHROME;

  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(FILE);
  await page.waitForTimeout(600);

  console.log('\n=== 1. 首页 ===');
  check(await page.locator('.game-title').isVisible(), '标题可见');
  check((await page.locator('#kCount').textContent()) === '65', '知识点数量显示 65');
  check((await page.locator('#lvCount').textContent()) === '6', '关卡数量显示 6');
  check((await page.locator('.flow-step').count()) === 3, '三段玩法说明已渲染');
  check(await page.locator('#btnStart').isVisible(), '开始按钮在首屏可见');
  await page.screenshot({ path: path.join(SHOT, '01-start.png') });

  await page.click('#btnStart');
  await page.waitForTimeout(500);

  // 逐关自动通关
  for (let lv = 1; lv <= 6; lv++) {
    console.log(`\n=== 第 ${lv} 关 ===`);
    const lvNo = await page.locator('#lvNum').textContent();
    check(lvNo === String(lv), `关卡号显示 ${lv}`);
    check((await page.locator('#riskDots .rdot').count()) === 5, '隐患值 5 格');

    // 读取本关项目与正确容器（以页面当前关卡号为准）
    const map = await page.evaluate(() => {
      const n = +document.getElementById('lvNum').textContent;
      const lv = LEVELS[n - 1];
      const out = [];
      document.querySelectorAll('.pool-item').forEach((el) => {
        const nm = el.dataset.name;
        const it = lv.items.find((i) => i.name === nm);
        if (it) out.push({ name: nm, slot: it.slot });
      });
      return out;
    });
    check(map.length > 0, `本关 ${map.length} 个待归位项目`);

    // 逐项点选归位
    for (const m of map) {
      await page.click(`.pool-item[data-name="${m.name.replace(/"/g, '\\"')}"]`);
      await page.click(`.slot[data-slot="${m.slot}"]`);
      await page.waitForTimeout(140);
      // 关闭知识卡
      const okBtn = page.locator('#kcardOk');
      if (await okBtn.count() > 0) {
        await okBtn.click();
        await page.waitForTimeout(140);
      }
    }
    await page.waitForTimeout(700);

    // 配伍实验环节
    const rxBox = page.locator('.reaction-box');
    check(await rxBox.count() > 0, '配伍实验弹层出现');
    if (await rxBox.count() > 0) {
      const expect = await page.evaluate(() => {
        const n = +document.getElementById('lvNum').textContent;
        return REACTIONS.find((r) => r.lv === n).result;
      });
      const optIdx = await page.evaluate((e) => OUTCOME_OPTIONS.indexOf(e), expect);
      await page.locator(`.rx-opt[data-i="${optIdx}"]`).click();
      await page.click('#rxRun');
      await page.waitForTimeout(900);
      check(await page.locator('.rx-result').count() > 0, '实验结果已揭晓');
      check((await page.locator('.rx-opt.right').count()) === 1, '正确选项被标出');
      await page.screenshot({ path: path.join(SHOT, `0${lv + 1}-reaction.png`) });
      await page.locator('.rx-result .btn').click();
      await page.waitForTimeout(400);
    }

    // 情境决策环节
    const scBox = page.locator('.scenario-box');
    check(await scBox.count() > 0, '情境决策弹层出现');
    if (await scBox.count() > 0) {
      const ans = await page.evaluate(() => {
        const n = +document.getElementById('lvNum').textContent;
        return SCENARIOS.find((s) => s.lv === n).ans;
      });
      await page.locator(`.sc-opt[data-i="${ans}"]`).click();
      await page.click('#scRun');
      await page.waitForTimeout(700);
      check(await page.locator('.sc-result').count() > 0, '情境解析已展开');
      check((await page.locator('.why-row').count()) === 4, '四个选项均有解析');
      check((await page.locator('.sc-opt.right').count()) === 1, '正确选项被标出');
      if (lv === 1) await page.screenshot({ path: path.join(SHOT, '03-scenario.png'), fullPage: false });
      await page.locator('.sc-result .btn').click();
      await page.waitForTimeout(1200);
    }
  }

  console.log('\n=== 结算页 ===');
  await page.waitForTimeout(600);
  check(await page.locator('#resultScreen').isVisible(), '结算页已显示');
  const score = await page.locator('#resScore').textContent();
  const acc = await page.locator('#resAcc').textContent();
  const learn = await page.locator('#resLearn').textContent();
  console.log(`  得分 ${score} / 正确率 ${acc} / 掌握知识点 ${learn}`);
  check(Number(score) > 0, '得分为正');
  check(acc === '100%', '全流程正确时正确率为 100%');
  check((await page.locator('.rev-sec').count()) >= 1, '分层回顾已渲染');
  await page.screenshot({ path: path.join(SHOT, '02-result.png'), fullPage: true });

  // 知识手册
  await page.click('#btnManual2');
  await page.waitForTimeout(500);
  check(await page.locator('#manualScreen').isVisible(), '知识手册已打开');
  check((await page.locator('.mgroup').count()) === 4, '手册按四个重要程度分层');
  check((await page.locator('.mitem').count()) === 65, '手册列出全部 65 条');
  check((await page.locator('.mitem.mastered').count()) > 0, '已掌握条目被标记');
  console.log(`  掌握进度：${await page.locator('#manualProg').textContent()}`);
  await page.screenshot({ path: path.join(SHOT, '04-manual.png') });

  /* ---------- 移动端 ---------- */
  console.log('\n=== 移动端 390x844 ===');
  const mp = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mErrors = [];
  mp.on('pageerror', (e) => mErrors.push(e.message));
  await mp.goto(FILE);
  await mp.waitForTimeout(500);
  check(await mp.locator('#btnStart').isVisible(), '移动端开始按钮可见');
  await mp.screenshot({ path: path.join(SHOT, '05-mobile-start.png') });

  await mp.click('#btnStart');
  await mp.waitForTimeout(500);
  const hOverflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  check(!hOverflow, '游戏页无横向溢出');
  const slotW = await mp.evaluate(() => {
    const s = document.querySelector('.slot');
    return s ? s.getBoundingClientRect().width : 0;
  });
  check(slotW > 0 && slotW <= 390, `容器宽度自适应（${Math.round(slotW)}px）`);
  await mp.screenshot({ path: path.join(SHOT, '06-mobile-game.png') });

  // 移动端触发一次配伍实验，验证弹层不溢出
  const mMap = await mp.evaluate(() => {
    const n = LEVELS[0];
    const out = [];
    document.querySelectorAll('.pool-item').forEach((el) => {
      const nm = el.dataset.name;
      out.push({ name: nm, slot: n.items.find((i) => i.name === nm).slot });
    });
    return out;
  });
  for (const m of mMap) {
    await mp.click(`.pool-item[data-name="${m.name.replace(/"/g, '\\"')}"]`);
    await mp.click(`.slot[data-slot="${m.slot}"]`);
    await mp.waitForTimeout(110);
    if (await mp.locator('#kcardOk').count() > 0) { await mp.click('#kcardOk'); await mp.waitForTimeout(110); }
  }
  await mp.waitForTimeout(700);
  check(await mp.locator('.reaction-box').count() > 0, '移动端配伍实验可打开');
  const mRxOverflow = await mp.evaluate(() => {
    const b = document.querySelector('.reaction-box');
    return b ? b.scrollWidth > window.innerWidth + 2 : false;
  });
  check(!mRxOverflow, '配伍实验弹层无横向溢出');
  await mp.screenshot({ path: path.join(SHOT, '07-mobile-reaction.png') });

  console.log('\n=== 运行时错误 ===');
  check(errors.length === 0, '桌面端无 JS 错误' + (errors.length ? '：' + errors.slice(0, 3).join(' | ') : ''));
  check(mErrors.length === 0, '移动端无 JS 错误' + (mErrors.length ? '：' + mErrors.slice(0, 3).join(' | ') : ''));

  await browser.close();

  console.log('\n' + '='.repeat(46));
  console.log(failed === 0 ? '端到端测试全部通过。' : `发现 ${failed} 个失败项。`);
  console.log(`截图目录：${SHOT}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('[fatal]', e); process.exit(1); });
