# Módulo `tools/verificacion`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Ejecutar las comprobaciones de ingeniería de una entrega con un único intérprete Python y un Node explícito, conservando resultados y logs locales reproducibles.

## Puntos clave

- `ensayo.py --demo-publica` abre la demo sin credenciales con autenticación personal activa, comprueba los tres roles, episodio simulado, separación de bandejas y cierre del acceso privado. Usa su propio `VIGIA_DEMO_DIR` temporal; no crea cuentas personales. Es incompatible con `--integral`.
- `--aislado` selecciona `.next-verificacion` en el verificador y en el ensayo de Chrome. La reapertura del navegador verifica identidad de nuevo antes de simular caída del registro; una pestaña desbloqueada sí continúa durante el corte de API dentro de su vigencia.
- `recuperar.py` usa SQLite backup (incluye WAL), verifica integridad/llaves/filas/hashes y restaura únicamente a un destino nuevo; conserva intactas las operaciones posteriores de la base original. Las copias son privadas y no se suben a Git.
- `ensayo.py --integral` usa cuentas con claves temporales para registro, episodio con una toma realmente posterior, módulos, offline e aislamiento de usuario. `ensayo_transporte.py` verifica ida y vuelta entre dos procesos/bases, con sesiones normales y credenciales generadas en memoria; no toca despliegues personales.

- `ensayo.py --datasets` exige MMASH/Orion publicados, comprueba las dos tarjetas y su copia offline, y conserva captura. Sin esa opción los campos de ese ensayo quedan null: no se presentan como aprobados; el resto de comprobaciones sigue siendo obligatorio. Los datasets se adquieren aparte, nunca durante tests unitarios.

- La batería incluye `tools/investigacion` y los tests TS de `tools/validacion`: verificar software y contratos no equivale a validar beneficio clínico. El ensayo en navegador usa servicios y base temporales, conserva el reporte científico gold y comprueba su vista sin modificar la API personal.

- Solo biblioteca estándar. `verificar.py` descubre las suites Python en los cuatro contenedores y ejecuta las mismas pruebas TS que CI; también lint, contexto y tipado. `--web` añade build de producción.
- No instala dependencias ni descarga datos ni publica cambios. Node debe ser 22.18 o posterior; `--node` permite usar un ejecutable portátil sin cambiar Windows.
- `inventario.py` comprueba hashes raw/gold y resume cobertura y esquema SQLite sin mostrar registros. Solo con `--migrar` crea un respaldo SQLite y aplica las migraciones; por defecto abre la base en solo lectura. No carga `.env`: admite rutas explícitas o variables ya exportadas.
- `ensayo.py` inicia API/web y un proxy en puertos locales libres con base temporal, ejecuta `navegador.mjs` por Chrome DevTools Protocol y detiene sus procesos. El proxy desvía `/vigia-api` a la base temporal sin cambiar el rewrite del build ni tocar la API del usuario. Requiere build previo, Node 22.18+ y Chrome/Chromium; sin dependencias npm. Prueba cierre/reapertura, pérdida de API, carcasa sin red y reenvío idempotente.
- `data/` está ignorada por Git: cada ejecución crea una carpeta UTC con logs por comprobación y `resultado.json` (HEAD, versiones, comandos, duración, códigos y resúmenes). Un fallo u omisión se conserva y devuelve código distinto de cero; una prueba omitida no se considera verificación completa.
- El resultado prueba ingeniería del software en esa copia, no eficacia clínica, reloj físico, autorización NASA ni revisión profesional.

tags: verificacion, tests, release, calidad, reproducibilidad
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [ensayo.py](ensayo.py) | 99 | Ensayo de navegador con base temporal: python tools/verificacion/ensayo.py --node RUTA [--chrome RUTA]. |
| [ensayo_transporte.py](ensayo_transporte.py) | 99 | Ensayo de ida/vuelta entre dos procesos y bases temporales, sin credenciales persistentes. |
| [flujo-demo-publica.mjs](flujo-demo-publica.mjs) | 68 | Aceptación de la entrada para evaluadores, sin crear cuentas personales. |
| [flujo-integral.mjs](flujo-integral.mjs) | 95 | Aceptación en Chrome con cuentas y datos de ensayo en una base temporal. |
| [inventario.py](inventario.py) | 89 | Auditar datalake y SQLite sin mostrar datos personales; --migrar crea respaldo antes de actualizar SQLite. |
| [navegador.mjs](navegador.mjs) | 230 | Ensayo de recuperación de informes con Chrome DevTools Protocol, sin dependencias npm. |
| [recuperar.py](recuperar.py) | 53 | Copias SQLite coherentes, con WAL y verificación, sin reemplazar ninguna base existente. |
| [test_recuperar.py](test_recuperar.py) | 40 | — |
| [verificar.py](verificar.py) | 76 | Comprobaciones reproducibles: python tools/verificacion/verificar.py [--node RUTA] [--web]. |

### API pública

**ensayo.py**

- función `esperar(url, proceso)`
- función `main()`

**ensayo_transporte.py**

- función `ejecutar()`

**flujo-demo-publica.mjs**

- función `ensayarDemoPublica`

**flujo-integral.mjs**

- función `ensayarIntegral`

**inventario.py**

- función `hash_archivo(raiz, relativa)`
- función `inventariar(datos, db)`
- función `main()`

**recuperar.py**

- función `verificar(ruta)`
- función `respaldar(origen, destino)`
- función `restaurar_en_copia(origen, manifiesto, destino)`

**verificar.py**

- función `ejecutar(nombre, comando, carpeta, destino, entorno=None)`
- función `main(argv=None)`

### Puntos de entrada

- `tools/verificacion/ensayo.py`
- `tools/verificacion/ensayo_transporte.py`
- `tools/verificacion/inventario.py`
- `tools/verificacion/verificar.py`

### Configuración y fuentes externas

- Variables de entorno: `DATALAKE_DIR`, `VIGIA_DB`, `VIGIA_E2E_API`, `VIGIA_E2E_CLAVE`, `VIGIA_E2E_DATASETS`, `VIGIA_E2E_DEMO_PUBLICA`, `VIGIA_E2E_INTEGRAL`, `VIGIA_E2E_PROXY`, `VIGIA_E2E_WEB`

### Dependencias

- Internas: `./flujo-demo-publica.mjs`, `./flujo-integral.mjs`, `recuperar`
- Externas: ninguna
- Biblioteca estándar: `argparse`, `contextlib`, `datetime`, `hashlib`, `http`, `json`, `node:assert/strict`, `node:child_process`, `node:events`, `node:fs/promises`, `node:http`, `node:os`, `node:path`, `node:timers/promises`, `os`, `pathlib`, `re`, `secrets`, `shutil`, `socket`, `sqlite3`, `subprocess`, `sys`, `tempfile`, `time`, `unittest`, `urllib`, `uuid`

### Tests

- `tools/verificacion/test_recuperar.py`: 2 pruebas en Recuperacion (2)
<!-- CONTEXT:AUTO:END -->
