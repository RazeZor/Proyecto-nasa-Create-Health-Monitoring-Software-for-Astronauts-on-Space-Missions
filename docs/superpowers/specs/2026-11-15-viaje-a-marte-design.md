# Viaje a Marte: una sola navegación de principio a fin (diseño)

Fecha: 2026-11-15. Rama: `cambios-jose` (no se fusiona a `main` hasta que lo diga José Carlos).

## Intención

Mostrar al jurado una misión creíble de principio a fin. Hoy la demo es un caso de 30 días sin lugar: el entorno
no depende de dónde va la nave. Queremos un único tránsito Tierra→Marte en el que cada día de misión tenga una
posición en el espacio, y que el entorno (retardo de comunicación, dosis, protones, CO2) cuelgue de ella o de su
calendario.

## Metas, no metas y antimetas

- Metas: (1) el tránsito dura lo que un tránsito real (meses, no 30 días); (2) en cualquier día se ve dónde está la
  nave y qué entorno le toca; (3) los eventos reales (DONKI, GOES) siguen marcados como reales, anclados en días
  concretos; (4) el motor híbrido trabaja con meses de datos (la capa de deriva se luce).
- No metas: efemérides reales, vista 3D, viaje de vuelta, superficie de Marte, tocar el modo Real (sigue como está).
- Antimetas: que el jurado note que el entorno es un cuento (dosis que no cuadra con la distancia, retardo fijo) o
  que la demo se rompa por alargarla (gráficas ilegibles, motor sin paridad Python/TypeScript).

## Restricciones

- Todo es determinista (semilla), sin dependencias nuevas en `pipelines/reanclaje` (solo biblioteca estándar).
- Python es la única fuente de la trayectoria: la API sirve la posición de cada día y la interfaz solo la dibuja.
- Paridad: `pipelines/reanclaje/simulacion.py` y `packages/engine/engine.ts` siguen siendo el mismo motor; no se
  cambia ninguna regla del motor, solo la duración y el día de inicio de las anomalías del escenario.
- El caso de referencia de 30 días (§5.5 del informe) se conserva intacto como fixture de las pruebas del motor.
- Convenciones del repo: español, i18n primero en `es.json`, contextgen al día.

## Enfoques considerados

- A. Trayectoria calculada y entorno modelado, con eventos reales anclados. **Elegido** (José Carlos dijo «sí»).
- B. Datos reales comprimidos en el tiempo: descartado, falsea dosis y duración de los eventos.
- C. Alargar el generador sintético con la posición de adorno: descartado, el entorno no depende del lugar.

## Diseño

**Trayectoria** (`pipelines/reanclaje/trayectoria.py`, nuevo): transferencia de Hohmann Tierra→Marte con órbitas
circulares coplanares (Tierra a 1 UA, Marte a 1,524 UA). Semieje 1,262 UA, duración 259 días (= `DIAS_VUELO` del
escenario). Marte sale adelantado ~44° para estar en la llegada donde la nave. Función pura
`posicion(dia) -> {x_ua, y_ua, dist_sol_ua, dist_tierra_ua, retardo_min, tierra, marte}` con la ecuación de Kepler
resuelta por Newton. Retardo = distancia a la Tierra / c (a los 259 días ≈ 13 min; el rango del perfil es 3–22).

**Entorno** (en el mismo módulo o `simulacion.py`, según quede más corto): por día de misión,
- dosis diaria: radiación galáctica de fondo ≈ 1,8 mSv/día (lo medido por MSL RAD en el tránsito, Zeitlin et al.
  2013), con una modulación lenta y ruido acotado; la acumulada se calcula sobre eso;
- protones ≥10 MeV: nivel de fondo bajo y, donde caen, los eventos de tormenta (DONKI/GOES reales reanclados a días
  de misión por el pipeline existente `reanclaje`); mantienen `Real` y su fecha real;
- CO2 de cabina: curva lenta simulada y un pico de la anomalía A2.

**Caso del viaje** (`generar_caso_viaje` en `simulacion.py`): parametriza `generar_mision` por `dias_vuelo` y por los
días de las anomalías. Sugerencia: A2 (CO2) hacia el día 60, A1 (deriva por falta de sueño en trip-1) en los días
100–120, A3 (tormenta) hacia los días 110–111; los tres antes del día actual para que se vean. Salida:
`caso_viaje.json` con el mismo esquema que `caso_referencia` más `trayectoria` (posición por día).

**API** (`apps/api/rutas_dashboard.py`): en modo `demo` el caso es el del viaje; `DIA_ACTUAL_DEMO` pasa a ~130
(mitad del tránsito); `entorno_diario` suma `posicion` y `retardo_min`. El perfil `transito` deja de tener un retardo
fijo en la demo: `delayMinutes` sale de la posición del día actual. Modo `real`: sin cambios.

**Interfaz**: (1) `MISSION_DAYS` ya sale de `historial.dias_vuelo`, así que el selector del Histórico, las
tendencias y las gráficas se alargan solos (revisar legibilidad); (2) nuevo componente `trayectoria-marte.tsx`
(SVG: Sol, órbitas de Tierra y Marte, arco de la nave, marcadores de Tierra, Marte y nave en el día elegido, y
lecturas: día X/259, distancia a la Tierra, retardo, dosis acumulada) en la pantalla Entorno, y una versión mini en
el Histórico; (3) textos por `t("...")`, es primero.

**Pruebas**: trayectoria (día 0 en la Tierra, día 259 en la órbita de Marte, retardo dentro de 3–22 min, distancias
continuas); caso del viaje (determinista, 259 días, anomalías en su día); paridad del motor sobre el caso nuevo;
API (demo con 259 días y posición); web (la posición y el selector llegan a 259).

## Lo que queda al constructor

Nombres exactos de campos, el ángulo de adelanto de Marte afinado, amplitud de la modulación de dosis, y cómo se
distribuyen los eventos reales entre los días de tormenta.

## Calls míos para revisar

- Hohmann de 259 días en vez de los ~210 que mencioné antes: es el tránsito de libro y se calcula exacto con una
  fórmula; uno más rápido exigiría resolver el elipse por tiempo de vuelo.
- Dosis de fondo ≈ 1,8 mSv/día (cifra publicada de MSL RAD), no la de la ventana RadLab reanclada.
- Día actual de la demo hacia el día 130.
- El caso de 30 días se queda como fixture del motor; la demo pasa al del viaje.
