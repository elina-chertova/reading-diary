// Уменьшает шрифт иконок Tabler до реально используемых в приложении.
// Запуск: node tools/build-icons-codes.mjs  (печатает codepoints), затем pyftsubset.
// Проще — скрипт tools/subset-icons.sh, который делает всё целиком.
// Здесь — только генерация минимального CSS и списка codepoints из оригинала.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

// собрать используемые ti-классы из js/ и index.html
function walk(dir) {
  let files = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) files = files.concat(walk(p));
    else if (/\.(js|html)$/.test(f)) files.push(p);
  }
  return files;
}
const sources = [...walk(join(root, 'js')), join(root, 'index.html')];
const used = new Set();
for (const f of sources) {
  const m = readFileSync(f, 'utf8').match(/ti-[a-z0-9-]+/g) || [];
  m.forEach((c) => { if (c !== 'ti-icons') used.add(c); });
}

const cssOrig = readFileSync(join(root, 'fonts/tabler-icons.css.orig'), 'utf8');
const firstIcon = cssOrig.search(/\.ti-[a-z0-9-]+:before\{/);
const base = cssOrig.slice(0, firstIcon);
let rules = '', codes = [];
for (const name of [...used].sort()) {
  const m = cssOrig.match(new RegExp('\\.' + name + ':before\\{content:"\\\\([0-9a-fA-F]+)"\\}'));
  if (m) { rules += `.${name}:before{content:"\\${m[1]}"}`; codes.push(m[1]); }
}
writeFileSync(join(root, 'fonts/tabler-icons.css'), base + rules);
writeFileSync('/tmp/ti-codes.txt', codes.join(','));
console.log(`Иконок: ${codes.length}; минимальный CSS записан. Codepoints в /tmp/ti-codes.txt`);
