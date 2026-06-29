# Script para importar stock de LINCE a LolitaBB
# Colocar este archivo y stock_lince.json en la misma carpeta
# Ejecutar: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\importar-stock.ps1

$token = "c5d6f03e9c0cea1ece6d6f2ec39241fa90be60b3c13ae8be7d06dcdde749d79e"
$url = "https://lolitabb-production.up.railway.app/api/data"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$stockFile = Join-Path $scriptDir "stock_lince.json"

Write-Host "Leyendo stock_lince.json..." -ForegroundColor Cyan
$stockLince = Get-Content $stockFile -Raw -Encoding UTF8 | ConvertFrom-Json

Write-Host "Obteniendo datos actuales de Railway..." -ForegroundColor Cyan
$db = Invoke-RestMethod -Method GET -Uri $url

Write-Host "DB actual: $($db.ingresos.Count) ingresos, $($db.gastos.Count) gastos, $($db.stock.Count) items en stock" -ForegroundColor Green
Write-Host "Items de LINCE a importar: $($stockLince.Count)" -ForegroundColor Cyan

# Evitar duplicados
$idsExistentes = @($db.stock | ForEach-Object { $_.id })
$nuevos = @($stockLince | Where-Object { $_.id -notin $idsExistentes })
Write-Host "Items nuevos (sin duplicados): $($nuevos.Count)" -ForegroundColor Yellow

$db.stock = @($db.stock) + $nuevos

Write-Host "Subiendo datos..." -ForegroundColor Cyan
$body = $db | ConvertTo-Json -Depth 10 -Compress
$result = Invoke-RestMethod -Method POST -Uri $url -Headers @{"x-api-token"=$token} -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -ContentType "application/json; charset=utf-8"

if ($result) {
    Write-Host "Importacion exitosa! Total stock: $($db.stock.Count) items" -ForegroundColor Green
} else {
    Write-Host "Error al importar" -ForegroundColor Red
}
pause
