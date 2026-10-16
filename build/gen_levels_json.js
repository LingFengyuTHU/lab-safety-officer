/**
 * 从运行时数据源导出 04_配置文件/levels.json
 *
 * 目的：配置文件供评审查阅玩法结构，必须与游戏实际运行的数据一致。
 * 运行：node build/gen_levels_json.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, '02_源代码', 'src', 'data', 'knowledge.js');
const OUT = path.join(ROOT, '04_配置文件', 'levels.json');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(SRC, 'utf8') +
  ';globalThis.__O={KNOWLEDGE,LEVELS,SCENARIOS,REACTIONS,OUTCOME_OPTIONS};', ctx);
const { KNOWLEDGE, LEVELS, SCENARIOS, REACTIONS, OUTCOME_OPTIONS } = ctx.__O;

const TYPE_LABEL = {
  danger: '违规·危险',
  warn: '常见错误',
  ok: '正确做法',
  info: '地区差异·不作判定依据'
};

const cfg = {
  game: '实验室安全官',
  version: '2.0.0',
  note:
    '本文件由 build/gen_levels_json.js 从运行时数据源 02_源代码/src/data/knowledge.js 导出，' +
    '供评审查阅玩法结构。游戏运行时不读取本文件，直接读取数据源，两者内容一致。',
  scoring: {
    timePerLevel: 100,
    scoreCorrect: 10,
    scoreScenario: 15,
    scoreReaction: 8,
    comboBonus: 2,
    comboMax: 5,
    expertFrom: 5,
    expertBonus: 3,
    riskWrong: 1,
    riskTrap: 3,
    riskScenario: 2,
    riskMax: 5,
    comment:
      '隐患值机制替代直接扣分：归位错误 +1，触发配伍禁忌 +3，情境决策错误 +2，' +
      '累计至5 格本关重来。错误有实际代价，但不立即结束游戏。'
  },
  gameFlow: ['归位排查', '配伍禁忌实验', '情境决策'],
  counts: {
    levels: LEVELS.length,
    knowledgePoints: Object.keys(KNOWLEDGE).length,
    scenarios: SCENARIOS.length,
    reactions: REACTIONS.length,
    outcomeOptions: OUTCOME_OPTIONS
  },
  levels: LEVELS.map(lv => {
    const sc = SCENARIOS.find(s => s.lv === lv.id);
    const rxs = REACTIONS.filter(r => r.lv === lv.id);
    return {
      id: lv.id,
      name: lv.name,
      subtitle: lv.subtitle,
      image: lv.image,
      slots: lv.slots,
      itemCount: lv.items.length,
      items: lv.items,
      trapCount: (lv.traps || []).length,
      traps: (lv.traps || []).map(t => ({ a: t.a, b: t.b, knowledge: t.k })),
      reaction: rxs.map(r => ({
        a: r.a, b: r.b, outcome: r.outcome, expect: r.expect,
        result: r.result, describe: r.describe, why: r.why, knowledge: r.k
      })),
      scenario: sc ? {
        scene: sc.scene, question: sc.q, answer: sc.ans,
        options: sc.opts, analysis: sc.why, knowledge: sc.k
      } : null
    };
  }),
  knowledgeIndex: Object.entries(KNOWLEDGE).map(([k, v]) => ({
    id: k,
    group: k.split('_')[0].toUpperCase(),
    title: v.title,
    type: TYPE_LABEL[v.level] || v.level,
    equation: v.equation || null,
    basisCount: (v.basis || []).length
  }))
};

fs.writeFileSync(OUT, JSON.stringify(cfg, null, 2), 'utf8');

const size = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log('[ok] 已生成：' + OUT);
console.log('关卡 ' + cfg.counts.levels + '　知识点 ' + cfg.counts.knowledgePoints +
  '　情境题 ' + cfg.counts.scenarios + '　配伍实验 ' + cfg.counts.reactions);
console.log('体积 ' + size + ' KB');
