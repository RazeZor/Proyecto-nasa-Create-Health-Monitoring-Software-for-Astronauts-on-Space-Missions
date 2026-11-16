# ADR-001: separar extensiones del producto y simulador histórico

Estado: decisión de ingeniería del prototipo · 16-nov-2026.

El motor TypeScript de `packages/engine/engine.ts` es la ruta de producto. El simulador Python de `pipelines/reanclaje/simulacion.py` conserva el contrato histórico de series diarias completas y su generador de desarrollo. Sus resultados no se interpretan como validación clínica.

Se mantiene la paridad de ambos sobre las fixtures diarias existentes. Las extensiones de TypeScript para ausencia de datos, identidad de fuentes, ventanas temporales, `excluir_personal`, `tomas_clinicas` y cambios de instrumento no se anuncian como implementadas en Python. No se usan desplazamientos del generador para corregir medidas de producto.

Para evaluar una entrega se ejecuta el motor TypeScript real, con sus hashes, entradas congeladas y configuración. La investigación de referencia estable/doble queda en `tools/validacion`; no cambia la ruta predeterminada ni las bandas de seguridad por mejorar el resultado del banco. Promover una variante requiere criterios previos, comparación de carga de alertas y revisión pertinente.

Una traza de producto conserva la entrada ya adaptada, fuentes por campo, perfil/configuración, resultado y huella del motor. `tools/validacion/reproducir.ts` rechaza otra huella y vuelve a calcular el resultado. Para reproducir una entrega antigua hay que recuperar su código versionado y su respaldo privado; no se reinterpreta con la configuración actual.

Esta separación evita que una prueba de paridad histórica se convierta en una afirmación de equivalencia de todas las rutas. La revisión profesional de calidad temporal, instrumentos, acciones y uso previsto sigue pendiente.
