# Módulo `packages/schemas`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Contratos de datos puros entre `pipelines/` y `apps/`. Define los esquemas JSON Schema (Draft 2020-12) para fichas de indicador, perfiles de misión, lecturas fisiológicas/conductuales, entorno espacial Gold y casos de referencia de la simulación, junto con un validador con biblioteca estándar y el catálogo estático de perfiles (`perfiles.json`).

## Puntos clave

- `validador.py` implementa validación JSON Schema con biblioteca estándar (soporte de `$ref` locales entre esquemas de `packages/schemas/`) para que ningún paquete ni pipeline añada dependencias externas.
- `ficha.schema.json` define los seis campos del reto (qué es, cómo se mide en vuelo, por qué hace falta, qué peligro lo altera, cuándo avisar, qué prevención) más `fuentes`. `como_se_mide_en_vuelo` se separa por perfil: `estacion`, `transito` y `superficie`.
- `perfiles.schema.json` y `perfiles.json` fijan los 5 perfiles de misión (§3.3 del informe): presión de cabina (`760`, `527`, `424 mmHg`), latencia unidireccional y gravedad (`microgravedad`, `lunar`, `marciana`). `apps/` y `pipelines/` consumen los mismos valores sin duplicarlos.
- `lectura.schema.json` define el contrato diario de check-in del tripulante (`dia_mision`, signos vitales, sueño, síntomas e estado conductual, contexto CO₂/tormenta y doble marca temporal con `t_real` UTC).
- `entorno-gold.schema.json` valida los JSON producidos por `pipelines/reanclaje` (escenarios `serie5min`/`diario` y paneles `panel-*` con dosis acumulada, protones, cabina y eventos DONKI).
- `caso-referencia.schema.json` valida los casos de prueba reproducibles y KPI de la simulación (`pipelines/reanclaje/simulacion.py`) para verificar de forma idéntica el futuro motor híbrido (`packages/engine`).
- `vocabulario.json` es el contrato de vocabulario entre la interfaz (claves `ui` en inglés) y la API (claves de la base, en español): indicadores con su zona del cuerpo, niveles, capas, roles, perfiles, retardo por perfil y síntomas. Las claves de la API son las canónicas; la interfaz traduce en el borde. `test_vocabulario.py` lo compara con la migración SQL, las fichas y `apps/web/lib/types.ts`: si un lado cambia sin el contrato, falla. Sus apartados `sin_equivalente` y `notas` documentan lo que aún no encaja (diastólica).
- `peligro` es una lista con los cinco peligros del HRP (`radiacion`, `aislamiento`, `distancia`, `gravedad_alterada`, `entorno_cerrado`). Un `null` en `unidad`, `referencia_en_vuelo` o `prevencion` significa que el informe no lo respalda.
- Los datos de fichas viven en `packages/schemas/fichas/<id>.json` con `index.json`; la app los recibe por la API (`GET /fichas`), nunca los importa. Si cambia cualquier esquema, se versiona aquí antes de tocar los consumidores.

- `fichas_en/<id>.json` trae la traducción al inglés de cada ficha: solo los campos de texto (`nombre`, `que_es`, `como_se_mide_en_vuelo`, `por_que`, `referencia_en_vuelo`, `cuando_avisar`, `prevencion`) y `fuentes` como lista de títulos en el mismo orden. El español manda: una ficha nueva o cambiada se edita primero en `fichas/`; `test_fichas.py` exige que la traducción no invente campos ni cambie la estructura. La API las aplica con `?lang=en`.

## Relación con el informe

- §3.2 Fichas de indicador. §3.3 Perfiles de misión y presiones de cabina. §3.4 Reanclaje y doble marca temporal. §5.1 Motor híbrido y §5.5 Simulación reproducible.

tags: schemas, contratos, fichas, perfiles, lectura, entorno, gold, simulacion, vocabulario, json-schema, hrp
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [test_fichas.py](test_fichas.py) | 56 | Valida las fichas de packages/schemas/fichas contra ficha.schema.json (solo biblioteca estándar). |
| [test_schemas.py](test_schemas.py) | 122 | Pruebas de contrato para perfiles, lecturas, entorno Gold y caso de referencia. |
| [test_vocabulario.py](test_vocabulario.py) | 65 | El contrato vocabulario.json no puede desviarse de lo que de verdad usan la base de datos, las fichas y la interfaz. |
| [validador.py](validador.py) | 82 | Validador mínimo de JSON Schema (Draft 2020-12) con solo biblioteca estándar. |

### API pública

**validador.py**

- función `validar(valor, esquema, ruta='dato', _raiz=None)`: Lista de errores de `valor` frente a `esquema`; vacía si es válido.

### Dependencias

- Internas: `validador`
- Externas: ninguna
- Biblioteca estándar: `json`, `pathlib`, `re`, `unittest`

### Tests

- `packages/schemas/test_fichas.py`: 5 pruebas en Fichas (5)
- `packages/schemas/test_schemas.py`: 4 pruebas en Contratos (4)
- `packages/schemas/test_vocabulario.py`: 6 pruebas en Vocabulario (6)
<!-- CONTEXT:AUTO:END -->
