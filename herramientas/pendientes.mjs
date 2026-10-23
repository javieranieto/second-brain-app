// Tu lista de pendientes, para Claude. Tu la ves y la palomeas en la app.
//
//   node herramientas/pendientes.mjs abiertos            lo que sigue abierto (JSON corto)
//   node herramientas/pendientes.mjs comentarios [dias]  lo que comentaste en la app (default 14 dias)
//   node herramientas/pendientes.mjs agregar <archivo.json>   uno o una lista de pendientes nuevos
//   node herramientas/pendientes.mjs cerrar <id> "<evidencia>"  Claude lo cierra porque vio que ya lo hiciste
//   node herramientas/pendientes.mjs cambiar <id> '<json>'      corregir campos de uno
//   node herramientas/pendientes.mjs logros               racha y lo hecho esta semana

import { readFileSync } from "node:fs";
import { sql, miUsuario, lit, falla } from "./sb.mjs";

const [orden, ...args] = process.argv.slice(2);
const CAMPOS = ["titulo", "detalle", "area", "grupo", "esfuerzo", "prioridad", "fecha", "quien", "quien_nombre", "tipo", "fijado", "origen", "nota", "comentario"];

const yo = await miUsuario();

if (orden === "abiertos") {
  const r = await sql(
    `select id, titulo, area, grupo, esfuerzo, prioridad, fecha, quien, quien_nombre, tipo, comentario from public.pendientes where user_id = ${lit(yo)} and not hecho order by fecha nulls last, orden`,
  );
  console.log(JSON.stringify(r, null, 1));
} else if (orden === "comentarios") {
  const dias = Number(args[0] ?? 14);
  const r = await sql(
    `select id, titulo, hecho, comentario, editado_en from public.pendientes where user_id = ${lit(yo)} and comentario <> '' and editado_en > now() - interval '${dias} days' order by editado_en desc`,
  );
  console.log(JSON.stringify(r, null, 1));
} else if (orden === "agregar") {
  if (!args[0]) falla("Uso: node herramientas/pendientes.mjs agregar <archivo.json>");
  const datos = JSON.parse(readFileSync(args[0], "utf8"));
  const lista = Array.isArray(datos) ? datos : [datos];
  for (const p of lista) {
    if (!p.titulo) falla("Cada pendiente necesita titulo.");
    const cols = ["user_id", ...CAMPOS.filter((c) => p[c] !== undefined)];
    const vals = [lit(yo), ...CAMPOS.filter((c) => p[c] !== undefined).map((c) => lit(p[c]))];
    if (p.id) {
      cols.unshift("id");
      vals.unshift(lit(p.id));
    }
    await sql(`insert into public.pendientes (${cols.join(",")}) values (${vals.join(",")}) on conflict (id) do nothing`);
  }
  console.log(`[ok] ${lista.length} pendiente(s) agregado(s).`);
} else if (orden === "cerrar") {
  const [id, evidencia] = args;
  if (!id || !evidencia) falla('Uso: node herramientas/pendientes.mjs cerrar <id> "<con que evidencia>"');
  const hoy = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const r = await sql(
    `update public.pendientes set hecho = true, hecho_en = now(), cerrado_por = 'claude', comentario = ${lit(`Cerrado por Claude el ${hoy}: ${evidencia}`)}, editado_en = now() where id = ${lit(id)} and user_id = ${lit(yo)} returning id`,
  );
  console.log(r.length ? `[ok] ${id} cerrado.` : `[!!] No existe ${id}.`);
} else if (orden === "cambiar") {
  const [id, json] = args;
  const c = JSON.parse(json ?? "{}");
  const sets = Object.keys(c).filter((k) => [...CAMPOS, "hecho"].includes(k)).map((k) => `${k} = ${lit(c[k])}`);
  if (!id || !sets.length) falla("Uso: node herramientas/pendientes.mjs cambiar <id> '{\"prioridad\":\"semana\"}'");
  const r = await sql(`update public.pendientes set ${sets.join(", ")}, editado_en = now() where id = ${lit(id)} and user_id = ${lit(yo)} returning id`);
  console.log(r.length ? `[ok] ${id} cambiado.` : `[!!] No existe ${id}.`);
} else if (orden === "logros") {
  // Lo mismo que la pantalla de Logros: solo cuenta lo que era tuyo.
  const r = await sql(
    `select (hecho_en at time zone 'utc')::date dia, count(*)::int n from public.pendientes where user_id = ${lit(yo)} and hecho and quien = 'yo' and hecho_en > now() - interval '30 days' group by 1 order by 1 desc`,
  );
  console.log(JSON.stringify(r, null, 1));
} else {
  console.log("Uso: node herramientas/pendientes.mjs abiertos | comentarios | agregar | cerrar | cambiar | logros");
}
