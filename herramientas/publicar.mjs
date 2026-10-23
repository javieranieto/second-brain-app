// Publica la app en tu Cloudflare Pages. Corre igual en Windows y en Mac.
//
//   npm run publicar
//
// La primera vez: `npx wrangler login` (abre el navegador para que entres a tu Cloudflare).
// El nombre de tu sitio sale de config.local.json -> "cloudflare_proyecto" (queda en <nombre>.pages.dev).
//
// Por que Cloudflare y no Vercel: la app no necesita servidor (entra con tu sesion y la base
// protege tus notas), y el plan gratis de Cloudflare no tiene tope de visitas. Vercel tambien
// funciona si lo prefieres: es un sitio estatico, carpeta app/dist.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, config, falla } from "./sb.mjs";

const proyecto = config().cloudflare_proyecto;
if (!proyecto) falla('config.local.json: falta "cloudflare_proyecto" (por ejemplo "second-brain-ana").');
const app = join(RAIZ, "app");
if (!existsSync(join(app, ".env.local"))) falla("Falta app/.env.local. Corre: node herramientas/base.mjs llaves");

function correr(cmd, permitirFallo = false) {
  console.log(`> ${cmd}`);
  const r = spawnSync(cmd, { cwd: app, stdio: "inherit", shell: true });
  if (r.status !== 0 && !permitirFallo) falla(`Fallo: ${cmd}`);
  return r.status === 0;
}

if (!existsSync(join(app, "node_modules"))) correr("npm install");
correr("npm run build");
// Crear el proyecto la primera vez; si ya existe, este paso falla y no importa.
correr(`npx -y wrangler pages project create ${proyecto} --production-branch main`, true);
correr(`npx -y wrangler pages deploy dist --project-name ${proyecto} --branch main`);
console.log(`\n[ok] Publicada. Tu app: https://${proyecto}.pages.dev`);
