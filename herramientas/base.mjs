// Preparar tu base de Supabase. Se corre en la instalacion y no hace falta volver a tocarla.
//
//   node herramientas/base.mjs aplicar          crea tablas, fotos y permisos (se puede repetir)
//   node herramientas/base.mjs llaves           escribe app/.env.local con la direccion y la clave publica
//   node herramientas/base.mjs cerrar-registro  nadie mas puede crearse cuenta en tu app
//   node herramientas/base.mjs crear-usuario    TU usuario (lo corres tu: pide la contrasena)
//   node herramientas/base.mjs revisar          comprueba todo lo anterior contra la base

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { RAIZ, config, sql, llaves, urlProyecto, configAuth, falla } from "./sb.mjs";

const orden = process.argv[2];

if (orden === "aplicar") {
  await sql(readFileSync(join(RAIZ, "supabase", "esquema.sql"), "utf8"));
  console.log("[ok] Esquema aplicado: notas, pendientes, fotos y permisos.");
} else if (orden === "llaves") {
  const { publica } = await llaves();
  if (!publica) falla("No encontre la clave publica del proyecto.");
  const nombre = config().nombre ?? "";
  writeFileSync(
    join(RAIZ, "app", ".env.local"),
    `VITE_SUPABASE_URL=${urlProyecto()}\nVITE_SUPABASE_ANON_KEY=${publica}\nVITE_NOMBRE=${nombre}\n`,
  );
  // Es publica a proposito (viaja dentro de la app). Aun asi no se imprime: no hace falta.
  console.log("[ok] app/.env.local escrito.");
} else if (orden === "cerrar-registro") {
  await configAuth({ disable_signup: true });
  console.log("[ok] Registro cerrado: solo entra el usuario que tu crees.");
} else if (orden === "crear-usuario") {
  await crearUsuario();
} else if (orden === "revisar") {
  await revisar();
} else {
  console.log("Uso: node herramientas/base.mjs aplicar | llaves | cerrar-registro | crear-usuario | revisar");
}

async function crearUsuario() {
  const correo = config().correo;
  // La contrasena la escribes tu en la terminal; no pasa por el chat ni se guarda en ningun archivo.
  const clave = await preguntarOculto(`Contrasena para ${correo} (minimo 8): `);
  if (clave.length < 8) falla("Muy corta.");
  const { servicio } = await llaves();
  const r = await fetch(`${urlProyecto()}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: servicio, Authorization: `Bearer ${servicio}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: correo, password: clave, email_confirm: true }),
  });
  const cuerpo = await r.text();
  if (!r.ok) falla(`No se creo el usuario: ${cuerpo.slice(0, 200)}`);
  console.log(`[ok] Usuario ${correo} creado. Con ese correo y esa contrasena entras a la app.`);
}

function preguntarOculto(texto) {
  return new Promise((resolver) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => rl.output.write(s.includes(texto) ? s : "*".repeat(s.length));
    rl.question(texto, (r) => {
      rl.close();
      process.stdout.write("\n");
      resolver(r);
    });
  });
}

async function revisar() {
  let mal = 0;
  const ok = (bien, texto, arreglo) => {
    console.log(`${bien ? "[ok]" : "[!!]"} ${texto}${bien ? "" : `  ->  ${arreglo}`}`);
    if (!bien) mal++;
  };
  const tablas = await sql(
    "select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('notas','pendientes')",
  );
  for (const t of ["notas", "pendientes"]) {
    const f = tablas.find((x) => x.relname === t);
    ok(!!f, `tabla ${t}`, "node herramientas/base.mjs aplicar");
    if (f) ok(f.relrowsecurity, `${t} con permisos por usuario (RLS)`, "node herramientas/base.mjs aplicar");
  }
  const anon = await sql(
    "select count(*)::int n from information_schema.role_table_grants where table_schema='public' and grantee='anon'",
  );
  ok(anon[0].n === 0, "sin permisos para usuarios sin sesion", "node herramientas/base.mjs aplicar");
  const cubeta = await sql("select public from storage.buckets where id='fotos'");
  ok(cubeta.length === 1 && cubeta[0].public === false, "fotos privadas", "node herramientas/base.mjs aplicar");
  const auth = await configAuth();
  ok(auth.disable_signup === true, "registro cerrado", "node herramientas/base.mjs cerrar-registro");
  const u = await sql(`select count(*)::int n from auth.users where lower(email)=lower('${config().correo.replace(/'/g, "''")}')`);
  ok(u[0].n === 1, `tu usuario (${config().correo})`, "npm run crear-usuario  (lo corres tu)");
  console.log(mal ? `\n${mal} cosa(s) por arreglar.` : "\nLa base esta lista.");
  process.exit(mal ? 1 : 0);
}
