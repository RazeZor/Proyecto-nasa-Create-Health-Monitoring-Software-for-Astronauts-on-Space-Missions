# Backlog de la auditoría (ordenado: puertas de elegibilidad → bugs → puntos por hora)

Actualizado 2026-11-15 02:10 (UTC-3). Fuentes: `EXPLORADOR-iteracion-1.md`, `FUENTES.md`, informe del Tester (pendiente). Estado: ⬜ pendiente · 🔧 en curso · ✅ hecho · ⏸ aplazado (con motivo).

## A. Puertas de elegibilidad y veracidad del envío

| # | Ítem | Quién | Estado |
|---|---|---|---|
| A1 | Sitio público desactualizado respecto a `main` (sin cuerpo 3D ni favicon nuevo). Redesplegar al cerrar. **Bloqueado**: falta permiso de `ssh`. | Claude | ⬜ |
| A2 | Demo oficial (≤7 diapositivas en inglés o vídeo ≤30 s) con equipo, integrantes, reto, imagen, experiencia de uso y datos abiertos. Contenido en `DEMO.md`; el archivo público lo sube el equipo. | Claude (contenido) / equipo (enlace) | ⬜ |
| A3 | Texto del formulario en inglés (`ENVIO.md`): coherente con la app tras las correcciones; nombre del equipo e integrantes `[por completar]`. | Claude | 🔧 |
| A4 | Declaración de IA (Claude Code y Codex) en formulario y README; sin logotipos NASA; referencias completas (BodyParts3D CC BY 4.0, fuentes, librerías). | Claude | 🔧 |
| A5 | Modo real puede guardar y subir como `Real` la FC del simulador sin confirmar y el ánimo 7 por defecto (`checkin-form.tsx`, `app-context.tsx`, `device-view.tsx`). Simulador solo en demo; ánimo solo si se confirma. Con test. | Claude | ✅ |
| A6 | Informes de demo van a la API y sus respuestas (y la sembrada por `sembrar`) salen en el hilo real (`rutas_dashboard.py:218-230`, `reports-view.tsx:180-188`). Filtrar por `contenido.demo` en ambos modos. Con test. | Claude | ✅ |
| A7 | Contradicciones texto ↔ código: §8.1/8.2 «fisiología simulada» frente a modo real; §7.1 «cubiertos por pruebas»; §4.2 «SVG»; «Tres perfiles» (hay 5); MODULE API CORS. | Claude | ✅ |
| A8 | NEWS2 mal atribuido: los cortes de agregación (3 aislado o suma ≥5 = rojo; 3–4 ámbar) son propios y más conservadores que el RCP (5–6 medio, ≥7 alto). Reescribir en readme, informe §5.1, About y ENVIO como «tramos de NEWS2 con cortes de agregación propios». No se cambia el motor (cambiaría los KPI publicados). | Claude | ✅ |
| A9 | Fichas con afirmaciones incorrectas: `spo2.json` y `temperatura_central.json` prometen una condición de línea base que el motor no aplica; `sintomas.json` «mareo cede en 2 o 3 días» (fuente: 1–2 días). Corregir es y en. | Claude | ✅ |
| A10 | Informe, tabla Fuentes: «cefaleas entre 2,8 y 4,5 mmHg» sin respaldo → odds ×2 por mmHg (Law 2014) y «3 mmHg mantiene incidencia <1,4 %» (OCHMO). | Claude | ✅ |
| A11 | Supuestos del simulador frente a la literatura: FC +3 lpm en vuelo (Norsk 2015: sin cambio), PAS −4 (Norsk: −8), sueño −0,7 h (Barger: 6,09 h). Decisión: no se regeneran los KPI; se declaran como escenario de estrés en §5.5/5.6 y readme. | Claude | ✅ |
| A12 | Frase «reglas de prototipo, no límites clínicos validados» (mentor y rúbrica V1) visible en la app (aviso) y en el formulario. | Claude | ✅ |

## B. Errores de código

| # | Ítem | Quién | Estado |
|---|---|---|---|
| B1 | Retardo de informes recortado a ≤1 min también en modo real (`reports-view.tsx:179`). Solo en demo. Con test. | Claude | ✅ |
| B2 | Etiquetas «Real» de GOES, EDA, RadLab y DONKI visibles sin datos (`environment-view.tsx:322-358`). | Claude | ✅ |
| B3 | Sin red `listarReportes` devuelve `[]` y la pantalla parece vacía sin aviso (`api-registro.ts:94`). Devolver `null` y mostrar «sin enlace». | Claude | ✅ |
| B4 | Recordatorios fijos de demo mostrados en real sin rótulo (`body-view.tsx:427`). Rotular como ejemplo. | Claude | ✅ |
| B5 | Pantalla de error sin API: sin aviso de prototipo ni banda de modo (`app-context.tsx:80-96`). | Claude | ✅ |
| B6 | `retardo_min.transit-docked = 12` frente a `retardo_demo_min = 0.03`. Revisar coherencia. | Claude | ✅ |
| B7 | Informes no se encolan sin red (`reports-view.tsx`). Mostrar error claro (ya lo hace: `fallo`). Encolar local: ⏸ fuera de alcance hoy; se declara en límites. | — | ⏸ |
| B8 | «Compartir» un ámbar es solo local. ⏸ Se declara como límite (readme ya dice que verde y ámbar no salen del dispositivo). | — | ⏸ |
| B9 | `typescript.ignoreBuildErrors: true` y CI sin build web. Correr `tsc --noEmit` y `next build` antes del cierre; dejar el build en el CI si da tiempo. | Claude | ⬜ |
| B10 | Tester it. 1: T01 API local vieja → reiniciada ✅; T02 sitio público viejo → A1; T03 público: modo real compartido → arrancar en demo + aviso `NEXT_PUBLIC_VIGIA_PUBLICO` ✅ (falta desplegar); T04 `/about` en español con `lang=en` → "use client" ✅; T05 pestañas ocultas en móvil → dos filas ✅; T06 «Todo en orden» sin datos → «Aún no hay registro» ✅; T07 carga en blanco / error sin aviso ✅; T08 audio y vibración sin gesto ✅; T09 offline en dev (esperado, SW solo en producción) ⏸; T10 hidratación con `lang=en` (texto SSR en la pantalla de carga) ✅; contraste ámbar/verde 3,8:1 y botón 36 px ⬜. | Claude | 🔧 |
| B11 | Reloj (encargo del usuario 02:10): auditar `puente_reloj.py`, `/device`, `lib/reloj.ts` y smart-monitor; que la ingesta sea robusta y conectar el reloj sea simple (instrucciones en pantalla, estado claro). Explorador en marcha. | Claude | 🔧 |

## C. Presentación y puntos por hora

| # | Ítem | Quién | Estado |
|---|---|---|---|
| C1 | Textos en español con `lang=en`: unidades de fichas («lpm», «puntos (1 a 10)»), `device-view.tsx:149` «bpm», `ui/dialog.tsx`/`sheet.tsx` «Close», `manifest.ts` `lang`, `layout.tsx` metadatos; API: autor «Cirujano de Vuelo», `aviso` del panel, `fuentes[].alimenta/detalle`. | Claude | ✅ |
| C2 | Readme: recursos oficiales del reto (HRP hazards/risks/ongoing, CSA) con URL; mención del mentor; NEWS2 reescrito; Codex en la declaración de IA. | Claude | ✅ |
| C3 | Dependencias sin uso (`@vercel/analytics`, `recharts`, `shadcn`, `cn`). Quitar si el build sigue en verde. | Claude | ⬜ |
| C4 | Comentario obsoleto `etl-client.ts:4-5`. | Claude | ✅ |
| C5 | Retardo lunar `[1, 3]` s solo tiempo de luz; Gateway 26 %/26,5 %; Bio-Monitor 2018. Notas en informe. | Claude | ✅ |
| C6 | KPI fijos en i18n: aceptado (coinciden con `kpi.json`); anotar en MODULE. | — | ⏸ |

## D. Entregables de cierre (encargo del usuario, 02:20)

| # | Ítem | Quién | Estado |
|---|---|---|---|
| D1 | Presentación de pitch en PowerPoint (skill `pptx`): demo oficial de 7 diapositivas en inglés (E3) y pitch largo de 240 s para el jurado local. Capturas reales de la app tras el redespliegue. | Claude | ⬜ |
| D2 | Informe final del proyecto (documento para jueces y lectores, inglés, con resumen ejecutivo, método, datos, validación, límites). Derivado del informe técnico y del README. | Claude | ⬜ |
| D3 | Glosario: qué significa cada término (NEWS2, mediana/MAD, z modificada, CUSUM, línea base, pfu, SEP, S1, RadLab, EDA, DONKI, GOES, OSDR, HRP, EIMO, modo tormenta, escalamiento, cola con retardo, PWA, service worker, gold/curated/raw…). Español e inglés. | Claude | ⬜ |
| D4 | Guiones: pitch de 240 s, vídeo de 30 s con subtítulos, recorrido de demo en vivo (qué pulsar, qué decir), preguntas frecuentes del jurado con respuesta. | Claude | ⬜ |
| D5 | Reloj conectable de verdad: instrucciones de conexión en pantalla y en README, variables mínimas, estado claro, pruebas. Depende de B11. | Claude | ⬜ |
