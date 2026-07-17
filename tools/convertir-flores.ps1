# Conversor: FLORES - stock mercaderia.xlsx -> public/stock-lolitabb.json
# Importa SOLO filas con c2 (DESCRIPCION) en BLANCO (sin fill color).
# Filas con fill azul (FF0070C0) o violeta (FF7030A0) = vendidas -> SE SALTAN.

$f = "C:\Users\SershIA\Desktop\FLORES - stock mercaderia.xlsx"
$out = "C:\Users\SershIA\Desktop\Proyectos Antigravity\apps\AppLolitaBB\public\stock-lolitabb.json"
Import-Module ImportExcel

function ParseNum($s) {
  if ([string]::IsNullOrWhiteSpace($s)) { return 0 }
  $s = $s -replace '\$','' -replace '\.','' -replace ',','.' -replace '[^0-9.\-]',''
  $r = 0.0
  [double]::TryParse($s, [ref]$r) | Out-Null
  return [Math]::Round($r, 2)
}

$pkg = Open-ExcelPackage -Path $f
$hojaMap = @{
  'baby'              = @{ abbr='BAB'; cat='Baby';    mode='L'; L3=6; L4=7; base=6 }
  'Mini'              = @{ abbr='MIN'; cat='Mini';    mode='L'; L3=6; L4=7; base=6 }
  'Kids'              = @{ abbr='KID'; cat='Kids';    mode='L'; L3=6; L4=7; base=6 }
  'Shura Accesorios'  = @{ abbr='SHU'; cat='Shura';   mode='S'; L3=7; L4=8; base=6 }
  'COFFEE (Camperas)' = @{ abbr='COF'; cat='Camperas';mode='L'; L3=6; L4=7; base=6 }
}

$salida = @(); $idas = @{}; $importados=0; $saltados=0; $hojasReporte=@{}
foreach ($ws in $pkg.Workbook.Worksheets) {
  $cfg = $hojaMap[$ws.Name]; if (-not $cfg) { continue }
  $cntHoja=0; $salHoja=0
  for ($r = 3; $r -le $ws.Dimension.Rows; $r++) {
    $fillRgb = if ($ws.Cells[$r,2].Style.Fill.PatternType -ne $null -and $ws.Cells[$r,2].Style.Fill.BackgroundColor.Rgb) { $ws.Cells[$r,2].Style.Fill.BackgroundColor.Rgb } else { 'BLANCO' }
    $desc = $ws.Cells[$r,2].Text.Trim()
    if ([string]::IsNullOrWhiteSpace($desc)) { continue }
    if ($fillRgb -ne 'BLANCO') { $salHoja++; continue }
    $art  = $ws.Cells[$r,1].Text.Trim()
    $col  = $ws.Cells[$r,3].Text.Trim()
    $talle= $ws.Cells[$r,4].Text.Trim()
    $cant = [int](ParseNum $ws.Cells[$r,5].Text)
    $pL3  = ParseNum $ws.Cells[$r,$cfg.L3].Text
    $pL4  = ParseNum $ws.Cells[$r,$cfg.L4].Text
    $base = ParseNum $ws.Cells[$r,$cfg.base].Text
    $codigo = if ($art) { $art } else { "LB-$($cfg.abbr)-$r" }
    $idBase = "lolitabb_${codigo}_${r}"; $id = $idBase
    if ($idas.ContainsKey($id)) { $n=2; while($idas.ContainsKey("${idBase}_v${n}")){$n++}; $id="${idBase}_v${n}" }
    $idas[$id]=$true
    $salida += [PSCustomObject]@{
      id=$id; proveedor='lolitabb'; categoria=$cfg.cat; codigo=$codigo; nombre=$desc
      color=$col; talle=$talle; cantidad=$cant; precio=$base
      precioSugerido=$pL3; precioContado=$pL4; precioTarjeta=0; apr2=0
      notas='Importado desde Excel Flores'; creadoEn='2026-07-16T21:00:00.0000000-03:00'
    }
    $cntHoja++
  }
  $importados+=$cntHoja; $saltados+=$salHoja; $hojasReporte[$ws.Name]=@{ import=$cntHoja; salt=$salHoja }
}
$salida = $salida | Sort-Object @{Expression={$_.categoria}}, @{Expression={($_.codigo -replace '[^0-9].*','') -as [int]}}, { {$_.codigo} }
$json = $salida | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText($out, $json, [System.Text.UTF8Encoding]::new($false))
"=== RESULTADO ==="
foreach ($k in $hojasReporte.Keys | Sort-Object) { $v=$hojasReporte[$k]; "  [$k] importados=$($v.import) saltados=$($v.salt)" }
"TOTAL importados=$importados  saltados=$saltados"
"Archivo: $out"
