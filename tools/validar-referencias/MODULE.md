# Módulo `tools/validar-referencias`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Comprueba que las referencias científicas del informe existen y dicen lo que citamos. Consulta Crossref y Europe PMC para cada DOI de `referencias.json`. El resultado legible está en [documentacion/referencias-validadas.md](../../documentacion/referencias-validadas.md).

## Puntos clave

- Tres comprobaciones por referencia: el DOI existe en Crossref; el título contiene `titulo_contiene` (detecta los DOI que apuntan a otro artículo); y el resumen, o el texto completo si se pide `texto_contiene`, contiene `resumen_contiene`.
- Estados: `OK`, `DOI_NO_EXISTE`, `REVISAR_TITULO` y `REVISAR_TEXTO`. Solo los dos primeros fallos dan código de salida 1. `REVISAR_TEXTO` es un aviso, porque muchos textos completos no son de acceso abierto y la cifra puede estar en una tabla.
- El texto completo solo existe para artículos de acceso abierto en Europe PMC. NCBI no se usa: en la red del equipo un proxy rompe su certificado TLS.
- Usa solo la biblioteca estándar. Todo el IO pasa por `_get`; `evaluar()` es pura y los tests reemplazan `_get`, sin red.
- No corre en CI, porque necesita red. Se ejecuta a mano cuando cambia el catálogo o el informe.
- Las frases de `resumen_contiene` deben copiarse tal cual del artículo, con su guion (`8–10 mmHg` lleva un guion largo) y su espaciado (`2.5 mm Hg`).

## Relación con el informe

- Respalda la sección "Fuentes" y el criterio Validity: cada cifra del informe enlaza con un artículo verificado.

tags: herramientas, referencias, papers, doi, crossref, europe-pmc, validación, informe
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [test_validar_referencias.py](test_validar_referencias.py) | 72 | — |
| [validar_referencias.py](validar_referencias.py) | 137 | Valida las referencias científicas del informe contra Crossref y Europe PMC. |

### API pública

**validar_referencias.py**

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

- `tools/validar-referencias/test_validar_referencias.py`: 7 pruebas en Evaluar (4), Validar (2), Catalogo (1)
<!-- CONTEXT:AUTO:END -->
