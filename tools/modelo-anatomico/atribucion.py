import json
import sys

W, D = sys.argv[1], sys.argv[2]
p = json.load(open(W + "/salida/piezas.json", encoding="utf-8"))
m = json.load(open(W + "/salida/cuerpo.json", encoding="utf-8"))
t = m["transformacion"]
L = []
a = L.append
a("# Atribución del modelo anatómico (`cuerpo.glb`)\n")
a("## Fuente\n")
a("**BodyParts3D**, © The Database Center for Life Science (DBCLS), Research Organization of Information and Systems, Japón.\n")
a("- Sitio: <http://lifesciencedb.jp/bp3d/> · Archivo: <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html>")
a("- Cita: Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. *BodyParts3D: 3D structure database for anatomical concepts.* Nucleic Acids Res. 2009;37(Database issue):D782-5. PMID 18835852.")
a("- Modelo de cuerpo entero de un varón adulto. Todas las piezas comparten el mismo sistema de coordenadas.\n")
a("## Licencia\n")
a("**Creative Commons Attribution 4.0 International (CC BY 4.0)**: <https://creativecommons.org/licenses/by/4.0/>\n")
a("- Términos de la base de datos (actualizados el 2025-02-27): <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html> y <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html>")
a("- Texto de atribución que pide el licenciante:\n")
a("  > BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International\n")
a("- Nota: las cabeceras de los OBJ originales (2011-2013) y el README archivado de la release 3.0 aún mencionan la licencia anterior, **CC BY-SA 2.1 Japan** (<https://creativecommons.org/licenses/by-sa/2.1/jp/>). La página de licencia vigente de la base de datos indica CC BY 4.0. Ambas permiten redistribuir y adaptar con atribución; si se quiere la lectura más conservadora, trátese este derivado como CC BY-SA (solo afectaría a los pulmones, tomados de la release 3.0, y por extensión al archivo combinado).\n")
a("Este archivo (`cuerpo.glb`) es una **obra derivada modificada** por el equipo de VIGÍA y se distribuye bajo la misma licencia CC BY 4.0. DBCLS no avala este proyecto.\n")
a("## Archivos de origen\n")
a("| Archivo | Release | URL |\n|---|---|---|")
a("| `isa_BP3D_4.0_obj_99.zip` (143 MB) | 4.0 (2013), árbol IS-A, reducción de polígonos 99 % | <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip> |")
a("| `BodyParts3D_3.0_obj_99.zip` (134 MB) | 3.0 (2011), solo los 5 lóbulos pulmonares | <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_99.zip> |\n")
a("## Transformaciones aplicadas\n")
a("1. Selección de piezas por grupo (lista abajo) y eliminación de piezas duplicadas (misma caja y volumen con otro identificador).")
a("2. Soldadura de vértices y fusión de las piezas de cada grupo en una sola malla.")
a("3. Filtro de superficie exterior (voxelización + inundación) en `piel`, `corazon`, `cerebro`, `higado`, `intestino`, `ojos` y `pulmones`: se quitan las caras internas (la piel original es una cáscara de doble capa; las cavidades cardíacas, los tabiques entre giros o segmentos, etc.).")
a("4. Pulmones (release 3.0): cada pulmón se encogió un 6 % alrededor de su centro y se bajó 5 mm para que encaje en la caja torácica de la release 4.0 (la 4.0 no incluye el parénquima pulmonar).")
a("5. Eliminación de fragmentos sueltos diminutos y decimación por métrica de error cuádrico (`fast-simplification`).")
a(f"6. Cambio de ejes y normalización: origen BodyParts3D en mm (+X izquierda del sujeto, −Y frente, +Z arriba) → metros, +Y arriba, +Z frente, +X izquierda del sujeto; `x=(X−cx)·s`, `y=(Z−z0)·s`, `z=−(Y−cy)·s` con `s={t['escala_m_por_mm']:.9f}` m/mm (estatura 1,78 m; la original es ≈1,72 m), `cx={t['centro_x_mm']:.3f}`, `cy={t['centro_y_mm']:.3f}`, `z0={t['z0_mm']:.3f}` mm (centro de la caja de la piel y punto más bajo de los pies).")
a("7. Normales suaves recalculadas (ponderadas por área) y guardadas como int8 normalizado (`KHR_mesh_quantization`); posiciones en float32; sin UV, materiales ni texturas; sin Draco ni meshopt.\n")
a("Script reproducible: `construir.py` (+ `util_malla.py`, `indice.py`, `encaje_pulmon.py`, `vista_previa.py`), Python 3 con `numpy`, `scipy` y `fast-simplification`.\n")
a("## Mallas\n")
a("| Malla | Triángulos | Piezas de origen |\n|---|---:|---:|")
for k, r in m["mallas"].items(): a(f"| `{k}` | {r['triangulos']} | {len(p[k])} |")
a("\n## Piezas usadas (identificadores)\n")
a("Identificadores `FJ…` = «element file id» de la release 4.0; `FMA…` = identificador FMA del archivo de la release 3.0.\n")
for k in m["mallas"]:
    a(f"### `{k}` ({len(p[k])})\n")
    if len(p[k]) <= 12:
        for i, n in p[k]: a(f"- {i}: {n}")
        a("")
    else:
        a(", ".join(i for i, _ in p[k]) + "\n")
        if k == "cerebro": a("Giros y lóbulos corticales, ínsula, sustancia blanca de ambos hemisferios, cuerpo calloso, cerebelo, mesencéfalo, puente y bulbo raquídeo.\n")
        if k == "higado": a("Segmentos hepatovenosos II-IX y lóbulo caudado.\n")
        if k == "intestino": a("Duodeno, yeyuno, íleon, unión ileocecal, apéndice, colon ascendente, transverso y descendente, y recto.\n")
        if k == "huesos": a("Clase FMA «bone organ» completa, dientes, cartílagos costales, esternón (manubrio, cuerpo, apófisis xifoides) y discos intervertebrales.\n")
        if k == "arterias": a("Clase FMA «artery» más aorta (ascendente, cayado, torácica, abdominal), tronco pulmonar, tronco celíaco, axilares, braquiales y coronarias; se excluyen las ramas intrapulmonares, intrahepáticas, cerebrales y digitales.\n")
        if k == "venas": a("Clase FMA «vein» más venas cavas superior e inferior, seno coronario, vena porta y venas pulmonares principales; se excluyen las ramas intrapulmonares, intrahepáticas y digitales.\n")
open(D + "/ATRIBUCION.md", "w", encoding="utf-8", newline="\n").write("\n".join(L).rstrip() + "\n")
