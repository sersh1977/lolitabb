const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const https = require('https');

const PORT      = process.env.PORT || 3000;
const PUBLIC    = path.join(__dirname, 'public');
const BACKUP_DIR= path.join(__dirname, 'backups');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TABLE = 'app_data';

function supabaseRequest(method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${TABLE}`);
    if (method === 'GET') url.searchParams.set('select', '*');
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : '',
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function leerDB() {
  try {
    const r = await supabaseRequest('GET');
    if (r.status !== 200 || !r.body || !r.body.length) return null;
    const data = r.body[0].data;
    if (!data.users || !Array.isArray(data.ingresos) || !Array.isArray(data.gastos)) return null;
    return data;
  } catch(e) {
    console.error('Error leyendo Supabase:', e.message);
    return null;
  }
}

async function escribirDB(data) {
  try {
    if (!data.users || !Array.isArray(data.ingresos) || !Array.isArray(data.gastos)) return false;
    const r = await supabaseRequest('POST', { id: 1, data, updated_at: new Date().toISOString() });
    return r.status >= 200 && r.status < 300;
  } catch(e) {
    console.error('Error escribiendo Supabase:', e.message);
    return false;
  }
}

async function backupDiario() {
  try {
    const db = await leerDB();
    if (!db) return;
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const hoy = new Date().toISOString().split('T')[0];
    const destino = path.join(BACKUP_DIR, `data-${hoy}.json`);
    if (!fs.existsSync(destino)) {
      fs.writeFileSync(destino, JSON.stringify(db, null, 2), 'utf-8');
      console.log(`Backup diario: backups/data-${hoy}.json`);
    }
  } catch(e) { console.error('Error backup:', e.message); }
}

backupDiario();
setInterval(backupDiario, 24 * 60 * 60 * 1000);

function obtenerToken() {
  if (process.env.API_TOKEN) return process.env.API_TOKEN.trim();
  const token = require('crypto').randomBytes(32).toString('hex');
  console.log('Token generado:', token);
  return token;
}
const API_TOKEN = obtenerToken();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.css':  'text/css',
  '.ico':  'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function leerBody(req, cb) {
  let body = '';
  req.on('data', chunk => { body += chunk; if (body.length > 10*1024*1024) req.destroy(); });
  req.on('end', () => cb(body));
}
function jsonRes(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, x-api-token' });
    return res.end();
  }

  if (req.url === '/api/data' && req.method === 'GET') {
    const db = await leerDB();
    if (!db) return jsonRes(res, 200, { __sinDatos: true });
    return jsonRes(res, 200, db);
  }

  if (req.url === '/api/data' && req.method === 'POST') {
    if (req.headers['x-api-token'] !== API_TOKEN) return jsonRes(res, 401, { ok: false, error: 'Token invalido' });
    leerBody(req, async body => {
      try {
        const data = JSON.parse(body);
        if (data.users && data.users.length === 0 && data.ingresos && data.ingresos.length === 0 && data.gastos && data.gastos.length === 0) {
          const actual = await leerDB();
          if (actual && (actual.ingresos.length > 0 || actual.gastos.length > 0 || actual.users.length > 0)) {
            return jsonRes(res, 409, { ok: false, error: 'No se puede sobreescribir datos existentes con base vacia.' });
          }
        }
        const ok = await escribirDB(data);
        return jsonRes(res, ok ? 200 : 500, { ok });
      } catch(e) { return jsonRes(res, 400, { ok: false, error: 'JSON invalido' }); }
    });
    return;
  }

  if (req.url === '/api/token' && req.method === 'GET') {
    const ip = req.socket.remoteAddress || '';
    const esLocal = ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
    if (!esLocal) return jsonRes(res, 403, { error: 'Solo accesible desde red local' });
    return jsonRes(res, 200, { token: API_TOKEN });
  }

  let filePath = path.join(PUBLIC, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) filePath = path.join(PUBLIC, 'index.html');
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    if (path.basename(filePath) === 'index.html') {
      const html = fs.readFileSync(filePath, 'utf-8');
      const injected = html.replace('/*__INJECT_TOKEN__*/', `window.__API_TOKEN__ = ${JSON.stringify(API_TOKEN)};`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store' });
      return res.end(injected);
    }
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=86400' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\nLolita Bebe corriendo en puerto ${PORT}`);
  console.log(`Supabase: ${SUPABASE_URL ? 'conectado' : 'NO CONFIGURADO'}\n`);
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') console.error(`Puerto ${PORT} en uso.`);
  else console.error('Error:', err);
  process.exit(1);
});




