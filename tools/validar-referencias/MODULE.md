# Módulo `tools/validar-referencias`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Comprueba existencia bibliográfica, títulos y fragmentos del catálogo mediante Crossref y Europe PMC. No verifica por sí solo la interpretación, aplicabilidad o validez clínica de las afirmaciones.

## Puntos clave

- Tres comprobaciones por referencia: el DOI existe en Crossref; el título contiene `titulo_contiene` (detecta los DOI que apuntan a otro artículo); y el resumen, o el texto completo si se pide `texto_contiene`, contiene `resumen_contiene`.
- Estados: `OK`, `DOI_NO_EXISTE`, `REVISAR_TITULO`, `REVISAR_TEXTO` y `FUENTE_NO_DISPONIBLE`. Salida 1 ante DOI/título incorrectos; 2 ante consultas no verificables sin esos errores. Un 404 se distingue de red o servidor caídos. `REVISAR_TEXTO` requiere inspección: la coincidencia de fragmentos no sustituye revisión humana.
- El texto completo solo existe para artículos de acceso abierto en Europe PMC. NCBI no se usa: en la red del equipo un proxy rompe su certificado TLS.
- Usa solo la biblioteca estándar. Todo el IO pasa por `_get`; `evaluar()` es pura y los tests reemplazan `_get`, sin red.
- No corre en CI, porque necesita red. Se ejecuta a mano cuando cambia el catálogo o el informe.
- Las frases de `resumen_contiene` deben copiarse tal cual del artículo, con su guion (`8–10 mmHg` lleva un guion largo) y su espaciado (`2.5 mm Hg`).

## Relación con el informe

- Ayuda a revisar la sección Fuentes; no permite afirmar que cada cifra o regla del informe esté validada profesionalmente.

tags: herramientas, referencias, papers, doi, crossref, europe-pmc, validación, informe
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [test_validar_referencias.py](test_validar_referencias.py) | 78 | — |
| [validar_referencias.py](validar_referencias.py) | 153 | Valida las referencias científicas del informe contra Crossref y Europe PMC. |

### API pública

**validar_referencias.py**

- clase `FuenteNoDisponible(OSError)`: Una consulta fallida no demuestra que un DOI no exista.
- función `crossref(doi)`: Metadatos de Crossref: título, revista, año y primeros autores, o None.
- función `europepmc(doi)`: Resumen y PMCID del artículo en Europe PMC: (resumen, pmcid).
- función `texto_completo(pmcid)`: Texto plano del artículo completo (solo acceso abierto), o cadena vacía.
- función `faltantes(frases, texto)`: Frases que no aparecen en el texto, sin distinguir mayúsculas.
- función `evaluar(ref, meta, resumen, texto='')`: Calcula el estado de una referencia a partir de lo descargado. Sin IO.
- función `validar(ref)`: Descarga y evalúa una referencia.
- función `main(argv=None)`

### Puntos de entrada

- `tools/validar-referencias/validar_referencias.py`

```
python tools/validar-referencias/validar_referencias.py [--salida resultado.json] [--solo id1,id2]
```

### Configuración y fuentes externas

- `CROSSREF_URL`: https://api.crossref.org/works/
- `EUROPEPMC_URL`: https://www.ebi.ac.uk/europepmc/webservices/rest/

### Dependencias

- Internas: `validar_referencias`
- Externas: ninguna
- Biblioteca estándar: `argparse`, `json`, `pathlib`, `re`, `sys`, `time`, `unittest`, `urllib`

### Tests

- `tools/validar-referencias/test_validar_referencias.py`: 8 pruebas en Evaluar (4), Validar (3), Catalogo (1)
<!-- CONTEXT:AUTO:END -->
