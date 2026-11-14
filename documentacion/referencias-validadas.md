# VIGÍA: referencias científicas validadas

Complemento de [VIGA-informe-tcnico…md](VIGA-informe-tcnico-para-el-reto-Health-Monitoring-Software-NASA-Space-Apps-2026.md). Reúne los artículos revisados por pares que sostienen cada afirmación con cifra del informe, con su DOI, y anota lo que hay que corregir.

## Cómo se validó

Validación automática del 14 de noviembre de 2026, en tres pasos por referencia:

1. **El DOI existe.** Consulta a Crossref (`api.crossref.org/works/<doi>`): título, revista, año y autores.
2. **Es el artículo que creemos.** El título devuelto debe contener las palabras esperadas. Así se detectaron tres DOI equivocados que apuntaban a otros artículos (ver "Correcciones").
3. **Dice lo que citamos.** Se buscó la cifra en el resumen de Europe PMC y, cuando no estaba ahí, en el texto completo de PMC. Las citas textuales de la columna "Verificado" salen de ahí.

Estados: **✔** cifra encontrada en el resumen o el texto completo. **◐** el artículo existe y trata el tema, pero la cifra exacta no se pudo leer en el texto. **✘** no respalda o contradice lo que dice el informe.

## 1. Problema y peligros (informe §2.1)

| Afirmación del informe | Referencia | Verificado | Estado |
| --- | --- | --- | --- |
| Cinco peligros (RIDGE) que se entrelazan; más de 30 riesgos de salud | Patel et al., *npj Microgravity* 2020. [10.1038/s41526-020-00124-6](https://doi.org/10.1038/s41526-020-00124-6) | "linked with over 30 human health risks as documented by NASA's Human Research Program"; los riesgos "are inherently interconnected" | ✔ |
| Efectos multisistema del vuelo espacial | Afshinnekoo et al., *Cell* 2020. [10.1016/j.cell.2020.10.050](https://doi.org/10.1016/j.cell.2020.10.050) | Seis rasgos biológicos fundamentales y repaso de los peligros del vuelo | ✔ |
| Hueso: 1 a 1,5 % de densidad por mes | Lang et al., *J Bone Miner Res* 2004. [10.1359/JBMR.040307](https://doi.org/10.1359/JBMR.040307) | "lost bone at an average rate of 1%/month from the spine and 1.5%/month from the hip" | ✔ |
| Hueso, segunda fuente | Vico et al., *Lancet* 2000. [10.1016/S0140-6736(00)02217-0](https://doi.org/10.1016/S0140-6736(00)02217-0) | Pérdida ósea en hueso de carga en vuelos largos | ✔ |
| SANS: edema de papila, aplanamiento del globo, pliegues | Mader et al., *Ophthalmology* 2011. [10.1016/j.ophtha.2011.06.021](https://doi.org/10.1016/j.ophtha.2011.06.021) | Título: "Optic Disc Edema, Globe Flattening, Choroidal Folds, and Hyperopic Shifts Observed in Astronauts" | ✔ |
| SANS: revisión actualizada | Lee et al., *npj Microgravity* 2020. [10.1038/s41526-020-0097-9](https://doi.org/10.1038/s41526-020-0097-9) | Manifestaciones clínicas y brechas de conocimiento | ✔ |
| Sueño en vuelo de 6 a 6,5 h | Barger et al., *Lancet Neurol* 2014. [10.1016/S1474-4422(14)70122-X](https://doi.org/10.1016/S1474-4422(14)70122-X) | Actigrafía de muñeca y registro diario; 5,96 h obtenidas por noche en el transbordador | ✔ |
| Déficit de sueño y peor desempeño en 24 astronautas, misiones de 6 meses | Jones et al., *Sleep* 2022. [10.1093/sleep/zsac006](https://doi.org/10.1093/sleep/zsac006) | N = 24; "~6.5 h in-flight"; menos de 6 h se asocia a menor velocidad de respuesta, más estrés y más carga de trabajo | ✔ |
| El retardo de comunicación afecta a la tripulación | Kintz y Palinkas, *Aerosp Med Hum Perform* 2016. [10.3357/AMHP.4626.2016](https://doi.org/10.3357/AMHP.4626.2016) | Estudio en la ISS con retardo de 50 s por trayecto | ✔ |
| Seguimiento longitudinal frente a la línea base de la persona | Garrett-Bakelman et al., *Science* 2019 (NASA Twins). [10.1126/science.aau8650](https://doi.org/10.1126/science.aau8650) | Cambios multisistema medidos antes, durante y después de un año en la ISS | ✔ |

## 2. Metrología en gravedad alterada (informe §2.4 y anexo A)

| Afirmación del informe | Referencia | Verificado | Estado |
| --- | --- | --- | --- |
| Presión braquial de 24 h baja 8 a 10 mmHg; resistencia vascular sistémica −39 % | Norsk et al., *J Physiol* 2015. [10.1113/jphysiol.2014.284869](https://doi.org/10.1113/jphysiol.2014.284869) | "Twenty-four hour ambulatory brachial blood pressure is reduced by 8–10 mmHg by a decrease in systemic vascular resistance of 39%" | ✔ |
| Temperatura central +1 °C en 2,5 meses; más de 40 °C en ejercicio; sensor doble en la frente | Stahn et al., *Sci Rep* 2017. [10.1038/s41598-017-15560-w](https://doi.org/10.1038/s41598-017-15560-w) | "increase of about 1 °C developed gradually over 2.5 months"; "even exceeded 40 °C in some individuals"; sensor de piel combinado con sensor de flujo de calor | ✔ |
| Masa: −4,4 % con BMMD y −2,8 % con SLAMMD en 25 tripulantes | Zwart et al., *Aviat Space Environ Med* 2014. [10.3357/ASEM.3979.2014](https://doi.org/10.3357/ASEM.3979.2014) | Cifras idénticas; diferencia media de 1,1 kg entre los dos dispositivos | ✔ |
| Actigrafía: buena para la duración, mala para detectar vigilia | Marino et al., *Sleep* 2013. [10.5665/sleep.3142](https://doi.org/10.5665/sleep.3142) | Sensibilidad 0,965 y especificidad 0,329 frente a polisomnografía | ✔ |
| Glucómetros en hipobaria: evidencia contradictoria entre enzimas | de Mol et al., *PLoS ONE* 2010. [10.1371/journal.pone.0015485](https://doi.org/10.1371/journal.pone.0015485) | "No significant difference" entre glucosa oxidasa y deshidrogenasa a altitud simulada | ✔ (respalda la cautela del informe) |
| La presión sin manguito por onda de pulso depende de la calibración | Mukkamala et al., *IEEE TBME* 2015. [10.1109/TBME.2015.2441951](https://doi.org/10.1109/TBME.2015.2441951) | Revisión de la relación entre tiempo de tránsito y presión y de sus límites prácticos. El resumen no menciona la calibración; está en el cuerpo del artículo | ◐ |
| Microtoma capilar y contención en vuelo | Mampre et al., *J Clin Pharmacol* 2026. [10.1002/jcph.70240](https://doi.org/10.1002/jcph.70240) | Microtoma volumétrica capilar en Polaris Dawn; "All samples collected in microgravity were adequate" | ✔ |

## 3. Datos humanos y radiación (informe §3.1)

| Afirmación del informe | Referencia | Verificado | Estado |
| --- | --- | --- | --- |
| Datos humanos de Inspiration4 en OSDR | Overbey et al., *Nature* 2024 (SOMA). [10.1038/s41586-024-07639-y](https://doi.org/10.1038/s41586-024-07639-y) | Atlas con NASA Twins, JAXA CFE, Inspiration4, Axiom y Polaris | ✔ |
| Dosis en crucero a Marte (MSL-RAD), perfil de tránsito | Zeitlin et al., *Science* 2013. [10.1126/science.1235989](https://doi.org/10.1126/science.1235989) | Dosis equivalente de 0,66 ± 0,12 Sv en el viaje de ida y vuelta más corto | ✔ |

## 4. Motor híbrido (informe §5.1 y §5.2)

Estos son los artículos que más sostienen el criterio **Validity**: muestran que la arquitectura del motor (línea base personal + CUSUM) ya funcionó con datos reales de vestibles.

| Afirmación del informe | Referencia | Verificado | Estado |
| --- | --- | --- | --- |
| Capa A: tramos NEWS como piso de seguridad | Smith et al., *Resuscitation* 2013. [10.1016/j.resuscitation.2012.12.016](https://doi.org/10.1016/j.resuscitation.2012.12.016) | AUROC de 0,894 para muerte en 24 h, mejor que otras 33 escalas, en 198 755 observaciones | ✔ |
| Capa A: NEWS2 | Pimentel et al., *Resuscitation* 2019. [10.1016/j.resuscitation.2018.09.026](https://doi.org/10.1016/j.resuscitation.2018.09.026) | Los cambios de NEWS2 "do not improve discrimination" frente a NEWS. Ver advertencia 2 | ✔ (con matiz) |
| Capas B y C: desviación de la FC en reposo frente a una línea base personal, con CUSUM en línea | Mishra et al., *Nat Biomed Eng* 2020. [10.1038/s41551-020-00640-6](https://doi.org/10.1038/s41551-020-00640-6) | "we developed an online detection method called CuSum"; "The baseline window was set to 28 d"; alarma antes o el día de los síntomas en 15 de 24 casos | ✔ |
| Capas B y C: el mismo enfoque en un estudio prospectivo | Alavi et al., *Nat Med* 2022. [10.1038/s41591-021-01593-2](https://doi.org/10.1038/s41591-021-01593-2) | 3 318 participantes; alertas en el 80 % de los infectados, con una mediana de 3 días antes de los síntomas; el estrés también dispara alertas, con menos frecuencia | ✔ |
| Capa B: FC en reposo y sueño de vestibles sirven para vigilar | Radin et al., *Lancet Digit Health* 2020. [10.1016/S2589-7500(19)30222-5](https://doi.org/10.1016/S2589-7500(19)30222-5) | 200 000 usuarios de Fitbit; FC en reposo y sueño | ✔ |
| Combinar sensor y autorreporte mejora la detección (mitigación del autorreporte sesgado, §5.6) | Quer et al., *Nat Med* 2021. [10.1038/s41591-020-1123-x](https://doi.org/10.1038/s41591-020-1123-x) | Síntomas + sensor: AUC de 0,80, mejor que los síntomas solos | ✔ |
| Las desviaciones de la línea base personal revelan enfermedad incipiente | Li et al., *PLoS Biol* 2017. [10.1371/journal.pbio.2001402](https://doi.org/10.1371/journal.pbio.2001402) | Normalización personalizada para detectar señales anormales; también mide la caída de SpO2 en vuelos comerciales | ✔ |
| Capa B: mediana y MAD en lugar de media y desviación estándar | Leys et al., *J Exp Soc Psychol* 2013. [10.1016/j.jesp.2013.03.013](https://doi.org/10.1016/j.jesp.2013.03.013) | Título: "Do not use standard deviation around the mean, use absolute deviation around the median" | ✔ |
| Capa B: z modificada con umbral de 3,5 | Iglewicz y Hoaglin, *How to Detect and Handle Outliers*, ASQC 1993 (libro, sin DOI) | No verificable en línea; es la referencia estándar de la fórmula | ◐ |
| Capa C: CUSUM | Page, *Biometrika* 1954. [10.1093/biomet/41.1-2.100](https://doi.org/10.1093/biomet/41.1-2.100) | "Continuous inspection schemes" | ✔ |
| §5.2: volumen plasmático −17 % en 24 h | Williams et al., *CMAJ* 2009. [10.1503/cmaj.090628](https://doi.org/10.1503/cmaj.090628) | "The first 24 hours of space flight are characterized by a 17% reduction in plasma volume" | ✔ |
| §5.2: volumen plasmático, segunda fuente | Leach et al., *J Appl Physiol* 1996. [10.1152/jappl.1996.81.1.105](https://doi.org/10.1152/jappl.1996.81.1.105) | Regulación de los compartimentos de fluidos en vuelos cortos | ✔ |
| §5.2: duración del mareo espacial | Williams et al. 2009 (arriba) y Lackner y DiZio, *Exp Brain Res* 2006. [10.1007/s00221-006-0697-y](https://doi.org/10.1007/s00221-006-0697-y) | Williams: "during the first 1–2 days". Ver corrección 1 | ✘ cifra distinta |
| Contexto: CO2 de cabina y cefalea | Law et al., *J Occup Environ Med* 2014. [10.1097/JOM.0000000000000158](https://doi.org/10.1097/JOM.0000000000000158) | "For each 1-mm Hg increase in CO2, the odds of a crew member reporting a headache doubled"; para un riesgo menor al 1 %, promedio de 7 días por debajo de 2,5 mmHg | ✔ |

## 5. Prueba de vigilancia, alarmas y usabilidad (informe §5.3, §4.2, §6.3)

| Afirmación del informe | Referencia | Verificado | Estado |
| --- | --- | --- | --- |
| PVT-B de 3 minutos válida; lapso a partir de 355 ms | Basner, Mollicone y Dinges, *Acta Astronaut* 2011. [10.1016/j.actaastro.2011.07.015](https://doi.org/10.1016/j.actaastro.2011.07.015) | "After reducing the lapse threshold from 500 ms to 355 ms for PVT-B…" | ✔ |
| PVT-B: salida en falso por debajo de 130 ms | Mismo artículo | No se pudo leer el texto completo. Una fuente secundaria (PsyToolkit, que cita a Basner 2011) usa menos de 100 ms. Ver corrección 2 | ◐ |
| Fatiga de alarmas (justifica tres niveles y persistencia de dos días) | Sendelbach y Funk, *AACN Adv Crit Care* 2013. [10.1097/NCI.0b013e3182a903f9](https://doi.org/10.1097/NCI.0b013e3182a903f9) | "72% to 99% of clinical alarms are false" | ✔ |
| SUS: meta de más de 68 | Bangor, Kortum y Miller, *Int J Hum Comput Interact* 2008. [10.1080/10447310802205776](https://doi.org/10.1080/10447310802205776) | Evaluación empírica de la escala SUS (el DOI existe; no hay resumen en Europe PMC) | ◐ |

## Correcciones al informe

Las dos primeras ya están aplicadas en el informe.

1. **Mareo espacial (§5.2 y fuentes).** El informe decía que "suele ceder en 2 o 3 días" y citaba a Williams et al. Ese artículo dice "during the first 1–2 days". Ahora dice "1 a 2 días, aunque en algunos tripulantes tarda más". La decisión de diseño no cambia: el modo adaptación de 14 días cubre ese rango de sobra.
2. **Salida en falso de la PVT-B (§5.3).** No encontramos respaldo para el umbral de 130 ms; lo que encontramos apunta a menos de 100 ms. El informe ahora dice 100 ms, marcado como "umbral por confirmar". Falta leer la sección de métodos de Basner 2011 (PDF en la web de UPenn) antes de implementar la prueba.
3. **Pendiente: tabla de fuentes.** Añadir el DOI a cada artículo de la sección "Fuentes" usando las tablas de arriba. Por ahora el informe enlaza a este archivo.

## Volver a validar

El catálogo de referencias y el validador están en [tools/validar-referencias](../tools/validar-referencias/MODULE.md):

```sh
python tools/validar-referencias/validar_referencias.py            # todas
python tools/validar-referencias/validar_referencias.py --solo law2014,norsk2015
```

Para sumar una referencia, agrégala a `referencias.json` con la frase del título y la cifra que debe aparecer en el texto.

## Advertencias que conviene declarar

1. **NEWS2 con 4 de sus 7 parámetros.** NEWS2 suma también frecuencia respiratoria, nivel de conciencia y oxígeno suplementario. Los cortes de suma de la capa A (ámbar de 3 a 4, rojo desde 5) se validaron con los 7 parámetros, así que con 4 la suma es más baja y menos sensible. Los tramos por parámetro sí coinciden con la tabla oficial: los revisamos uno por uno. Sugerencia para el informe: "usamos los tramos de NEWS2 por parámetro; los cortes de suma son una adaptación, no un valor validado".
2. **NEWS2 frente a NEWS.** Pimentel et al. 2019 encontró que NEWS2 no discrimina mejor que NEWS. No afecta a VIGÍA, porque la escala de SpO2 que usamos (escala 1) es la misma en las dos versiones, pero no conviene presentar NEWS2 como "el más validado".
3. **El respaldo del motor viene de la Tierra.** Mishra 2020 y Alavi 2022 validan el método (línea base personal + CUSUM sobre la FC en reposo) en personas en tierra con infecciones, no en astronautas. Es un argumento fuerte de que el método funciona; no es una validación en vuelo. Redacción sugerida para el pitch: "la misma técnica detectó infecciones antes de los síntomas en el 80 % de 84 casos con datos reales de relojes (Alavi et al., *Nature Medicine* 2022)".
4. **El umbral de CO2 podría ser más estricto.** Law et al. 2014 sugiere un promedio de 7 días por debajo de 2,5 mmHg para mantener el riesgo de cefalea bajo el 1 %. La regla de contexto (más de 3 mmHg en una hora, con cefalea) sigue NASA-STD-3001, así que es correcta como límite. Se puede añadir un aviso informativo cuando el promedio de 7 días supere 2,5 mmHg.

## Cálculos del informe recomprobados

| Cálculo | Informe | Recalculado |
| --- | --- | --- |
| 3 mmHg de CO2 a 760 mmHg | 3 950 ppm | 3 947 ppm |
| 3 mmHg a 527 mmHg | 5 690 ppm | 5 693 ppm |
| 3 mmHg a 424 mmHg | 7 070 ppm | 7 075 ppm |
| 3 950 ppm a 424 mmHg | 1,7 mmHg | 1,67 mmHg |
| 7 070 ppm a 760 mmHg | 5,4 mmHg | 5,37 mmHg |
| 12,4 kg leídos en la Luna (g = 0,165) | 75 kg | 75,2 kg |
| Tramos NEWS2 de SpO2, temperatura, presión sistólica y FC | Tabla de §5.1 | Coinciden con la tabla oficial del RCP |
