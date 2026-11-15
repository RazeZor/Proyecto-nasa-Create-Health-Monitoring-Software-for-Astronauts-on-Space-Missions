# Explorador del reloj (Galaxy Watch4 · smart-monitor → VIGÍA), 2026-11-15 02:25 (UTC-3)

Informe del agente Explorador (solo lectura). `V/` = raíz de VIGÍA, `S/` = `C:\Users\ASUS-07\Documents\smart`.

**Lo más grave:** el puente da de alta como tripulante, con datos `Real`, a cualquier nombre de reloj; un desajuste en `metodo` produce cambios de instrumento falsos (pausa la línea base de FC sin motivo); `chequeo_estado` puede quedar bloqueado para siempre; el sueño del reloj se sube como autorreporte manual; el `.env` de la raíz no lo lee nadie.

## 1. Flujo de punta a punta

- **Reloj → smart-monitor:** una `lectura` por segundo a `/watch` (S/docs/PROTOCOLO.md:29-54); guarda hasta 6 h sin conexión y reenvía. El servidor persiste todo a 1 Hz en su SQLite (S/server/server.py:157-166); retransmite en vivo solo lecturas de <15 s; `resumen` ≤1/s por persona; `tripulacion` en cada (des)conexión y cada 5 s. Puerto 8765, por defecto en 127.0.0.1 (server.py:583); heartbeat 20 s.
- **smart-monitor → puente** (V/apps/api/puente_reloj.py): arranca en el lifespan solo si existe `SMART_URL` (main.py:61-73; puente_reloj.py:271-274). `websockets` con `open_timeout=10`, `ping_interval=20`, reintentos 1, 2, 4… hasta 30 s (243-257). Al conectar recibe `config`, `tripulacion`, y por tripulante `history` (360), `chequeos` (14) y `resumen`. En memoria (`EstadoReloj`, 70-144): serie de 360 `{t, fc_lpm}`, última lectura, resumen, chequeos, fase/progreso, notas y avisos (20). Se pierde al reiniciar la API. En SQLite solo entran chequeos **válidos**: FC en reposo y SpO2 con `origen=sensor`, `metodo=galaxy_watch4`, `naturaleza=Real` (33-34, 192-206), idempotentes (almacen/lecturas.py:19-21). Escrituras síncronas dentro del bucle async (226-232).
- **API:** `GET /reloj/estado` (281-286); `GET /tripulantes/{id}/reloj` busca por nombre (289-296, 185-189); órdenes 202/503 (303-316); `/reloj/tripulacion`, `/reloj/config` GET/PUT; `/reloj/export.csv` proxy con timeout 15 s (354-383).
- **Web:** sondeo cada 1,5 s solo si `device !== "disconnected"` (app-context.tsx:175-195); `device` arranca siempre en `disconnected` (110): hay que pulsar «Conectar» en cada carga (device-view.tsx:115). Estados (lib/reloj.ts:89-94): lectura vigente si puente conectado, reloj conectado, `fc_lpm` no nulo y ≤10 s (78-82); `connecting` → `lost` a los 15 s; `lost` se recupera solo.

| Caso | Efecto | Mensaje en /device |
|---|---|---|
| smart-monitor caído | `puente.conectado=false` → `lost` | `bridgeDown`; `puente.error` no se muestra |
| Sin `SMART_URL` | — | `bridgeOff` sugiere el simulador aunque en real esté bloqueado |
| API caída | `leerReloj` → null | sin diagnóstico; solo `lostDetail` genérico |
| Reloj desconectado de smart | `lost` | mismo `lostDetail`; no dice «el reloj no llega al servidor» |
| Reloj fuera de la muñeca | `fc_lpm=null` → `lost` | texto correcto |
| Nombre sin vincular | — | `notLinked` |

## 2. Contrato `/live`

| Mensaje | smart emite | Puente y web | Riesgo |
|---|---|---|---|
| `tripulacion` | tripulante, conectado, dispositivos, modelo, sdk, fc_lpm, ultima_lectura, chequeo_hoy, relojes_conectados | todo (100-106) | ninguno |
| `lectura` | t, origen, fc_lpm, ibi_ms, spo2_pct, en_muneca, calidad, mov_g, fuente_fc, dispositivo | entera (119); la web usa `t` y `fc_lpm` | se ignoran en_muneca, calidad, mov_g, ibi_ms, fuente_fc |
| `history` | lecturas completas | solo `{t, fc_lpm}` añadidos al deque (122-124) | **sin deduplicar** en cada reconexión |
| `chequeos`/`chequeo` | t, duracion_s, segundos_medidos, fc_reposo_lpm, rmssd_ms, ibi_validos, spo2_pct, mov_g_medio, en_muneca, valido, motivo, tolerancia, dispositivo | enteros (125-133); la web tipa 7 campos | al persistir se pierde `dispositivo` |
| `resumen` | fc_reposo, ventana_reposo_s, ventana_requerida_s, rmssd_ms, spo2, sueno, chequeo_hoy, chequeos_fallidos_hoy, fc_reposo_dia, notas | la web usa rmssd_ms, spo2, fc_reposo_dia, sueno | **`resumen.notas` se ignora** |
| `nota` | t, tipo, detalle | sí (140-141) | solo en vivo: tras reiniciar la API desaparece el cambio de instrumento |
| `chequeo_estado`/`chequeo_progreso` | detalle / progreso | sí (136-139) | **nunca caduca** en el puente |
| `aviso` sin tripulante (set_config inválido) | server.py:510 | se descarta (115) | el rechazo de una tolerancia no llega a la UI |
| `spo2_estado`, `sdk_estado`, `chequeo_aviso` | detalle crudo | avisos crudos (142-143; device-view.tsx:294) | sin traducir |

Sin campo de versión en el protocolo; docstring (292) y AGENTES.md:163 dicen «120 puntos» pero `MAX_SERIE=360`.

## 3. Funcionalidades de smart-monitor en VIGÍA

INTEGRADAS: FC en vivo, curva FC (con duplicados al reconectar), chequeo guiado (puede bloquearse), SpO2 a demanda, RMSSD (solo se muestra), vista de tripulación, export CSV, modelo/SDK. PARCIAL: `fc_reposo_dia` (la fuente no se guarda: `metodo` = `galaxy_watch4:gw-…`), sueño experimental (se precarga y sube como `manual`), notas `cambio_instrumento` (solo en vivo), tolerancia (presets; «personalizada» no editable), historial de 14 chequeos (solo se ve el último), varios relojes (se avisa pero se persiste). NO: en_muneca/calidad/mov_g en vivo, IBI crudos, `fc_reposo` continua con progreso de ventana, `chequeos_fallidos_hoy`.

## 4. Cómo se conecta hoy y qué es frágil

1. smart-monitor: `cd server && pip install -r requirements.txt && SMART_HOST=0.0.0.0 python server.py`.
2. Reloj: modo desarrollador + ADB por WiFi + APK (S/docs/RELOJ.md:54-81); campo «Servidor» `ws://<IP-PC>:8765/watch` (por defecto apunta al servidor público del autor, gradle.properties:5); «Tripulante» (por defecto `Tripulante XXXX`).
3. API: `SMART_URL=ws://127.0.0.1:8765/live` y `SMART_TRIPULANTES="<nombre>=1"` **en la shell**; `uvicorn`.
4. Web: identidad `NEXT_PUBLIC_VIGIA_TRIPULANTE` (1); pulsar «Conectar» en /device.

Frágil: el `.env` no se carga (la API solo lee `os.environ`); vinculación por nombre libre (con `Tripulante XXXX` la web dice `notLinked` mientras el puente crea un tripulante nuevo con datos reales, 179-182); comparación sin mayúsculas contra alias; puerto fijo y host 127.0.0.1 en smart; la UI no explica cómo emparejar ni muestra `puente.error`; hay que reconectar a mano; un 202 no garantiza que el reloj recibió la orden.

## 5. Tests existentes y huecos

API: 13 tests en `test_puente_reloj.py` (mapa y tiempo, lectura/resumen/tripulación, chequeo reemplaza, dato mínimo, url http, chequeo válido una vez, no válido no se guarda, reloj nuevo con id, estado sin configurar, privacidad, orden 503/422, tripulación y config, servidor falso). Web: 5 en `reloj.test.ts`. Huecos: reconexión y backoff, `history` duplicado, caducidad de `chequeo_estado`, aviso sin tripulante, `resumen.notas`, export 503, dos relojes con el mismo nombre, nombres por defecto, desajuste de `metodo`, desfase de reloj, componentes.

## 6. Riesgos de datos falsos

1. Alta automática de cualquier nombre como `Real` (197 `registrar=True`; 179-182); al conectar smart manda chequeos de los últimos 7 días de todos, incluidos `Tripulante XXXX` y `Tripulante previo`; con el servidor público entran relojes ajenos.
2. Dos relojes con el mismo nombre se persisten igual.
3. El puente escribe `Real` aunque la web esté en demo (independiente del modo).
4. Cambio de instrumento falso: puente `galaxy_watch4` frente a checkin `galaxy_watch4:gw-…` (rutas_dashboard.py:160-162; engine.ts:262-263).
5. `fc_reposo_dia` de `continua` o `sueno` sube como `sensor` sin fuente (contra A.6).
6. Sueño estimado guardado como `manual`.
7. Desfase de reloj: vigencia comparada con `Date.now()` del navegador (reloj.ts:81).
8. Simulador: bien aislado (solo demo).
9. Lecturas de 1 Hz: **no** se persisten en VIGÍA (cumple A.6).

## 7. Recomendaciones

**(a) Robustez:** unificar `metodo` (`galaxy_watch4:{dispositivo}` + fuente); limitar el alta automática (solo `SMART_TRIPULANTES`, vínculo explícito o alias exacto; ignorar nombres por defecto y `relojes_conectados > 1`; crear tripulantes solo con `SMART_AUTOREGISTRO=1`); caducidad de 2 min para `chequeo_estado`/`chequeo_progreso` y limpiar al desconectar; combinar `resumen.notas` con `notas`; reemplazar y deduplicar `history`; avisos globales del puente visibles con `puente.error`; sueño con `origen: sensor` y `metodo: galaxy_watch4_experimental` o sin precarga; vigencia con hora de recepción del puente; escrituras SQLite en `asyncio.to_thread`; cargar `.env`; corregir «120 puntos».

**(b) Conectar con lo mínimo:** vincular desde la UI (nombres de `/reloj/tripulacion` no vinculados + botón «Este es mi reloj» → `POST /tripulantes/{id}/reloj/vinculo`); `SMART_URL` por defecto `ws://127.0.0.1:8765/live` y editable; conexión automática recordando el estado; diagnóstico por pasos (API → smart-monitor → reloj en el servidor → muñeca) con la URL exacta a escribir en el reloj y la IP LAN que exponga la API; aviso de nombre por defecto o duplicado; `bridgeOff` sin sugerir el simulador en real; «orden enviada, esperando al reloj» confirmada con `chequeo_estado`/`spo2_estado`.

**(c) Tests:** fixture JSON compartida de mensajes `/live` como test de contrato; test opcional de extremo a extremo con `server.py`; tests del puente (reconexión, history sin duplicados, caducidad, aviso global, notas, sin alta de nombres por defecto, `metodo` con dispositivo, export 200/503/422); web (`siguienteEstado` con desfase y puente caído, componentes de diagnóstico y precarga, `cambiosDeInstrumento` mezclando puente y checkin).
