# Informe final del ciclo de auditoría — VIGÍA (NASA Space Apps 2026)

> Borrador en construcción. Se completa al corte (21:59 UTC-3) o a la salida anticipada. Las notas provienen del evaluador independiente (Codex, solo lectura) y se contrastan con la evidencia ejecutada; nada se infla.

## 1. Nota por criterio (rúbrica `RUBRICA.md`, 20 por criterio)

| Criterio | Iteración 1 | Iteración 2 | Evidencia |
| --- | --- | --- | --- |
| Impact | 12 | 16 | I2 roles, I3 KPI reproducibles, I4 casos terrestres, I5 licencia (`EVALUADOR-iteracion-1.md`) |
| Creativity | 16 | 20 | C2 alerta ambiental trazable a dato real, C3 privacidad del sitio público |
| Validity | 10 | 16 | V1–V5: correcciones locales sin desplegar; sin salidas de tests adjuntas; inglés incompleto en el sitio público |
| Relevance | 16 | 20 | R2 «Todo en orden» sin datos (corregido en local), R4 recorrido dato NASA → alerta |
| Presentation | 8 | 12 | P1 demo ausente, P2 síntesis larga (acortada), P3 propósito en la primera pantalla (añadido), P4 versión pública distinta |
| **Total /100** | **62** | **84** | It. 1: Codex gpt-6.1-sol con material embebido y capturas. It. 2: agente Claude independiente con acceso de solo lectura al repo, tests y app local (`EVALUADOR-iteracion-2.md`) |

## 2. Puertas de elegibilidad (E1–E10)

| Puerta | Estado | Evidencia / qué falta |
| --- | --- | --- |
| E1 Equipo registrado, ≤6, mismo evento | lo confirma el equipo | — |
| E2 Campos obligatorios completos | texto listo en `ENVIO.md` | faltan nombre de equipo e integrantes |
| E3 Demo ≤7 diapositivas o ≤30 s | contenido en `DEMO.md` | falta producir el archivo y el enlace público |
| E4 Inglés en envío y materiales | readme, app (`?lang=en`), ENVIO en inglés | el informe técnico está en español (se enlaza como material complementario; el README en inglés es la entrada) |
| E5 Enlaces públicos sin registro | sitio y repo públicos | probar en ventana privada tras el redespliegue |
| E6 Datos NASA | OSDR RadLab y EDA, DONKI, HRP | campo NASA Data redactado |
| E7 Declaración de IA, sin marcas NASA | redactada; sin medios generados | — |
| E8 Referencias completas | redactadas (fuentes, librerías, BodyParts3D) | — |
| E9 Sin menores | sin personas en los materiales | — |
| E10 Submit antes de 23:59 | lo hace el usuario | — |

## 3. Cambios hechos en el ciclo

Ver `BITACORA.md`. Commits en `fix/auditoria-final`:

- `52ed761` Corregir la veracidad del modo real y alinear textos con el código tras la auditoría.
- `d6529d6` Hacer conectable el reloj, completar el inglés de la API y cerrar los hallazgos del Tester 2 (LICENSE MIT, fixtures de KPI, informe final en inglés, glosario, guiones). El paso de build de la web en el CI no pudo subirse: el token de git no tiene el permiso `workflow`; queda como pendiente para el equipo (el build se verificó en local).

## 4. Pendientes y su impacto

| Pendiente | Impacto | Motivo |
| --- | --- | --- |
| Redespliegue del sitio público | Presentation, Validity, E5 | permiso de `ssh` denegado por el clasificador; requiere regla del usuario |
| Nombre del equipo e integrantes en ENVIO/DEMO | E2, E3 | dato que solo tiene el equipo |
| Archivo de la demo y su enlace | E3, Presentation | producción fuera del repo |

## 5. Fuentes

`FUENTES.md` (validación científica con URL y fecha), `documentacion/referencias-validadas.md` (DOIs), `GUIA-MENTOR.md` (recursos recomendados por el mentor del reto).

## 6. Contenido de la demo

`DEMO.md`: 7 diapositivas en inglés (formato elegido) y guion alternativo de 30 s con subtítulos.
