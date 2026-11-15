param([string]$Carpeta, [string]$Nombres)
$app = New-Object -ComObject PowerPoint.Application
foreach ($n in $Nombres.Split(',')) {
  $origen = Join-Path (Join-Path $Carpeta 'salida') ($n + '.pptx')
  $destino = Join-Path (Join-Path $Carpeta 'png') $n
  $pres = $app.Presentations.Open($origen, $true, $false, $false)
  New-Item -ItemType Directory -Force $destino | Out-Null
  $i = 1
  foreach ($sl in $pres.Slides) { $sl.Export((Join-Path $destino ('slide-' + $i + '.png')), 'PNG', 1600, 900); $i++ }
  $pres.Close()
}
$app.Quit()
'export ok'
