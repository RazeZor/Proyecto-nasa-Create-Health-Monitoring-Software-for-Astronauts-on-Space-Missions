# Verificación de la integración de VIGÍA

Revisión local: 15-nov-2026; ejecución en UTC del 16-nov. Base: `cf5d53f184ea71ebf6e638d08e7ebee95f9c548c`, rama `docs/analisis-innovacion-vigia` con cambios locales. Sustituye la revisión anterior sobre 817c78e.

## Cierre posterior: plan completo y datasets reales

### Demo pública para evaluación, 16-nov-2026

La pantalla de acceso ofrece «Explorar demo», también disponible en `/?demo=1`, sin cuenta ni contraseña. Cada visitante recibe una sesión de ocho horas y una base simulada independiente; los tres roles exploran ese espacio. El almacenamiento del navegador incorpora el identificador de la demo. La API personal conserva su autenticación y rechaza peticiones marcadas como demo, incluso con una cookie personal válida. No se incluyen cuentas compartidas ni contraseñas en el código.

- **414 pruebas locales: 293 Python y 121 Node**, sin fallos ni omitidas; contexto, Ruff, tipos y build de producción aprobados. Resultado: `tools/verificacion/data/20261116T130659Z/resultado.json`.
- Chrome sin credenciales: `ensayo-20261116T131907Z/resultado.json`. Tres roles, nueve observaciones simuladas, episodio revisado, informes ficticios, API personal cerrada, puente del reloj ausente, bandeja personal conservada y sesión recuperada. Cero excepciones.
- Regresión del acceso personal en Chrome: `ensayo-20261116T133259Z/resultado.json`. Dieciocho observaciones, episodio/acción/nueva toma/revisión, recuperación local, sueño, reacción interrumpida, continuidad de pestaña offline y aislamiento del segundo usuario. Cero excepciones.
- Los ensayos usan bases y perfiles temporales; no validan eficacia clínica ni constituyen una evaluación oficial de NASA. Los artefactos permanecen ignorados por Git.

### Ejecución del plan, 16-nov-2026

Rama `feat/ejecutar-plan-integral`, con referencia `origin/main` en `b55d0f8` (PR #67 ya fusionado). La presentación final T38 no se implementó.

- **406 pruebas locales: 286 Python y 120 Node**, sin fallos ni omitidas. Contexto, lint de contexto, Ruff, tipado y build de producción separado en verde. Python 3.14.1 y Node 22.18 en Windows. Reporte final: `tools/verificacion/data/20261116T115556Z/resultado.json`. CI Python 3.12/Linux de esta nueva entrega sigue pendiente.
- Chrome con sesiones verificadas: `ensayo-20261116T120211Z/resultado.json`. Guardó 18 observaciones, abrió episodio, registró acción, exigió nueva toma posterior, enlazó remedición y solicitó revisión. También verificó IndexedDB al recargar, diario de sueño, reacción interrumpida no comparable, pestaña offline y separación del segundo usuario. Cero excepciones.
- Chrome de recuperación/datasets: `ensayo-20261116T120254Z/resultado.json`. Reinicio de navegador, cola durable, reintento sin duplicación, carcasa sin red, evidencia actual/offline/móvil/inglés y MMASH/Orion. Cero excepciones. La reapertura verifica identidad antes de simular caída del registro; no demuestra un desbloqueo offline ilimitado tras cerrar el navegador.
- Transporte real de ensayo entre dos procesos y dos bases: `transporte-20261116T114554Z/resultado.json`. Sesiones normales, acuse de destino, respuesta causal y reintento sin duplicado. Sin destino externo real ni supervisión clínica.
- Inventario `inventario-20261116T120410378410Z`: 22 originales ambientales y 17 productos gold con hashes correctos; SQLite local v11 e integridad `ok`. Los datasets siguen separados de las mediciones personales.

Los directorios anteriores están bajo `tools/verificacion/data/` y no se suben a Git. El banco y las limitaciones científicas se detallan en [EJECUCION-PLAN](EJECUCION-PLAN.md).

**Incidente de aislamiento detectado:** aunque los ensayos apuntaron a SQLite temporales, la base local pasó de v6 a v11 mientras la carpeta SQL era compartida con servicios abiertos. El migrador consulta esa carpeta en cada petición; el build separado no impedía descubrir nuevas migraciones. No se revirtió ni se borró la base. Se creó `conservacion-20261116T120536Z/estado-actual.db` con manifiesto/hash y se contrastó con la copia v6 de `inventario-20261116T000657950532Z/respaldo.db`: ninguna fila previa ausente en misión, tripulante, indicador, lectura, síntoma, alerta, escalamiento, auditoría ni cuentas experimentales. Las 18 lecturas de aquella copia siguen entre las 63 actuales. Integridad y llaves correctas; cero cuentas nuevas de ensayo en la base personal. La copia es privada e ignorada por Git. SETUP ahora exige aislar también el worktree o detener el servicio antes de incorporar SQL.

### Antecedente del PR #67

**Antecedente:** la revisión de 373 pruebas de esta sección precede a la [ejecución del plan](EJECUCION-PLAN.md), que incorpora observaciones, sesiones, IndexedDB, episodios, receptor Tierra y módulos científicos. Sus comprobaciones se registran por separado.

El [plan vigente](PLAN-IMPLEMENTACION-COMPLETO.md) contiene T01–T44, dependencias, responsables por ámbito, criterios, datos, calendario orientativo y puertas. `tools/verificacion/data/plan-completo-comprobado.json` comprueba los 44 IDs sin duplicados/faltantes y sus enlaces locales. T25/T26 registran la primera adquisición como parcial; el resto del plan no se presenta como implementado.

La batería posterior aprobó **373 pruebas: 265 Python y 108 Node**, sin fallos ni omitidas; contexto, Ruff, tipos y build en verde. Artefacto: `tools/verificacion/data/20261116T020606Z/resultado.json`. Incluye cuatro tests del importador biométrico, tres de datasets en API, uno del contrato MMASH y dos del lector cliente, además de la regresión del saneamiento de URL RadLab dentro del test existente.

MMASH v1.0.0 realmente adquirido: 22 sujetos, 1.749.295 intervalos originales y 22 periodos de sueño; 1.701.696 intervalos agregables, 5.944 puntos de 5 min. Los 47.599 con día `-29` se conservan sin corregir ni fechar artificialmente. Se verificaron ZIP/licencia contra sumas oficiales; raw, curated, gold, procesador y esquema coinciden. Producto idempotente comprobado. Orion: 3.456 observaciones de cuatro instrumentos el 17-nov-2022; escenario y panel publicados con detectores separados. [Alcance y comandos](DATOS-Y-EVIDENCIA.md).

`inventario-20261116T020821807090Z/resultado.json`: 22 entradas raw ambientales y 17 productos gold íntegros; RadLab pasa a 10 archivos y 39.315 filas únicas. MMASH conserva aparte tres originales con su manifiesto en `pipelines/biometria/data/`. SQLite v6 sigue íntegro; los datasets no se escriben como datos del usuario. `datasets-incorporados-20261116.json` verifica además los hashes biométricos, la versión del procesador/esquema y HTTP 200 de ambas referencias en API y proxy local; el HTML pertenece al build instalado.

Chrome `ensayo-20261116T021100Z/resultado.json`, ejecutado con `--datasets`: ambas tarjetas, copia offline, informe recuperado tras reinicio, reintento sin duplicados, panel científico, móvil e inglés; cero excepciones. Captura `datasets-adquiridos.png` revisada visualmente. Los servicios propios se recargaron con la misma base y puertos; logs en `servicios-datasets-20261116T021059Z`. Los datos siguen ignorados por Git. No se evaluó eficacia del motor con los nuevos datasets ni se obtuvo un dictamen profesional en esta ampliación.

## Ampliación científica anterior del 16-nov-2026 UTC

La batería final ejecutó **363 pruebas: 257 Python y 106 Node, sin fallos ni omitidas**. Incluye investigación, contrato de afirmaciones, vigencia e integridad de `/ciencia/evidencia`, lectura defensiva en la app, elegibilidad, comparadores/ablaciones e integridad de los datos del pitch. Ruff, contexto y tipado aprobaron. Artefactos del comando global final: `tools/verificacion/data/20261116T013334Z/resultado.json`. La compilación de la interfaz final aprobó en `20261116T012914Z/resultado.json`; después solo se corrigió el desglose del banco y se repitió la batería completa sin recompilar una interfaz idéntica.

Banco publicado: `tools/validacion/data/20261116T013201320Z/resultado.json`, con protocolo, casos y congelación junto al resultado. Se evaluó el motor TS real sin reajustarlo: 780 misiones sintéticas, trece escenarios y siete métodos. V1.1 separa las comprobaciones ambientales deterministas y fortalece el negativo ambiental; conserva idénticos casos, detector y resultados fisiológicos (`comparacion-enmienda.json`). La enmienda se declara posterior a inspeccionar v1, sin atribuirle independencia. Resultado completo visible en Acerca de y `/ciencia/evidencia`. El banco es exploratorio del mismo equipo, no reservado ni clínico. Detecta 1/60 derivas sutiles; el dato adverso se conserva en el pitch.

Inventario final: `tools/verificacion/data/inventario-20261116T013518751129Z/resultado.json`: 21 entradas raw y catorce productos gold con hashes correctos; SQLite v6, quick_check correcto y las tablas existentes conservadas. La ampliación no añadió mediciones humanas ni nuevas descargas ambientales.

Chrome final: `tools/verificacion/data/ensayo-20261116T013344Z/resultado.json`. Aprobó informe recuperado tras cerrar Chrome, recarga sin red, pérdida de API, reintento con la misma operación sin duplicados, panel científico vigente, copia local rotulada sin verificar, vista de 390 px sin desbordamiento de página e inglés; cero excepciones. Se revisaron visualmente `evidencia-cientifica.png` y `evidencia-movil.png`. Se ajustaron decimales al idioma y se añadió indicación de desplazamiento horizontal y acceso por teclado a la tabla. El primer ensayo ampliado quedó esperando porque el temporizador del cierre mataba el siguiente Chrome: se corrigió capturando el proceso concreto, cancelando el temporizador y acotando esperas. Se detuvo solo ese proceso del ensayo; no fue un resultado aprobado y sus logs se conservan en `ensayo-20261116T012246Z`.

Carga local: se reiniciaron únicamente la API y la web previamente identificadas, conservando datos y puertos 8000/3000. `tools/verificacion/data/carga-local-20261116.json` confirma HTTP 200 en API, proxy y web; auditoría v1.1 vigente, revisión profesional pendiente y build instalado coincidente. Los logs y metadatos están en `servicio-api-20261116T012520Z` y `servicio-web-20261116T013332Z`. Sin publicación remota, commit o push. Se actualizó el generador de diapositivas y se verificaron sintaxis/lectura de evidencia; no se generaron ni se revisaron nuevos binarios PPTX. El guion de siete diapositivas y treinta segundos sí está escrito.

Fuentes: diez fichas de ganadores 2025 leídas, guías actuales y artefactos públicos seleccionados, con manifiestos y vías de acceso; no se ejecutaron todos sus demos o repositorios. Comprobación bibliográfica: 35 DOI/títulos identificados, 33 coincidencias de fragmentos y dos `REVISAR_TEXTO`. No equivale a revisión semántica o profesional. [Alcance de la investigación](GANADORES-2025-Y-ESTRATEGIA-CIENTIFICA.md), [protocolo profesional pendiente](PROTOCOLO-REVISION-CIENTIFICA.md) y [guion de pitch](PITCH-CIENTIFICO.md).

## Hito de ingeniería anterior y alcance

La batería global aprobó **340 pruebas: 247 Python y 93 TypeScript, sin fallos ni omitidas**. Ruff, contexto, tipado y build aprobaron. Chrome comprobó recuperación de un informe tras cerrar el navegador, pérdida de API y recarga sin red, con reenvío sin duplicados. Las entregas concretas están en [PLAN-MAESTRO §1.1](PLAN-MAESTRO.md).

Siguen pendientes observaciones con tiempos propios, identidad autenticada, aislamiento general del HealthStore, episodios completos, receptor independiente en Tierra y benchmark reservado. No se hicieron ensayos humanos, caracterización del reloj físico ni revisión profesional. El producto completo aún no está terminado ni validado para vuelo.

## Base y entorno

- `git fetch origin` completado y `git merge origin/main`: `Already up to date`. HEAD y origin/main coinciden en cf5d53f; el nombre local main sigue en 817c78e.
- Hook `.githooks` activo. Sin cambios globales de Git, commit, push, PR o despliegue. Se conservaron los documentos preexistentes y se registró intención de añadir los archivos nuevos para contextgen.
- Python: `venv/Scripts/python.exe`, 3.14.1. CI usa 3.12; esa combinación no se declara ejecutada aquí.
- Node: 22.18.0 portátil en `apps/web/node_modules/.cache/runtime/node.exe`, extraído del ZIP oficial tras verificar SHA-256 contra SHASUMS256 de nodejs.org. Node global 22.12.0 no se modificó.
- Instalados websockets 15.0.1 y ruff 0.17.5 en el venv existente; las demás dependencias API ya estaban presentes. Sin nuevas dependencias npm/de producto. Gestor/lock canónicos: pnpm 12.3.4 y pnpm-lock.yaml.
- No se ensayó una instalación nueva desde cero.

## Pruebas automatizadas

[Resultado global JSON](../tools/verificacion/data/20261116T002221Z/resultado.json), con logs por comprobación en esa carpeta ignorada.

| Ámbito | Resultado |
| --- | --- |
| pipelines/datalake | 12 aprobadas |
| pipelines/reanclaje | 49 aprobadas |
| packages/schemas | 15 aprobadas |
| packages/i18n | 8 aprobadas |
| tools/contextgen | 9 aprobadas |
| tools/sincro-smart | 7 aprobadas |
| tools/validar-referencias | 7 aprobadas |
| apps/api | 140 aprobadas, ninguna omitida |
| Total Python | 247 aprobadas |
| Motor y lógica web en Node | 93 aprobadas, ninguna omitida |
| Ruff; contextgen --check / --lint | Código 0 |
| TypeScript sin emisión | Código 0 |
| Next build con TypeScript habilitado | Código 0; 34 páginas generadas |

Se repitieron las 93 pruebas TS tras el ajuste final de rotulado: [log final](../tools/verificacion/data/typescript-final.log). El [build final](../tools/verificacion/data/build-final.log) conserva la compilación posterior a esos cambios.

La suite del puente ya no se omite por falta de websockets. Tras cerrar las conexiones de las fixtures SQLite hubo **0 apariciones de ResourceWarning**. Persiste un aviso de deprecación de Starlette sobre httpx en TestClient; no produce fallos y no se oculta.

Regresiones cubiertas: migraciones duplicadas rechazadas antes de escribir; upgrades de ambas variantes v4 sin pérdida; rollback e idempotencia; síntomas/informes concurrentes sin duplicados; conflicto HTTP 409 sin sobrescritura y 403 para otro propietario; bandeja reabierta y aislada por misión/persona/modo; pérdida de acuse, almacenamiento lleno/corrupto; contador sin falsa recepción; referencias sin acciones de cabina, conservando extremos fisiológicos; dosis por detector/magnitud; cobertura DONKI por intervalo; raw inmutable; claves ausentes de manifiestos/errores; KPI divergente rechazado antes de publicar.

## Ensayo de navegador

Comando: `venv/Scripts/python.exe tools/verificacion/ensayo.py --node apps/web/node_modules/.cache/runtime/node.exe`.

[Ensayo sobre el build final](../tools/verificacion/data/ensayo-20261116T002855Z/resultado.json) y [captura](../tools/verificacion/data/ensayo-20261116T002855Z/bandeja-recuperada.png), completado a las 00:29:19Z. Usa datos demo en una base temporal, puertos libres, proxy aislado y perfil temporal; no la base ni la API activa de la persona.

1. Cargar informes/catálogo/carcasa en modo demo.
2. Bloquear solo `/vigia-api`, crear el informe y comprobar su operación persistida.
3. Cerrar Chrome completo, reabrir y recuperar el mismo id/contenido sin API.
4. Cortar la red del navegador, recargar y recuperar la pantalla por el service worker.
5. Reconectar y comprobar un informe en SQLite.
6. Reenviar el mismo cuerpo como si se perdiera el acuse: mismo id y una sola fila.

Todas las condiciones pasaron, con **0 excepciones del navegador**. Prueba el mecanismo sobre datos demo; no el protocolo de medidas reales ni todos los recorridos por rol.

Incidencias de entorno corregidas: tipos Next obsoletos regenerados; Expand-Archive superaba MAX_PATH y se extrajo solo node.exe del ZIP validado; CacheStorage no completaba la instalación con el perfil bajo la ruta larga del repositorio, por lo que el ensayo usa un perfil corto en el temporal de Windows y lo limpia al terminar. Los intentos fallidos no se contaron como aprobados.

## Datos y base local

[Inventario final](../tools/verificacion/data/inventario-20261116T002848558655Z/resultado.json): 21 entradas raw y 13 productos gold, todos con SHA-256 correcto. También se republicaron los tres paneles antiguos para aplicar la separación por detector y retirar su comparación personal. GOES 1.719 filas únicas, DONKI 45 (31 del viaje), RadLab 35.859 y EDA 1.440. Auditoría adicional: 0 URLs de manifiesto con claves/tokens y 0 paneles con porcentaje personal. Huecos y límites en [DATOS-Y-EVIDENCIA](DATOS-Y-EVIDENCIA.md).

- Publicados ambos paneles. La consulta DONKI reciente vacía no acredita el futuro completo solicitado por mision-real; queda en `faltan`.
- KPI reproducido con semilla 2026 y 500 misiones; fixture y gold tienen SHA-256 `8dfb46c5d5c3b2c8c76aed8cd4e9cee5370ca1a56b8ac70f634c9c4c105b13cd` en este checkout. La segunda semilla sigue siendo evaluación sintética del mismo generador, no validación externa.
- Respaldo previo: `tools/verificacion/data/inventario-20261116T000657950532Z/respaldo.db`. Base local migrada v4→v6, quick_check ok, reloj_vinculo recuperado y cuentas conservadas sin activar autenticación.
- [Restauración ensayada](../tools/verificacion/data/restauracion-20261116T002617Z/resultado.json): restaurar respaldo en otra base temporal, migrar a v6, quick_check ok y conteos originales conservados. No se reemplazó la base activa para ensayarlo.
- Raw original conservado. Datos, SQLite y artefactos quedan fuera de Git. Los respaldos contienen datos personales y requieren los mismos permisos que el original.

## Repetir la verificación

```powershell
.\venv\Scripts\python.exe tools/contextgen/contextgen.py --check
.\venv\Scripts\python.exe tools/verificacion/verificar.py --node apps/web/node_modules/.cache/runtime/node.exe --web
.\venv\Scripts\python.exe tools/verificacion/inventario.py
.\venv\Scripts\python.exe tools/verificacion/ensayo.py --node apps/web/node_modules/.cache/runtime/node.exe
```

Con Node 22.18+ en PATH se omite `--node`. En otro sistema, indicar Chrome/Chromium con `--chrome`. Las herramientas no descargan dependencias ni datos automáticamente. Ejecutar el ensayo después del build; no compilar sobre la misma `.next` mientras su servidor de prueba esté en uso.
