// ¿Que falta? Revisa todo y dice el comando exacto de lo que no esta.
//
//   npm run doctor
//
// Lo corre Claude al final de la instalacion y cuando algo no funciona. Sin acentos en lo que
// imprime a proposito: en la consola de Windows a veces salen como basura.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { RAIZ } from "./sb.mjs";

let faltan = 0;
function linea(bien, texto, arreglo) {
  console.log(`${bien ? "[ok]   " : "[falta]"} ${texto}${bien || !arreglo ? "" : `\n         -> ${arreglo}`}`);
  if (!bien) faltan++;
}

const major = Number(process.versions.node.split(".")[0]);
linea(major >= 18, `Node ${process.versions.node}`, "instala Node 18 o mas nuevo (nodejs.org)");

const cfgRuta = join(RAIZ, "config.local.json");
let cfg = null;
if (existsSync(cfgRuta)) cfg = JSON.parse(readFileSync(cfgRuta, "utf8"));
linea(!!cfg, "config.local.json", "copia config.ejemplo.json a config.local.json y llenalo");
if (cfg) {
  for (const k of ["supabase_ref", "correo", "nombre", "cloudflare_proyecto"])
    linea(cfg[k] && !String(cfg[k]).includes("<"), `config: ${k}`, `llena "${k}" en config.local.json`);
}
const tok = join(RAIZ, ".secrets", "supabase-token.txt");
linea(existsSync(tok) && readFileSync(tok, "utf8").trim().length > 20, ".secrets/supabase-token.txt",
  "crea un access token en supabase.com/dashboard/account/tokens y pegalo en ese archivo (no en el chat)");

linea(existsSync(join(RAIZ, "app", ".env.local")), "app/.env.local", "node herramientas/base.mjs llaves");
linea(existsSync(join(RAIZ, "app", "node_modules")), "librerias de la app", "cd app && npm install");
linea(existsSync(join(RAIZ, "cuaderno", "Inbox")), "tu cuaderno (cuaderno/)", "copia plantilla-cuaderno a cuaderno (CLAUDE.md, Instalar paso 6)");
linea(existsSync(join(RAIZ, "cuaderno", ".git")), "tu cuaderno con su propio git", "cd cuaderno && git init  (y subelo a un repo PRIVADO)");

// La base solo se revisa si lo de arriba esta: si no, el error de red tapa al verdadero.
if (!faltan) {
  console.log("\nRevisando tu base...");
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath, [join(RAIZ, "herramientas", "base.mjs"), "revisar"], { stdio: "inherit" });
  if (r.status !== 0) faltan++;
}

console.log(faltan ? `\nFaltan ${faltan} cosa(s). Arriba dice como arreglar cada una.` : "\nTodo listo. Dicta una nota y dile a Claude: procesa las notas.");
process.exit(faltan ? 1 : 0);
