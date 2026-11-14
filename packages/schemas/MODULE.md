# Módulo `packages/schemas`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Contratos de datos entre `pipelines/` y `apps/`. Hoy contiene el esquema de las fichas de indicador y la prueba que valida las fichas publicadas en `apps/web/public/fichas/`.

## Puntos clave

- `ficha.schema.json` define los seis campos del reto (qué es, cómo se mide en vuelo, por qué hace falta, qué peligro lo altera, cuándo avisar, qué prevención) más `fuentes`. `como_se_mide_en_vuelo` se separa por perfil: `estacion`, `transito` y `superficie`.
- `peligro` es una lista con los cinco peligros del HRP (`radiacion`, `aislamiento`, `distancia`, `gravedad_alterada`, `entorno_cerrado`). El informe §3.2 lo muestra como texto suelto; aquí es lista porque un indicador (síntomas) responde a más de uno.
- Un `null` en `unidad`, `referencia_en_vuelo` o `prevencion` significa que el informe no lo respalda: la app no debe inventarlo. Hoy 8 de las 10 fichas tienen `prevencion` en `null`.
- Cada ficha cita al menos una fuente. `url: null` es una cita al informe técnico sin enlace verificado (la ficha de glucosa solo tiene esa).
- Los datos viven en `apps/web/public/fichas/<id>.json`, con `index.json` como lista de ids; el nombre del archivo es el `id`. Las fichas están solo en español.
- `test_fichas.py` usa un validador mínimo con solo biblioteca estándar: cubre los términos que usa el esquema. Si el esquema crece, cambiar a una biblioteca de JSON Schema.
- `vocabulario.json` es el contrato de vocabulario entre la interfaz (claves `ui` en inglés) y la API (claves de la base, en español): indicadores con su zona del cuerpo, niveles, capas, roles, perfiles, retardo por perfil y síntomas. Las claves de la API son las canónicas; la interfaz traduce en el borde. `test_vocabulario.py` lo compara con la migración SQL, las fichas y `apps/web/lib/types.ts`: si un lado cambia sin el contrato, falla. Sus apartados `sin_equivalente` y `pendiente_en_la_base` listan lo que aún no encaja (diastólica, retardo 0 min, códigos de síntoma libres).
- Si cambia el esquema, se versiona: las apps leen estos archivos sin importar código de `packages/`.

## Relación con el informe

- §3.2 Fichas de indicador y su esquema. §2.4 Metrología (instrucción por perfil). §5.1 Motor híbrido (tramos de la capa A y umbrales de B y C usados en `cuando_avisar`).

tags: schemas, contratos, fichas, indicadores, json-schema, peligros, hrp
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [test_fichas.py](test_fichas.py) | 79 | Valida las fichas de apps/web/public/fichas contra ficha.schema.json (solo biblioteca estándar). |
| [test_vocabulario.py](test_vocabulario.py) | 65 | El contrato vocabulario.json no puede desviarse de lo que de verdad usan la base de datos, las fichas y la interfaz. |

### Dependencias

- Externas: ninguna
- Biblioteca estándar: `json`, `pathlib`, `re`, `unittest`

### Tests

- `packages/schemas/test_fichas.py`: 4 pruebas en Fichas (4)
- `packages/schemas/test_vocabulario.py`: 6 pruebas en Vocabulario (6)
<!-- CONTEXT:AUTO:END -->
