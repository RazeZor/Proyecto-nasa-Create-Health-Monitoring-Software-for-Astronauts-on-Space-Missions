/**
 * Traducciones de VIGÍA: español es el idioma principal e inglés el secundario.
 *
 * Misma semántica que i18n.py: una clave que falte en inglés cae al español, y una
 * que falte en ambos devuelve la clave. Es una función pura: la app decide el idioma
 * (preferencia guardada o idioma del navegador) y se lo pasa a detectarIdioma().
 * Requiere `resolveJsonModule` en el tsconfig de la app. Los JSON se importan con `with { type: "json" }` para que
 * el mismo archivo corra en Node (tests) y en el empaquetador de la app.
 */
import es from "./locales/es.json" with { type: "json" };
import en from "./locales/en.json" with { type: "json" };

export type Idioma = "es" | "en";
export const PRINCIPAL: Idioma = "es";
export const IDIOMAS: readonly Idioma[] = ["es", "en"];

type Arbol = { [clave: string]: string | Arbol };
const CATALOGOS: Record<Idioma, Arbol> = { es, en };

/** 'en-US', 'EN_us' → 'en'; cualquier idioma no soportado → el principal. */
export function normalizar(idioma?: string | null): Idioma {
  const base = (idioma ?? "").replace("_", "-").split("-")[0].toLowerCase();
  return (IDIOMAS as readonly string[]).includes(base) ? (base as Idioma) : PRINCIPAL;
}

/** Elige el idioma: primero la preferencia guardada y después el del navegador; si no, español. */
export function detectarIdioma(preferido?: string | null, navegador?: string | null): Idioma {
  if (preferido) return normalizar(preferido);
  return normalizar(navegador);
}

function buscar(arbol: Arbol, clave: string): string | undefined {
  let nodo: string | Arbol | undefined = arbol;
  for (const parte of clave.split(".")) {
    if (typeof nodo !== "object" || nodo === null) return undefined;
    nodo = nodo[parte];
  }
  return typeof nodo === "string" ? nodo : undefined;
}

/** Texto traducido de la clave, con {variables} reemplazadas. */
export function t(clave: string, idioma: Idioma = PRINCIPAL, variables: Record<string, string | number> = {}): string {
  const texto = buscar(CATALOGOS[idioma], clave) ?? buscar(CATALOGOS[PRINCIPAL], clave) ?? clave;
  return texto.replace(/\{(\w+)\}/g, (marca, nombre) => (nombre in variables ? String(variables[nombre]) : marca));
}
