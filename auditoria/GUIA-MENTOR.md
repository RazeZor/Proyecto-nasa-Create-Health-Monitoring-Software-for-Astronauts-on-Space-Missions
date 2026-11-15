# Orientación recibida del mentor del reto (texto pegado por el equipo el 2026-11-15)

Resumen de lo que importa para la auditoría; el texto original está en inglés.

- El reto no prescribe un dataset obligatorio. Recursos sugeridos: NASA OSDR (https://osdr.nasa.gov/), NASA Life Sciences Portal (https://nlsp.nasa.gov/), NASA HRP (https://www.nasa.gov/hrp/), FAQ de OSDR (https://science.nasa.gov/reference/osdr-faq/) y el artículo de la NASA sobre el dataset de salud de Inspiration4 (https://science.nasa.gov/humans-in-space/nasas-repository-supports-research-of-commercial-astronaut-health/).
- No todo dataset tiene lecturas continuas de astronautas; muchos son muestras biológicas o resultados procesados.
- Es aceptable combinar datos de investigación reales con telemetría simulada **claramente rotulada como sintética**.
- Evitar umbrales arbitrarios y no asumir que los rangos clínicos terrestres son límites seguros en microgravedad. Usar publicaciones (HRP, revisadas por pares), **línea base individual** y tres niveles transparentes (normal, aviso, crítico) con fuentes citadas y descritos como **reglas de prototipo, no límites de medicina de vuelo validados**.
- Recomendación: enfoque híbrido con datos reales donde existan, telemetría sintética donde no, tablero de tendencias en una línea de tiempo de misión simulada, alertas con explicación y acción sugerida, y distinción clara entre dato real, lectura simulada y umbral de prototipo.

Cómo se usa en VIGÍA: estas URL entran en el campo *NASA Data* y en *References* de `ENVIO.md`; la frase "reglas de prototipo, no límites clínicos validados" debe aparecer en la app (aviso) y en el formulario.
