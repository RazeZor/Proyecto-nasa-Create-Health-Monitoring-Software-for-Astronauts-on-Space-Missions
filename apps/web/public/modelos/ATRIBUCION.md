# Atribución del modelo anatómico (`cuerpo.glb`)

## Fuente

**BodyParts3D**, © The Database Center for Life Science (DBCLS), Research Organization of Information and Systems, Japón.

- Sitio: <http://lifesciencedb.jp/bp3d/> · Archivo: <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html>
- Cita: Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. *BodyParts3D: 3D structure database for anatomical concepts.* Nucleic Acids Res. 2009;37(Database issue):D782-5. PMID 18835852.
- Modelo de cuerpo entero de un varón adulto. Todas las piezas comparten el mismo sistema de coordenadas.

## Licencia

**Creative Commons Attribution 4.0 International (CC BY 4.0)**: <https://creativecommons.org/licenses/by/4.0/>

- Términos de la base de datos (actualizados el 2025-02-27): <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html> y <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html>
- Texto de atribución que pide el licenciante:

  > BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International

- Nota: las cabeceras de los OBJ originales (2011-2013) y el README archivado de la release 3.0 aún mencionan la licencia anterior, **CC BY-SA 2.1 Japan** (<https://creativecommons.org/licenses/by-sa/2.1/jp/>). La página de licencia vigente de la base de datos indica CC BY 4.0. Ambas permiten redistribuir y adaptar con atribución; si se quiere la lectura más conservadora, trátese este derivado como CC BY-SA (solo afectaría a los pulmones, tomados de la release 3.0, y por extensión al archivo combinado).

Este archivo (`cuerpo.glb`) es una **obra derivada modificada** por el equipo de VIGÍA y se distribuye bajo la misma licencia CC BY 4.0. DBCLS no avala este proyecto.

## Archivos de origen

| Archivo | Release | URL |
|---|---|---|
| `isa_BP3D_4.0_obj_99.zip` (143 MB) | 4.0 (2013), árbol IS-A, reducción de polígonos 99 % | <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip> |
| `BodyParts3D_3.0_obj_99.zip` (134 MB) | 3.0 (2011), solo los 5 lóbulos pulmonares | <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_99.zip> |

## Transformaciones aplicadas

1. Selección de piezas por grupo (lista abajo) y eliminación de piezas duplicadas (misma caja y volumen con otro identificador).
2. Soldadura de vértices y fusión de las piezas de cada grupo en una sola malla.
3. Filtro de superficie exterior (voxelización + inundación) en `piel`, `corazon`, `cerebro`, `higado`, `intestino`, `ojos` y `pulmones`: se quitan las caras internas (la piel original es una cáscara de doble capa; las cavidades cardíacas, los tabiques entre giros o segmentos, etc.).
4. Pulmones (release 3.0): cada pulmón se encogió un 6 % alrededor de su centro y se bajó 5 mm para que encaje en la caja torácica de la release 4.0 (la 4.0 no incluye el parénquima pulmonar).
5. Eliminación de fragmentos sueltos diminutos y decimación por métrica de error cuádrico (`fast-simplification`).
6. Cambio de ejes y normalización: origen BodyParts3D en mm (+X izquierda del sujeto, −Y frente, +Z arriba) → metros, +Y arriba, +Z frente, +X izquierda del sujeto; `x=(X−cx)·s`, `y=(Z−z0)·s`, `z=−(Y−cy)·s` con `s=0.001035193` m/mm (estatura 1,78 m; la original es ≈1,72 m), `cx=-0.659`, `cy=-100.759`, `z0=-78.128` mm (centro de la caja de la piel y punto más bajo de los pies).
7. Normales suaves recalculadas (ponderadas por área) y guardadas como int8 normalizado (`KHR_mesh_quantization`); posiciones en float32; sin UV, materiales ni texturas; sin Draco ni meshopt.

Script reproducible: `construir.py` (+ `util_malla.py`, `indice.py`, `encaje_pulmon.py`, `vista_previa.py`), Python 3 con `numpy`, `scipy` y `fast-simplification`.

## Mallas

| Malla | Triángulos | Piezas de origen |
|---|---:|---:|
| `piel` | 56000 | 1 |
| `corazon` | 11999 | 7 |
| `pulmones` | 14000 | 5 |
| `cerebro` | 20000 | 47 |
| `higado` | 9000 | 11 |
| `estomago` | 1810 | 1 |
| `pancreas` | 3000 | 1 |
| `rinones` | 4000 | 2 |
| `intestino` | 17999 | 61 |
| `huesos` | 77998 | 270 |
| `arterias` | 35730 | 330 |
| `venas` | 39308 | 229 |
| `ojos` | 2400 | 4 |

## Piezas usadas (identificadores)

Identificadores `FJ…` = «element file id» de la release 4.0; `FMA…` = identificador FMA del archivo de la release 3.0.

### `piel` (1)

- FJ2810: Skin

### `corazon` (7)

- FJ2422: Cavity of left ventricle
- FJ2423: Cavity of right ventricle
- FJ2424: Cavity of right atrium
- FJ2425: Cavity of left atrium
- FJ2428: Wall of ventricle
- FJ2438: Wall of left atrium
- FJ2439: Wall of right atrium

### `pulmones` (5)

- FMA7333: upper lobe of right lung [release 3.0]
- FMA7383: middle lobe of lung (right) [release 3.0]
- FMA7337: lower lobe of right lung [release 3.0]
- FMA7370: upper lobe of left lung [release 3.0]
- FMA7371: lower lobe of left lung [release 3.0]

### `cerebro` (47)

FJ1732, FJ1733, FJ1739, FJ1740, FJ1742, FJ1744, FJ1745, FJ1746, FJ1747, FJ1748, FJ1749, FJ1758, FJ1769, FJ1770, FJ1775, FJ1781, FJ1783, FJ1784, FJ1785, FJ1786, FJ1787, FJ1788, FJ1789, FJ1790, FJ1791, FJ1792, FJ1793, FJ1794, FJ1797, FJ1798, FJ1800, FJ1801, FJ1806, FJ1817, FJ1822, FJ1830, FJ1831, FJ1833, FJ1834, FJ1835, FJ1836, FJ1837, FJ1838, FJ1839, FJ1840, FJ1841, FJ1842

Giros y lóbulos corticales, ínsula, sustancia blanca de ambos hemisferios, cuerpo calloso, cerebelo, mesencéfalo, puente y bulbo raquídeo.

### `higado` (11)

- FJ1858: Hepatovenous segment IX
- FJ2409: Hepatovenous segment VII
- FJ2816: Caudate lobe of liver
- FJ2818: Hepatovenous segment II
- FJ2819: Hepatovenous segment III
- FJ2820: Hepatovenous segment IV
- FJ2821: Hepatovenous segment V
- FJ2822: Hepatovenous segment VI
- FJ2823: Hepatovenous segment VIII
- FJ2824: Hepatovenous segment VIII
- FJ3094: Left duct of caudate lobe of liver

### `estomago` (1)

- FJ2564: Stomach

### `pancreas` (1)

- FJ1895: Pancreas

### `rinones` (2)

- FJ3145: Left kidney
- FJ3147: Right kidney

### `intestino` (61)

FJ2565, FJ2566, FJ2567, FJ2571, FJ2572, FJ2573, FJ2574, FJ2575, FJ2576, FJ2577, FJ2578, FJ2579, FJ2580, FJ2581, FJ2582, FJ2583, FJ2584, FJ2585, FJ2586, FJ2587, FJ2588, FJ2589, FJ2590, FJ2591, FJ2592, FJ2593, FJ2594, FJ2595, FJ2596, FJ2597, FJ2598, FJ2599, FJ2600, FJ2601, FJ2602, FJ2603, FJ2604, FJ2605, FJ2606, FJ2607, FJ2608, FJ2609, FJ2610, FJ2611, FJ2612, FJ2613, FJ2614, FJ2615, FJ2616, FJ2617, FJ2618, FJ2619, FJ2620, FJ2621, FJ2622, FJ2623, FJ2624, FJ2625, FJ2626, FJ2627, FJ2628

Duodeno, yeyuno, íleon, unión ileocecal, apéndice, colon ascendente, transverso y descendente, y recto.

### `huesos` (270)

FJ1254, FJ1255, FJ1256, FJ1257, FJ1258, FJ1259, FJ1260, FJ1261, FJ1262, FJ1263, FJ1264, FJ1265, FJ1266, FJ1267, FJ1268, FJ1269, FJ1270, FJ1271, FJ1272, FJ1273, FJ1274, FJ1275, FJ1276, FJ1277, FJ1278, FJ1279, FJ1280, FJ1281, FJ2772, FJ3152, FJ3153, FJ3154, FJ3155, FJ3156, FJ3157, FJ3158, FJ3159, FJ3160, FJ3161, FJ3162, FJ3163, FJ3164, FJ3165, FJ3166, FJ3167, FJ3168, FJ3169, FJ3170, FJ3171, FJ3172, FJ3173, FJ3174, FJ3175, FJ3176, FJ3177, FJ3178, FJ3179, FJ3180, FJ3181, FJ3182, FJ3183, FJ3184, FJ3185, FJ3186, FJ3187, FJ3188, FJ3189, FJ3190, FJ3191, FJ3192, FJ3193, FJ3194, FJ3195, FJ3196, FJ3197, FJ3198, FJ3199, FJ3200, FJ3202, FJ3203, FJ3204, FJ3205, FJ3206, FJ3207, FJ3208, FJ3209, FJ3210, FJ3211, FJ3212, FJ3213, FJ3214, FJ3215, FJ3216, FJ3217, FJ3218, FJ3219, FJ3220, FJ3221, FJ3222, FJ3223, FJ3224, FJ3225, FJ3226, FJ3227, FJ3228, FJ3229, FJ3230, FJ3231, FJ3232, FJ3233, FJ3234, FJ3235, FJ3236, FJ3237, FJ3239, FJ3240, FJ3241, FJ3242, FJ3243, FJ3244, FJ3245, FJ3246, FJ3247, FJ3248, FJ3249, FJ3250, FJ3251, FJ3252, FJ3253, FJ3254, FJ3255, FJ3256, FJ3257, FJ3258, FJ3259, FJ3260, FJ3261, FJ3262, FJ3263, FJ3264, FJ3265, FJ3266, FJ3267, FJ3268, FJ3269, FJ3270, FJ3271, FJ3272, FJ3273, FJ3274, FJ3275, FJ3276, FJ3277, FJ3278, FJ3279, FJ3280, FJ3281, FJ3282, FJ3283, FJ3284, FJ3285, FJ3286, FJ3287, FJ3288, FJ3289, FJ3290, FJ3291, FJ3292, FJ3293, FJ3294, FJ3295, FJ3296, FJ3297, FJ3298, FJ3299, FJ3300, FJ3301, FJ3302, FJ3303, FJ3304, FJ3305, FJ3306, FJ3307, FJ3308, FJ3309, FJ3310, FJ3311, FJ3312, FJ3313, FJ3314, FJ3315, FJ3316, FJ3317, FJ3318, FJ3319, FJ3320, FJ3321, FJ3322, FJ3323, FJ3324, FJ3325, FJ3326, FJ3327, FJ3328, FJ3329, FJ3330, FJ3331, FJ3332, FJ3333, FJ3334, FJ3335, FJ3336, FJ3337, FJ3338, FJ3339, FJ3340, FJ3341, FJ3342, FJ3343, FJ3344, FJ3345, FJ3346, FJ3347, FJ3348, FJ3349, FJ3350, FJ3351, FJ3352, FJ3353, FJ3354, FJ3355, FJ3356, FJ3357, FJ3358, FJ3359, FJ3360, FJ3361, FJ3362, FJ3364, FJ3365, FJ3366, FJ3367, FJ3368, FJ3369, FJ3370, FJ3371, FJ3372, FJ3373, FJ3374, FJ3375, FJ3376, FJ3377, FJ3378, FJ3379, FJ3380, FJ3381, FJ3382, FJ3383, FJ3384, FJ3385, FJ3386, FJ3387, FJ3388, FJ3389, FJ3390, FJ3391, FJ3392, FJ3393, FJ3394, FJ3395

Clase FMA «bone organ» completa, dientes, cartílagos costales, esternón (manubrio, cuerpo, apófisis xifoides) y discos intervertebrales.

### `arterias` (330)

FJ1656, FJ1657, FJ1657M, FJ1659, FJ1659M, FJ1664, FJ1665, FJ1667, FJ1667M, FJ1672, FJ1677, FJ1677M, FJ1678, FJ1678M, FJ1682, FJ1682M, FJ1687, FJ1687M, FJ1691, FJ1691M, FJ1712, FJ1712M, FJ1716, FJ1716M, FJ1724, FJ1724M, FJ1725, FJ1725M, FJ1844, FJ1846, FJ1928, FJ1931, FJ1932, FJ1934, FJ1935, FJ1936, FJ1937, FJ1938, FJ1939, FJ1950, FJ1961, FJ1967, FJ1969, FJ1970, FJ1971, FJ1972, FJ1973, FJ1974, FJ1975, FJ1976, FJ1977, FJ1979, FJ2011, FJ2025, FJ2034, FJ2038, FJ2046, FJ2055, FJ2057, FJ2063, FJ2065, FJ2066, FJ2067, FJ2069, FJ2073, FJ2074, FJ2076, FJ2077, FJ2078, FJ2080, FJ2081, FJ2083, FJ2084, FJ2086, FJ2087, FJ2130, FJ2131, FJ2133, FJ2137, FJ2143, FJ2150, FJ2152, FJ2158, FJ2162, FJ2163, FJ2166, FJ2167, FJ2170, FJ2172, FJ2209, FJ2210, FJ2211, FJ2212, FJ2214, FJ2215, FJ2216, FJ2219, FJ2221, FJ2223, FJ2224, FJ2225, FJ2226, FJ2230, FJ2231, FJ2232, FJ2236, FJ2239, FJ2240, FJ2241, FJ2242, FJ2243, FJ2245, FJ2246, FJ2251, FJ2252, FJ2253, FJ2255, FJ2256, FJ2257, FJ2258, FJ2259, FJ2261, FJ2262, FJ2263, FJ2264, FJ2266, FJ2267, FJ2268, FJ2271, FJ2273, FJ2275, FJ2276, FJ2277, FJ2278, FJ2282, FJ2283, FJ2284, FJ2288, FJ2291, FJ2292, FJ2293, FJ2294, FJ2295, FJ2297, FJ2298, FJ2303, FJ2304, FJ2305, FJ2307, FJ2308, FJ2309, FJ2310, FJ2311, FJ2314, FJ2330, FJ2331, FJ2332, FJ2338, FJ2339, FJ2342, FJ2361, FJ2362, FJ2363, FJ2371, FJ2372, FJ2373, FJ2374, FJ2562, FJ2631, FJ2632, FJ2633, FJ2634, FJ2635, FJ2636, FJ2637, FJ2638, FJ2639, FJ2640, FJ2641, FJ2642, FJ2643, FJ2644, FJ2645, FJ2646, FJ2647, FJ2648, FJ2649, FJ2650, FJ2651, FJ2652, FJ2653, FJ2654, FJ2667, FJ2668, FJ2670, FJ2671, FJ2672, FJ2673, FJ2674, FJ2675, FJ2676, FJ2677, FJ2692, FJ2693, FJ2694, FJ2695, FJ2696, FJ2697, FJ2698, FJ2699, FJ2700, FJ2714, FJ2715, FJ2716, FJ2717, FJ2718, FJ2719, FJ2720, FJ2721, FJ2722, FJ2723, FJ2732, FJ2733, FJ2734, FJ2735, FJ2736, FJ2737, FJ2924, FJ2966, FJ3019, FJ3401, FJ3406, FJ3409, FJ3410, FJ3411, FJ3413, FJ3414, FJ3417, FJ3419, FJ3420, FJ3421, FJ3430, FJ3431, FJ3432, FJ3433, FJ3437, FJ3439, FJ3442, FJ3444, FJ3446, FJ3458, FJ3459, FJ3460, FJ3461, FJ3462, FJ3463, FJ3464, FJ3466, FJ3467, FJ3468, FJ3472, FJ3473, FJ3474, FJ3475, FJ3476, FJ3479, FJ3481, FJ3483, FJ3494, FJ3496, FJ3497, FJ3499, FJ3501, FJ3511, FJ3514, FJ3515, FJ3516, FJ3517, FJ3518, FJ3519, FJ3520, FJ3529, FJ3532, FJ3534, FJ3542, FJ3544, FJ3546, FJ3553, FJ3557, FJ3558, FJ3559, FJ3560, FJ3561, FJ3562, FJ3563, FJ3564, FJ3565, FJ3567, FJ3569, FJ3573, FJ3574, FJ3575, FJ3576, FJ3579, FJ3581, FJ3582, FJ3584, FJ3586, FJ3590, FJ3592, FJ3593, FJ3594, FJ3596, FJ3604, FJ3614, FJ3617, FJ3619, FJ3620, FJ3621, FJ3622, FJ3623, FJ3624, FJ3625, FJ3626, FJ3632, FJ3636, FJ3638, FJ3640, FJ3644, FJ3656

Clase FMA «artery» más aorta (ascendente, cayado, torácica, abdominal), tronco pulmonar, tronco celíaco, axilares, braquiales y coronarias; se excluyen las ramas intrapulmonares, intrahepáticas, cerebrales y digitales.

### `venas` (229)

FJ1853, FJ1893, FJ1913, FJ1981, FJ1985, FJ1986, FJ1987, FJ1988, FJ1991, FJ1993, FJ1994, FJ1995, FJ1996, FJ2056, FJ2059, FJ2060, FJ2061, FJ2062, FJ2097, FJ2099, FJ2102, FJ2103, FJ2107, FJ2108, FJ2117, FJ2118, FJ2121, FJ2122, FJ2124, FJ2125, FJ2132, FJ2135, FJ2144, FJ2145, FJ2151, FJ2153, FJ2171, FJ2173, FJ2176, FJ2178, FJ2181, FJ2182, FJ2183, FJ2184, FJ2187, FJ2188, FJ2189, FJ2190, FJ2193, FJ2194, FJ2200, FJ2201, FJ2202, FJ2208, FJ2213, FJ2217, FJ2218, FJ2220, FJ2222, FJ2233, FJ2234, FJ2235, FJ2244, FJ2247, FJ2250, FJ2254, FJ2260, FJ2265, FJ2269, FJ2270, FJ2272, FJ2274, FJ2285, FJ2286, FJ2287, FJ2296, FJ2299, FJ2302, FJ2306, FJ2312, FJ2313, FJ2341, FJ2404, FJ2405, FJ2655, FJ2656, FJ2657, FJ2658, FJ2659, FJ2660, FJ2661, FJ2662, FJ2663, FJ2664, FJ2665, FJ2678, FJ2679, FJ2680, FJ2681, FJ2682, FJ2683, FJ2684, FJ2685, FJ2686, FJ2687, FJ2688, FJ2689, FJ2690, FJ2691, FJ2701, FJ2702, FJ2703, FJ2704, FJ2705, FJ2706, FJ2707, FJ2708, FJ2709, FJ2710, FJ2711, FJ2712, FJ2713, FJ2724, FJ2725, FJ2727, FJ2728, FJ2729, FJ2730, FJ2731, FJ2925, FJ2933, FJ2944, FJ2950, FJ2955, FJ3020, FJ3040, FJ3082, FJ3400, FJ3415, FJ3416, FJ3426, FJ3429, FJ3434, FJ3438, FJ3440, FJ3441, FJ3443, FJ3447, FJ3448, FJ3449, FJ3450, FJ3451, FJ3452, FJ3465, FJ3469, FJ3470, FJ3471, FJ3477, FJ3478, FJ3480, FJ3482, FJ3484, FJ3485, FJ3486, FJ3493, FJ3495, FJ3500, FJ3502, FJ3510, FJ3512, FJ3513, FJ3522, FJ3523, FJ3524, FJ3525, FJ3526, FJ3527, FJ3530, FJ3531, FJ3533, FJ3541, FJ3543, FJ3545, FJ3566, FJ3568, FJ3570, FJ3571, FJ3572, FJ3577, FJ3578, FJ3580, FJ3583, FJ3585, FJ3587, FJ3589, FJ3591, FJ3595, FJ3597, FJ3603, FJ3605, FJ3606, FJ3607, FJ3608, FJ3609, FJ3610, FJ3611, FJ3612, FJ3615, FJ3616, FJ3618, FJ3631, FJ3635, FJ3637, FJ3639, FJ3641, FJ3645, FJ3646, FJ3647, FJ3648, FJ3649, FJ3650, FJ3651, FJ3652, FJ3653, FJ3654, FJ3655, FJ3657, FJ3658, FJ3659

Clase FMA «vein» más venas cavas superior e inferior, seno coronario, vena porta y venas pulmonares principales; se excluyen las ramas intrapulmonares, intrahepáticas y digitales.

### `ojos` (4)

- FJ1289: Left cornea
- FJ1317: Left sclera
- FJ1340: Right cornea
- FJ1368: Right sclera
