#!/usr/bin/env node
// Genera los iconos PWA usando solo módulos de Node (sin dependencias externas)
// Crea un PNG simple con fondo café y la letra C

const fs = require('fs');
const path = require('path');

// Genera un PNG mínimo válido con fondo #3D2314 y texto "☕"
// Usamos un SVG embebido como base64 dentro de un PNG fake-ish
// En realidad generamos el PNG desde cero con la spec PNG

function createSimplePNG(size) {
  // Usaremos un enfoque SVG→PNG via data: pero sin browser,
  // lo más simple es escribir un PNG con la librería pura.
  // Vamos a generar un PNG válido manualmente (spec minimal)
  
  const { createCanvas } = (() => {
    try { return require('canvas'); } catch(e) { return null; }
  })() || {};

  if (createCanvas) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    // Fondo
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#3D2314');
    grad.addColorStop(1, '#A0622A');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(0, 0, size, size, size * 0.2) : ctx.rect(0, 0, size, size);
    ctx.fill();
    // Texto
    ctx.fillStyle = '#FDF6EC';
    ctx.font = `bold ${size * 0.55}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☕', size / 2, size / 2);
    return canvas.toBuffer('image/png');
  }

  // Fallback: generar PNG mínimo manualmente (1x1 escalado con cabecera correcta)
  // En su lugar generamos un SVG y lo guardamos con extensión .png para que el browser lo acepte
  // (los browsers modernos aceptan SVG como icono si el manifest lo referencia correctamente)
  // Pero para máxima compatibilidad, generamos un PNG binario real usando zlib

  const zlib = require('zlib');
  
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const buf = Buffer.concat([Buffer.from(type), data]);
    const crc = crc32(buf);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, buf, crcBuf]);
  }

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    const table = makeCRCTable();
    for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xFF];
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  let _crcTable = null;
  function makeCRCTable() {
    if (_crcTable) return _crcTable;
    _crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      _crcTable[n] = c;
    }
    return _crcTable;
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Image data: fill with gradient-ish color
  const r1 = 0x3D, g1 = 0x23, b1 = 0x14;
  const r2 = 0xA0, g2 = 0x62, b2 = 0x2A;
  
  const rows = [];
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter type None
    for (let x = 0; x < size; x++) {
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 6 });
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, iend]);
}

const outDir = path.join(__dirname, '..', 'public');
[192, 512].forEach(size => {
  const buf = createSimplePNG(size);
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), buf);
  console.log(`✓ icon-${size}.png generado`);
});
console.log('Iconos listos.');
