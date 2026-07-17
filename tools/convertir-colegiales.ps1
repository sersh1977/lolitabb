# Conversor: STOCK - mercaderia nuestra.xlsx (hoja COFFEE) -> public/stock-colegiales.json
# Explota talles (col TALLE 02 a 14) en items individuales con categoria=Colegial

$ErrorActionPreference = 'Stop'
$f = "C:\Users\SershIA\Desktop\STOCK - mercaderia nuestra.xlsx"
$out = "C:\Users\SershIA\Desktop\Proyectos Antigravity\apps\AppLolitaBB\public\stock-colegiales.json"

Import-Module ImportExcel
$data = Import-Excel -Path $f -WorksheetName 'COFFEE'
$tnames = @('02','04','06','08','10','12','14')
$salida = @(); $idas = @{}; $total=0; $unids=0

foreach ($row in $data) {
  $art = "$($row.ARTICULO)".Trim()
  $desc = "$($row.DESCRIPCION)".Trim()
  $col  = "$($row.COLOR)".Trim()
  if ([string]::IsNullOrWhiteSpace($art) -or [string]::IsNullOrWhiteSpace($desc)) { continue }
  $v3 = [double]($row.COSTO -replace '[\$,]','' -replace ',','.')
  $v4 = [double]($row.SUGERIDO -replace '[\$,]','' -replace ',','.')
  $v5 = [double]($row.PRECIO -replace '[\$,]','' -replace ',','.')
  for ($ti = 0; $ti -lt 7; $ti++) {
    $q = [int]$row.("TALLE $($tnames[$ti])")
    if ($q -le 0) { continue }
    $colKey = $col -replace '[\s/\\]','_'
    $idBase = "lolitabb_${art}_$($tnames[$ti])_${colKey}"
    $id = $idBase
    if ($idas.ContainsKey($id)) { $n=2; while($idas.ContainsKey("${idBase}_v${n}")){$n++}; $id="${idBase}_v${n}" }
    $idas[$id] = $true
    $salida += [PSCustomObject]@{
      id=$id; proveedor='lolitabb'; categoria='Colegial'; codigo=$art
      nombre=$desc; color=$col; talle=$tnames[$ti]; cantidad=$q
      precio=[Math]::Round($v3,2); precioSugerido=[Math]::Round($v3,2)
      precioContado=[Math]::Round($v4,2); precioTarjeta=[Math]::Round($v5,2)
      notas='Importado desde STOCK - mercaderia nuestra.xlsx'
      creadoEn='2026-07-16T21:00:00.0000000-03:00'
    }
    $total++; $unids+=$q
  }
}

$json = $salida | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText($out, $json, [System.Text.UTF8Encoding]::new($false))
Write-Host "=== RESULTADO ==="
Write-Host "Items: $total"
Write-Host "Unidades: $unids"
Write-Host "Archivo: $out"