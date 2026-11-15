# Módulo `tools/modelo-anatomico`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Guiones que generaron el modelo anatómico del cuerpo 3D de la app (`apps/web/public/modelos/cuerpo.glb`, `cuerpo.json` y `ATRIBUCION.md`) a partir de los OBJ originales de BodyParts3D. Se guardan para que el modelo sea reproducible y su procedencia, verificable.

## Puntos clave

- Fuente: **BodyParts3D** (DBCLS, Japón), release 4.0 (árbol IS-A, OBJ con reducción del 99 %) y los cinco lóbulos pulmonares de la release 3.0, porque la 4.0 no trae el parénquima. Licencia CC BY 4.0; la atribución exigida va en `ATRIBUCION.md` y se muestra en el lienzo de la app.
- Los originales **no están en el repo** (cientos de MB): se descargan de <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html> y se descomprimen en una carpeta de trabajo (`obj/isa_BP3D_4.0_obj_99/` y `obj3/`).
- Orden: `indice.py <carpeta de OBJ> <dir_trabajo>/indice.tsv`, luego `python -I construir.py <dir_trabajo> <dir_salida>` (escribe `cuerpo.glb`, `cuerpo.json` y `piezas.json`) y `atribucion.py <dir_trabajo> <destino>` (lee `<dir_trabajo>/salida/`). Dependencias en `requirements.txt` (numpy, scipy, fast-simplification); usar un entorno virtual.
- Coordenadas de salida, las que espera `apps/web/components/body/escena.ts`: metros, +Y arriba, +Z frente, +X izquierda del sujeto, pies en y = 0, estatura 1,78 m. Es una rotación propia del sistema de origen (mm, +X izquierda, −Y frente, +Z arriba), sin espejo: el hígado queda en −X y el corazón en +X.
- Una malla por grupo con nombre fijo (`piel`, `corazon`, `pulmones`, `cerebro`, `higado`, `estomago`, `pancreas`, `rinones`, `intestino`, `huesos`, `arterias`, `venas`, `ojos`): la escena las busca por ese nombre. `piezas.json` lista los identificadores FMA que entran en cada grupo.
- GLB sin Draco ni meshopt (no hay que servir decodificadores sin conexión); normales cuantizadas con `KHR_mesh_quantization`. Objetivo de peso: 6 MB o menos (hoy 4,2 MB, unos 293 000 triángulos).
- Los pulmones se encogen un 6 % y bajan 5 mm para encajar con la release 4.0; aun así se solapan algo con el corazón y las costillas.
- Son guiones de un solo uso, conservados tal como se ejecutaron: `ruff.toml` les perdona solo reglas de estilo. No tienen tests; la comprobación es `gltf-transform validate` y mirar el resultado en la app.

## Relación con el informe

- §4.1 y §4.2 (interfaz a bordo, figura humana por sistema): da la anatomía que muestra la pantalla del cuerpo.

tags: herramientas, modelo-3d, anatomía, bodyparts3d, glb, three.js, atribución, licencia
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [atribucion.py](atribucion.py) | 54 | — |
| [construir.py](construir.py) | 345 | Genera cuerpo.glb + cuerpo.json para VIGÍA a partir de los OBJ originales de BodyParts3D. |
| [indice.py](indice.py) | 15 | — |
| [util_malla.py](util_malla.py) | 51 | Utilidades de malla sin dependencias pesadas: lectura OBJ, soldadura, componentes conexas, volumen. |

### API pública

**construir.py**

- función `por_nombre(patron, excluye=None)`
- función `clase_isa(nombres)`
- función `sin_duplicados(fjs)`: BodyParts3D repite algunas piezas con otro identificador (misma caja y volumen): deja una.
- función `cargar(rutas)`
- función `normales_cara(v, f)`
- función `filtrar_exterior(v, f, vox, cierre=0)`: Deja solo las caras que dan al exterior del conjunto (quita cavidades y tabiques internos).
- función `quitar_migas(v, f, min_caras, min_diag)`
- función `simplificar(v, f, objetivo)`
- función `normales_suaves(v, f)`
- función `normalizar(v)`
- función `alinear()`
- función `vista(datos, destino)`

**util_malla.py**

- función `leer_obj(ruta)`
- función `soldar(v, f, tol=0.001)`: Une vértices coincidentes (tolerancia en las unidades de la malla) y quita caras degeneradas.
- función `compactar(v, f)`
- función `componentes(v, f)`
- función `volumen(v, f)`
- función `area(v, f)`

### Dependencias

- Internas: `util_malla`
- Externas: `fast_simplification`, `numpy`, `scipy`
- Biblioteca estándar: `glob`, `json`, `os`, `re`, `struct`, `sys`
<!-- CONTEXT:AUTO:END -->
