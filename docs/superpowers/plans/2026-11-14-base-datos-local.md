# Base de datos local en el backend: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un almacén SQLite en `apps/api` con el modelo de la tripulación (lecturas, síntomas, líneas base, alertas, escalamientos, cola y auditoría) y sus endpoints, que corre en localhost.

**Architecture:** Paquete `apps/api/almacen/` de funciones que reciben una conexión `sqlite3` (sin ORM, solo biblioteca estándar) y un router FastAPI que las usa. La privacidad y los registros de solo adición se aplican en el almacén y en triggers de SQLite, no en el cliente.

**Tech Stack:** Python 3.12 (`sqlite3`), FastAPI (ya instalado), `unittest` con SQLite en memoria.

**Spec:** `docs/superpowers/specs/2026-11-14-base-datos-local-design.md`

## Global Constraints

- Solo biblioteca estándar en `almacen/`; FastAPI solo en el router.
- Horas en UTC ISO 8601 `YYYY-MM-DDTHH:MM:SSZ` en `t_real`; `t_mision` con la forma `D022T00:05:00`.
- Español en código, comentarios y commits; texto que ve un usuario por `t("api.error.<clave>")` en `packages/i18n` (primero `es.json`; `en.json` solo si se sabe traducir).
- Archivo de la base: `VIGIA_DB`, por defecto `apps/api/data/vigia.db` (fuera de git).
- Verde y ámbar solo los ve su dueño; rojo escala con el dato mínimo (indicador, valor, hora, tramo).
- `alerta`, `escalamiento` y `auditoria` son de solo adición.
- Cada ruta nueva lleva `summary` y `description` y aparece en `apps/api/AGENTES.md` (lo exige `test_api.py`).
- Atajos con la forma `shortcut: <límite>, <cuándo mejorar>`.
- Ramas `feat/<tema>`, commits en español e infinitivo, con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Cambios menores al diseño (decisiones del plan)

- `alerta` gana la columna `tramo` (texto) porque el escalamiento envía el tramo clínico.
- Antes de `mision.dia1_t_real` (línea base de tierra), `lectura.t_mision` es `NULL`.
- Sin consentimiento, una alerta roja **no** escala: se guarda y se anota en `auditoria` (`escalamiento_omitido`).
- `reporte_cola.estado` se guarda y `avanzar_cola` lo actualiza; no se calcula al leer.

## Review Focus

- `t_real` antes del día 1 de la misión (línea base de tierra): se guarda con `t_mision` NULL, sin error. Test en Task 3.
- `valor` NaN, infinito o no numérico: se rechaza con `ValueError`. Test en Task 3.
- Reenviar la misma lectura (reintento del cliente): devuelve el mismo `id`, sin duplicar. Test en Task 3.
- Rojo cuando el afectado es el oficial médico: va al comandante; sin consentimiento no se envía nada. Tests en Task 5.
- Un tripulante que pide las alertas de otro: no ve verdes ni ámbares y queda en `auditoria`. Test en Task 5.

## Estructura de archivos

```
apps/api/almacen/__init__.py          reexporta la API pública
apps/api/almacen/db.py                conectar, migrar, ruta_por_defecto
apps/api/almacen/migraciones/001_inicial.sql
apps/api/almacen/tripulacion.py       misión, tripulante, consentimiento, día de vuelo, semilla
apps/api/almacen/lecturas.py          lecturas y síntomas
apps/api/almacen/base.py              línea base
apps/api/almacen/alertas.py           alertas, escalamientos, auditoría, visibilidad
apps/api/almacen/cola.py              reportes con retardo
apps/api/almacen/__main__.py          CLI: migrar | sembrar
apps/api/rutas_registro.py            router FastAPI (se incluye en main.py)
apps/api/test_almacen_*.py            una prueba por módulo
```

---

### Task 1: Conexión, migraciones y esquema

**Files:**
- Create: `apps/api/almacen/__init__.py`, `apps/api/almacen/db.py`, `apps/api/almacen/migraciones/001_inicial.sql`
- Test: `apps/api/test_almacen_db.py`

**Interfaces:**
- Produces: `conectar(ruta: str | Path = None) -> sqlite3.Connection` (`row_factory=sqlite3.Row`, `PRAGMA foreign_keys=ON`, `busy_timeout=5000`; `ruta=None` usa `ruta_por_defecto()`; crea la carpeta); `migrar(conn) -> int` (aplica `NNN_*.sql` pendientes en orden y devuelve `PRAGMA user_version`); `ruta_por_defecto() -> Path` (`VIGIA_DB` o `apps/api/data/vigia.db`).

- [ ] **Step 1: Write the failing tests** (`test_almacen_db.py`)
  - `test_migrar_crea_todas_las_tablas`: con `conectar(":memory:")` y `migrar`, `sqlite_master` contiene `mision, tripulante, indicador, lectura, sintoma, linea_base, alerta, escalamiento, reporte_cola, consentimiento, auditoria`; devuelve `1`.
  - `test_migrar_es_idempotente`: dos llamadas devuelven `1` y no fallan.
  - `test_llaves_foraneas_activas`: insertar un `tripulante` con `mision_id=99` lanza `sqlite3.IntegrityError`.
  - `test_catalogo_de_indicadores`: `SELECT id FROM indicador` devuelve exactamente `presion_arterial_sistolica, spo2, temperatura_central, frecuencia_cardiaca_reposo, sueno, estado_animo, glucosa, masa_corporal`; `glucosa` y `masa_corporal` son `frecuencia='semanal'`; `sueno` y `estado_animo`, `tipo='conductual'`.
- [ ] **Step 2: Run to verify they fail:** `cd apps/api && python3 -m unittest test_almacen_db -v` → `ModuleNotFoundError: almacen`.
- [ ] **Step 3: Implement** `db.py` y `001_inicial.sql`. El SQL sigue las tablas de la spec, con `CHECK` en los enumerados (`perfil`, `rol`, `origen`, `naturaleza`, `capa`, `nivel`, `estado`, `gravedad` 1 a 3) y `UNIQUE(tripulante_id, indicador, t_real, origen)` en `lectura`. `indicador` se siembra en el mismo archivo con unidad, tipo, frecuencia y `capas` del informe (§5.1): presión A,B; SpO2 A; temperatura A; frecuencia cardíaca A,B,C; sueño B,C; ánimo B,C; glucosa B; masa corporal sin capas. `linea_base` tiene PK (`tripulante_id`, `indicador`, `origen`). Triggers `BEFORE UPDATE` y `BEFORE DELETE` con `RAISE(ABORT, ...)` en `alerta` y `auditoria`; en `escalamiento` solo se permite poner `contexto_astronauta` cuando era `NULL`.
- [ ] **Step 4: Run to verify they pass:** mismo comando → `OK`.
- [ ] **Step 5: Commit:** `git add apps/api/almacen apps/api/test_almacen_db.py && git commit -m "Agregar conexión, migraciones y esquema del almacén"`

### Task 2: Misión, tripulantes y consentimiento

**Files:**
- Create: `apps/api/almacen/tripulacion.py`, `apps/api/almacen/__main__.py`
- Modify: `apps/api/almacen/__init__.py`
- Test: `apps/api/test_almacen_tripulacion.py`

**Interfaces:**
- Consumes: `conectar`, `migrar` (Task 1).
- Produces: `crear_mision(conn, nombre: str, perfil: str, dia1_t_real: str) -> int`; `crear_tripulante(conn, alias: str, mision_id: int, rol: str) -> int`; `consentir(conn, tripulante_id: int, regla: str, t_real: str) -> None`; `tiene_consentimiento(conn, tripulante_id: int, regla: str) -> bool`; `t_mision(conn, tripulante_id: int, t_real: str) -> str | None` (`D001T00:00:00` en `dia1_t_real`; `None` antes); `dia_de_vuelo(conn, tripulante_id: int, t_real: str) -> int | None`; `sembrar_demo(conn) -> dict[str, int]` (misión `demo` perfil `estacion`, tripulantes `astronauta`, `oficial_medico`, `comandante` con consentimiento `escalamiento_rojo`; idempotente; devuelve alias → id).

- [ ] **Step 1: Write the failing tests**
  - `test_t_mision_y_dia_de_vuelo`: con `dia1_t_real="2026-11-14T00:00:00Z"`, `t_mision(.., "2026-11-15T00:05:00Z") == "D002T00:05:00"` y `dia_de_vuelo == 2`.
  - `test_antes_del_vuelo_no_tiene_t_mision`: `t_real="2026-11-10T08:00:00Z"` → `None`.
  - `test_t_real_con_formato_invalido`: `t_mision(.., "2026-11-14 00:00")` lanza `ValueError`.
  - `test_rol_y_perfil_invalidos`: `crear_tripulante(.., rol="piloto")` y `crear_mision(.., perfil="luna")` lanzan `ValueError`.
  - `test_sembrar_demo_es_idempotente`: dos llamadas devuelven los mismos tres ids y `tiene_consentimiento(.., "escalamiento_rojo")` es `True` para los tres.
- [ ] **Step 2: Run to verify they fail:** `python3 -m unittest test_almacen_tripulacion -v`.
- [ ] **Step 3: Implement** el módulo. Un helper `_utc(t_real) -> datetime` (único lugar que parsea y valida `YYYY-MM-DDTHH:MM:SSZ`) se reutiliza en los demás módulos. `__main__.py`: `python3 -m almacen migrar|sembrar` imprime el resultado en JSON.
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit:** `git commit -m "Agregar misión, tripulantes y consentimiento"`

### Task 3: Lecturas y síntomas

**Files:**
- Create: `apps/api/almacen/lecturas.py`
- Modify: `apps/api/almacen/__init__.py`
- Test: `apps/api/test_almacen_lecturas.py`

**Interfaces:**
- Consumes: `_utc`, `t_mision` (Task 2).
- Produces: `registrar_lectura(conn, tripulante_id: int, indicador: str, valor: float, t_real: str, origen: str = "manual", metodo: str | None = None, naturaleza: str = "Simulado") -> int`; `leer_lecturas(conn, tripulante_id: int, indicador: str | None = None, desde: str | None = None, hasta: str | None = None) -> list[dict]` (orden por `t_real`; dicts con las columnas de `lectura`); `registrar_sintoma(conn, tripulante_id: int, codigo: str, gravedad: int, t_real: str) -> int`; `leer_sintomas(conn, tripulante_id: int, desde: str | None = None, hasta: str | None = None) -> list[dict]`.

- [ ] **Step 1: Write the failing tests**
  - `test_registrar_y_leer`: una lectura de `spo2` 95 devuelve un dict con `valor == 95.0`, `t_mision == "D001T08:00:00"` y `naturaleza == "Simulado"`.
  - `test_reenviar_no_duplica`: dos llamadas idénticas devuelven el mismo id y `len(leer_lecturas(..)) == 1`.
  - `test_antes_del_vuelo`: `t_real` previo al día 1 se guarda con `t_mision is None`.
  - `test_valor_invalido`: `float("nan")`, `float("inf")` y `"abc"` lanzan `ValueError`.
  - `test_indicador_desconocido_y_origen_invalido`: `indicador="colesterol"` y `origen="rumor"` lanzan `ValueError`.
  - `test_filtros_por_fecha_e_indicador` y `test_gravedad_fuera_de_rango` (`gravedad=4` lanza `ValueError`).
- [ ] **Step 2: Run to verify they fail:** `python3 -m unittest test_almacen_lecturas -v`.
- [ ] **Step 3: Implement.** Reenvío idempotente con `INSERT ... ON CONFLICT(tripulante_id, indicador, t_real, origen) DO NOTHING` y luego `SELECT id`. Validar antes de tocar la base; traducir `IntegrityError` de `CHECK` a `ValueError`.
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit:** `git commit -m "Agregar lecturas y síntomas al almacén"`

### Task 4: Línea base

**Files:**
- Create: `apps/api/almacen/base.py`
- Modify: `apps/api/almacen/__init__.py`
- Test: `apps/api/test_almacen_base.py`

**Interfaces:**
- Consumes: `_utc` (Task 2).
- Produces: `guardar_linea_base(conn, tripulante_id: int, indicador: str, origen: str, mediana: float, mad: float, n: int, desde: str, hasta: str) -> None` (reemplaza la fila de la misma clave); `obtener_linea_base(conn, tripulante_id: int, indicador: str, origen: str) -> dict | None`.

- [ ] **Step 1: Write the failing tests**
  - `test_guardar_reemplaza`: dos llamadas con medianas 60 y 62 dejan una fila con `mediana == 62`.
  - `test_origen_tierra_y_vuelo_conviven`: `tierra` y `vuelo` del mismo indicador son filas distintas.
  - `test_mad_negativo_o_n_no_positivo`: `mad=-1` y `n=0` lanzan `ValueError`; `desde > hasta` también.
  - `test_obtener_inexistente_devuelve_none`.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** con `INSERT OR REPLACE`; validaciones antes de escribir.
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit:** `git commit -m "Agregar línea base al almacén"`

### Task 5: Alertas, escalamiento, auditoría y visibilidad

**Files:**
- Create: `apps/api/almacen/alertas.py`
- Modify: `apps/api/almacen/__init__.py`
- Test: `apps/api/test_almacen_alertas.py`

**Interfaces:**
- Consumes: `t_mision`, `tiene_consentimiento`, `_utc` (Task 2).
- Produces: `anotar(conn, actor_id: int | None, accion: str, entidad: str, entidad_id: int | None, detalle: dict | None = None) -> int`; `registrar_alerta(conn, tripulante_id: int, indicador: str, capa: str, nivel: str, valor: float, t_real: str, explicacion: str, regla_version: str, tramo: str | None = None) -> int` (si `nivel == "rojo"` y `capa == "A"`, llama a `escalar`); `escalar(conn, alerta_id: int) -> int | None` (destinatario: oficial médico de la misión; si el afectado es el oficial médico, el comandante; sin consentimiento, anota `escalamiento_omitido` y devuelve `None`; `contenido` JSON con exactamente `indicador`, `valor`, `t_real`, `tramo`); `agregar_contexto(conn, escalamiento_id: int, texto: str) -> None`; `alertas_visibles(conn, actor_id: int, tripulante_id: int) -> list[dict]` (dueño: todas; otro: solo rojas con escalamiento a él; si `actor_id != tripulante_id` anota `lectura_ajena`).

- [ ] **Step 1: Write the failing tests**
  - `test_rojo_capa_a_escala_al_oficial_medico`: devuelve un escalamiento con `destinatario_id == oficial` y `json.loads(contenido).keys() == {"indicador","valor","t_real","tramo"}`.
  - `test_si_el_afectado_es_el_oficial_va_al_comandante`.
  - `test_sin_consentimiento_no_escala_y_se_audita`: no hay fila en `escalamiento`; `auditoria` tiene `escalamiento_omitido`.
  - `test_verde_y_ambar_no_escalan`.
  - `test_alerta_no_se_puede_actualizar_ni_borrar`: `UPDATE`/`DELETE` lanzan `sqlite3.IntegrityError`; igual con `auditoria`.
  - `test_contexto_se_agrega_una_sola_vez`: la segunda llamada lanza `sqlite3.IntegrityError`; cambiar `contenido` también.
  - `test_visibilidad`: el oficial ve la roja escalada pero no la ámbar del astronauta; el dueño ve ambas; un tercero no ve ninguna; el acceso ajeno deja `lectura_ajena` en `auditoria`.
- [ ] **Step 2: Run to verify they fail:** `python3 -m unittest test_almacen_alertas -v`.
- [ ] **Step 3: Implement.** `registrar_alerta` y `escalar` en una sola transacción. `alertas_visibles` filtra en SQL, no en Python.
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit:** `git commit -m "Agregar alertas, escalamiento y auditoría de solo adición"`

### Task 6: Cola de reportes con retardo

**Files:**
- Create: `apps/api/almacen/cola.py`
- Modify: `apps/api/almacen/__init__.py`
- Test: `apps/api/test_almacen_cola.py`

**Interfaces:**
- Consumes: `_utc` (Task 2).
- Produces: `encolar_reporte(conn, tripulante_id: int, creado_t_real: str, retardo_min: int) -> int` (`retardo_min` entre 3 y 22; `llega_t_real = creado + retardo`; estado `en_cola`); `avanzar_cola(conn, ahora: str) -> int` (pasa a `entregado` los reportes con `llega_t_real <= ahora`; devuelve cuántos); `responder_reporte(conn, reporte_id: int, respuesta: str, t_real: str) -> None` (solo si está `entregado` y `t_real >= llega_t_real`; estado `respondido`); `leer_reportes(conn, tripulante_id: int) -> list[dict]`.

- [ ] **Step 1: Write the failing tests**
  - `test_llega_tras_el_retardo`: creado `08:00:00Z`, retardo 10 → `llega_t_real == "2026-11-14T08:10:00Z"`.
  - `test_avanzar_cola`: a `08:09:59Z` devuelve 0; a `08:10:00Z` devuelve 1 y el estado es `entregado`.
  - `test_retardo_fuera_de_rango`: 2 y 23 lanzan `ValueError`.
  - `test_responder_antes_de_entregar_falla`: `ValueError`; después de `avanzar_cola`, deja `respondido`.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit:** `git commit -m "Agregar cola de reportes con retardo"`

### Task 7: Endpoints HTTP

**Files:**
- Create: `apps/api/rutas_registro.py`
- Modify: `apps/api/main.py` (incluir el router y migrar al arrancar), `packages/i18n/locales/es.json` (y `en.json` si se sabe traducir)
- Test: `apps/api/test_api_registro.py`

**Interfaces:**
- Consumes: todo `almacen` (Tasks 1 a 6).
- Produces (todas con cabecera `X-Tripulante: <id>`; el tripulante debe existir, si no, 401; escribir datos de otro, 403):
  - `POST /tripulantes/{id}/lecturas` → 201 `{"id": n}`; `GET /tripulantes/{id}/lecturas?indicador=&desde=&hasta=`
  - `POST /tripulantes/{id}/sintomas`; `GET /tripulantes/{id}/sintomas`
  - `PUT /tripulantes/{id}/linea-base/{indicador}/{origen}`; `GET` de la misma ruta (404 si no hay)
  - `POST /tripulantes/{id}/alertas` → 201 `{"id": n, "escalamiento_id": n | null}`; `GET /tripulantes/{id}/alertas` (según `alertas_visibles`)
  - `POST /tripulantes/{id}/reportes`; `GET /tripulantes/{id}/reportes`; `POST /reportes/{reporte_id}/respuesta`
  - Errores de validación (`ValueError`) → 422 con mensaje de `t("api.error.<clave>")`. Claves nuevas: `actor_desconocido`, `sin_permiso`, `dato_invalido`, `linea_base_no_existe`.
- Conexión por petición con `Depends`; `VIGIA_DB` se lee en cada petición (los tests lo apuntan a un archivo temporal). `main.py` llama `migrar` en el evento de arranque.

- [ ] **Step 1: Write the failing tests** (`TestClient`, `VIGIA_DB` temporal, `sembrar_demo`)
  - `test_sin_cabecera_o_actor_inexistente_da_401`.
  - `test_escribir_en_otro_tripulante_da_403`.
  - `test_lectura_ida_y_vuelta` y `test_lectura_invalida_da_422` (`valor: "abc"`).
  - `test_alerta_roja_devuelve_escalamiento_y_el_oficial_la_ve`; `test_un_tercero_no_ve_la_ambar`.
  - `test_reporte_y_respuesta_tras_avanzar_la_cola`.
  - `test_mensajes_de_error_salen_de_i18n` (el 403 trae el texto de `api.error.sin_permiso`).
- [ ] **Step 2: Run to verify they fail:** `python3 -m unittest test_api_registro -v`.
- [ ] **Step 3: Implement** el router y las claves de `es.json`. `shortcut: el tripulante se declara en la cabecera X-Tripulante sin autenticación real; reemplazar por sesión firmada antes de uso fuera de localhost`.
- [ ] **Step 4: Run to verify they pass.** Además, `python3 -m unittest discover -s apps/api` completo.
- [ ] **Step 5: Commit:** `git commit -m "Agregar endpoints de registro, alertas y cola"`

### Task 8: Documentación y cierre

**Files:**
- Modify: `apps/api/AGENTES.md`, `apps/api/MODULE.md`, `.github/workflows/context.yml` (solo si hace falta), `docs/SETUP.md` (cómo crear y sembrar la base)
- Test: `apps/api/test_api.py` (ya existente: exige que cada ruta esté documentada)

**Interfaces:**
- Consumes: rutas de Task 7.

- [ ] **Step 1: Run to verify the guard fails:** `python3 -m unittest test_api.Api.test_openapi_documentado_para_agentes -v` → falla porque las rutas nuevas no están en `AGENTES.md`.
- [ ] **Step 2: Document** cada ruta nueva en `AGENTES.md` (tabla, cabecera `X-Tripulante`, reglas de visibilidad, ejemplo real de una lectura y de una alerta roja con su escalamiento, obtenidos de la API sembrada) y actualizar `MODULE.md` (puntos clave: almacén, solo adición, privacidad, `VIGIA_DB`, atajo de autenticación).
- [ ] **Step 3: Run to verify it passes** y `python3 tools/contextgen/contextgen.py --check`.
- [ ] **Step 4: Verificación manual:** `cd apps/api && python3 -m almacen migrar && python3 -m almacen sembrar && uvicorn main:app --port 8000`, registrar una lectura y una alerta roja con `curl` y comprobar que el oficial médico la ve y el comandante no.
- [ ] **Step 5: Commit y PR:** `git commit -m "Documentar el almacén y sus endpoints"`; abrir PR hacia `main`; actualizar la tarjeta de Miro.

---

## Self-review

- **Cobertura de la spec:** tablas y reglas (Tasks 1 a 6), privacidad y auditoría (Task 5), endpoints, documentación de agentes y archivo fuera de git (Tasks 7 y 8; `.gitignore` ya está en la rama del diseño). Sin tabla de entorno, como pide la spec.
- **Tipos:** `_utc`, `t_mision`, `tiene_consentimiento` se definen en Task 2 y se usan igual después; `registrar_alerta` recibe `tramo` y `escalar` lo vuelca al `contenido`.
- **Proporción:** los pasos dan firmas, valores y pruebas; el cuerpo de cada función lo escribe quien implementa.
- **Fuera del plan:** el motor híbrido (quién calcula las alertas) y la autenticación real, como dice la spec.
