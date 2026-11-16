# Setup del entorno: lo que cada dev hace una vez tras clonar

Toma unos 10 minutos. Al final tendrás el hook activo, los tests en verde y tu asistente de IA leyendo el contexto del repo.

## 1. Requisitos

| Herramienta | Versión | Para qué |
| --- | --- | --- |
| Git | 2.30 o más | Repositorio y hook de pre-commit |
| Python | 3.10 o más (CI usa 3.12) | `pipelines/` y `tools/contextgen` |
| Node.js | 22.18 o más (CI: 22.18) | `apps/web` y pruebas TypeScript sin compilación |
| pnpm | 12.3.4 (`apps/web/package.json`) | Instalación reproducible con `pnpm-lock.yaml` |

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
- `VIGIA_CLAVE_INVITACIONES`: secreto de al menos 32 caracteres para emitir altas web ligadas a una identidad/rol; solo se configura en entornos privados de la API y nunca se comparte.
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

Si el clon ya tiene `venv/`, reutilízalo; no hace falta crear además `.venv/`. En los comandos siguientes usa el intérprete del entorno elegido (en este equipo, `venv\Scripts\python.exe`). Instala lo que usa la API y la verificación:

```sh
python -m pip install -r apps/api/requirements.txt ruff
cd apps/web
corepack enable
pnpm install --frozen-lockfile
cd ../..
```

`websockets` está declarado por la API: sin él las pruebas del puente y la conexión con smart-monitor quedan incompletas. El gestor canónico de la web es pnpm; no generes un `package-lock.json` adicional.

## 5. Verificar que todo funciona

```sh
python tools/contextgen/contextgen.py --check       # sin salida y código 0: contexto al día
python -m unittest discover -s tools/contextgen     # tests del generador
python -m unittest discover -s pipelines/datalake   # tests del datalake
python -m ruff check .                              # lint en el mismo entorno Python
cd pipelines/datalake && python index.py ingest goes && cd ../..   # requiere internet
```

Si funcionan, tu entorno está listo. Ruff se configura en `ruff.toml` (E, F, W e imports ordenados; no exige largo de línea) y el CI lo corre en cada PR.

Para comprobar la entrega completa con las suites de todos los módulos, tipado y build:

```sh
python tools/verificacion/verificar.py --web
```

`--node RUTA` elige otro ejecutable sin cambiar Node del sistema. El comando conserva códigos, versiones y logs en `tools/verificacion/data/<UTC>/resultado.json` (ignorado por Git), y falla si hay pruebas omitidas. El CI sigue siendo la referencia en Python 3.12; una ejecución local con otro Python no acredita esa versión.

Ensayo de recuperación en Chrome/Chromium, después del build:

```sh
python tools/verificacion/ensayo.py --node RUTA_NODE --chrome RUTA_CHROME
```

Usa puertos locales libres, una base y un perfil de navegador temporales: guarda un informe sin API, reinicia Chrome, abre la carcasa sin red y verifica un único informe al reconectar. Un proxy del ensayo aísla la API temporal del destino configurado en el build. Conserva captura y resultado en `tools/verificacion/data/ensayo-*`; detiene sus servidores al terminar. No utiliza la base del usuario ni sustituye un ensayo con el reloj físico.

### Datos de la demo (gold)

Los datos no van a git, así que en un clon nuevo la pantalla de entorno sale vacía. Al arrancar, la API imprime qué paneles y escenarios tiene cargados, o `gold: vacío` si no hay ninguno.

GOES solo publica las últimas 24 h: una ventana antigua que usara GOES necesita el respaldo del equipo. La demo actual `mision-vigia` es el viaje a Marte del 15-sep-2011 al día 259: usa RadLab y DONKI históricos; su dosis de tránsito, CO2 y flujo son simulados y se rotulan. DONKI puede volver a consultarse por tramos de hasta 60 días. El respaldo `vigia-datalake-AAAA-MM-DD.tar.gz` conserva raw, curated, gold y manifiestos; su tamaño depende del inventario.

```sh
tar -xzf vigia-datalake-2026-11-14.tar.gz -C pipelines/datalake   # restaurar (Windows 10+ trae tar)
cd pipelines/datalake && tar -czf ../../vigia-datalake-$(date +%F).tar.gz data   # respaldar tras una ingesta nueva
```

Restaura solo en un clon sin `pipelines/datalake/data/`: el datalake nunca sobrescribe `raw/`. Si un escenario pide una ventana que tu curated no tiene, `index.py panel` la omite, avisa por la terminal y la deja en el campo `faltan` del panel.

Para publicar ambos paneles con lo disponible y reproducir el KPI vigente antes de servir exactamente la fixture versionada:

```sh
cd pipelines/reanclaje
python index.py preparar
cd ../..
python tools/verificacion/inventario.py
```

Una consulta DONKI vacía solo acredita el rango consultado. `preparar` falla si los resultados actuales no reproducen la fixture; no cambia reglas ni rellena datos faltantes. En modo real el entorno reanclado es referencia: no describe la cabina de la persona.

Las migraciones actuales llegan a versión 6. Para una base existente, respaldar y migrar explícitamente:

```sh
python tools/verificacion/inventario.py --migrar
```

`--db` y `--datos` permiten indicar otras rutas; por defecto usa `VIGIA_DB`/`DATALAKE_DIR` del entorno o las rutas del repositorio (este CLI no carga `.env`). El respaldo queda en `tools/verificacion/data/inventario-*/respaldo.db`, fuera de Git y con datos personales: consérvalo con los mismos permisos que el original. Para revertir, detener la API y restaurar ese respaldo con el código anterior; no borrar la base para solucionar versiones. La migración 005 recupera el vínculo del reloj en ambas variantes v4, conserva tablas de cuentas y no activa el acceso experimental.

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
   cd apps/web && pnpm dev          # http://localhost:3000 ; desde el móvil http://192.168.137.1:3000
   ```

   La API lee el `.env` al arrancar: tras cambiarlo hay que reiniciarla.

4. **Reloj:** Wi-Fi del reloj encendido (si está enlazado al teléfono por Bluetooth lo apaga), conectar a `umbra` / `solem123`, y en la app: Servidor `ws://192.168.137.1:8765/watch`, Tripulante el nombre que pusiste en `SMART_TRIPULANTES`. La pantalla Dispositivo de VIGÍA (`/device`) muestra esa misma URL sugerida y si el reloj ya está vinculado.

Comprobación: `curl http://127.0.0.1:8000/reloj/estado` debe dar `conectado: true` e `ip_lan: "192.168.137.1"`; el panel de smart-monitor (`http://localhost:8765`) muestra el reloj al conectarse. Si el reloj no llega, revisa que `python.exe` tenga permitida la entrada en el firewall de Windows para redes públicas (así trata Windows al hotspot).

## 9. Identidad, seguimiento y recuperación del prototipo

La [ejecución del plan](EJECUCION-PLAN.md) distingue lo implementado de la revisión profesional y el piloto pendientes. Los parámetros de evidencia siguen siendo experimentales. No habilites datos personales de un piloto basándote solo en que las pruebas pasan.

### Cuentas y acceso

Para evaluar el producto abre **«Explorar demo»** o el enlace `/?demo=1` (`&lang=en` para inglés). No hay que repartir una contraseña: cada visitante recibe una cookie de demostración y una base ficticia propia durante ocho horas. Puede probar los tres roles y realizar registros/episodios/informes simulados. La franja de la interfaz señala siempre la demo. El puente del reloj, el transporte real y la base personal no forman parte de ella.

Las cookies de demo se invalidan al reiniciar el proceso. Sus bases viven en `VIGIA_DEMO_DIR` o `apps/api/data/demostraciones/`, fuera de Git; se limita a 100 espacios y se limpian archivos propios de más de nueve horas. El navegador también separa IndexedDB, cachés y bandejas por el identificador de esa visita. La implementación usa una [subaplicación independiente de FastAPI](https://fastapi.tiangolo.com/advanced/sub-applications/) con sus propias dependencias; las pruebas comprueban el aislamiento frente a una base personal con registros señuelo.

La API exige sesión verificada por defecto. Primero crea la misión/tripulantes por el procedimiento del proyecto; `python -m almacen sembrar` es exclusivamente una semilla de demostración. Desde `apps/api`, una persona con acceso privado al equipo puede dar de alta una cuenta:

```sh
python cuentas.py --usuario mi-usuario --tripulante 1 --rol astronaut
```

La contraseña se pide con `getpass`, se repite y nunca se pasa como argumento ni queda en Git. Mínimo 12 caracteres. `cmo` y `surgeon` requieren un tripulante `oficial_medico` de esa misión; una cuenta de astronauta no puede heredar un tripulante médico. No hay contraseñas predeterminadas. Abre la web e inicia sesión con esa cuenta.

Para permitir que la persona cree su propia contraseña, emite una invitación firmada y de un solo uso para una identidad sin cuenta:

```powershell
$env:VIGIA_CLAVE_INVITACIONES = "<secreto-aleatorio-de-32-caracteres-o-mas>"
python apps/api/invitaciones.py --tripulante 12 --rol astronaut --horas 72
```

La API debe tener configurado el mismo secreto. Entrega el código impreso solo a esa persona; vence en un máximo de siete días. La pantalla `/?lang=en&alta=1` usa el logo VIGÍA, fondo negro y textos en inglés. La demo sigue abierta sin registro.

El acceso clínico al historial, observaciones y episodios requiere consentimiento `historial_clinico`; el dueño lo concede/revoca en Tendencias → módulos de investigación → permisos. Los escalamientos rojos conservan su alcance separado. La revocación se comprueba en servidor; una copia previamente autorizada sin red no se puede revocar a distancia hasta reconectar. Las respuestas de informes en modo normal requieren rol `surgeon` y el destino configurado.

La sesión vence en ocho horas. Una pestaña desbloqueada puede continuar offline dentro de ese plazo; abrir un navegador nuevo necesita verificar identidad. No se guarda la contraseña ni un token portador en localStorage. IndexedDB y los respaldos no cifran el disco: la protección del dispositivo, HTTPS y la gestión de cuentas forman parte del despliegue que debe revisarse antes del piloto. Con TLS en un proxy externo, exporta `VIGIA_COOKIE_SEGURA=1`.

`VIGIA_IDENTIDAD_ENSAYO=1` habilita el adaptador de cabecera antiguo y el reloj simulado de entrega; solo corresponde a servicios/bases temporales de ensayo. El funcionamiento normal lo deja vacío. CORS permanece cerrado; el proxy web del mismo origen funciona sin abrirlo. Si necesitas acceso directo, exporta `VIGIA_ORIGENES` con orígenes exactos antes de iniciar uvicorn.

### Migración y respaldos

Las migraciones 007–011 se aplican al abrir la API. Antes de migrar una base existente, detén las escrituras del despliegue y crea una copia privada. Desde la raíz, con rutas de archivos reales y un destino nuevo:

Si ya hay una API usando este clon, trabaja en otro `git worktree` o detén ese servicio antes de agregar SQL: el migrador descubre los archivos de la carpeta en cada consulta, incluso aunque el proceso haya arrancado con código anterior. Un build separado y una base temporal de tests no aíslan esa lectura de los servicios abiertos.

```python
import sys
sys.path.insert(0, "tools/verificacion")
from recuperar import respaldar, restaurar_en_copia
respaldar("apps/api/data/vigia.db", "apps/api/data/respaldo-previo.db")
restaurar_en_copia("apps/api/data/respaldo-previo.db",
                  "apps/api/data/respaldo-previo.db.manifest.json",
                  "apps/api/data/restauracion-aislada.db")
```

Ejecuta estas llamadas con el Python del entorno. La copia incluye WAL y verifica integridad, llaves, filas y hash; rechaza un destino existente. La restauración **no sustituye** la base original: conserva operaciones posteriores para conciliarlas hacia adelante. La reversión de aplicación debe conservar la base nueva y revisar las observaciones/episodios que una versión anterior no interpreta.

El navegador exporta/restaura su propio ámbito desde Tendencias. Rechaza hash, formato, usuario/misión o claves incompatibles y no pisa diferencias actuales. Los registros antiguos de localStorage sin identidad se conservan en cuarentena; no se reasignan automáticamente. Exportación y copias contienen datos privados y quedan fuera de Git.

### Receptor Tierra y respuesta

Instala las dependencias de `apps/tierra/requirements.txt` en el entorno elegido. En el proceso Tierra exporta `VIGIA_TIERRA_DB`, `VIGIA_TIERRA_CLAVE` y `VIGIA_TIERRA_OPERADOR_CLAVE`: dos secretos distintos, aleatorios y de al menos 32 caracteres. No hay claves incluidas. Desde `apps/tierra`:

```sh
python -m uvicorn receptor:app --host 127.0.0.1 --port 8100
```

El proceso receptor toma las variables del entorno; no carga el `.env` de la raíz. En el emisor configura `VIGIA_TIERRA_URL=http://127.0.0.1:8100` y las credenciales correspondientes. Fuera de loopback el transporte requiere HTTPS y no sigue redirecciones. La API intenta entregar cada `VIGIA_RELOJ_SEG` segundos; sin destino/configuración conserva la cola. Solo cambia a recibido después de ID/hash confirmados por la otra base. El operador responde a un mensaje realmente recibido y la vuelta conserva `en_respuesta_a`. Esto sigue rotulado como ensayo de transporte.

### Verificación sin reemplazar el build en uso

```sh
python tools/contextgen/contextgen.py
python tools/verificacion/verificar.py --web --aislado
python tools/verificacion/ensayo.py --aislado --integral
python tools/verificacion/ensayo.py --aislado --datasets
```

`--node RUTA` permite el Node portátil del entorno. `--aislado` usa `.next-verificacion`. El ensayo integral genera contraseñas temporales, usa sesiones reales y otra SQLite; comprueba observaciones, episodios, sueño, reacción interrumpida, IndexedDB, offline de pestaña y separación de usuarios. El ensayo de datasets comprueba referencias ya adquiridas, recuperación de informes, reinicio y carcasa; no descarga datos ni utiliza la base personal.

Investigación y reproducción (Node 22.18+):

```sh
node tools/validacion/ejecutar.ts --publicar
node tools/validacion/investigar.ts
node tools/validacion/reproducir.ts RUTA_AL_ARTEFACTO_DE_EVALUACION.json
```

El último comando exige la misma huella del motor y recalcula su salida. Publicar el banco sintético no constituye evaluación reservada ni validación profesional. Para promover una variante siguen pendientes los criterios, la revisión y el conjunto independiente.

## Problemas frecuentes

Para preparar la evidencia científica del pitch, ejecutar desde la raíz con Node 22.18+:

```powershell
node tools/validacion/ejecutar.ts --publicar
python tools/investigacion/investigar.py --lector
```

El primer comando no necesita red: congela protocolo/casos/código, evalúa el motor de producto y publica el reporte sintético en gold. La API sirve `/ciencia/evidencia` y Acerca de lo muestra sin KPI embebidos. Si cambia motor, generador, métricas o protocolo, la auditoría se rotula histórica hasta repetirla. No convertir esa repetición en conjunto independiente. El segundo comando consulta fuentes públicas y declara el uso de un lector tercero cuando el origen no es accesible. Los datos descargados y resultados permanecen ignorados por Git. El guion y los límites están en [PITCH-CIENTIFICO](PITCH-CIENTIFICO.md).

Para adquirir MMASH con checksum/licencia y publicar su referencia fisiológica: `python pipelines/biometria/index.py mmash`. La consulta Orion y su panel están en [DATOS-Y-EVIDENCIA](DATOS-Y-EVIDENCIA.md). Son datos de referencia, nunca se añaden a la cuenta del usuario actual. Tras publicarlos, `python tools/verificacion/ensayo.py --datasets` comprueba además ambas tarjetas y su copia sin red; la opción exige que existan ambos productos. La batería de tests no descarga datasets. El [plan completo vigente](PLAN-IMPLEMENTACION-COMPLETO.md) reúne los siguientes trabajos.

| Síntoma | Solución |
| --- | --- |
| `pre-commit: no encontré Python 3.10+` | Instala Python o revisa el PATH (en Windows, los alias de la Store). El commit pasa, pero CI te va a fallar |
| CI falla en "Contexto para IA al día" | El hook no estaba activo. Corre `python tools/contextgen/contextgen.py`, commitea y empuja |
| `permission denied: .githooks/pre-commit` (Mac/Linux) | `chmod +x .githooks/pre-commit` |
| Un archivo nuevo no aparece en `MODULE.md` | El generador solo ve archivos versionados: haz `git add` primero |
| `aviso: ... fuera del patrón de carpetas` | Mueve el código a `apps/`, `pipelines/`, `packages/` o `tools/` ([ARQUITECTURA.md](ARQUITECTURA.md)) |
