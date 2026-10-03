/**
 * 无浏览器逻辑自检：
 * 1. 语法检查（knowledge.js / game.js 能否解析）
 * 2. 数据完整性（每个 item 的 slot 是否存在于 slots 中、知识点是否存在于 KNOWLEDGE）
 * 3. 单文件完整性（图片是否全部内联、有无外部引用）
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, '02_源代码', 'src');
let fail = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { console.log('  ✗ ' + m); fail++; };

// ---------- 1. 语法与数据 ----------
console.log('\n[1] 加载 knowledge.js');
const ctx = { console };
vm.createContext(ctx);
let KNOWLEDGE, LEVELS;
try {
  const code = fs.readFileSync(path.join(SRC, 'data', 'knowledge.js'), 'utf8')
    + '\n;this.KNOWLEDGE = KNOWLEDGE; this.LEVELS = LEVELS;';
  vm.runInContext(code, ctx);
  KNOWLEDGE = ctx.KNOWLEDGE;
  LEVELS = ctx.LEVELS;
  ok(`语法正确；KNOWLEDGE ${Object.keys(KNOWLEDGE).length} 条，LEVELS ${LEVELS.length} 关`);
} catch (e) {
  bad('语法错误: ' + e.message);
  process.exit(1);
}

console.log('\n[2] 校验 game.js 语法');
try {
  new vm.Script(fs.readFileSync(path.join(SRC, 'js', 'game.js'), 'utf8'));
  ok('game.js 语法正确');
} catch (e) { bad('game.js 语法错误: ' + e.message); }

console.log('\n[3] 数据完整性');
let itemCount = 0;
LEVELS.forEach((lv) => {
  const slotIds = lv.slots.map((s) => s.id);
  const names = new Set();
  lv.items.forEach((it) => {
    itemCount++;
    if (!slotIds.includes(it.slot)) bad(`第${lv.id}关 "${it.name}" 的 slot "${it.slot}" 不存在`);
    if (!KNOWLEDGE[it.k]) bad(`第${lv.id}关 "${it.name}" 的知识点 "${it.k}" 不存在`);
    if (names.has(it.name)) bad(`第${lv.id}关 项目名重复: ${it.name}`);
    names.add(it.name);
  });
  (lv.traps || []).forEach((t) => {
    if (!KNOWLEDGE[t.k]) bad(`第${lv.id}关 trap 知识点 "${t.k}" 不存在`);
    if (!names.has(t.a) || !names.has(t.b)) bad(`第${lv.id}关 trap 引用了不存在的项目`);
  });
});
ok(`校验 ${itemCount} 个项目、${LEVELS.reduce((n, l) => n + l.slots.length, 0)} 个容器`);

// ---------- 4. 单文件检查 ----------
console.log('\n[4] 单文件完整性');
const single = path.join(ROOT, '01_可执行文件', '实验室安全官.html');
if (!fs.existsSync(single)) { bad('单文件不存在'); }
else {
  const html = fs.readFileSync(single, 'utf8');
  const size = (fs.statSync(single).size / 1024).toFixed(0);
  const b64 = (html.match(/data:image\/webp;base64,/g) || []).length;
  const ext = html.match(/(?:src|href)="(?!data:|#|https?:)[^"]+"/g) || [];
  console.log(`  文件大小 ${size} KB，内联图片 ${b64} 张`);
  if (b64 === 7) ok('7 张图片全部内联'); else bad(`内联图片数应为 7，实际 ${b64}`);
  if (ext.length === 0) ok('无外部文件引用，可离线运行'); else bad('存在外部引用: ' + ext.join(', '));
  if (html.includes('ASSET_DATA')) ok('资源映射表已注入'); else bad('缺少 ASSET_DATA');
}

console.log(fail === 0 ? '\n=== 全部自检通过 ===' : `\n=== 发现 ${fail} 个问题 ===`);
process.exit(fail === 0 ? 0 : 1);
