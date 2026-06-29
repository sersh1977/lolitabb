const fs = require('fs');
let h = fs.readFileSync('public/index.html', 'utf8');
let count = 0;
// Fix $${ -> ${ in template literals
h = h.replace(/\$\$\{fmtMoney\(/g, () => { count++; return '${fmtMoney('; });
fs.writeFileSync('public/index.html', h, 'utf8');
console.log('Dobles $ corregidos:', count);
console.log('Dobles $ restantes:', (h.match(/\$\$\{fmtMoney\(/g)||[]).length);
