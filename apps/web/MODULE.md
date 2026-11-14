# Módulo `apps/web`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Interfaz a bordo de VIGÍA: registro diario, figura humana con el estado por sistema y vista del médico de vuelo. Todavía no está implementada (`app.tsx` está vacío).

## Puntos clave

- Stack previsto: React + Vite como PWA con service worker, IndexedDB (Dexie), motor de análisis en TypeScript puro y gráficas con Recharts o uPlot. Si el equipo no usa React, se hace con HTML, CSS y JS sin framework, y el mismo motor (informe §4.3).
- Debe funcionar **sin conexión**: la demo apaga el wifi. Nada de servidor; Streamlit está descartado.
- Motor híbrido: capa A clínica, capa B de desviación personal y capa C de deriva. Muestra 3 niveles como máximo (verde, ámbar, rojo). Solo el rojo escala al oficial médico (§4.2, §5.1).
- Las fichas de indicador salen de un JSON con la URL de su fuente: la interfaz nunca muestra una afirmación sin origen.
- Consume las filas curadas que exporta `pipelines/datalake` (campo `t_real` en UTC) como JSON estático. No importa código de `pipelines/`: el contrato va en `packages/schemas` (docs/ARQUITECTURA.md).
- Organización interna por funcionalidad (`src/features/<feature>/`). El motor híbrido irá a `packages/engine` para que lo compartan la app de a bordo y la vista de tierra.

## Relación con el informe

- §4.1 Flujo de extremo a extremo. §4.2 Capas de captura, almacén, motor, permisos y decisión. §4.3 Stack. §5.1 Motor híbrido. Anexo A (Galaxy Watch4).

tags: frontend, interfaz, react, pwa, offline, motor-híbrido, figura-humana, pendiente
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [app.tsx](app.tsx) | 0 | vacío (pendiente) |
<!-- CONTEXT:AUTO:END -->
