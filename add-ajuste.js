const fs = require('fs');
let h = fs.readFileSync('public/index.html', 'utf8');

// 1. Add +- button to stock table row
const oldBtn = "        <button class=\"btn btn-ghost\" style=\"padding:4px 10px;font-size:12px\" onclick=\"editarProducto('${p.id}')\">✏</button>\n        <button class=\"btn btn-ghost\" style=\"padding:4px 10px;font-size:12px;color:var(--danger)\" onclick=\"eliminarProducto('${p.id}')\">🗑</button>";
const newBtn = "        <button class=\"btn btn-ghost\" style=\"padding:4px 10px;font-size:12px\" onclick=\"editarProducto('${p.id}')\">✏</button>\n        <button class=\"btn btn-ghost\" style=\"padding:4px 10px;font-size:12px;color:#2e7d32\" onclick=\"ajusteStock('${p.id}')\">±</button>\n        <button class=\"btn btn-ghost\" style=\"padding:4px 10px;font-size:12px;color:var(--danger)\" onclick=\"eliminarProducto('${p.id}')\">🗑</button>";

if (h.includes(oldBtn)) {
  h = h.replace(oldBtn, newBtn);
  console.log('OK: boton +- agregado');
} else {
  console.log('ERROR: no encontro los botones de accion en la tabla');
}

// 2. Add modal before </body>
const modal = '\n<!-- MODAL AJUSTE -->\n<div class="modal-overlay" id="modal-ajuste-stock"><div class="modal" style="max-width:400px"><div class="modal-header"><h3>Ajuste de Stock</h3><button class="modal-close" onclick="closeModal(\'modal-ajuste-stock\')">x</button></div><div class="modal-body"><input type="hidden" id="ajuste-prod-id"><div id="ajuste-prod-info" style="background:#f5f5f5;border-radius:8px;padding:10px;margin-bottom:14px;font-size:13px"></div><div class="form-group"><label>Tipo de ajuste</label><select id="ajuste-tipo" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:8px"><option value="suma">+ Sumar stock (devolucion, reposicion)</option><option value="resta">- Restar stock (perdida, correccion)</option><option value="fijo">= Establecer cantidad exacta</option></select></div><div class="form-group"><label>Cantidad</label><input type="number" id="ajuste-cantidad" min="1" value="1" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:8px"></div><div class="form-group"><label>Motivo (opcional)</label><input type="text" id="ajuste-motivo" placeholder="Ej: Devolucion cliente..." style="width:100%;padding:8px;border:1px solid #ccc;border-radius:8px"></div></div><div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal(\'modal-ajuste-stock\')">Cancelar</button><button class="btn btn-primary" onclick="confirmarAjusteStock()">Confirmar</button></div></div></div>';

h = h.replace('</body>\n</html>', modal + '\n</body>\n</html>');

// 3. Add JS functions
const js = '\nfunction ajusteStock(id) {\n  var p = db.stock.find(function(x){return x.id===id;});\n  if (!p) return;\n  document.getElementById("ajuste-prod-id").value = id;\n  document.getElementById("ajuste-prod-info").innerHTML = "<strong>"+p.nombre+"</strong> - "+(p.talle||"")+" "+(p.color||"")+"<br>Codigo: "+p.codigo+" | Stock actual: <strong>"+p.cantidad+"</strong>";\n  document.getElementById("ajuste-cantidad").value = 1;\n  document.getElementById("ajuste-motivo").value = "";\n  openModal("modal-ajuste-stock");\n}\nasync function confirmarAjusteStock() {\n  var id = document.getElementById("ajuste-prod-id").value;\n  var tipo = document.getElementById("ajuste-tipo").value;\n  var cant = parseInt(document.getElementById("ajuste-cantidad").value)||0;\n  var motivo = document.getElementById("ajuste-motivo").value.trim();\n  if (cant<=0) { toast("Cantidad invalida.","error"); return; }\n  var p = db.stock.find(function(x){return x.id===id;});\n  if (!p) return;\n  var anterior = p.cantidad;\n  if (tipo==="suma") p.cantidad += cant;\n  else if (tipo==="resta") p.cantidad = Math.max(0, p.cantidad-cant);\n  else if (tipo==="fijo") p.cantidad = cant;\n  closeModal("modal-ajuste-stock");\n  logAudit("STOCK_AJUSTE", p.nombre+" ("+p.codigo+"): "+anterior+" -> "+p.cantidad+(motivo?" | "+motivo:""));\n  saveDB();\n  renderStock();\n  toast("Stock ajustado: "+anterior+" -> "+p.cantidad+" ok","success");\n}\n';

h = h.replace('iniciarApp();', js + 'iniciarApp();');

fs.writeFileSync('public/index.html', h, 'utf8');
console.log('Guardado. ajusteStock presente:', h.includes('ajusteStock') ? 'SI' : 'NO');
