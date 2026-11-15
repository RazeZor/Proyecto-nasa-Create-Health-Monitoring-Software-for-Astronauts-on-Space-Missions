# Guion de la presentación con demo en vivo al final

Versión para presentar con `VIGIA-pitch-es.pptx` (15 diapositivas: 13 de contenido y 2 de demo al final) y la app corriendo en el PC del equipo. Duración objetivo: 4 minutos de pitch más la demo. Complementa a `GUIONES.md` (allí están el vídeo de 30 s y las preguntas del jurado).

Regla de oro: cada dato real se nombra con su fuente; lo simulado se dice que es simulado; nunca «diagnostica», siempre «apoya la decisión».

## 0. Preparación (30 minutos antes)

1. Arrancar la API y la web en el PC (`uvicorn` en :8000 y `next` en :3000). Si se usa `next dev`, abrir **todas** las pantallas una vez antes de empezar: la primera carga tarda hasta 25 s y muestra solo el logotipo.
2. Abrir en Chrome, ventana propia y tema claro: `http://localhost:3000/?modo=demo&lang=es`. Comprobar la banda «Modo demo» y poner el **día de misión en 27** (ahí están la deriva, el pico de CO2 y la tormenta).
3. Dejar abiertas en pestañas: Cuerpo, Registro, Entorno, Alertas, Informes, Dispositivo. Cerrar los avisos emergentes que salgan (se cierran solos a los pocos segundos).
4. Reloj (opcional): encender el hotspot `umbra` con `tools/red-local/hotspot.ps1 -Vigilar`, reloj de Fernando apuntando a `ws://192.168.137.1:8765/watch`, y comprobar en Dispositivo que los cuatro pasos estén en verde. Si el paso 4 queda en ámbar, no insistir.
5. Wifi del PC apagado durante la demo si se quiere mostrar que funciona sin conexión (la app ya está cargada; la API es local).
6. Plan B: las diapositivas 14 y 15 llevan capturas de las mismas pantallas. Si la app falla, se sigue el guion de la demo sobre ellas.

## 1. Guion por diapositiva

Unos 15 segundos por diapositiva salvo donde se indica. Las dos últimas son la demo en vivo.

| # | Diapositiva | Qué se dice |
| --- | --- | --- |
| 1 | 22:00 | «Te duele la cabeza y estás mareada. Le escribes a tu médico. La respuesta llegará en 44 minutos, si llega. Estás a mitad de camino a Marte.» Pausa de dos segundos. |
| 2 | VIGÍA | «Somos [equipo]: [integrantes]. Esto es VIGÍA. Un monitor con el que la tripulación evalúa su propia salud a bordo, sin conexión y sin esperar a la Tierra.» |
| 3 | Camino a Marte, tu médico está a 22 minutos | «La NASA define cinco peligros del vuelo espacial que se potencian entre sí: radiación, aislamiento, distancia, gravedad y ambiente cerrado. En la Estación el modelo es estabilizar y regresar. En Marte no hay regreso: la tripulación decide sola. Los monitores actuales mandan datos a tierra; no ayudan a decidir a bordo.» |
| 4 | Registrar, evaluar, actuar | «VIGÍA hace tres cosas. Registra: un chequeo diario en menos de 90 segundos, sin teclado, y cada medida explica cómo tomarla en esta misión. Evalúa: tres capas, seguridad clínica, tu propia línea base y deriva lenta, con el entorno real dentro del razonamiento. Actúa: verde, ámbar o rojo por sistema del cuerpo, con el motivo y el siguiente paso.» |
| 5 | El entorno es parte del razonamiento | «Un ejemplo con datos reales. Día 12: dolor de cabeza y CO2 de cabina de NASA OSDR por encima del límite. Es una alerta de entorno para toda la tripulación, no una alerta médica de una persona. Día 22: un evento solar real del catálogo DONKI con el flujo GOES de la NOAA enciende el modo tormenta. Días 18 a 27: sueño, pulso y ánimo derivan despacio; un umbral fijo nunca salta, la línea base personal sí.» |
| 6 | Tres preguntas por registro, y luego el entorno | «Por cada registro el motor hace tres preguntas: ¿está fuera de una banda de seguridad? ¿Se aleja de tu propia línea base? ¿Lleva días derivando? Y después mira el entorno. Las reglas tienen fuente citada y son de prototipo. El motor está escrito dos veces, en Python y en TypeScript, con un test de paridad entre ambos.» |
| 7 | Lo que diferencia a VIGÍA | «Cuatro cosas. Tu línea base en vez de rangos de libro. El entorno dentro del veredicto, no en otra pantalla. La decisión a bordo, en privado y sin conexión. Y honestidad: cada valor dice si es real o simulado.» |
| 8 | Cinco peligros, cinco respuestas, cinco entornos | «Cada peligro del HRP tiene en VIGÍA una medida, una regla y una acción. Y los cinco perfiles de misión, de la Estación a la superficie de Marte, cambian la presión de cabina, el retardo de comunicación y cómo se toma cada medida.» |
| 9 | Un reloj en la muñeca | «También hicimos el lado del reloj: una app Wear OS para el Galaxy Watch4 y su servidor. Solo entran al motor los chequeos válidos de pulso en reposo y SpO2; el flujo crudo a un hercio nunca sale de la memoria.» |
| 10 | Datos abiertos de la NASA y sus socios | «Dosis de radiación de RadLab, CO2 de cabina de la Environmental Data Application, eventos solares de DONKI, flujo de protones de GOES, y los peligros del HRP como estructura. Cada conjunto entra por su API pública, se reancla a la línea de tiempo de la misión con un escenario explícito y se muestra con su fuente y fecha real.» |
| 11 | Qué medimos y qué significa | «En 500 misiones simuladas el motor detectó la deriva en el 99,8 % de los casos, a los 8 días de mediana. El umbral fijo terrestre no se disparó nunca. Menos de 0,001 falsas alarmas por tripulante y semana. Es simulación, no rendimiento clínico, y lo decimos.» |
| 12 | Tres personas, cinco entornos, una Tierra | «Lo usan tres personas: la astronauta, el oficial médico y el cirujano de vuelo, cada uno con su vista y sus permisos. Y el mismo patrón sirve en la Tierra donde el médico está lejos: bases antárticas, barcos, minería remota, salud rural.» |
| 13 | Qué es, qué no es y qué viene después | «Qué es: fisiología real solo la que tú ingresas o mide tu reloj, entorno real de NASA y NOAA, reglas con fuente. Qué no es: un dispositivo médico ni límites validados para vuelo. Qué viene: revisión por un cirujano de vuelo, prueba de vigilancia PVT-B y dosimetría personal. Cuando la Tierra tarda 22 minutos en contestar, el primer médico eres tú. VIGÍA se asegura de que no vueles a ciegas. Ahora se lo enseño en vivo.» |
| 14 | Demo en vivo: registrar y evaluar (1 minuto, en la app) | «Modo demo, tripulante simulado y rotulado, día 27. El cuerpo dice que hay algo que vigilar.» Pulsar **Corazón y vasos**. «Pulso de 82: normal para un libro, no para ella. Lleva días derivando respecto a su propia línea base y ningún límite fijo lo habría marcado.» **Iniciar registro**, mover el dial, abrir **Cómo medirlo**, saltar una medida: «lo que no se mide queda como sin dato, nunca como cero». Guardar. Tendencias: «su banda personal, no un rango de tabla». |
| 15 | Demo en vivo: actuar, escalar, informar (1 minuto, en la app) | Alertas: «Cada alerta dice por qué saltó y qué hacer ahora, en lenguaje llano. Verdes y ámbar son privadas. Solo una roja de seguridad sale sola al oficial médico, con el dato mínimo.» Cambiar a **Ver como: Oficial Médico** y volver. Informes: «Lo que hiciste con la acción sugerida queda registrado. El informe viaja a la Tierra con el retardo real; en demo lo acortamos a un minuto.» Pulsar **La hice** y **Encolar informe de hoy**. Dispositivo solo si el reloj está en verde: «solo entran chequeos válidos; el flujo crudo nunca sale de la memoria». Cierre: «Gracias. ¿Preguntas?» |

## 2. Reparto sugerido

- Persona A: diapositivas 1 a 13 (voz principal).
- Persona B: la demo en vivo (maneja el ratón y habla las diapositivas 14 y 15). Cambiar de voz en el cambio de ventana evita silencios.
- Persona C (si hay): reloj y preguntas técnicas; tiene abierta `GUIONES.md` §4 con las respuestas al jurado.

## 3. Si algo falla

- La app no carga: usar las diapositivas 14 y 15 como capturas con el mismo texto.
- La API no responde: la pantalla muestra «Reintentar»; decir que la app guarda copia local y sigue el registro.
- El reloj no conecta: saltar Dispositivo y apoyarse en la diapositiva 9.
- Se pasa el tiempo: recortar primero las diapositivas 8 y 9, y en la demo el paso de Tendencias; nunca recortar el cierre de la 13.
