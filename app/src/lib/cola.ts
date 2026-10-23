// Cola de notas que todavia no llegaron a Supabase.
//
// Por que existe: si capturo una idea en el coche sin senal y se pierde,
// dejo de confiar en la app. Y una app de captura en la que no confias
// no se usa. La nota se guarda primero aqui, en el telefono, y de aqui
// se sube. Solo se borra de la cola cuando Supabase confirma.

import { supabase } from "./supabase";

const CLAVE_COLA = "notas.cola";
const CLAVE_BORRADOR = "notas.borrador";

export type Pendiente = {
  id: string;
  texto: string;
  creada: string;
};

function leerJSON<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

export function leerCola(): Pendiente[] {
  return leerJSON<Pendiente[]>(CLAVE_COLA, []);
}

function guardarCola(cola: Pendiente[]) {
  localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
}

export function encolar(texto: string): Pendiente {
  const pendiente: Pendiente = {
    id: crypto.randomUUID(),
    texto,
    creada: new Date().toISOString(),
  };
  guardarCola([...leerCola(), pendiente]);
  return pendiente;
}

/** Descartar una nota que todavia no sube. */
export function quitarDeCola(id: string) {
  guardarCola(leerCola().filter((p) => p.id !== id));
}

/**
 * Intenta subir todo lo que hay en la cola.
 * Cada nota se quita solo si Supabase la acepto. Si falla, se queda
 * para el proximo intento. Devuelve cuantas subieron.
 */
export async function vaciarCola(): Promise<number> {
  const cola = leerCola();
  if (cola.length === 0) return 0;

  let subidas = 0;
  const quedan: Pendiente[] = [];

  for (const pendiente of cola) {
    const { error } = await supabase
      .from("notas")
      .insert({ texto: pendiente.texto, created_at: pendiente.creada });

    if (error) quedan.push(pendiente);
    else subidas++;
  }

  guardarCola(quedan);
  return subidas;
}

// El borrador: lo que estoy escribiendo ahora mismo. Si se cierra Chrome
// a media nota, al reabrir sigue ahi.
export function leerBorrador(): string {
  return localStorage.getItem(CLAVE_BORRADOR) ?? "";
}

export function guardarBorrador(texto: string) {
  if (texto) localStorage.setItem(CLAVE_BORRADOR, texto);
  else localStorage.removeItem(CLAVE_BORRADOR);
}
