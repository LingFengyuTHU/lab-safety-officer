/**
 * 从运行时数据源生成《知识点与规范依据清单.md》
 *
 * 目的：清单与游戏内数据严格同源，避免人工誊抄导致的条目缺失或依据错漏。
 * 运行：node build/gen_basis_doc.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, '02_源代码', 'src', 'data', 'knowledge.js');
const OUT = path.join(ROOT, '05_说明文档', '知识点与规范依据清单.md');

/* 在独立上下文中执行数据文件，取出四个导出 */
const code = fs.readFileSync(SRC, 'utf8');
const ctx = { window: {}, document: {} };
vm.createContext(ctx);
vm.runInContext(code + '\n;globalThis.__OUT = { KNOWLEDGE, LEVELS, SCENARIOS, REACTIONS, OUTCOME_OPTIONS };', ctx);
const { KNOWLEDGE, LEVELS, SCENARIOS, REACTIONS } = ctx.__OUT;

/* ---------- 关卡分组：按知识点 key 前缀 L1..L6 ---------- */
const TYPE_LABEL = {
  danger: '违规·危险',
  warn: '常见错误',
  ok: '正确做法',
  info: '地区差异·不作判定依据'
};

/* 归位项目与配伍实验引用的知识点都算"本关涉及" */
function keysOfLevel(lv) {
  const set = new Set();
  lv.items.forEach(it => set.add(it.k));
  (lv.traps || []).forEach(t => set.add(t.k));
  return set;
}

const lines = [];
const w = s => lines.push(s);

w('# 知识点与规范依据清单');
w('');
w('本清单列出《实验室安全官》2.0 中出现的全部安全知识点，共 ' +
  Object.keys(KNOWLEDGE).length +
  ' 条，按关卡分组。每条列出知识点原文、判定依据、正确做法，另附各关的配伍实验与情境决策及其依据。');
w('');
w('本清单由 `build/gen_basis_doc.js` 从游戏运行时数据源 `02_源代码/src/data/knowledge.js` 直接导出，与游戏内显示内容同源，不存在誊抄差异。');
w('');
w('## 使用方式');
w('');
w('1. 依据栏所列标准编号与条款号，可在国家标准全文公开系统、全国标准信息公共服务平台或相应行业主管部门官网检索原文核对。');
w('2. 判定依据分两类：一类是强制性或推荐性国家标准的具体条款，一类是法律法规与部门规章的条文。前者可核查条文原文，后者可核查法规名称与发布文号。');
w('3. 标注为「地区差异·不作判定依据」的条目，在游戏中不作为得分判定条件，仅作提示。这类条目在不同地区、不同高校的规定不一致，作品不对其作对错判断。');
w('4. 涉及救援、灭火、触电处置等条目的内容为教学用途，实际事故处置应立即拨打急救电话并服从现场指挥。');
w('');

/* ---------- 按知识点编号前缀 L1..L6 分组，全量列出 ---------- */
const usedKeys = new Set();
LEVELS.forEach(lv => keysOfLevel(lv).forEach(k => usedKeys.add(k)));

const groups = new Map(); // 'L1' -> [key, ...]
for (const key of Object.keys(KNOWLEDGE)) {
  const g = key.split('_')[0];
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(key);
}
const groupOrder = [...groups.keys()].sort();

let idx = 0;
groupOrder.forEach(g => {
  const lv = LEVELS.find(l => l.id === Number(g.slice(1)));
  const keys = groups.get(g);

  w('---');
  w('');
  w(`## ${g.toUpperCase()} 组 · 第 ${lv ? lv.id : '?'} 关 ${lv ? lv.name : ''}`);
  w('');
  w(`> ${lv ? lv.subtitle : ''}`);
  w('');
  w(`本组知识点 ${keys.length} 条。${
    lv ? `本关归位项目 ${lv.items.length} 项，配伍实验 ${REACTIONS.filter(r => r.lv === lv.id).length} 组，情境决策 1 题。` : ''
  }`);
  if (lv) {
    w('');
    w(`关卡设定：${lv.slots.length} 个存放位置——` +
      lv.slots.map(s => `${s.name}（${s.hint}）`).join('；') + '。');
  }
  w('');

  keys.forEach(key => {
    const kp = KNOWLEDGE[key];
    idx += 1;
    w(`### ${idx}. ${kp.title}`);
    w('');
    w(`- **判定类型**：${TYPE_LABEL[kp.level] || kp.level}　**内部编号**：\`${key}\`${
      usedKeys.has(key) ? '' : '　**说明**：本条为知识卡补充条目，不作为归位判定项'
    }`);
    w(`- **知识点原文**：${kp.fact}`);
    if (kp.equation) w(`- **反应方程式**：${kp.equation}`);
    w('- **判定依据**：');
    (kp.basis || []).forEach(b => w(`  - ${b}`));
    w(`- **正确做法**：${kp.correct}`);
    w('');
  });

  /* 配伍实验 */
  if (!lv) return;
  const rxs = REACTIONS.filter(r => r.lv === lv.id);
  rxs.forEach(r => {
    w(`### 本关配伍实验 · ${r.a} ＋ ${r.b}`);
    w('');
    w(`- **玩家预测**：${r.expect}　**实际结果**：${r.result}　**性质**：${
      { danger: '危险', caution: '需注意', safe: '安全' }[r.outcome] || r.outcome
    }`);
    w(`- **现象描述**：${r.describe}`);
    w(`- **原理说明**：${r.why}`);
    w(`- **关联知识点**：${KNOWLEDGE[r.k] ? KNOWLEDGE[r.k].title : '（无）'}（编号 \`${r.k}\`）`);
    w(`- **判定依据**：`);
    (KNOWLEDGE[r.k] ? KNOWLEDGE[r.k].basis : []).forEach(b => w(`  - ${b}`));
    w('');
  });

  /* 情境决策 */
  const sc = SCENARIOS.find(s => s.lv === lv.id);
  if (sc) {
    w(`### 本关情境决策`);
    w('');
    w(`**情境**：${sc.scene}`);
    w('');
    w(`**问题**：${sc.q}`);
    w('');
    w('**四个选项与逐项分析**：');
    w('');
    sc.opts.forEach((o, i) => {
      w(`${i + 1}. ${o}${i === sc.ans ? '　←　**正确选项**' : ''}`);
      w(`   - ${sc.why[i]}`);
    });
    w('');
    w(`- **关联知识点**：${KNOWLEDGE[sc.k] ? KNOWLEDGE[sc.k].title : ''}（编号 \`${sc.k}\`）`);
    w(`- **判定依据**：`);
    (KNOWLEDGE[sc.k] ? KNOWLEDGE[sc.k].basis : []).forEach(b => w(`  - ${b}`));
    w('');
  }
});

/* ---------- 附：规范索引 ---------- */
w('---');
w('');
w('## 附：引用的规范与文件索引');
w('');
w('下表按标准编号排序，列出本作品引用的全部规范文件及其引用次数，便于核查时逐项对照。');
w('');

const stdMap = new Map();
const lawMap = new Map();
for (const key of Object.keys(KNOWLEDGE)) {
  const kp = KNOWLEDGE[key];
  for (const b of kp.basis || []) {
    const m = b.match(/((?:GB|DB\d+\/T|TBG|TSG|JJG|HJ|HG)\s?[A-Z]?[\d.\/—\-]+)/);
    if (m) {
      const sk = m[1].replace(/\s+/g, '').replace(/[。，；]$/, '');
      if (!stdMap.has(sk)) stdMap.set(sk, new Set());
      stdMap.get(sk).add(key);
    } else {
      const lm = b.match(/《[^》]+》/);
      const lk = lm ? lm[0] : b.replace(/[：:].*$/, '').slice(0, 30);
      if (!lawMap.has(lk)) lawMap.set(lk, new Set());
      lawMap.get(lk).add(key);
    }
  }
}

const sorted = [...stdMap.keys()].sort((a, b) => {
  const na = a.replace(/[^0-9.]/g, ''), nb = b.replace(/[^0-9.]/g, '');
  return na.localeCompare(nb, 'en', { numeric: true });
});

w('| 标准编号 | 标准名称 | 引用条目数 |');
w('| --- | --- | --- |');
for (const k of sorted) {
  const m = k.match(/^([A-Z\/]+)\s?([\d.]+)/);
  const name = nameOf(k);
  w(`| ${k} | ${name} | ${stdMap.get(k).size} |`);
}
w('');
w('完整名称与现行状态：');
w('');
for (const k of sorted) {
  w(`- **${k}**　${nameOf(k)}　—　涉及 ${stdMap.get(k).size} 条知识点`);
}
w('');

function nameOf(k) {
  const table = {
    'GB15603-2022': '《危险化学品仓库储存通则》',
    'GB/T16483-2008': '《化学品安全技术说明书 内容和项目顺序》',
    'GB/T4968-2008': '《火灾分类》',
    'GB30000.1-2024': '《化学品分类和标签规范 第1部分：通则》',
    'GB/T13869-2017': '《用电安全导则》',
    'GB/T31190-2014': '《实验室废弃化学品收集技术规范》',
    'GB18597-2023': '《危险废物贮存污染控制标准》',
    'GB/T7144-2016': '《气瓶颜色标志》',
    'GB39800.1-2020': '《个体防护装备配备规范 第1部分：总则》',
    'GB50054-2011': '《低压配电设计规范》',
    'GB50140-2005': '《泡沫灭火系统技术规范》',
    'GB50444-2008': '《建筑灭火器配置验收及检查规范》',
    'GB51309-2018': '《消防应急照明和疏散指示系统技术标准》',
    'GB55037-2022': '《建筑防火通用规范》',
    'GB50016': '《建筑设计防火规范》',
    'GB/T29639-2020': '《生产经营单位生产安全事故应急预案编制导则》',
    'TSG23-2021': '《气瓶安全技术规程》',
    'TSG07-2019': '《特种设备生产和充装单位许可规则》',
    'TSG08-2017': '《特种设备使用管理规则》',
    'DB11/T1368-2016': '《实验室危险废物污染防治技术规范》（北京市地方标准）'
  };
  return table[k] || '（见条目内引用说明）';
}

/* 法律法规与部门规章索引 */
w('### 法律法规与部门规章');
w('');
w('下表列出本作品引用的法律、行政法规与部门规章。此类依据不含标准编号，按法规全称与发布文号核查。');
w('');
w('| 法规文件 | 引用条目数 |');
w('| --- | --- |');
const lawSorted = [...lawMap.keys()].sort((a, b) => lawMap.get(b).size - lawMap.get(a).size);
for (const k of lawSorted) {
  w(`| ${k} | ${lawMap.get(k).size} |`);
}
w('');
w('其中地方性文件已注明发布地区：');
w('');
for (const k of lawSorted) {
  if (/北京|湖南|江苏|广东省|地方/.test(k)) {
    w(`- **${k}**　—　涉及 ${lawMap.get(k).size} 条知识点，属地方规定，不作为全国统一要求`);
  }
}
w('');

w('---');
w('');
w('## 核查方式');
w('');
w('本作品依据的可核查性约定如下：');
w('');
w('1. **依据总数与构成**。全部 ' + allBasisLen() + ' 条依据中，' + stdMapTotal() +
  ' 条给出标准编号与年号，' + lawMapTotal() + ' 条为法律、行政法规或部门规章并给出法规全称与发布文号，无一条使用「有关规定」「按惯例」这类无法核查的表述。');
w('2. **已替代标准不引用**。核查确认 GB 13690-2009《化学品分类和危险性公示 通则》已于 2025-08-01 废止，由 GB 30000.1-2024《化学品分类和标签规范 第1部分：通则》全部代替。本作品的判定依据不涉及化学品分类公示的具体条款，故未引用该系列标准；如需扩展标签与分类相关内容，应引用 GB 30000.1-2024 而非已废止的 GB 13690-2009。气瓶管理按TSG 23-2021《气瓶安全技术规程》引用，不再引用已废止的原《气瓶安全监察规程》。');
w('3. **标准名称与编号一一对应**。核查中修正过两处编号与名称错配：GB/T 13869-2017 的标准名称为《用电安全导则》，并非实验室废物管理文件；TSG07-2019 的标准名称为《特种设备生产和充装单位许可规则》，《特种设备使用管理规则》的编号是 TSG 08-2017。实验室废弃化学品的收集贮存依据改引 GB/T 31190-2014《实验室废弃化学品收集技术规范》与 GB 18597-2023《危险废物贮存污染控制标准》。');
w('4. **可自动复核**。`build/verify.js` 第 11、12 项检查会对全部依据做可核查性审计，并将 9 个易错标准编号与名称逐一比对，新增或修改依据后重跑该脚本即可确认无误。');
w('5. **地方标准与地方指南标注归属**。凡引用地方标准或地方指南的条目，均写明发布地区与文号（北京市 DB11/T 1368-2016、湖南省湘环发〔2021〕12 号、江苏省实验室危险废物环境管理指南），不将地方要求表述为全国统一要求。');
w('6. **不作判定依据的条目单独标注**。地区规定不一致的内容（如废液容器颜色）标注为「地区差异·不作判定依据」，游戏中不计分、不判错，仅展示提示并说明应以所在单位规定为准。');
w('7. **内容与游戏内显示一致**。本清单由 `build/gen_basis_doc.js` 从运行时数据源 `02_源代码/src/data/knowledge.js` 导出，与知识手册、情境解析、配伍实验原理说明中显示的文本同源。');
w('');

function allBasisLen() {
  let n = 0;
  for (const key of Object.keys(KNOWLEDGE)) n += (KNOWLEDGE[key].basis || []).length;
  return n;
}
function stdMapTotal() {
  let n = 0;
  for (const s of stdMap.values()) n += 0;
  let c = 0;
  for (const key of Object.keys(KNOWLEDGE)) {
    for (const b of KNOWLEDGE[key].basis || []) {
      if (/((?:GB|DB\d+\/T|TBG|TSG|JJG|HJ|HG)\s?[A-Z]?[\d.\/—\-]+)/.test(b)) c += 1;
    }
  }
  return c;
}
function lawMapTotal() {
  let c = 0;
  for (const key of Object.keys(KNOWLEDGE)) {
    for (const b of KNOWLEDGE[key].basis || []) {
      if (!/((?:GB|DB\d+\/T|TBG|TSG|JJG|HJ|HG)\s?[A-Z]?[\d.\/—\-]+)/.test(b)) c += 1;
    }
  }
  return c;
}

fs.writeFileSync(OUT, lines.join('\n'), 'utf8');

/* 统计输出 */
const allBasis = [];
for (const key of Object.keys(KNOWLEDGE)) {
  (KNOWLEDGE[key].basis || []).forEach(b => allBasis.push(b));
}
const withStd = allBasis.filter(b => /((?:GB|DB|TSG|TBG|JJG|HJ)\s?[A-Z]?[\d.\/]+)/.test(b));
const uniq = new Set(allBasis);

console.log('[ok] 已生成：' + OUT);
console.log('     知识点 ' + Object.keys(KNOWLEDGE).length + ' 条（全量列出）');
console.log('     其中归位判定引用 ' + usedKeys.size + ' 条，知识卡补充 ' +
  (Object.keys(KNOWLEDGE).length - usedKeys.size) + ' 条');
console.log('     依据条目 ' + allBasis.length + ' 条，去重后 ' + uniq.size + ' 条');
console.log('     含标准编号 ' + withStd.length + ' 条（' + Math.round(withStd.length / allBasis.length * 100) + '%）');
console.log('     规范索引 ' + sorted.length + ' 项');
