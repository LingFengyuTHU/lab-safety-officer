/**
 * 数据与逻辑自检
 * 用法：node build/verify.js
 * 校验范围：知识点、关卡、容器引用、情境题、配伍实验、文件结构
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '02_源代码', 'src');

let errors = [];
let warns = [];
function err(m) { errors.push(m); }
function warn(m) { warns.push(m); }
function ok(m) { console.log('  [ok] ' + m); }

/* ---------- 加载数据（模拟浏览器环境） ---------- */
const dataSrc = fs.readFileSync(path.join(SRC, 'data', 'knowledge.js'), 'utf8');
const sandbox = {};
const fn = new Function(dataSrc + '\nreturn {KNOWLEDGE, LEVELS, SCENARIOS, REACTIONS, OUTCOME_OPTIONS};');
let D;
try {
  D = fn();
} catch (e) {
  console.error('[fatal] 数据文件解析失败:', e.message);
  process.exit(1);
}
const { KNOWLEDGE, LEVELS, SCENARIOS, REACTIONS, OUTCOME_OPTIONS } = D;

console.log('\n=== 1. 数据规模 ===');
const kCount = Object.keys(KNOWLEDGE).length;
const itemTotal = LEVELS.reduce((s, l) => s + l.items.length, 0);
const slotTotal = LEVELS.reduce((s, l) => s + l.slots.length, 0);
console.log(`  知识点 ${kCount} 条 / 关卡 ${LEVELS.length} 个 / 项目 ${itemTotal} 项 / 容器 ${slotTotal} 个`);
console.log(`  情境题 ${SCENARIOS.length} 道 / 配伍实验 ${REACTIONS.length} 个`);
if (kCount < 60) err(`知识点数量偏少：${kCount}`);
if (LEVELS.length !== 6) err(`关卡数应为 6，实际 ${LEVELS.length}`);
if (SCENARIOS.length !== LEVELS.length) err(`情境题数应与关卡数一致（${LEVELS.length}），实际 ${SCENARIOS.length}`);
if (REACTIONS.length !== LEVELS.length) err(`配伍实验数应与关卡数一致（${LEVELS.length}），实际 ${REACTIONS.length}`);

console.log('\n=== 2. 知识点结构 ===');
let kBad = 0;
Object.keys(KNOWLEDGE).forEach((k) => {
  const c = KNOWLEDGE[k];
  if (!c.title) { err(`${k} 缺 title`); kBad++; }
  if (!c.fact) { err(`${k} 缺 fact`); kBad++; }
  if (!c.correct) { err(`${k} 缺 correct`); kBad++; }
  if (!Array.isArray(c.basis) || !c.basis.length) { err(`${k} 缺 basis`); kBad++; }
  if (!['ok', 'warn', 'danger', 'info'].includes(c.level)) { err(`${k} 的 level 非法：${c.level}`); kBad++; }
});
if (!kBad) ok(`${kCount} 条知识点结构完整（title/fact/correct/basis/level）`);

console.log('\n=== 3. 规范依据可核查性 ===');
const STD_RE = /(GB\s*\/?\s*T?\s*\d{4,5}|GBJ|TSG|法规|办法|规定|规范|指南|导则)/;
let noStd = [];
Object.keys(KNOWLEDGE).forEach((k) => {
  const has = (KNOWLEDGE[k].basis || []).some((b) => STD_RE.test(b));
  if (!has) noStd.push(k);
});
if (noStd.length) {
  noStd.forEach((k) => warn(`${k} 的依据中未识别到标准号或文件名`));
  ok(`${kCount - noStd.length}/${kCount} 条含可识别的标准号或规范文件名`);
} else {
  ok(`${kCount} 条依据全部含标准号或规范文件名`);
}

console.log('\n=== 4. 关卡引用完整性 ===');
let refBad = 0;
LEVELS.forEach((lv) => {
  const slotIds = lv.slots.map((s) => s.id);
  const slotSet = new Set(slotIds);

  if (new Set(slotIds).size !== slotIds.length) { err(`第 ${lv.id} 关容器 id 重复`); refBad++; }

  lv.slots.forEach((s) => {
    if (!s.name || !s.hint) { err(`第 ${lv.id} 关容器 ${s.id} 缺 name/hint`); refBad++; }
  });

  const names = lv.items.map((i) => i.name);
  if (new Set(names).size !== names.length) { err(`第 ${lv.id} 关项目名称重复`); refBad++; }

  lv.items.forEach((it) => {
    if (!slotSet.has(it.slot)) { err(`第 ${lv.id} 关「${it.name}」指向不存在的容器 ${it.slot}`); refBad++; }
    if (!it.k || !KNOWLEDGE[it.k]) { err(`第 ${lv.id} 关「${it.name}」引用了不存在的知识点 ${it.k}`); refBad++; }
  });

  lv.traps.forEach((t, i) => {
    if (!names.includes(t.a)) { err(`第 ${lv.id} 关陷阱${i + 1} 的 a「${t.a}」不在本关项目中`); refBad++; }
    if (!names.includes(t.b)) { err(`第 ${lv.id} 关陷阱${i + 1} 的 b「${t.b}」不在本关项目中`); refBad++; }
    if (t.a === t.b) { err(`第 ${lv.id} 关陷阱${i + 1} a 与 b 相同`); refBad++; }
    if (!KNOWLEDGE[t.k]) { err(`第 ${lv.id} 关陷阱${i + 1} 知识点 ${t.k} 不存在`); refBad++; }
  });
});
if (!refBad) ok('全部关卡的容器引用、项目引用、陷阱引用均有效');

console.log('\n=== 5. 情境题 ===');
let scBad = 0;
SCENARIOS.forEach((s) => {
  if (s.opts.length !== 4) { err(`第 ${s.lv} 关情境题选项数应为 4，实际 ${s.opts.length}`); scBad++; }
  if (typeof s.ans !== 'number' || s.ans < 0 || s.ans > 3) { err(`第 ${s.lv} 关情境题 ans 越界：${s.ans}`); scBad++; }
  if (!s.why || s.why.length !== 4) { err(`第 ${s.lv} 关情境题解析数应为 4，实际 ${s.why ? s.why.length : 0}`); scBad++; }
  if (!KNOWLEDGE[s.k]) { err(`第 ${s.lv} 关情境题知识点 ${s.k} 不存在`); scBad++; }
  if (!s.scene || !s.q) { err(`第 ${s.lv} 关情境题缺 scene 或 q`); scBad++; }
  // 答案下标必须对应"正确"而非"错误"的解析
  if (s.why && s.why[s.ans] && !/正确|稳妥|应|必须|依据/.test(s.why[s.ans])) {
    warn(`第 ${s.lv} 关情境题：ans 下标对应的解析未包含肯定表述，请人工确认`);
  }
});
if (!scBad) ok(`${SCENARIOS.length} 道情境题结构与引用均有效`);

console.log('\n=== 6. 配伍实验 ===');
let rxBad = 0;
const OUTCOMES = ['danger', 'caution', 'safe'];
REACTIONS.forEach((r) => {
  if (!OUTCOMES.includes(r.outcome)) { err(`第 ${r.lv} 关配伍实验 outcome 非法：${r.outcome}`); rxBad++; }
  if (!OUTCOME_OPTIONS.includes(r.result)) { err(`第 ${r.lv} 关配伍实验 result 不在 OUTCOME_OPTIONS 中：${r.result}`); rxBad++; }
  if (r.expect !== r.result) { err(`第 ${r.lv} 关配伍实验 expect 与 result 不一致`); rxBad++; }
  if (!KNOWLEDGE[r.k]) { err(`第 ${r.lv} 关配伍实验知识点 ${r.k} 不存在`); rxBad++; }
  ['a', 'b', 'describe', 'why'].forEach((f) => {
    if (!r[f]) { err(`第 ${r.lv} 关配伍实验缺字段 ${f}`); rxBad++; }
  });
  if (r.a === r.b) { err(`第 ${r.lv} 关配伍实验两物质相同`); rxBad++; }
});
if (!rxBad) ok(`${REACTIONS.length} 个配伍实验结构与引用均有效`);

console.log('\n=== 7. 知识点编号与关卡对应 ===');
let numBad = 0;
LEVELS.forEach((lv) => {
  const prefix = 'L' + lv.id + '_';
  lv.items.forEach((it) => {
    if (!it.k.startsWith(prefix)) { err(`第 ${lv.id} 关「${it.name}」的知识点 ${it.k} 与关卡编号不一致`); numBad++; }
  });
  lv.traps.forEach((t) => {
    if (!t.k.startsWith(prefix)) { err(`第 ${lv.id} 关陷阱知识点 ${t.k} 与关卡编号不一致`); numBad++; }
  });
});
if (!numBad) ok('全部知识点编号与所属关卡一致');

console.log('\n=== 8. 颜色不作判定依据 ===');
// 危险废物颜色标准各地不统一，不应作为唯一判定依据出现在 correct 里
let colorBad = [];
Object.keys(KNOWLEDGE).forEach((k) => {
  const c = KNOWLEDGE[k];
  const t = (c.title + c.fact + c.correct);
  if (/颜色/.test(t) && !/不以颜色|颜色标准|不一致|以所在单位|以本单位|地区差异|不作判定/.test(t)) {
    colorBad.push(k);
  }
});
if (colorBad.length) {
  colorBad.forEach((k) => warn(`${k} 提到颜色但未声明地区差异，需人工确认`));
  ok(`提及颜色的 ${colorBad.length} 条已单独标注或需人工复核`);
} else {
  ok('涉及颜色的条目均已声明地区差异或不作判定依据');
}

console.log('\n=== 9. 文件结构 ===');
const need = [
  '02_源代码/src/index.html',
  '02_源代码/src/css/style.css',
  '02_源代码/src/js/game.js',
  '02_源代码/src/data/knowledge.js',
  '01_可执行文件/实验室安全官.html',
  '01_可执行文件/实验室安全官.exe',
  '01_可执行文件/启动游戏.bat',
  '04_配置文件/levels.json',
  'build/build_single.py',
  'build/verify.js',
  'build/audit_basis.js',
  'build/gen_basis_doc.js',
  'build/gen_levels_json.js',
  'build/make_exe.py',
  'build/e2e.js',
  'docs/index.html',
  'docs/.nojekyll',
  '05_说明文档/作品说明.md',
  '05_说明文档/知识点与规范依据清单.md',
  '05_说明文档/运行说明.md',
  '05_说明文档/GitHub部署指南.md',
  '05_说明文档/环境与清理记录.md',
  'README.md',
  '00_设计方案_增强版.md'
];
let fileBad = 0;
need.forEach((f) => {
  if (!fs.existsSync(path.join(ROOT, f))) { err(`缺少文件：${f}`); fileBad++; }
});
if (!fileBad) ok(`${need.length} 个必需文件齐备`);

const assets = fs.readdirSync(path.join(SRC, 'assets')).filter((f) => f.endsWith('.webp'));
const needImg = LEVELS.map((l) => l.image).concat(['cover_lab.webp', 'ending_pass.webp']);
const missImg = needImg.filter((i) => !assets.includes(i));
if (missImg.length) { err('缺少插画：' + missImg.join(', ')); }
else ok(`${assets.length} 张插画齐备，命名与关卡配置一致`);

console.log('\n=== 10. JS 语法检查 ===');
const gameJs = fs.readFileSync(path.join(SRC, 'js', 'game.js'), 'utf8');
try {
  new Function(gameJs);
  ok('game.js 语法正确');
} catch (e) {
  err('game.js 语法错误：' + e.message);
}

const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
['lvCount', 'kCount', 'scCount', 'expertBadge', 'riskDots', 'manualProg', 'manualBar']
  .forEach((id) => {
    if (!html.includes(`id="${id}"`)) err(`index.html 缺少元素 id="${id}"`);
  });
const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
const jsIds = [...gameJs.matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]);
const missing = [...new Set(jsIds)].filter((i) => !ids.includes(i));
if (missing.length) err('game.js 引用了不存在的元素：' + missing.join(', '));
else ok(`game.js 引用的 ${new Set(jsIds).size} 个元素 id 均存在于 HTML`);

/* ---------- 11. 依据可核查性 ---------- */
console.log('\n=== 11. 依据可核查性 ===');
const BASIS_STD = /((?:GB|DB\d+|TSG|TBG|JJG|HJ|HG)\s?\/?\s?[A-Z]?\s?[\d.]+)/;
const BASIS_LAW = /《|国务院令|教育部|中华人民共和国|条例|办法/;
let basisTotal = 0, stdCnt = 0, lawCnt = 0;
const noSource = [];
for (const [key, kp] of Object.entries(KNOWLEDGE)) {
  for (const b of kp.basis || []) {
    basisTotal += 1;
    if (BASIS_STD.test(b)) stdCnt += 1;
    else if (BASIS_LAW.test(b)) lawCnt += 1;
    else noSource.push(key + '：' + b.slice(0, 30));
  }
}
if (noSource.length) {
  err('以下依据无法核查到标准编号或法规名称：\n     ' + [...new Set(noSource)].join('\n     '));
} else {
  ok(`全部 ${basisTotal} 条依据均可核查（标准类 ${stdCnt} 条，法规类 ${lawCnt} 条，无不可核查项）`);
}

/* ---------- 12. 标准编号与名称对应 ---------- */
// 已知易错点：编号与标准名称必须一致，防止引用错配
const NAME_PAIRS = [
  ['GB/T13869-2017', '用电安全导则'],
  ['GB/T31190-2014', '实验室废弃化学品收集技术规范'],
  ['GB18597-2023', '危险废物贮存污染控制标准'],
  ['GB/T7144-2016', '气瓶颜色标志'],
  ['GB/T4968-2008', '火灾分类'],
  ['GB/T16483-2008', '化学品安全技术说明书'],
  ['TSG23-2021', '气瓶安全技术规程'],
  ['TSG07-2019', '特种设备生产和充装单位许可规则'],
  ['TSG08-2017', '特种设备使用管理规则'],
  ['DB11/T1368-2016', '实验室危险废物污染防治技术规范']
];
/**
 * 校验标准编号与名称是否对应。
 *
 * 源文件中的标准号写法不统一（"GB/T 31190-2014"与 "GB18597-2023" 混用），
 * 因此先剥掉书名号以外的所有空白字符再比对，避免正则转义带来的歧义。
 */
let nameBad = 0;
const rawData = fs.readFileSync(path.join(ROOT, '02_源代码', 'src', 'data', 'knowledge.js'), 'utf8');

/** 归一化标准号：去掉全部空白，使 "GB/T 13869-2017" 与 "GB/T13869-2017" 视为同一个 */
const norm = s => s.replace(/\s+/g, '');

const pairDetail = [];
for (const [code, name] of NAME_PAIRS) {
  // 抽出源文件中所有「标准号 + 书名号」片段，书名号内为标准名称
  const refs = [];
  // 标准号中可含字母、数字、斜杠、点、空格。
  // 源文件为 CRLF 换行，故字符类中排除 \r\n，防止匹配跨行。
  const refRe = /([A-Z][A-Z0-9/. \t-]{1,30}?)\s*《([^》]{2,40})》/g;
  let m;
  while ((m = refRe.exec(rawData)) !== null) {
    refs.push({ no: norm(m[1]), name: m[2] });
  }
  const mine = refs.filter(r => r.no === norm(code));
  if (!mine.length) {
    warn(`${code} 未在数据中检索到，若已不再引用可忽略`);
  } else {
    const wrong = mine.filter(r => !r.name.includes(name));
    if (wrong.length) {
      err(`${code} 的标准名称不符，期望含「${name}」，实际为「${[...new Set(wrong.map(w => w.name))].join('、')}」`);
      nameBad += 1;
    } else {
      pairDetail.push(`${code}《${name}》　引用 ${mine.length} 处`);
    }
  }
}
if (pairDetail.length) {
  ok(`易错标准编号与名称对应正确（共校验 ${pairDetail.length} 项）：`);
  pairDetail.forEach(d => console.log('· ' + d));
}

/* ---------- 13. 文档与数据规模一致 ---------- */
console.log('\n=== 13. 文档与数据规模一致 ===');
const docPath = path.join(ROOT, '05_说明文档', '知识点与规范依据清单.md');
if (fs.existsSync(docPath)) {
  const doc = fs.readFileSync(docPath, 'utf8');
  const docCount = Object.keys(KNOWLEDGE).length;
  // 生成脚本的表述为「共 N 条」，避免匹配到依据条目里的数字
  const m = doc.match(/全部安全知识点，共\s*(\d+)\s*条/);
  if (m && Number(m[1]) !== docCount) {
    err(`依据清单声明 ${m[1]} 条，实际数据 ${docCount} 条，请运行 node build/gen_basis_doc.js`);
  } else if (!m) {
    warn('依据清单首句未找到条目数声明，无法自动核对规模');
  } else {
    ok(`依据清单声明的条目数与数据一致（${docCount} 条）`);
  }
  const lvCount = LEVELS.length;
  if (!doc.includes('第 ' + lvCount + ' 关')) {
    warn(`依据清单中未找到第 ${lvCount} 关标题，请确认是否已重新生成`);
  }
} else {
  err('依据清单缺失');
}

const cfgPath = path.join(ROOT, '04_配置文件', 'levels.json');
if (fs.existsSync(cfgPath)) {
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  if (cfg.counts.knowledgePoints !== Object.keys(KNOWLEDGE).length ||
      cfg.counts.levels !== LEVELS.length) {
    err(`levels.json 规模为 ${cfg.counts.levels} 关 / ${cfg.counts.knowledgePoints} 条，` +
        `实际为 ${LEVELS.length} 关 / ${Object.keys(KNOWLEDGE).length} 条，请运行 node build/gen_levels_json.js`);
  } else {
    ok(`levels.json 与数据一致（${cfg.counts.levels} 关 / ${cfg.counts.knowledgePoints} 条）`);
  }
} else {
  err('levels.json 缺失');
}

/* ---------- 汇总 ---------- */
console.log('\n' + '='.repeat(46));
if (warns.length) {
  console.log(`提示 ${warns.length} 条（不阻断构建，建议人工确认）：`);
  warns.forEach((w) => console.log('  · ' + w));
}
if (errors.length) {
  console.log(`\n发现 ${errors.length} 个错误：`);
  errors.forEach((e) => console.log('  ✗ ' + e));
  process.exit(1);
}
console.log('自检全部通过。');
