// Lo comun a todas las herramientas: leer tu configuracion y hablar con tu Supabase.
//
// Dos archivos tuyos, que NUNCA van a git (estan en .gitignore):
//   config.local.json          -> tu proyecto, tu correo, el nombre de tu sitio
//   .secrets/supabase-token.txt -> tu "access token" personal de Supabase
//
// Con ese token Claude puede correr SQL en tu base y pedir la llave de servicio cuando la
// necesita (para bajar fotos o crear tu usuario). La llave de servicio no se guarda en ningun
// lado: se pide en el momento, vive en memoria y muere con el comando. Nunca se imprime.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = join(RAIZ, "config.local.json");
const TOKEN = join(RAIZ, ".secrets", "supabase-token.txt");
// Algunas APIs rechazan el agente por defecto de Node con un error que no dice eso. Se manda uno normal.
const AGENTE = "Mozilla/5.0 (second-brain)";

export function config() {
  if (!existsSync(CONFIG)) falla(`Falta config.local.json. Copia config.ejemplo.json y llenalo (o pideselo a Claude).`);
  const c = JSON.parse(readFileSync(CONFIG, "utf8"));
  for (const k of ["supabase_ref", "correo"]) if (!c[k] || String(c[k]).includes("<")) falla(`config.local.json: falta "${k}".`);
  return c;
}

export function token() {
  if (!existsSync(TOKEN)) falla(`Falta .secrets/supabase-token.txt (tu access token de Supabase: supabase.com/dashboard/account/tokens).`);
  const t = readFileSync(TOKEN, "utf8").trim();
  if (!t || t.startsWith("<")) falla(`.secrets/supabase-token.txt esta vacio.`);
  return t;
}

export function falla(msg) {
  console.error(`[!!] ${msg}`);
  process.exit(1);
}

async function api(ruta, opciones = {}) {
  const { supabase_ref } = config();
  const r = await fetch(`https://api.supabase.com/v1/projects/${supabase_ref}${ruta}`, {
    ...opciones,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", "User-Agent": AGENTE, ...opciones.headers },
  });
  const cuerpo = await r.text();
  // Se lee el cuerpo del error, no solo el codigo: un 401 puede ser "token invalido" o "sin permiso".
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${cuerpo.slice(0, 300)}`);
  return cuerpo ? JSON.parse(cuerpo) : null;
}

/** Corre SQL en tu base (como dueno: salta los permisos por usuario, por eso todo filtra por tu user_id). */
export async function sql(consulta) {
  return api("/database/query", { method: "POST", body: JSON.stringify({ query: consulta }) });
}

export async function llaves() {
  const lista = await api("/api-keys?reveal=true");
  const publica =
    lista.find((k) => k.type === "publishable")?.api_key ?? lista.find((k) => k.name === "anon")?.api_key;
  const servicio =
    lista.find((k) => k.type === "secret")?.api_key ?? lista.find((k) => k.name === "service_role")?.api_key;
  return { publica, servicio };
}

export function urlProyecto() {
  return `https://${config().supabase_ref}.supabase.co`;
}

export async function configAuth(cambios) {
  return api("/config/auth", cambios ? { method: "PATCH", body: JSON.stringify(cambios) } : {});
}

/** Tu user_id, sacado de tu correo. Todo lo que Claude lee o escribe va filtrado por el. */
export async function miUsuario() {
  const correo = config().correo.toLowerCase().replace(/'/g, "''");
  const r = await sql(`select id from auth.users where lower(email) = '${correo}'`);
  if (!r?.length) falla(`No hay usuario con el correo ${config().correo}. Crealo con: npm run crear-usuario`);
  return r[0].id;
}

/** Texto -> literal de SQL seguro. */
export function lit(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}
