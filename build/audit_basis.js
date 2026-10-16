/**
 * 依据可核查性检查：区分「标准类」「法律法规类」「无出处」三类。
 * 运行：node build/audit_basis.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', '02_源代码', 'src', 'data', 'knowledge.js');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(SRC, 'utf8') + ';globalThis.__O={KNOWLEDGE};', ctx);
const K = ctx.__O.KNOWLEDGE;

const STD = /((?:GB|DB\d+|TSG|TBG|JJG|HJ|HG)\s?\/?\s?[A-Z]?\s?[\d.]+[\d.]*)/;
const LAW = /《|国务院令|教育部|中华人民共和国|修订\)|条例|办法|规定|法》/;

let total = 0, withStd = 0, lawOnly = 0;
const noSrc = [];

for (const [k, v] of Object.entries(K)) {
  for (const b of (v.basis || [])) {
    total += 1;
    if (STD.test(b)) withStd += 1;
    else if (LAW.test(b)) lawOnly += 1;
    else noSrc.push(k + '  |  ' + b);
  }
}

console.log('知识点 ' + Object.keys(K).length + '条');
console.log('依据 ' + total + ' 条：标准类 ' + withStd + '，法律法规类 ' + lawOnly + '，无出处 ' + noSrc.length);
if (noSrc.length) {
  console.log('--- 仍无出处，需人工补核---');
  [...new Set(noSrc)].forEach(s => console.log('  ' + s));
  process.exitCode = 1;
} else {
  console.log('[ok] 全部依据均可核查到标准编号或法规名称');
}
