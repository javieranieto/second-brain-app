// Tus pendientes: tipos, lectura y las cuentas de la pantalla (sugeridos, racha, puntos).
//
// Viven en la tabla public.pendientes de esta misma base, protegidos por RLS como las notas.
// Claude los lee y los escribe al procesar tus notas (herramientas/pendientes.mjs); esta pantalla es para
// verlos, palomearlos y comentarlos.

import { supabase } from "./supabase";

export type Esfuerzo = "rapido" | "medio" | "largo";
export type Prioridad = "semana" | "pronto" | "despues";
export type Quien = "yo" | "claude" | "otro";

export type PendienteFila = {
  id: string;
  titulo: string;
  detalle: string;
  area: string;
  grupo: string | null;
  esfuerzo: Esfuerzo | null;
  prioridad: Prioridad;
  fecha: string | null; // AAAA-MM-DD
  quien: Quien;
  quien_nombre: string;
  tipo: "" | "revision";
  fijado: boolean;
  origen: string;
  nota: string;
  comentario: string;
  editado_en: string | null;
  hecho: boolean;
  hecho_en: string | null;
  cerrado_por: "yo" | "claude" | null;
  orden: number;
  creado: string;
};

export const META_DEL_DIA = 3;

export const ESFUERZO_TEXTO: Record<Esfuerzo, string> = {
  rapido: "Rápido",
  medio: "Medio",
  largo: "Largo",
};

export const PRIORIDAD_TEXTO: Record<Prioridad, string> = {
  semana: "Esta semana",
  pronto: "Pronto",
  despues: "Cuando haya tiempo",
};

// Los puntos van por esfuerzo, no por palomita: si todo valiera igual, el sistema premiaría
// hacer diez rápidos y castigaría el largo que de verdad importa.
const PUNTOS: Record<Esfuerzo, number> = { rapido: 1, medio: 3, largo: 8 };
export function puntos(p: PendienteFila) {
  return p.esfuerzo ? PUNTOS[p.esfuerzo] : 2;
}

/** Todos los pendientes. Pagina de 1,000 en 1,000: un tope que corta en silencio se ve igual que una lista completa. */
export async function leerPendientes(): Promise<PendienteFila[]> {
  const todos: PendienteFila[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("pendientes")
      .select("*")
      .order("id")
      .range(desde, desde + 999);
    if (error) throw error;
    todos.push(...(data as PendienteFila[]));
    if (!data || data.length < 1000) return todos;
  }
}

export async function guardar(id: string, cambios: Partial<PendienteFila>) {
  const { error } = await supabase.from("pendientes").update(cambios).eq("id", id);
  if (error) throw error;
}

export async function agregar(nuevo: Partial<PendienteFila>) {
  const { data, error } = await supabase.from("pendientes").insert(nuevo).select("*").single();
  if (error) throw error;
  return data as PendienteFila;
}

// ---- fechas, siempre en la hora del teléfono ----

export function diaLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function hoyISO() {
  return diaLocal(new Date());
}
export function diasHasta(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const hoy = new Date();
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((new Date(a, m - 1, d).getTime() - base.getTime()) / 86400000);
}
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaCorta(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(a, m - 1, d);
  return `${DIAS[f.getDay()]} ${d} ${MESES[m - 1]}`;
}
export function cuandoTexto(iso: string) {
  const n = diasHasta(iso);
  if (n < 0) return `vencido · ${fechaCorta(iso)}`;
  if (n === 0) return "hoy";
  if (n === 1) return "mañana";
  return fechaCorta(iso);
}

// ---- en qué cajón cae cada uno ----

/** Lo que puedes atacar ya: es suyo y no es una revisión que espera su fecha. */
export function esAccionable(p: PendienteFila) {
  if (p.hecho || p.quien !== "yo") return false;
  if (p.tipo !== "revision") return true;
  return !!p.fecha && diasHasta(p.fecha) <= 0; // una revisión suya cuyo día ya llegó
}

/** Lo que todavía no se puede atacar: espera una fecha, a Claude o a otra persona. */
export function esEspera(p: PendienteFila) {
  return !p.hecho && !esAccionable(p);
}

/** Qué tan arriba va en "Hoy". Fecha encima, luego la prioridad que le diste, luego lo rápido. */
export function urgencia(p: PendienteFila) {
  let s = 0;
  if (p.fijado) s += 1000;
  if (p.fecha) {
    const n = diasHasta(p.fecha);
    if (n <= 0) s += 100;
    else if (n <= 3) s += 50;
    else if (n <= 7) s += 20;
  }
  s += p.prioridad === "semana" ? 30 : p.prioridad === "pronto" ? 10 : 0;
  return s;
}
const FACILIDAD: Record<string, number> = { rapido: 0, medio: 1, largo: 2 };
export function porFacilidad(a: PendienteFila, b: PendienteFila) {
  const fa = FACILIDAD[a.esfuerzo ?? "medio"];
  const fb = FACILIDAD[b.esfuerzo ?? "medio"];
  return fa - fb || urgencia(b) - urgencia(a) || a.orden - b.orden;
}
export function porPrioridad(a: PendienteFila, b: PendienteFila) {
  return urgencia(b) - urgencia(a) || porFacilidad(a, b);
}

/**
 * Los sugeridos del día: los fijados, tres rápidos y dos de los que pesan.
 * Así hay con qué arrancar en cinco minutos sin que lo importante se quede siempre abajo.
 */
export function sugeridos(todos: PendienteFila[], saltados: Set<string>) {
  const cand = todos.filter((p) => esAccionable(p) && !saltados.has(p.id)).sort(porPrioridad);
  const fijados = cand.filter((p) => p.fijado);
  const resto = cand.filter((p) => !p.fijado);
  const rapidos = resto.filter((p) => p.esfuerzo === "rapido").slice(0, 3);
  const pesados = resto.filter((p) => p.esfuerzo !== "rapido").slice(0, 2);
  return [...fijados, ...rapidos, ...pesados];
}

// ---- logros ----

export function hechosPorDia(todos: PendienteFila[]) {
  const mapa = new Map<string, PendienteFila[]>();
  for (const p of todos) {
    if (!p.hecho || !p.hecho_en) continue;
    const dia = diaLocal(new Date(p.hecho_en));
    if (!mapa.has(dia)) mapa.set(dia, []);
    mapa.get(dia)!.push(p);
  }
  return mapa;
}

/** Días seguidos con al menos un pendiente hecho. Si hoy todavía no hay, la racha sigue viva hasta la noche. */
export function racha(porDia: Map<string, PendienteFila[]>) {
  const d = new Date();
  if (!porDia.has(diaLocal(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (porDia.has(diaLocal(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function mejorRacha(porDia: Map<string, PendienteFila[]>) {
  const dias = [...porDia.keys()].sort();
  let mejor = 0;
  let actual = 0;
  let previo: Date | null = null;
  for (const iso of dias) {
    const [a, m, d] = iso.split("-").map(Number);
    const f = new Date(a, m - 1, d);
    actual = previo && Math.round((f.getTime() - previo.getTime()) / 86400000) === 1 ? actual + 1 : 1;
    mejor = Math.max(mejor, actual);
    previo = f;
  }
  return mejor;
}
