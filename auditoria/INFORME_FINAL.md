# Informe final del ciclo de auditoría — VIGÍA (NASA Space Apps 2026)

Ciclo ejecutado el 2026-11-15 entre las 01:35 y las 08:30 (UTC-3), con una pausa de cuota de la API entre las 03:00 y las 05:40. Corte previsto 21:59; envío 23:59 (lo hace el equipo). Rama de trabajo `fix/auditoria-final` (8 commits), subida a origin. Nada se infla: cada nota viene de un evaluador independiente y cada corrección tiene test o captura.

## 1. Nota por criterio (rúbrica `RUBRICA.md`, 20 por criterio)

| Criterio | Iteración 1 | Iteración 2 | Qué quedó por recuperar según el evaluador 2 |
| --- | --- | --- | --- |
| Impact | 12 | 16 | I3: tiempo de registro no cronometrado con personas. I4: casos terrestres sin fuente (añadidos después en About e informe §9.3). |
| Creativity | 16 | 20 | — |
| Validity | 10 | 16 | V2: textos de la API en español con `lang=en` (corregidos después); V5: avisos sobre el dial, móvil, contraste (corregidos después). |
| Relevance | 16 | 20 | — |
| Presentation | 8 | 12 | P1: demo sin enlace público; P3: primera pantalla móvil (corregida después); P4/P5: sitio público sin redesplegar. |
| **Total /100** | **62** | **84** | Las correcciones posteriores a la iteración 2 (avisos, móvil, contraste, inglés, Tierra) no se han vuelto a puntuar: las verificó el Tester 3 y un recorrido propio con Chrome. |

Evaluadores: iteración 1, Codex (gpt-6.1-sol) con material embebido y capturas (`EVALUADOR-iteracion-1.md`); iteración 2, agente Claude independiente con acceso de solo lectura al repositorio, a los tests y a la app local (`EVALUADOR-iteracion-2.md`). Ninguno implementó.

## 2. Puertas de elegibilidad (E1–E10)

| Puerta | Estado | Evidencia / qué falta |
| --- | --- | --- |
| E1 Equipo registrado, ≤6, mismo evento | lo confirma el equipo | — |
| E2 Campos obligatorios completos | texto listo en `ENVIO.md` | faltan nombre del equipo, integrantes y evento, y el enlace de la demo |
| E3 Demo ≤7 diapositivas o ≤30 s | **hecha**: `VIGIA-demo-7-slides.pptx` (7 diapositivas, inglés) | rellenar equipo en la diapositiva 1, exportar a PDF, subir con enlace público y probarlo en ventana privada |
| E4 Inglés en envío y materiales | readme, app (`?lang=en`), ENVIO, informe final (`FINAL-PROJECT-REPORT.md` y `.docx`) en inglés; el informe técnico en español queda como complementario | el sitio público sirve aún la versión anterior hasta redesplegar |
| E5 Enlaces públicos sin registro | repo y sitio responden sin login | probar de nuevo tras el redespliegue |
| E6 Datos NASA | OSDR RadLab y EDA, DONKI, HRP (campo redactado) | — |
| E7 Declaración de IA, sin marcas NASA | redactada (Claude Code y Codex); sin medios generados | — |
| E8 Referencias completas | fuentes, librerías, BodyParts3D CC BY 4.0, LICENSE MIT | — |
| E9 Sin menores | sin personas en los materiales | — |
| E10 Submit antes de 23:59 | lo hace el equipo | — |

## 3. Cambios hechos (rama `fix/auditoria-final`)

| Commit | Contenido |
| --- | --- |
| `52ed761` | Veracidad del modo real: simulador solo en demo, ánimo solo si se confirma, hilo de tierra filtrado y traducido, retardo real, sin cola vacía fingida, etiquetas «Real» solo con datos, «Aún no hay registro» sin datos, sonido solo tras un gesto, pantalla de carga, About en el idioma del navegador, pestañas en móvil, aviso de sitio público; NEWS2 bien atribuido; fichas corregidas; informe alineado. |
| `d6529d6` | Reloj conectable: vínculo por API, sin alta automática, `metodo` unificado, caducidad, `.env`, URL sugerida; diagnóstico en cuatro pasos y «Este es mi reloj»; API en inglés con `lang`; cabecera móvil; LICENSE MIT; fixtures de KPI; informe final en inglés, glosario, guiones. |
| `669baf9` | Hallazgos del evaluador 2: sin avisos durante el registro, banda móvil en columna, contraste ≥ 4,5:1, tormenta por evento SEP nombrada por el evento, sección «En la Tierra», 8 días, 270 tests. |
| `9f32249`, `c99506c` | Aviso del escenario e informe de ejemplo (y su respuesta) en inglés; no se encola un informe real sin registro. |
| `2eda05d`, `fdd3918`, `60e9e46` | `tools/presentacion` (generador de las dos presentaciones y capturas limpias), `docs/capturas`, los dos `.pptx`, el `.docx` y el cierre de la bitácora y el backlog. |

Verificación final (08:25): 8 suites Python (212 tests) y 59 tests de Node en verde; `tsc --noEmit`, ruff, `contextgen --check` y `--lint` limpios; build de producción OK en el worktree; recorrido propio con Chrome sin texto en español con `lang=en` en Informes y Entorno, banda móvil legible, 0 avisos sobre el dial.

## 4. Pendientes y su impacto

| Pendiente | Impacto | Motivo / quién |
| --- | --- | --- |
| Fusionar `fix/auditoria-final` en `main` y subir | Estabilidad de la rama principal | El clasificador de permisos de Claude Code denegó el merge y el push a `main`. Comando: `git checkout main && git merge --ff-only fix/auditoria-final && git push origin main` (o PR en GitHub). Usuario. |
| Redesplegar el sitio público | E4, E5, Presentation, Validity (el sitio sirve la versión anterior y su modo real es un tripulante compartido) | Permiso `ssh` denegado. Procedimiento en `PULSO.md`: `git archive` + gold por tar, build con `NEXT_PUBLIC_VIGIA_MODO=demo NEXT_PUBLIC_VIGIA_PUBLICO=1 VIGIA_API_INTERNA=http://127.0.0.1:8000`, resembrar la base, reiniciar `vigia-api vigia-web`, probar en ventana privada. Usuario (o añadir la regla de permiso). |
| Nombre del equipo, integrantes y evento | E2, E3, P1 | Marcadores `[TEAM NAME]` en `ENVIO.md`, diapositiva 1 (`node tools/presentacion/deck.js … "Equipo" "Integrantes" "Evento"`) y portada del Word. Usuario. |
| Enlace público de la demo | E2, E3, P1 | Exportar el `.pptx` a PDF, subir a Drive/GitHub con acceso público y pegar el enlace. Usuario. |
| Cronometrar 5 registros con personas | I3 (+2) | Medición humana; anotar mediana y rango en README «Results». Equipo. |
| Build de la web en el CI | Validity (evidencia) | El token de git no tiene permiso `workflow`; añadir en `.github/workflows/context.yml`: `npm ci && npx tsc --noEmit && npx next build --webpack` en `apps/web`. Equipo. |
| Informes propios guardados en el idioma en que se escribieron | menor | Inherente al diseño; declarado. |
| Clasificación FortiGuard del sitio | recomendación de la guía | Formulario externo. Usuario. |

## 5. Fuentes

`FUENTES.md` (validación científica con URL y fecha de consulta), `documentacion/referencias-validadas.md` (DOIs), `GUIA-MENTOR.md` (recursos recomendados por el mentor del reto), `EXPLORADOR-iteracion-1.md` y `EXPLORADOR-reloj.md` (matrices requisito → código).

## 6. Contenido de la demo

Formato elegido: **7 diapositivas en inglés** (`VIGIA-demo-7-slides.pptx`, generada por `tools/presentacion/deck.js`, revisada diapositiva a diapositiva). Contenido y alternativa de vídeo de 30 s en `DEMO.md`; guion de pitch, recorrido en vivo y preguntas del jurado en `GUIONES.md`; pitch largo en `VIGIA-pitch.pptx` (12 diapositivas). Glosario en `GLOSARIO.md`. Informe final del proyecto en `FINAL-PROJECT-REPORT.md` y `VIGIA-Final-Project-Report.docx` (21 páginas).
