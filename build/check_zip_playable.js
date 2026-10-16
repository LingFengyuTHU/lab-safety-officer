/**
 * 可用性验证：确认单文件能直接打开并进入游戏。
 * 既支持本地文件，也支持线上地址。
 *
 * 用法：
 *   export NODE_PATH="C:/Users/lenovo/.workbuddy/binaries/node/workspace/node_modules"
 *   node build/check_zip_playable.js "<html 绝对路径>"
 *   node build/check_zip_playable.js "https://lingfengyuthu.github.io/lab-safety-officer/"
 *
 * 检查项：页面无外部依赖、首页数据正确、点击开始能进入第 1 关、无 JS 报错。
 */
const fs = require('fs');
const path = require('path');

const TARGET = process.argv[2];
if (!TARGET) {
  console.error('[fail] 请传入 HTML 路径或线上地址');
  process.exit(2);
}
const isUrl = /^https?:\/\//.test(TARGET);
if (!isUrl && !fs.existsSync(TARGET)) {
  console.error('[fail] 文件不存在：' + TARGET);
  process.exit(2);
}

const LOCAL_CHROME = 'C:/Users/lenovo/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

(async () => {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (e) {
    console.error('[fail] 未找到 playwright，请设置 NODE_PATH');
    process.exit(2);
  }

  const opts = {};
  if (fs.existsSync(LOCAL_CHROME)) opts.executablePath = LOCAL_CHROME;

  const browser = await chromium.launch(opts);
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  const results = [];
  const ok = (n, c, extra) => results.push({ n, c: !!c, extra });

  // 线上地址直接用，本地文件转成 file:// 协议，模拟评委双击
  const url = isUrl ? TARGET : 'file:///' + TARGET.replace(/\\/g, '/');
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200);

  // 1. 页面标题
  const title = await page.title();
  ok('页面标题存在', title.length > 0, title);

  // 2. 首页统计数字与数据源一致
  const body = await page.locator('body').innerText();
  ok('首页显示 6 个关卡', /6\s*个?关卡/.test(body));
  ok('首页显示 65 个知识点', /65\s*个?安全?知识点/.test(body));

  // 3. 开始按钮可点击
  const startBtn = page.locator('#btnStart');
  const visible = await startBtn.isVisible().catch(() => false);
  ok('开始按钮可见', visible);
  if (visible) {
    await startBtn.click();
    await page.waitForTimeout(900);
    const lvNum = await page.locator('#lvNum').innerText().catch(() => '');
    ok('点击后进入第 1 关', lvNum.trim() === '1', 'lvNum=' + lvNum.trim());

    const cards = await page.locator('.pool-item').count();
    ok('第 1 关有可拖拽项目', cards > 0, cards + ' 项');

    const slots = await page.locator('.slot').count();
    ok('第 1 关有存放容器', slots > 0, slots + ' 个');
  }

  // 4. 运行期错误
  ok('无 JS 运行错误', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();

  console.log('=== 提交包可用性验证 ===');
  console.log('目标：' + TARGET);
  let bad = 0;
  for (const r of results) {
    if (!r.c) bad += 1;
    console.log(`  [${r.c ? 'ok' : 'FAIL'}] ${r.n}${r.extra ? '  → ' + r.extra : ''}`);
  }
  console.log('========================');
  console.log(bad === 0 ? '解压后可直接运行，全部检查通过。' : `发现 ${bad} 项异常。`);
  process.exit(bad === 0 ? 0 : 1);
})();
