import { useEffect, useMemo, useState } from "react";
import {
  agregar,
  cuandoTexto,
  diaLocal,
  diasHasta,
  ESFUERZO_TEXTO,
  esAccionable,
  esEspera,
  fechaCorta,
  guardar,
  hechosPorDia,
  hoyISO,
  leerPendientes,
  META_DEL_DIA,
  mejorRacha,
  porFacilidad,
  porPrioridad,
  PRIORIDAD_TEXTO,
  puntos,
  racha,
  sugeridos,
  type Esfuerzo,
  type PendienteFila,
  type Prioridad,
} from "../lib/pendientes";
import {
  IconoBuscar,
  IconoCheck,
  IconoFlecha,
  IconoFuego,
  IconoMas,
  IconoNota,
  IconoReloj,
  IconoTrofeo,
} from "../lib/iconos";

// Las vistas de pendientes: Inicio (el tablero), Por negocio, Esperas y Logros.
// Los datos se leen una vez en App (usePendientes) y se comparten entre vistas.


function leerLocal(clave: string, porDefecto: string) {
  try {
    return localStorage.getItem(clave) ?? porDefecto;
  } catch {
    return porDefecto;
  }
}
function guardarLocal(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // sin almacenamiento local, la pantalla funciona igual
  }
}
// "Hoy no" esconde un sugerido solo por hoy; mañana vuelve a entrar.
function leerSaltados(): Set<string> {
  try {
    const c = JSON.parse(localStorage.getItem("pendientes.saltados") ?? "{}");
    return new Set(c.dia === hoyISO() ? c.ids : []);
  } catch {
    return new Set();
  }
}

// ---------------------------------------------------------------- datos

export function usePendientes(activo: boolean) {
  const [todos, setTodos] = useState<PendienteFila[] | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [saltados, setSaltados] = useState<Set<string>>(leerSaltados);

  useEffect(() => {
    if (!activo || todos) return;
    leerPendientes()
      .then(setTodos)
      .catch((e) => setError(e.message ?? "No se pudieron leer los pendientes."));
  }, [activo, todos]);

  // Racha y logros cuentan solo lo que era TUYO: lo que hizo Claude o esperaba a otro no es avance tuyo.
  const porDia = useMemo(() => hechosPorDia((todos ?? []).filter((p) => p.quien === "yo")), [todos]);

  async function cambiar(id: string, c: Partial<PendienteFila>) {
    const antes = todos;
    setTodos((ts) => (ts ?? []).map((p) => (p.id === id ? { ...p, ...c } : p)));
    try {
      await guardar(id, c);
      const suyo = todos?.find((p) => p.id === id)?.quien === "yo";
      if (c.hecho && suyo) {
        const n = (porDia.get(hoyISO())?.length ?? 0) + 1;
        setAviso(n >= META_DEL_DIA ? `Hecho. Van ${n} hoy: meta cumplida.` : `Hecho. Van ${n} de ${META_DEL_DIA} hoy.`);
      } else setAviso("Guardado.");
    } catch (e) {
      setTodos(antes);
      setAviso("No se guardó: " + ((e as Error).message ?? "revisa la conexión"));
    }
  }

  async function nuevo(titulo: string, destino: string | null) {
    // Sin grupo, las listas se agrupan por area: agregar ahi es esa area.
    const esArea = !!destino && !(todos ?? []).some((p) => p.grupo === destino) && (todos ?? []).some((p) => p.area === destino);
    const grupo = esArea ? null : destino;
    const area = esArea ? destino! : ((todos ?? []).find((p) => p.grupo === grupo)?.area ?? "Personal");
    try {
      const fila = await agregar({ titulo, grupo, area, origen: "Lo agregaste tú" });
      setTodos((ts) => [...(ts ?? []), fila]);
      setAviso("Agregado. Claude le pone el detalle y la facilidad al procesar.");
      return true;
    } catch (e) {
      setAviso("No se agregó: " + ((e as Error).message ?? ""));
      return false;
    }
  }

  function saltar(id: string) {
    const s = new Set(saltados);
    s.add(id);
    setSaltados(s);
    guardarLocal("pendientes.saltados", JSON.stringify({ dia: hoyISO(), ids: [...s] }));
  }

  return { todos, error, aviso, porDia, saltados, cambiar, nuevo, saltar };
}
export type Datos = ReturnType<typeof usePendientes>;

// ---------------------------------------------------------------- piezas

function Chip({ children, clase = "" }: { children: React.ReactNode; clase?: string }) {
  return <span className={`max-w-full rounded-md px-1.5 py-0.5 text-xs font-medium [overflow-wrap:anywhere] ${clase}`}>{children}</span>;
}

function Encabezado({ titulo, sub, children }: { titulo: string; sub?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-texto">{titulo}</h1>
        {sub && <p className="mt-1 text-sm text-texto3">{sub}</p>}
      </div>
      {children}
    </header>
  );
}

function Seccion({ titulo, n, children }: { titulo: string; n?: number; children?: React.ReactNode }) {
  return (
    <h2 className="mt-8 mb-3 flex items-baseline gap-2 text-xs font-semibold tracking-[0.08em] text-texto3 uppercase first:mt-0">
      {titulo}
      {n !== undefined && <span className="font-mono text-texto3 tabular-nums">{n}</span>}
      {children}
    </h2>
  );
}

function Cifra({
  Icono,
  tono,
  valor,
  texto,
  extra,
}: {
  Icono: (p: { className?: string }) => React.ReactElement;
  tono: string;
  valor: React.ReactNode;
  texto: string;
  extra?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-linea bg-tarjeta p-4">
      <span className={`hidden h-11 w-11 shrink-0 place-items-center rounded-lg sm:grid ${tono}`}>
        <Icono className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <b className="block text-2xl leading-tight font-semibold text-texto tabular-nums">{valor}</b>
        <span className="block text-sm text-texto3">{texto}</span>
        {extra && <span className="block text-xs text-texto3">{extra}</span>}
      </span>
    </div>
  );
}

function Fila({
  p,
  abierto,
  alternar,
  cambiar,
  saltar,
}: {
  p: PendienteFila;
  abierto: boolean;
  alternar: () => void;
  cambiar: (c: Partial<PendienteFila>) => void;
  saltar?: () => void;
}) {
  const [comentario, setComentario] = useState(p.comentario);
  useEffect(() => setComentario(p.comentario), [p.comentario]);
  const vence = p.fecha && !p.hecho ? diasHasta(p.fecha) : null;
  const campo = "mt-1 block min-h-11 w-full rounded-lg border border-linea bg-fondo px-2.5 text-sm text-texto";

  return (
    <li className={p.fijado && !p.hecho ? "bg-naranja-suave/40" : ""}>
      <div className="flex items-start">
        <label className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center">
          <input
            type="checkbox"
            checked={p.hecho}
            onChange={(e) =>
              cambiar({
                hecho: e.target.checked,
                hecho_en: e.target.checked ? new Date().toISOString() : null,
                cerrado_por: e.target.checked ? "yo" : null,
              })
            }
            aria-label={(p.hecho ? "Desmarcar: " : "Marcar como hecho: ") + p.titulo}
            className="h-[18px] w-[18px] cursor-pointer accent-verde"
          />
        </label>
        <button onClick={alternar} className="min-w-0 flex-1 py-3 pr-4 text-left" aria-expanded={abierto}>
          <span
            className={`block text-[15px] leading-snug [overflow-wrap:anywhere] ${
              p.hecho ? "text-texto3 line-through" : "text-texto"
            }`}
          >
            {p.titulo}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip clase="bg-hover text-texto2">{p.grupo ?? p.area}</Chip>
            {p.esfuerzo && !p.hecho && (
              <Chip
                clase={
                  p.esfuerzo === "rapido"
                    ? "bg-verde-suave text-verde"
                    : p.esfuerzo === "largo"
                      ? "bg-azul-suave text-azul"
                      : "bg-hover text-texto3"
                }
              >
                {ESFUERZO_TEXTO[p.esfuerzo]}
              </Chip>
            )}
            {p.fecha && !p.hecho && (
              <Chip clase={vence !== null && vence <= 1 ? "bg-rojo-suave text-rojo" : "bg-hover text-texto3"}>
                {cuandoTexto(p.fecha)}
              </Chip>
            )}
            {p.tipo === "revision" && <Chip clase="bg-azul-suave text-azul">Revisión</Chip>}
            {p.quien === "claude" && <Chip clase="bg-azul-suave text-azul">Claude</Chip>}
            {p.quien === "otro" && <Chip clase="bg-ambar-suave text-ambar">Espera a {p.quien_nombre || "alguien"}</Chip>}
            {p.hecho && p.cerrado_por === "claude" && <Chip clase="bg-azul-suave text-azul">lo cerró Claude</Chip>}
            {p.comentario && !abierto && <Chip clase="bg-naranja-suave text-naranja-osc">con comentario</Chip>}
            {p.fijado && !p.hecho && <Chip clase="bg-naranja-suave text-naranja-osc">fijado</Chip>}
          </span>
        </button>
      </div>

      {abierto && (
        <div className="space-y-3 px-4 pb-4 sm:pl-12">
          {p.detalle && <p className="text-sm whitespace-pre-line text-texto2 [overflow-wrap:anywhere]">{p.detalle}</p>}
          <p className="text-xs text-texto3">
            {p.area}
            {p.origen ? ` · ${p.origen}` : ""}
            {p.nota ? ` · Nota: ${p.nota}` : ""}
          </p>
          <label className="block text-xs text-texto3">
            Tu comentario (Claude lo lee al procesar)
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="ya lo hice · no se va a hacer porque… · espero a…"
              rows={2}
              className="mt-1 block w-full rounded-lg border border-linea bg-fondo p-2.5 text-sm text-texto placeholder-texto3"
            />
          </label>
          {comentario !== p.comentario && (
            <button
              onClick={() => cambiar({ comentario: comentario.trim(), editado_en: new Date().toISOString() })}
              className="min-h-11 rounded-lg bg-azul px-4 text-sm font-medium text-white"
            >
              Guardar comentario
            </button>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-xs text-texto3">
              Facilidad
              <select
                value={p.esfuerzo ?? ""}
                onChange={(e) => cambiar({ esfuerzo: (e.target.value || null) as Esfuerzo | null })}
                className={campo}
              >
                <option value="">Sin marcar</option>
                <option value="rapido">Rápido</option>
                <option value="medio">Medio</option>
                <option value="largo">Largo</option>
              </select>
            </label>
            <label className="text-xs text-texto3">
              Cuándo
              <select value={p.prioridad} onChange={(e) => cambiar({ prioridad: e.target.value as Prioridad })} className={campo}>
                {Object.entries(PRIORIDAD_TEXTO).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-texto3">
              Fecha
              <input
                type="date"
                value={p.fecha ?? ""}
                onChange={(e) => cambiar({ fecha: e.target.value || null })}
                className={campo}
              />
            </label>
            <div className="flex items-end">
              <button
                onClick={() => cambiar({ fijado: !p.fijado })}
                className={`min-h-11 w-full rounded-lg border px-2 text-sm ${
                  p.fijado ? "border-naranja text-naranja-osc" : "border-linea text-texto2 hover:bg-hover"
                }`}
              >
                {p.fijado ? "Fijado en Inicio" : "Fijar en Inicio"}
              </button>
            </div>
          </div>
          {saltar && (
            <button onClick={saltar} className="min-h-11 text-sm text-texto3 underline-offset-2 hover:underline">
              Hoy no (vuelve mañana)
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function Lista({
  filas,
  datos,
  conSaltar = false,
  vacio,
}: {
  filas: PendienteFila[];
  datos: Datos;
  conSaltar?: boolean;
  vacio?: string;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  if (!filas.length) return <p className="rounded-xl border border-dashed border-linea p-4 text-sm text-texto3">{vacio}</p>;
  return (
    <ul className="divide-y divide-linea overflow-hidden rounded-xl border border-linea bg-tarjeta">
      {filas.map((p) => (
        <Fila
          key={p.id}
          p={p}
          abierto={abierto === p.id}
          alternar={() => setAbierto(abierto === p.id ? null : p.id)}
          cambiar={(c) => datos.cambiar(p.id, c)}
          saltar={conSaltar ? () => datos.saltar(p.id) : undefined}
        />
      ))}
    </ul>
  );
}

function Aviso({ datos }: { datos: Datos }) {
  return datos.aviso ? (
    <p role="status" className="mb-4 rounded-lg bg-verde-suave px-3 py-2 text-sm text-verde">
      {datos.aviso}
    </p>
  ) : null;
}

/** Cargando o con error: el mismo mensaje para las cuatro vistas. */
export function Estado({ datos }: { datos: Datos }) {
  if (datos.error) return <p className="text-sm text-rojo">{datos.error}</p>;
  return <p className="text-sm text-texto3">Cargando…</p>;
}

// Tu nombre para el saludo: VITE_NOMBRE en app/.env.local.
const NOMBRE = ((import.meta.env.VITE_NOMBRE as string | undefined) ?? "").trim();

const FECHA_LARGA = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });

// ---------------------------------------------------------------- Inicio

export function VistaInicio({
  datos,
  irANegocio,
  irA,
}: {
  datos: Datos;
  irANegocio: (g: string) => void;
  irA: (p: "capturar" | "esperas" | "logros") => void;
}) {
  const [busca, setBusca] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const todos = datos.todos!;
  const hoy = hoyISO();
  const hechosHoy = datos.porDia.get(hoy) ?? [];
  const accionables = todos.filter(esAccionable);
  const esperas = todos.filter(esEspera);
  const tocanHoy = esperas.filter((p) => p.fecha && diasHasta(p.fecha) <= 0).length;
  const semana: PendienteFila[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    semana.push(...(datos.porDia.get(diaLocal(d)) ?? []));
  }
  const conteo = new Map<string, number>();
  for (const p of accionables) conteo.set(p.grupo ?? p.area, (conteo.get(p.grupo ?? p.area) ?? 0) + 1);
  const grupos = [...conteo.entries()].sort((a, b) => b[1] - a[1]);
  const q = busca.trim().toLowerCase();
  const resultados = q
    ? todos
        .filter((p) => `${p.titulo} ${p.detalle} ${p.grupo ?? ""} ${p.comentario}`.toLowerCase().includes(q))
        .sort((a, b) => Number(a.hecho) - Number(b.hecho) || porPrioridad(a, b))
        .slice(0, 40)
    : [];
  const ultimos = todos
    .filter((p) => p.hecho && p.hecho_en && p.quien === "yo")
    .sort((a, b) => (b.hecho_en ?? "").localeCompare(a.hecho_en ?? ""))
    .slice(0, 5);
  const r = racha(datos.porDia);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Encabezado titulo={NOMBRE ? `Hola, ${NOMBRE}` : "Hola"} sub={`${FECHA_LARGA.format(new Date())} · Mis pendientes`} />

      <label className="flex min-h-12 items-center gap-3 rounded-xl border border-linea bg-tarjeta px-4 text-texto3 focus-within:border-azul">
        <IconoBuscar className="h-5 w-5 shrink-0" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar en mis pendientes"
          aria-label="Buscar en mis pendientes"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-texto placeholder-texto3 outline-none"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setAgregando((a) => !a)}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-naranja sm:flex-none px-4 text-sm font-medium text-texto hover:bg-naranja-osc"
        >
          <IconoMas className="h-4 w-4" /> <span>Agregar<span className="hidden sm:inline"> pendiente</span></span>
        </button>
        <button
          onClick={() => irA("capturar")}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-linea bg-tarjeta px-4 text-sm text-texto2 hover:bg-hover sm:flex-none"
        >
          <IconoNota className="h-4 w-4" /> <span>Dictar<span className="hidden sm:inline"> una nota</span></span>
        </button>
      </div>
      {agregando && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (titulo.trim() && (await datos.nuevo(titulo.trim(), null))) {
              setTitulo("");
              setAgregando(false);
            }
          }}
          className="mt-3 flex gap-2"
        >
          <input
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="¿Qué hay que hacer?"
            aria-label="Pendiente nuevo"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-linea bg-tarjeta px-3 text-texto"
          />
          <button type="submit" className="min-h-11 rounded-lg bg-azul px-4 text-sm font-medium text-white">
            Guardar
          </button>
        </form>
      )}

      <div className="mt-6">
        <Aviso datos={datos} />
      </div>

      {q ? (
        <>
          <Seccion titulo="Resultados" n={resultados.length} />
          <Lista filas={resultados} datos={datos} vacio="Nada con esa palabra." />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra
              Icono={IconoCheck}
              tono={hechosHoy.length >= META_DEL_DIA ? "bg-verde-suave text-verde" : "bg-hover text-texto2"}
              valor={
                <>
                  {hechosHoy.length}
                  <span className="text-base font-normal text-texto3"> / {META_DEL_DIA}</span>
                </>
              }
              texto="hechos hoy"
            />
            <Cifra
              Icono={IconoFuego}
              tono="bg-naranja-suave text-naranja-osc"
              valor={r}
              texto={r === 1 ? "día de racha" : "días de racha"}
            />
            <Cifra
              Icono={IconoTrofeo}
              tono="bg-azul-suave text-azul"
              valor={semana.length}
              texto="esta semana"
              extra={`${semana.reduce((s, p) => s + puntos(p), 0)} puntos`}
            />
            <button onClick={() => irA("esperas")} className="text-left">
              <Cifra
                Icono={IconoReloj}
                tono={tocanHoy ? "bg-ambar-suave text-ambar" : "bg-hover text-texto2"}
                valor={tocanHoy}
                texto="esperas para hoy"
                extra={`${esperas.length} en total`}
              />
            </button>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <section className="min-w-0 lg:col-span-2">
              <Seccion titulo="Para avanzar hoy" n={sugeridos(todos, datos.saltados).length} />
              <p className="-mt-1 mb-3 text-sm text-texto3">
                Tres rápidos para arrancar y dos de los que pesan. Lo que no quieras hoy, ábrelo y toca «Hoy no».
              </p>
              <Lista
                filas={sugeridos(todos, datos.saltados)}
                datos={datos}
                conSaltar
                vacio="No queda nada sugerido para hoy."
              />
              {hechosHoy.length > 0 && (
                <>
                  <Seccion titulo="Hecho hoy" n={hechosHoy.length} />
                  <Lista filas={hechosHoy} datos={datos} />
                </>
              )}
            </section>

            <aside className="min-w-0 space-y-8">
              <section>
                <Seccion titulo="Por proyecto" n={accionables.length} />
                <ul className="divide-y divide-linea overflow-hidden rounded-xl border border-linea bg-tarjeta">
                  {grupos.slice(0, 10).map(([g, n]) => (
                    <li key={g}>
                      <button
                        onClick={() => irANegocio(g)}
                        className="flex min-h-12 w-full items-center gap-3 px-4 text-left hover:bg-hover"
                      >
                        <span className="min-w-0 flex-1 truncate text-[15px] text-texto">{g}</span>
                        <span className="text-sm text-texto3 tabular-nums">{n}</span>
                        <IconoFlecha className="h-4 w-4 text-texto3" />
                      </button>
                    </li>
                  ))}
                  {grupos.length > 10 && (
                    <li>
                      <button
                        onClick={() => irANegocio("Todos")}
                        className="flex min-h-12 w-full items-center px-4 text-sm text-azul hover:bg-hover"
                      >
                        Ver los {grupos.length}
                      </button>
                    </li>
                  )}
                </ul>
              </section>

              {ultimos.length > 0 && (
                <section>
                  <Seccion titulo="Lo último que hiciste" />
                  <ul className="space-y-3">
                    {ultimos.map((p) => (
                      <li key={p.id} className="flex gap-3 text-sm">
                        <IconoCheck className="mt-0.5 h-4 w-4 shrink-0 text-verde" />
                        <span className="min-w-0">
                          <span className="block text-texto2 [overflow-wrap:anywhere]">{p.titulo}</span>
                          <span className="text-xs text-texto3">
                            {p.grupo ?? p.area} · {fechaCorta(diaLocal(new Date(p.hecho_en!)))}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => irA("logros")} className="mt-3 min-h-11 text-sm text-azul">
                    Ver mis logros
                  </button>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Por negocio

export function VistaNegocios({
  datos,
  grupo,
  setGrupo,
}: {
  datos: Datos;
  grupo: string;
  setGrupo: (g: string) => void;
}) {
  const [orden, setOrden] = useState(() => leerLocal("pendientes.orden", "facilidad"));
  const [titulo, setTitulo] = useState("");
  const accionables = datos.todos!.filter(esAccionable);
  const conteo = new Map<string, number>();
  for (const p of accionables) conteo.set(p.grupo ?? p.area, (conteo.get(p.grupo ?? p.area) ?? 0) + 1);
  const grupos = [...conteo.entries()].sort((a, b) => b[1] - a[1]);
  const visibles = accionables
    .filter((p) => grupo === "Todos" || (p.grupo ?? p.area) === grupo)
    .sort(orden === "facilidad" ? porFacilidad : porPrioridad);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Encabezado
        titulo={grupo === "Todos" ? "Por proyecto" : grupo}
        sub={`${visibles.length} que te tocan${grupo === "Todos" ? ", de todos los proyectos" : ""}`}
      >
        <div className="flex gap-1 rounded-lg border border-linea bg-tarjeta p-1" role="group" aria-label="Ordenar">
          {[
            ["facilidad", "Más fáciles"],
            ["prioridad", "Más urgentes"],
          ].map(([k, t]) => (
            <button
              key={k}
              onClick={() => {
                setOrden(k);
                guardarLocal("pendientes.orden", k);
              }}
              aria-pressed={orden === k}
              className={`min-h-11 rounded-md px-3 text-sm ${orden === k ? "bg-azul text-white" : "text-texto2 hover:bg-hover"}`}
            >
              {t} primero
            </button>
          ))}
        </div>
      </Encabezado>

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
        {[["Todos", accionables.length] as [string, number], ...grupos].map(([g, n]) => (
          <button
            key={g}
            onClick={() => setGrupo(g)}
            aria-pressed={grupo === g}
            className={`min-h-11 shrink-0 rounded-full border px-3.5 text-sm ${
              grupo === g ? "border-azul bg-azul-suave font-medium text-azul" : "border-linea bg-tarjeta text-texto2 hover:bg-hover"
            }`}
          >
            {g} <span className="text-texto3 tabular-nums">{n}</span>
          </button>
        ))}
      </div>

      <Aviso datos={datos} />
      <Lista filas={visibles} datos={datos} vacio="Nada que te toque aquí." />

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (titulo.trim() && (await datos.nuevo(titulo.trim(), grupo !== "Todos" ? grupo : null)))
            setTitulo("");
        }}
        className="mt-6 flex gap-2"
      >
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={grupo === "Todos" ? "Agregar un pendiente" : `Agregar a ${grupo}`}
          aria-label="Pendiente nuevo"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-linea bg-tarjeta px-3 text-texto"
        />
        <button type="submit" className="min-h-11 rounded-lg bg-naranja px-4 text-sm font-medium text-texto hover:bg-naranja-osc">
          Agregar
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- Esperas

export function VistaEsperas({ datos }: { datos: Datos }) {
  const esperas = datos.todos!.filter(esEspera);
  const tramos: { t: string; d: string; lista: PendienteFila[] }[] = [
    { t: "Toca hoy o ya pasó", d: "", lista: [] },
    { t: "Esta semana", d: "", lista: [] },
    { t: "Más adelante", d: "", lista: [] },
    { t: "Sin fecha", d: "Esperan a alguien; no hay día puesto.", lista: [] },
  ];
  for (const p of esperas) {
    if (!p.fecha) tramos[3].lista.push(p);
    else if (diasHasta(p.fecha) <= 0) tramos[0].lista.push(p);
    else if (diasHasta(p.fecha) <= 7) tramos[1].lista.push(p);
    else tramos[2].lista.push(p);
  }
  for (const t of tramos) t.lista.sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Encabezado
        titulo="Esperas"
        sub="Lo que hace Claude, lo que espera a otra persona y las revisiones con fecha. No hace falta mirarlo a diario."
      />
      <Aviso datos={datos} />
      {tramos.map(
        (t) =>
          t.lista.length > 0 && (
            <section key={t.t}>
              <Seccion titulo={t.t} n={t.lista.length} />
              {t.d && <p className="-mt-1 mb-3 text-sm text-texto3">{t.d}</p>}
              <Lista filas={t.lista} datos={datos} />
            </section>
          ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Logros

export function VistaLogros({ datos }: { datos: Datos }) {
  const todos = datos.todos!;
  const porDia = datos.porDia;
  const dias: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dias.push(diaLocal(d));
  }
  const semana = dias.slice(0, 7).flatMap((d) => porDia.get(d) ?? []);
  const maximo = Math.max(1, ...dias.map((d) => porDia.get(d)?.length ?? 0));
  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - 7);
  const ajenos = todos.filter((p) => p.hecho && p.quien !== "yo" && p.hecho_en && new Date(p.hecho_en) >= hace7).length;
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  const mes = todos.filter((p) => p.hecho && p.quien === "yo" && p.hecho_en && new Date(p.hecho_en) >= hace30);
  const porGrupo = new Map<string, number>();
  for (const p of mes) porGrupo.set(p.grupo ?? p.area, (porGrupo.get(p.grupo ?? p.area) ?? 0) + 1);
  const maxGrupo = Math.max(1, ...porGrupo.values());

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Encabezado
        titulo="Logros"
        sub={`Cuenta solo lo que era tuyo.${
          ajenos > 0 ? ` Aparte, esta semana se cerraron ${ajenos} que hacía Claude o esperaban a otra persona.` : ""
        }`}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra Icono={IconoFuego} tono="bg-naranja-suave text-naranja-osc" valor={racha(porDia)} texto="días de racha" />
        <Cifra Icono={IconoTrofeo} tono="bg-azul-suave text-azul" valor={mejorRacha(porDia)} texto="mejor racha" />
        <Cifra Icono={IconoCheck} tono="bg-verde-suave text-verde" valor={semana.length} texto="hechos esta semana" />
        <Cifra
          Icono={IconoTrofeo}
          tono="bg-hover text-texto2"
          valor={semana.reduce((s, p) => s + puntos(p), 0)}
          texto="puntos esta semana"
          extra="rápido 1 · medio 3 · largo 8"
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="min-w-0">
          <Seccion titulo="Últimos 14 días" />
          <ol className="space-y-1 rounded-xl border border-linea bg-tarjeta p-4">
            {dias.map((d) => {
              const n = porDia.get(d)?.length ?? 0;
              return (
                <li key={d} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-texto3">{d === dias[0] ? "hoy" : fechaCorta(d)}</span>
                  <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-hover">
                    <span
                      className={`block h-full rounded-full ${n >= META_DEL_DIA ? "bg-verde" : "bg-azul/40"}`}
                      style={{ width: `${(n / maximo) * 100}%` }}
                    />
                  </span>
                  <span className="w-7 text-right font-mono text-texto2 tabular-nums">{n}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs text-texto3">En verde, los días que llegaste a la meta de {META_DEL_DIA}.</p>
        </section>

        <section className="min-w-0">
          <Seccion titulo="Por proyecto, últimos 30 días" n={mes.length} />
          <ul className="space-y-2.5 rounded-xl border border-linea bg-tarjeta p-4">
            {[...porGrupo.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([g, n]) => (
                <li key={g} className="text-sm">
                  <span className="flex justify-between text-texto2">
                    <span>{g}</span>
                    <span className="font-mono tabular-nums">{n}</span>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-hover">
                    <span className="block h-full rounded-full bg-azul" style={{ width: `${(n / maxGrupo) * 100}%` }} />
                  </span>
                </li>
              ))}
          </ul>
        </section>
      </div>

      <Seccion titulo="Lo que hiciste" />
      {dias.map((d) => {
        const lista = porDia.get(d);
        if (!lista?.length) return null;
        return (
          <section key={d} className="mb-5">
            <h3 className="mb-2 text-sm font-medium text-texto2">{d === dias[0] ? "Hoy" : fechaCorta(d)}</h3>
            <Lista filas={lista} datos={datos} />
          </section>
        );
      })}
    </div>
  );
}
