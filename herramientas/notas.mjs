// Bajar tus notas de la app al cuaderno. Lo usa Claude en "procesa las notas".
//
//   node herramientas/notas.mjs bajar                     escribe cada nota nueva en cuaderno/Inbox y la marca como procesada
//   node herramientas/notas.mjs fotos <carpeta> <ruta>...  baja fotos a una carpeta temporal (nunca al cuaderno)
//
// El orden importa: primero se escriben los archivos y DESPUES se marcan en la base.
// Si algo falla a la mitad, lo peor que pasa es que una nota se baje dos veces; nunca que se pierda.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { RAIZ, sql, llaves, urlProyecto, miUsuario, lit, falla } from "./sb.mjs";

const [orden, ...args] = process.argv.slice(2);

if (orden === "bajar") await bajar();
else if (orden === "fotos") await fotos(args[0], args.slice(1));
else console.log("Uso: node herramientas/notas.mjs bajar | fotos <carpeta> <ruta1> [ruta2...]");

function nombreLocal(iso) {
  // La base guarda la hora en UTC; el archivo lleva la hora de tu computadora.
  // Si no se convierte, las notas de la noche salen fechadas al dia siguiente.
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}${p(d.getMinutes())}`;
}

async function bajar() {
  const yo = await miUsuario();
  const notas = await sql(
    `select id, texto, foto, created_at from public.notas where not procesada and user_id = ${lit(yo)} order by created_at`,
  );
  if (!notas.length) return console.log("No hay notas nuevas.");
  const inbox = join(RAIZ, "cuaderno", "Inbox");
  if (!existsSync(inbox)) falla("No existe cuaderno/Inbox. Corre la instalacion (CLAUDE.md, seccion Instalar).");
  const escritas = [];
  for (const n of notas) {
    let nombre = nombreLocal(n.created_at);
    let archivo = join(inbox, `${nombre}.md`);
    for (let i = 2; existsSync(archivo); i++) archivo = join(inbox, `${nombre} (${i}).md`);
    const cuerpo = [n.texto?.trim() || "", n.foto ? `Foto: ${n.foto}` : ""].filter(Boolean).join("\n\n");
    writeFileSync(archivo, cuerpo + "\n");
    escritas.push({ id: n.id, archivo: basename(archivo), foto: n.foto });
  }
  // Solo ahora, con los archivos escritos, se marcan.
  await sql(`update public.notas set procesada = true where id in (${escritas.map((e) => lit(e.id)).join(",")})`);
  console.log(JSON.stringify({ bajadas: escritas.length, notas: escritas }, null, 2));
}

async function fotos(destino, rutas) {
  if (!destino || !rutas.length) falla("Uso: node herramientas/notas.mjs fotos <carpeta> <ruta1> [ruta2...]");
  mkdirSync(destino, { recursive: true });
  const { servicio } = await llaves(); // en memoria; muere con este comando
  let bien = 0;
  for (const ruta of rutas) {
    const r = await fetch(`${urlProyecto()}/storage/v1/object/fotos/${ruta}`, {
      headers: { apikey: servicio, Authorization: `Bearer ${servicio}` },
    });
    if (!r.ok) {
      console.log(`[!!] ${ruta}: ${r.status}`);
      continue;
    }
    const salida = join(destino, basename(ruta));
    writeFileSync(salida, Buffer.from(await r.arrayBuffer()));
    console.log(`[ok] ${salida}`);
    bien++;
  }
  console.log(`${bien} de ${rutas.length} fotos bajadas.`);
}
