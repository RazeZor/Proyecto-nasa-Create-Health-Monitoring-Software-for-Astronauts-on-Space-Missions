# Intradía en tiempo real y descomposición en el histórico (diseño corto)

**Por qué:** el tiempo real debe mostrar lo de ahora, no la misión por días; para la evolución están los históricos, que ganan análisis de series temporales.

## Approaches

- **API (elegido):** `GET /tripulantes/{id}/intradia?modo=demo|real&dia=N`. Real: lecturas de ese día con su hora. Demo: puntos simulados deterministas alrededor del valor diario del caso de referencia, rotulados `Simulado`. Permiso `propio_o_clinico` (auditado). Encaja con «los datos demo viven en la API y la app solo conoce la API».
- **App (descartado):** simular en el navegador; duplica los datos demo y rompe esa regla.

## Decisiones

- Intradía solo para lo que mide un sensor: pulso (`fc_reposo_lpm`), SpO2, temperatura y presión sistólica. Sueño, ánimo, masa y glucosa siguen con su valor del día y un enlace al histórico.
- Demo: un punto cada 15 min desde las 00:00 hasta la hora actual (UTC), con ritmo circadiano suave y ruido acotado; misma semilla = mismos puntos.
- Descomposición (`packages/engine/series.ts`, pura): tendencia = media móvil centrada de 7 días; ciclo semanal = media por día de la semana del residuo de la tendencia (centrada en 0); residuo = resto. Ciclo solo si autocorrelación a 7 días ≥ 0,3 y ≥ 14 días con dato; nada con < 10 días.
- Se ve en `TrendsView`, así que también en las Tendencias del astronauta.

## Fuera

- Pulso en vivo del reloj (1 Hz) para clínicos, predicción, otros periodos.
- No es parte del motor híbrido: no hay paridad con Python.
