// scripts/hash-password.js
// Uso: node scripts/hash-password.js tuContraseña
const crypto = require('crypto');
const pass = process.argv[2];
if (!pass) { console.error('Uso: node scripts/hash-password.js <contraseña>'); process.exit(1); }
const hash = crypto.createHash('sha256').update(pass).digest('hex');
console.log('Hash SHA-256:', hash);
console.log('\nPegalo en data.json así:');
console.log(`  "password": "${hash}",`);
console.log('  "hashed": true');
