# Setup del entorno: lo que cada dev hace una vez tras clonar

Toma unos 10 minutos. Al final tendrás el hook activo, los tests en verde y tu asistente de IA leyendo el contexto del repo.

## 1. Requisitos

| Herramienta | Versión | Para qué |
| --- | --- | --- |
| Git | 2.30 o más | Repositorio y hook de pre-commit |
| Python | 3.10 o más (CI usa 3.12) | `pipelines/` y `tools/contextgen` |
| Node.js | 20 LTS o más | `apps/web`, cuando exista su `package.json` |

**Windows:** si `python` abre la Microsoft Store o dice "no se encontró Python", instálalo desde python.org y usa `py`, o desactiva los alias en *Configuración → Aplicaciones → Configuración avanzada de aplicaciones → Alias de ejecución de aplicaciones* (`python.exe` y `python3.exe`). En esta guía, donde dice `python`, usa `py` si es tu caso.

## 2. Clonar y configurar git

```sh
git clone https://github.com/RazeZor/Proyecto-nasa-Create-Health-Monitoring-Software-for-Astronauts-on-Space-Missions.git vigia
cd vigia

git config core.hooksPath .githooks        # OBLIGATORIO: activa el pre-commit que mantiene el contexto al día
git config user.name  "Tu Nombre"          # si no lo tienes configurado globalmente
git config user.email "tu@correo"
```

Finales de línea: en Windows `core.autocrlf true` (lo normal) funciona; en Mac y Linux, `git config --global core.autocrlf input`. El `.gitattributes` del repo fija LF donde importa (hook y archivos generados).

Comprueba el hook:

```sh
git config core.hooksPath                  # debe imprimir .githooks
```

## 3. Secretos y variables de entorno

```sh
cp .env.example .env                       # PowerShell: Copy-Item .env.example .env
```

Completa `.env`:

- `NASA_API_KEY`: pídela gratis en https://api.nasa.gov. Sin ella se usa `DEMO_KEY`, que tiene límite de consultas.
- `DATALAKE_DIR`: opcional. Por defecto es `pipelines/datalake/data/`.
- `VIGIA_DB`: opcional. Archivo SQLite de la API (registro de la tripulación). Por defecto `apps/api/data/vigia.db`. Se crea con `cd apps/api && python3 -m almacen migrar` y se llena de demostración con `python3 -m almacen sembrar`.
`.env` está en `.gitignore`: **nunca lo subas**. Los scripts leen variables del entorno y **no** cargan `.env` solos. Cárgalo en tu terminal antes de ingerir:

```sh
set -a; . ./.env; set +a                   # bash / zsh / Git Bash
```

```powershell
Get-Content .env | Where-Object { $_ -match '^\s*[^#].*=' } | ForEach-Object {
  $k, $v = $_ -split '=', 2; Set-Item "env:$($k.Trim())" $v.Trim() }      # PowerShell
```

En VS Code no hace falta: el `.vscode/settings.json` del repo activa `python.terminal.useEnvFile` y la extensión de Python carga `.env` en la terminal integrada, al ejecutar y al depurar.

## 4. Entorno de Python

`pipelines/datalake` y `tools/contextgen` usan solo la biblioteca estándar: no hay nada que instalar. Cuando un módulo traiga su propio `requirements.txt` (ver [ARQUITECTURA.md](ARQUITECTURA.md)), usa un único entorno virtual en la raíz:

```sh
python -m venv .venv
. .venv/bin/activate                       # Windows: .venv\Scripts\activate
pip install -r pipelines/<modulo>/requirements.txt
```

`.venv/` ya está en `.gitignore`.

## 5. Verificar que todo funciona

```sh
python tools/contextgen/contextgen.py --check       # sin salida y código 0: contexto al día
python -m unittest discover -s tools/contextgen     # tests del generador
python -m unittest discover -s pipelines/datalake   # tests del datalake
ruff check .                                        # lint (instalar: uv tool install ruff o pip install ruff)
cd pipelines/datalake && python index.py ingest goes && cd ../..   # requiere internet
```

Si funcionan, tu entorno está listo. Ruff se configura en `ruff.toml` (E, F, W e imports ordenados; no exige largo de línea) y el CI lo corre en cada PR.

### Datos de la demo (gold)

Los datos no van a git, así que en un clon nuevo la pantalla de entorno sale vacía. Al arrancar, la API imprime qué paneles y escenarios tiene cargados, o `gold: vacío` si no hay ninguno.

No se pueden regenerar descargando: GOES solo publica las últimas 24 h, y la ventana de `mision-vigia` (13-14 nov. 2026) ya no está. Por eso se restaura desde el respaldo del equipo, `vigia-datalake-AAAA-MM-DD.tar.gz` (unos 250 KB; trae raw, curated, gold y manifiestos). Pídelo a quien lleve el frente de datos.

```sh
tar -xzf vigia-datalake-2026-11-14.tar.gz -C pipelines/datalake   # restaurar (Windows 10+ trae tar)
cd pipelines/datalake && tar -czf ../../vigia-datalake-$(date +%F).tar.gz data   # respaldar tras una ingesta nueva
```

Restaura solo en un clon sin `pipelines/datalake/data/`: el datalake nunca sobrescribe `raw/`. Si un escenario pide una ventana que tu curated no tiene, `index.py panel` la omite, avisa por la terminal y la deja en el campo `faltan` del panel.

## 6. Tu asistente de IA

Todas las herramientas leen la misma fuente: [AGENTS.md](../AGENTS.md). No hay que copiar instrucciones a mano.

| Herramienta | Qué lee | Qué tienes que hacer |
| --- | --- | --- |
| Codex (CLI, IDE, web) | `AGENTS.md` | Nada |
| Claude Code | `CLAUDE.md` → importa `AGENTS.md` | Nada. Para verificar, escribe `/memory` y debe aparecer `CLAUDE.md` |
| Google Antigravity | `GEMINI.md` y `.agent/rules/agents.md` | Abre la carpeta raíz del repo como workspace y revisa que la regla aparezca en la configuración de reglas del agente |
| Gemini CLI | `GEMINI.md` → importa `AGENTS.md` | Nada. Para verificar: `/memory show` |
| GitHub Copilot (VS Code) | `.github/copilot-instructions.md` | Revisa que en los ajustes de Copilot Chat estén habilitados los archivos de instrucciones (*instruction files*) |
| Cursor | `.cursor/rules/agents.mdc` (`alwaysApply`) | Nada |
| Windsurf | `.windsurf/rules/agents.md` | Nada |
| Cline / Roo | `.clinerules/agents.md` | Nada |

Las opciones de cada IDE cambian con sus versiones. Si tu herramienta no carga las reglas, dile en el primer mensaje: "lee AGENTS.md".

**Otra herramienta:** si lee `AGENTS.md`, no hagas nada. Si necesita su propio archivo, agrégalo en `ADAPTADORES` de [tools/contextgen/contextgen.py](../tools/contextgen/contextgen.py) y corre el generador. No crees el archivo a mano: el generador lo mantiene.

**Prueba rápida:** pregúntale a tu IA "¿dónde se ingiere DONKI y qué pasa si cambia su estructura?". Debe responder `pipelines/datalake/datalake.py` y mencionar `EstructuraInesperada`, citando `docs/context/INDEX.md` o el `MODULE.md`.

## 7. Flujo diario

1. Crea una rama desde `main` actualizado: `git switch -c <tipo>/<tema>`, por ejemplo `feat/figura-humana` o `fix/donki-espejo`.
2. Programa. Si cambias el comportamiento de un módulo, actualiza los **puntos clave** de su `MODULE.md` (bloque MANUAL), tú o tu IA.
3. `git commit`: el hook regenera el bloque AUTO, el índice y los adaptadores, y los suma al commit.
4. Abre el PR y completa el checklist. CI exige el contexto al día y los tests en verde.
5. **Conflicto en un bloque AUTO o en `docs/context/`:** no lo resuelvas a mano. Acepta cualquier versión, corre `python tools/contextgen/contextgen.py` y commitea.

## 8. Pruebas en local con el reloj (hotspot «umbra»)

Todo el proyecto corre en el PC, sin internet ni servidor: smart-monitor (servidor del reloj), la API y la web. Como las redes de eventos y universidades aíslan los dispositivos entre sí, el reloj se conecta a un hotspot cerrado que crea el propio PC.

1. **Hotspot** (PowerShell, sin administrador; el PC debe estar conectado a alguna otra red):

   ```powershell
   tools\red-local\hotspot.ps1 -Vigilar     # SSID umbra, clave solem123, 2,4 GHz, WPA2; -Apagar para apagarlo
   ```

   `-Vigilar` deja el script mirando cada 15 s y lo reenciende si Windows lo apaga: el Hotspot móvil se corta solo a los 5 min sin clientes (por ejemplo al reiniciar el reloj). Para dejarlo oculto en segundo plano, el comando `Start-Process` está en la cabecera del script. Alternativa sin script: en Configuración > Red e Internet > Zona con cobertura inalámbrica móvil, desactivar «Ahorro de energía». El PC queda en `192.168.137.1`. En el `.env` de la raíz: `SMART_IP_LAN=192.168.137.1` y `SMART_TRIPULANTES="<nombre en el reloj>=<id>"` (por ejemplo `"Fernando=1"`).

2. **Servidor del reloj** (repo smart-monitor, `SMART_DIR` del `.env`):

   ```powershell
   cd $env:SMART_DIR\server; $env:SMART_HOST = "0.0.0.0"; python server.py    # escucha en :8765
   ```

3. **API y web** (dos terminales; en Windows `py` si `python` no está en el PATH):

   ```sh
   cd apps/api && python -m uvicorn main:app --host 127.0.0.1 --port 8000
   cd apps/web && npm run dev          # http://localhost:3000 ; desde el móvil http://192.168.137.1:3000
   ```

   La API lee el `.env` al arrancar: tras cambiarlo hay que reiniciarla.

4. **Reloj:** Wi-Fi del reloj encendido (si está enlazado al teléfono por Bluetooth lo apaga), conectar a `umbra` / `solem123`, y en la app: Servidor `ws://192.168.137.1:8765/watch`, Tripulante el nombre que pusiste en `SMART_TRIPULANTES`. La pantalla Dispositivo de VIGÍA (`/device`) muestra esa misma URL sugerida y si el reloj ya está vinculado.

Comprobación: `curl http://127.0.0.1:8000/reloj/estado` debe dar `conectado: true` e `ip_lan: "192.168.137.1"`; el panel de smart-monitor (`http://localhost:8765`) muestra el reloj al conectarse. Si el reloj no llega, revisa que `python.exe` tenga permitida la entrada en el firewall de Windows para redes públicas (así trata Windows al hotspot).

## Problemas frecuentes

| Síntoma | Solución |
| --- | --- |
| `pre-commit: no encontré Python 3.10+` | Instala Python o revisa el PATH (en Windows, los alias de la Store). El commit pasa, pero CI te va a fallar |
| CI falla en "Contexto para IA al día" | El hook no estaba activo. Corre `python tools/contextgen/contextgen.py`, commitea y empuja |
| `permission denied: .githooks/pre-commit` (Mac/Linux) | `chmod +x .githooks/pre-commit` |
| Un archivo nuevo no aparece en `MODULE.md` | El generador solo ve archivos versionados: haz `git add` primero |
| `aviso: ... fuera del patrón de carpetas` | Mueve el código a `apps/`, `pipelines/`, `packages/` o `tools/` ([ARQUITECTURA.md](ARQUITECTURA.md)) |
