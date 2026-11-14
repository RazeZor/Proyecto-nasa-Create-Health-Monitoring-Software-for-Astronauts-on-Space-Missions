# Base de datos local de VIGÍA: diseño

Estado: borrador para aprobar. Autor del modelo: datos (backend). Fecha: 2026-11-14. Cierre de la entrega: domingo 15, 11:59 p. m.

## Intención

El informe (§4.2, §4.3) pone el almacén en el navegador (IndexedDB con Dexie). Se decidió **moverlo al backend** para que el cliente no cargue con datos ni con cálculo: el backend es la fuente única de los registros de la tripulación y la interfaz es delgada. El backend corre **en localhost**, en el mismo equipo que la interfaz, así que el producto sigue funcionando con el wifi apagado (propiedad central del informe).

## Objetivos

- Guardar lo que el informe pide guardar: registro diario y semanal, lecturas de sensor o simulador, síntomas, líneas base, alertas, escalamientos, reportes en cola con retardo y auditoría.
- Aplicar la privacidad del §5.4 en el servidor: verde y ámbar solo los ve su dueño; rojo escala al oficial médico con el dato mínimo.
- Una sola base, un archivo (`SQLite`), solo biblioteca estándar de Python, con migraciones versionadas.
- Toda hora en UTC ISO 8601 en `t_real`, más `t_mision` (convención del datalake).

## No-objetivos y anti-objetivos

- No duplica el entorno: dosis, protones, cabina y eventos se siguen sirviendo desde el gold por la API existente y se cruzan por `t_mision`. No hay tabla de entorno.
- No sincroniza ni funciona sin el backend (decisión del equipo). Una cola en el navegador queda para después, solo si sobra tiempo.
- No cifra ni autentica de verdad. Anti-objetivo: presentarlo como seguro; es un prototipo local.
- No decide dónde corre el motor híbrido (ver "Pendiente de decidir").

## Enfoques considerados

1. **Backend como fuente única (elegido).** SQLite en `apps/api`, cliente delgado. Lo más simple y rápido con el plazo; pierde el modo sin servidor.
2. Backend autoritativo con cola mínima en el cliente. Mantiene el modo sin conexión del navegador, pero exige sincronización y resolución de conflictos.
3. Dexie para lo privado y backend para el resto. Deja el cliente cargado y parte el modelo en dos.

## Modelo de datos

```
mision ─< tripulante ─< lectura >─ indicador
                    ├─< sintoma
                    ├─< linea_base >─ indicador
                    ├─< alerta ─< escalamiento
                    ├─< reporte_cola
                    └─< consentimiento
auditoria  (registro de solo adición, sin llaves foráneas duras)
```

| Tabla | Para qué | Campos clave |
| --- | --- | --- |
| `mision` | Línea de tiempo de la misión | `id`, `nombre`, `perfil` (estacion, transito, superficie), `dia1_t_real` (UTC del día de vuelo 1) |
| `tripulante` | Persona monitoreada | `id`, `alias`, `mision_id`, `rol` (astronauta, oficial_medico, comandante) |
| `indicador` | Catálogo; `id` = id de la ficha (`spo2`, `glucosa`, …) | `id`, `unidad`, `tipo` (fisiologico, conductual), `frecuencia` (diaria, semanal), `capas` (A, B, C) |
| `lectura` | Un valor de un indicador | `tripulante_id`, `indicador`, `valor`, `t_real`, `t_mision`, `origen` (manual, sensor, simulado), `metodo`, `naturaleza` (Real, Simulado) |
| `sintoma` | Síntomas reportados | `tripulante_id`, `t_real`, `t_mision`, `codigo`, `gravedad` (1 a 3) |
| `linea_base` | Mediana y MAD por indicador | `tripulante_id`, `indicador`, `origen` (tierra, vuelo), `mediana`, `mad`, `n`, `desde`, `hasta` |
| `alerta` | Resultado del motor | `tripulante_id`, `indicador`, `capa` (A, B, C, contexto), `nivel` (verde, ambar, rojo), `valor`, `t_real`, `t_mision`, `explicacion`, `regla_version` |
| `escalamiento` | Aviso automático por rojo | `alerta_id`, `destinatario_id`, `enviado_t_real`, `contenido` (JSON mínimo: indicador, valor, hora, tramo), `contexto_astronauta` |
| `reporte_cola` | Reporte del astronauta hacia tierra | `tripulante_id`, `creado_t_real`, `retardo_min` (3 a 22), `llega_t_real`, `estado` (en_cola, entregado, respondido), `respuesta` |
| `consentimiento` | Aceptación previa al vuelo | `tripulante_id`, `regla` (escalamiento_rojo), `aceptado_t_real` |
| `auditoria` | Quién hizo qué | `t_real`, `actor_id`, `accion`, `entidad`, `entidad_id`, `detalle` |

Reglas del modelo:

- `lectura` es única por (`tripulante_id`, `indicador`, `t_real`, `origen`): reenviar no duplica.
- `linea_base` guarda una fila por indicador y origen (tierra o vuelo). El peso `w(d)` de §5.2 se calcula al leer, a partir del día de vuelo (`t_real - mision.dia1_t_real`); no se guarda.
- `alerta`, `escalamiento` y `auditoria` son de solo adición: nunca se actualizan ni se borran (el informe pide registro de cada escalamiento).
- `naturaleza` distingue medición real de simulación, como el §3.4. Signos vitales, sueño, ánimo y síntomas de la demo son `Simulado`.

## Privacidad en la API

- Cada petición lleva el tripulante que actúa. Verde y ámbar solo se devuelven a su dueño. Rojo, también al destinatario del escalamiento (oficial médico; si el afectado es él, comandante o suplente).
- El escalamiento envía solo el dato mínimo (indicador, valor, hora, tramo); no el historial.
- Cada lectura de datos de otro tripulante y cada escalamiento escriben en `auditoria`.

## Ubicación en el repo

- `apps/api/` conserva `main.py`. El almacén va en `apps/api/almacen/`: `esquema.sql` por migración (`001_inicial.sql`), `almacen.py` (conexión, migraciones con `PRAGMA user_version`, consultas) y pruebas con SQLite en memoria.
- Archivo de la base: por defecto `apps/api/data/vigia.db` (se agrega `apps/api/data/` a `.gitignore`: los datos no van a git) y `VIGIA_DB` para cambiarlo.
- Endpoints nuevos (a detallar en el plan): registro de lecturas y síntomas, consulta de historial y estado, línea base, alertas y escalamientos, cola de reportes. Se documentan en `AGENTES.md` y `openapi` como los actuales.
- Mensajes de error por `packages/i18n`. Solo biblioteca estándar para el almacén.

## Pendiente de decidir (no es mío)

- **Dónde corre el motor híbrido.** Si sigue en TypeScript en el cliente, la interfaz calcula y envía `alerta` al backend; si pasa al backend, usa el motor de referencia en Python. El modelo sirve en ambos casos. Lo decide quien tiene la tarjeta "Motor".

## Lo que queda al implementador

- Códigos de síntoma, escala exacta de gravedad y la lista final de `indicador` (parten de las 10 fichas).
- Autenticación real: en el prototipo, el tripulante se declara en una cabecera. Atajo explícito, a documentar con `shortcut:` en el código.
- Datos de demostración (semilla) para la tripulación simulada.
