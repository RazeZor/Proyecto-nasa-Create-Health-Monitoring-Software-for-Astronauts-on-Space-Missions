# Hotspot cerrado «umbra» para las pruebas en local con el reloj (Galaxy Watch4 vía smart-monitor).
# Uso (PowerShell, sin administrador):
#   tools\red-local\hotspot.ps1            # configura y enciende umbra / solem123
#   tools\red-local\hotspot.ps1 -Vigilar   # lo enciende y lo mantiene: Windows lo apaga a los 5 min sin clientes
#   tools\red-local\hotspot.ps1 -Apagar    # lo apaga (y detiene al vigilante)
#   tools\red-local\hotspot.ps1 -Ssid otra -Clave otraclave
# Usa el Hotspot móvil de Windows 10/11 (la «red hospedada» de netsh ya no existe en los drivers modernos).
# El PC queda en 192.168.137.1 dentro del hotspot: es la IP que va en SMART_IP_LAN del .env y en el campo
# «Servidor» del reloj (ws://192.168.137.1:8765/watch). Ver docs/SETUP.md §8.
# Para dejar el vigilante en segundo plano (ventana oculta, sobrevive al cierre de la terminal):
#   Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$PWD\tools\red-local\hotspot.ps1`"",'-Vigilar'
# (la ruta va entre comillas escapadas porque la carpeta del repo tiene espacios). Registro: %TEMP%\vigia-hotspot.log
param(
    [string]$Ssid = "umbra",
    [string]$Clave = "solem123",
    [switch]$Apagar,
    [switch]$Vigilar,
    [int]$CadaSegundos = 15
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType = WindowsRuntime] | Out-Null
[Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager, Windows.Networking.NetworkOperators, ContentType = WindowsRuntime] | Out-Null

$metodos = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 }
$asTaskOp = ($metodos | Where-Object { $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asTaskAct = ($metodos | Where-Object { $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' })[0]
function Esperar-Operacion($op, $tipo) { $t = $asTaskOp.MakeGenericMethod($tipo).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
function Esperar-Accion($act) { $t = $asTaskAct.Invoke($null, @($act)); $t.Wait(-1) | Out-Null }
$tipoResultado = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult]
$registro = Join-Path $env:TEMP "vigia-hotspot.log"
function Anotar($texto) { $linea = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $texto"; Write-Output $linea; Add-Content -Path $registro -Value $linea -Encoding utf8 }

function Gestor {
    $perfil = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile()
    if ($null -eq $perfil) { throw "El PC necesita estar conectado a alguna red (WiFi o cable) para encender el hotspot." }
    [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager]::CreateFromConnectionProfile($perfil)
}

function Encender($gestor) {
    $cfg = $gestor.GetCurrentAccessPointConfiguration()
    $cfg.Ssid = $Ssid
    $cfg.Passphrase = $Clave
    try { $cfg.Band = [Windows.Networking.NetworkOperators.TetheringWiFiBand]::TwoPointFourGigahertz } catch { Anotar "Aviso: no se pudo fijar 2,4 GHz; queda en automático." }
    try { $cfg.AuthenticationKind = [Windows.Networking.NetworkOperators.TetheringWiFiAuthenticationKind]::Wpa2 } catch { }
    Esperar-Accion $gestor.ConfigureAccessPointAsync($cfg)
    $r = Esperar-Operacion $gestor.StartTetheringAsync() $tipoResultado
    if ($r.Status -ne "Success") { throw "No se pudo encender el hotspot: $($r.Status) $($r.AdditionalErrorMessage)" }
}

# Un solo vigilante a la vez: los demás salen en silencio.
$mutex = New-Object System.Threading.Mutex($false, "Global\vigia-hotspot-umbra")

if ($Apagar) {
    $gestor = Gestor
    $r = Esperar-Operacion $gestor.StopTetheringAsync() $tipoResultado
    Anotar "Hotspot apagado: $($r.Status) $($r.AdditionalErrorMessage)"
    Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object { $_.CommandLine -like '*hotspot.ps1*-Vigilar*' -and $_.ProcessId -ne $PID } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Anotar "Vigilante detenido (PID $($_.ProcessId))" }
    return
}

$gestor = Gestor
Encender $gestor
Start-Sleep -Seconds 3
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.137.*' } | Select-Object -First 1).IPAddress
Anotar "Hotspot «$Ssid» encendido (clave: $Clave). Estado: $($gestor.TetheringOperationalState). IP del PC: $ip"
Write-Output "Campo «Servidor» del reloj: ws://${ip}:8765/watch"
Write-Output "SMART_IP_LAN=$ip en el .env de la raíz (y reinicia la API si ya estaba corriendo)."

if (-not $Vigilar) { return }
if (-not $mutex.WaitOne(0)) { Anotar "Ya hay un vigilante corriendo; este sale."; return }
Anotar "Vigilante activo cada $CadaSegundos s (registro: $registro). Ctrl+C o -Apagar para terminar."
while ($true) {
    Start-Sleep -Seconds $CadaSegundos
    try {
        $gestor = Gestor
        if ($gestor.TetheringOperationalState -ne 'On') {
            Anotar "Hotspot apagado (Windows lo corta sin clientes): reencendiendo."
            Encender $gestor
            Anotar "Hotspot reencendido. Estado: $($gestor.TetheringOperationalState)"
        }
    } catch { Anotar "Error al vigilar: $($_.Exception.Message)" }
}
