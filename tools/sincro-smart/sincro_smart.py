"""Avisa al repositorio smart-monitor (servidor y app del Galaxy Watch4) de los cambios de VIGÍA que lo afectan.

Lo llaman los hooks `post-commit`, `post-merge` y `post-rewrite` de `.githooks/`. Mira qué archivos cambiaron
en el rango de commits y, si alguno toca el contrato con el reloj, agrega a `<SMART_DIR>/PENDIENTES-VIGIA.md`
qué hay que revisar o modificar allí. No toca nada más de smart-monitor ni hace commits en él.

  python tools/sincro-smart/sincro_smart.py                       # último commit (HEAD~1..HEAD)
  python tools/sincro-smart/sincro_smart.py --desde ORIG_HEAD     # lo que trajo un pull o un merge
  python tools/sincro-smart/sincro_smart.py --desde main --simular   # muestra el resultado sin escribir

La carpeta de smart-monitor sale de `--smart`, de la variable `SMART_DIR` o de `SMART_DIR=` en el `.env` de la
raíz. Si no está definida o no existe, no hace nada (cada dev tiene su ruta y algunos no tienen el reloj).
Solo biblioteca estándar.
"""
import argparse
import fnmatch
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
ARCHIVO = "PENDIENTES-VIGIA.md"
MARCA = "<!-- vigia:{} -->"

# (patrones de ruta, qué es, qué revisar en smart-monitor). Mantener al día con apps/api/puente_reloj.py.
REGLAS = [
    (["apps/api/puente_reloj.py", "apps/api/test_puente_reloj.py"],
     "Puente de la API con `/live`",
     "Comprobar que `server/server.py` sigue emitiendo los tipos que el puente consume (`tripulacion`, `lectura`, "
     "`history`, `chequeos`, `chequeo`, `resumen`, `chequeo_estado`, `chequeo_progreso`, `nota`, `aviso`) con el "
     "campo `tripulante`, y que acepta `medir_spo2` e `iniciar_chequeo` desde un panel. Si cambió un campo, "
     "actualizar `docs/PROTOCOLO.md`."),
    (["packages/schemas/lectura.schema.json", "packages/schemas/fixtures/lectura*.json"],
     "Contrato de lectura de VIGÍA",
     "Revisar rangos y enumerados (`fc_reposo_lpm`, `spo2_pct`, `fc_fuente: galaxy_watch4`) contra lo que mide el "
     "reloj y lo que documenta `docs/METRICAS.md`; ajustar la app del reloj si un valor quedaría fuera de rango."),
    (["packages/schemas/vocabulario.json"],
     "Vocabulario de indicadores",
     "Si cambió el id de `frecuencia_cardiaca_reposo` o `spo2`, actualizar las referencias en `docs/METRICAS.md` "
     "(el puente guarda el chequeo con esos ids)."),
    (["packages/schemas/fichas/frecuencia_cardiaca_reposo.json", "packages/schemas/fichas/spo2.json"],
     "Fichas de FC en reposo y SpO2",
     "Revisar `cuando_avisar` y `como_se_mide_en_vuelo` contra el protocolo del chequeo guiado (`docs/METRICAS.md`, "
     "`README.md`: postura, ventana de 60 s, SpO2 a demanda)."),
    (["packages/engine/*"],
     "Motor híbrido",
     "Si cambiaron los umbrales de la capa A (NEWS2: SpO2 rojo con 91 % o menos, FC), actualizar la tabla de "
     "`README.md` y `docs/METRICAS.md`."),
    (["apps/api/almacen/migraciones/*"],
     "Esquema del almacén",
     "Confirmar que la tabla `lectura` sigue aceptando `origen = sensor` y `naturaleza = Real`, que es como el "
     "puente guarda los chequeos. Si no, coordinar el cambio en el puente; smart-monitor solo necesita saberlo."),
    (["apps/web/lib/reloj.ts", "apps/web/components/device/*", "apps/web/components/app-context.tsx"],
     "Pantalla del reloj en el tablero",
     "Si el tablero muestra un dato nuevo del reloj, comprobar que `server/server.py` lo calcula y lo envía en "
     "`resumen` o en `chequeo`; si no existe, agregarlo allí y documentarlo en `docs/PROTOCOLO.md`."),
    (["documentacion/*informe*", "documentacion/*VIGA*"],
     "Informe técnico (anexo A)",
     "Si cambió el anexo A (formato A.4, reglas A.6 o alcance A.7), revisar `README.md` y `docs/METRICAS.md`."),
    ([".env.example"],
     "Configuración compartida",
     "Si cambiaron `SMART_URL` o `SMART_TRIPULANTES`, actualizar `docs/SERVIDOR.md` (cómo conectar VIGÍA)."),
]


def _coincide(ruta, patrones):
    return any(fnmatch.fnmatchcase(ruta, p) for p in patrones)


def evaluar(archivos):
    """[(qué es, qué revisar, archivos que lo tocaron)] para las reglas que aplican. Pura."""
    resultado = []
    for patrones, titulo, accion in REGLAS:
        tocados = sorted(a for a in archivos if _coincide(a, patrones))
        if tocados:
            resultado.append((titulo, accion, tocados))
    return resultado


def bloque(id_rango, commits, pendientes, cuando):
    """Texto Markdown de una entrada, con la marca que evita repetirla."""
    lineas = [MARCA.format(id_rango), f"### {cuando} · `{id_rango}`", ""]
    lineas += [f"- `{h[:7]}` {asunto}" for h, asunto in commits]
    lineas.append("")
    for titulo, accion, tocados in pendientes:
        lineas.append(f"- [ ] **{titulo}**: {accion}")
        lineas.append(f"  - Cambió: {', '.join(f'`{a}`' for a in tocados)}")
    return "\n".join(lineas) + "\n"


ENCABEZADO = """# Pendientes por cambios en VIGÍA

> Lo genera `tools/sincro-smart/sincro_smart.py` del repositorio VIGÍA desde sus hooks de git. Cada entrada es
> un cambio de VIGÍA que toca el contrato con este repositorio. Marca la casilla al resolverla o borra la entrada;
> el script no vuelve a escribir una entrada que ya agregó.

"""


def agregar(ruta, texto, id_rango):
    """Agrega la entrada al final. False si esa entrada ya estaba (idempotente)."""
    previo = ruta.read_text(encoding="utf-8") if ruta.exists() else ENCABEZADO
    if MARCA.format(id_rango) in previo:
        return False
    ruta.write_text(previo.rstrip("\n") + "\n\n" + texto, encoding="utf-8", newline="\n")
    return True


def _git(*args):
    return subprocess.run(["git", *args], cwd=RAIZ, capture_output=True, text=True, encoding="utf-8",
                          check=True).stdout


def _existe(rev):
    return subprocess.run(["git", "rev-parse", "--verify", "--quiet", f"{rev}^{{commit}}"], cwd=RAIZ,
                          capture_output=True).returncode == 0


def cambios(desde, hasta):
    """(archivos cambiados, [(hash, asunto)]) entre `desde` y `hasta`. Sin `desde` válido: solo `hasta`."""
    if desde and _existe(desde):
        archivos = _git("diff", "--name-only", desde, hasta).split()
        commits = _git("log", "--format=%H%x09%s", f"{desde}..{hasta}").splitlines()
    else:  # primer commit del repositorio
        archivos = _git("diff-tree", "--no-commit-id", "--name-only", "-r", "--root", hasta).split()
        commits = _git("log", "-1", "--format=%H%x09%s", hasta).splitlines()
    return archivos, [tuple(c.split("\t", 1)) for c in commits if "\t" in c]


def dir_smart(argumento=None):
    """Carpeta de smart-monitor: argumento, variable SMART_DIR o `SMART_DIR=` del .env. None si no hay."""
    valor = argumento or os.environ.get("SMART_DIR")
    env = RAIZ / ".env"
    if not valor and env.exists():
        for linea in env.read_text(encoding="utf-8").splitlines():
            clave, _, v = linea.partition("=")
            if clave.strip() == "SMART_DIR":
                valor = v.strip().strip('"').strip("'")
    return Path(valor).expanduser() if valor else None


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--desde", default="HEAD~1", help="commit base (por defecto HEAD~1)")
    p.add_argument("--hasta", default="HEAD", help="commit final (por defecto HEAD)")
    p.add_argument("--smart", help="carpeta de smart-monitor (si no, SMART_DIR)")
    p.add_argument("--simular", action="store_true", help="muestra la entrada sin escribirla")
    a = p.parse_args(argv)

    destino = dir_smart(a.smart)
    if not a.simular and (destino is None or not destino.is_dir()):
        return 0  # este dev no tiene smart-monitor configurado: no es un error
    archivos, commits = cambios(a.desde, a.hasta)
    pendientes = evaluar(archivos)
    if not pendientes:
        return 0
    hasta = _git("rev-parse", a.hasta).strip()
    desde = _git("rev-parse", a.desde).strip() if _existe(a.desde) else ""
    id_rango = f"{desde[:7]}..{hasta[:7]}" if desde else hasta[:7]
    cuando = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    texto = bloque(id_rango, commits, pendientes, cuando)
    if a.simular:
        print(texto)
        return 0
    if agregar(destino / ARCHIVO, texto, id_rango):
        print(f"sincro-smart: {len(pendientes)} pendiente(s) para smart-monitor en {destino / ARCHIVO}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
