# Intradía y descomposición: plan

**Goal:** tiempo real con datos del día por horas y descomposición de series en el histórico.
**Spec:** docs/superpowers/specs/2026-11-15-intradia-y-descomposicion-design.md
**Ejecución:** inline en la sesión (pedido «empieza»).

### Task 1: API `intradia`
- `apps/api/rutas_dashboard.py`: `intradia(id=Depends(propio_o_clinico), modo, dia: int|None)` → `{dia, naturaleza, series: {fc_reposo_lpm|spo2_pct|temp_central_c|pas_mmHg: [{hora: "HH:MM", valor}]}}`.
- Tests (`test_api_dashboard.py`): demo determinista, rotulada `Simulado`, horas crecientes cada 15 min y valores cerca del diario; real devuelve solo lecturas `Real` de ese día con su hora; ajeno no clínico 403.

### Task 2: `packages/engine/series.ts`
- `descomponer(puntos: {dia: number; valor: number}[], periodo = 7): Descomposicion | null` con `tendencia`, `ciclo | null`, `residuo`, `fuerzaCiclo` (autocorrelación).
- Tests (`series.test.ts`): serie con ciclo semanal claro → ciclo con amplitud correcta; serie lineal sin ciclo → `ciclo: null`, tendencia ≈ serie; < 10 días → `null`; residuo = valor − tendencia − ciclo.

### Task 3: tiempo real
- `lib/catalogo.ts`: `cargarIntradia(tripulante, actor, modo, dia)`.
- `components/shared/grafico-intradia.tsx`: SVG por horas 00–24, con banda personal del día.
- `body-view.tsx`: el detalle de pulso, SpO2, temperatura y presión usa el gráfico intradía; el resto, sin la serie por días.

### Task 4: histórico
- `trends-view.tsx`: bajo el gráfico, tendencia (línea) y, si corresponde, ciclo y residuo (mini gráficos), con una línea que explica cada parte.

### Task 5: verificación
- Navegador (demo): tiempo real de oficial y astronauta, ficha. Tests API, motor, web, i18n, `contextgen --check`. MODULE.md (api, engine, web). Commit.
