// Fotos: la comida y la bascula, sin escribir nada.
//
// Por que existe (2026-09-21): registrar calorias costaba demasiado. Tomar la foto,
// pasarla a ChatGPT, copiar el numero a Samsung Health... y al tercer paso ya no se
// hacia. Aqui es un toque: la foto se guarda con su hora, y al procesar las notas
// Claude la mira y estima.
//
// Mismas reglas que las notas de texto:
//   - Nada bloquea el guardado. La foto se guarda PRIMERO en el telefono (IndexedDB,
//     porque una foto no cabe en localStorage) y de ahi se sube.
//   - Solo se borra del telefono cuando Supabase confirmo las DOS cosas: el archivo
//     y la nota que lo apunta.
//   - Subirla dos veces no la duplica: la nota lleva el mismo id que la foto, asi que
//     un reintento despues de un corte a medias no crea otra.

import { supabase } from "./supabase";

const BASE = "notas-fotos";
const ALMACEN = "pendientes"; // listas para subir
const BORRADOR = "borrador"; // elegidas, esperando a que toque Guardar (vista previa)
const LADO_MAXIMO = 1280; // suficiente para ver un plato; pesa ~150-250 KB
const CALIDAD = 0.8;

export type FotoPendiente = {
  id: string;
  texto: string;
  creada: string;
  blob: Blob;
};

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, fallar) => {
    // v2 (21-sep): se agrega el borrador, para la vista previa antes de guardar.
    const peticion = indexedDB.open(BASE, 2);
    peticion.onupgradeneeded = () => {
      const bd = peticion.result;
      if (!bd.objectStoreNames.contains(ALMACEN)) bd.createObjectStore(ALMACEN, { keyPath: "id" });
      if (!bd.objectStoreNames.contains(BORRADOR)) bd.createObjectStore(BORRADOR, { keyPath: "id" });
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => fallar(peticion.error);
  });
}

async function operar<T>(
  modo: IDBTransactionMode,
  accion: (almacen: IDBObjectStore) => IDBRequest<T>,
  almacen: string = ALMACEN
): Promise<T> {
  const bd = await abrir();
  return new Promise((resolver, fallar) => {
    const peticion = accion(bd.transaction(almacen, modo).objectStore(almacen));
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => fallar(peticion.error);
  });
}

export async function fotosPendientes(): Promise<FotoPendiente[]> {
  try {
    return await operar("readonly", (a) => a.getAll() as IDBRequest<FotoPendiente[]>);
  } catch {
    return [];
  }
}

const poner = (p: FotoPendiente) => operar("readwrite", (a) => a.put(p));
const quitar = (id: string) => operar("readwrite", (a) => a.delete(id));

/** Achica la foto en el telefono antes de subirla. Si algo falla, sube la original. */
async function comprimir(archivo: File): Promise<Blob> {
  try {
    const imagen = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d")!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    imagen.close();
    const blob = await new Promise<Blob | null>((r) =>
      lienzo.toBlob(r, "image/jpeg", CALIDAD)
    );
    return blob && blob.size < archivo.size ? blob : archivo;
  } catch {
    return archivo;
  }
}

/**
 * Lee la fecha en que se TOMO la foto, de sus datos EXIF (DateTimeOriginal).
 * Hace falta para las fotos de la galeria: al elegirlas, el navegador a veces reporta
 * como fecha del archivo el momento de elegirla, no el de tomarla. El EXIF no miente.
 * Se lee ANTES de comprimir, porque el lienzo se los quita. Si no hay, devuelve null.
 */
async function fechaExif(archivo: File): Promise<number | null> {
  try {
    const vista = new DataView(await archivo.slice(0, 256 * 1024).arrayBuffer());
    if (vista.getUint16(0) !== 0xffd8) return null; // no es JPEG
    let i = 2;
    while (i + 4 < vista.byteLength) {
      const marca = vista.getUint16(i);
      const largo = vista.getUint16(i + 2);
      if (marca === 0xffe1 && vista.getUint32(i + 4) === 0x45786966) {
        const tiff = i + 10;
        const le = vista.getUint16(tiff) === 0x4949;
        const u16 = (o: number) => vista.getUint16(o, le);
        const u32 = (o: number) => vista.getUint32(o, le);
        const buscar = (ifd: number, etiqueta: number) => {
          const n = u16(ifd);
          for (let k = 0; k < n; k++) {
            const e = ifd + 2 + k * 12;
            if (u16(e) === etiqueta) return e;
          }
          return -1;
        };
        const ifd0 = tiff + u32(tiff + 4);
        const punteroExif = buscar(ifd0, 0x8769);
        if (punteroExif < 0) return null;
        const exif = tiff + u32(punteroExif + 8);
        const entrada = buscar(exif, 0x9003); // DateTimeOriginal: "AAAA:MM:DD HH:MM:SS"
        if (entrada < 0) return null;
        const inicio = tiff + u32(entrada + 8);
        let texto = "";
        for (let k = 0; k < 19; k++) texto += String.fromCharCode(vista.getUint8(inicio + k));
        const m = texto.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
        if (!m) return null;
        // Sin zona horaria: es la hora del telefono, que es la misma de este navegador.
        return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
      }
      i += 2 + largo;
    }
  } catch {
    /* sin EXIF legible: se usa la fecha del archivo */
  }
  return null;
}

/**
 * La hora que importa es cuando se TOMO la foto, no cuando subio. Primero el EXIF,
 * luego la fecha del archivo. Nunca en el futuro: si algo viene raro, cuenta ahora.
 */
async function horaDeLaFoto(archivo: File): Promise<string> {
  const ahora = Date.now();
  const candidatos = [await fechaExif(archivo), archivo.lastModified || null];
  const t = candidatos.find((c): c is number => !!c && c <= ahora) ?? ahora;
  return new Date(t).toISOString();
}

async function subir(p: FotoPendiente): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const usuario = data.session?.user.id;
  if (!usuario) return false;

  const tipo = p.blob.type || "image/jpeg";
  const extension = tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : "jpg";
  const ruta = `${usuario}/${p.id}.${extension}`;

  const archivo = await supabase.storage
    .from("fotos")
    .upload(ruta, p.blob, { contentType: tipo, upsert: false });
  // "Ya existe" no es error: es un reintento de una foto que ya habia subido.
  if (archivo.error && !/exist/i.test(archivo.error.message)) return false;

  const nota = await supabase
    .from("notas")
    .insert({ id: p.id, texto: p.texto, foto: ruta, created_at: p.creada });
  // 23505 = ya estaba insertada: tambien es un reintento, no un error.
  if (nota.error && nota.error.code !== "23505") return false;

  return true;
}

// --- Vista previa -----------------------------------------------------------------
// Al elegir una foto NO se sube: se queda en el borrador, se ve en la pantalla y se
// guarda hasta tocar Guardar, junto con lo que escriba. Pedido el 21-sep: "no supe si
// te la mando directo". El borrador vive en el telefono, asi que si se cierra la app
// a medias, la foto sigue ahi al volver a abrir. Nada se pierde.

export async function fotosDelBorrador(): Promise<FotoPendiente[]> {
  try {
    const todas = await operar(
      "readonly",
      (a) => a.getAll() as IDBRequest<FotoPendiente[]>,
      BORRADOR
    );
    return todas.sort((x, y) => x.creada.localeCompare(y.creada));
  } catch {
    return [];
  }
}

/** Prepara las fotos elegidas (hora y compresion) y las deja en el borrador. */
export async function agregarAlBorrador(archivos: File[]): Promise<void> {
  for (const archivo of archivos) {
    const p: FotoPendiente = {
      id: crypto.randomUUID(),
      texto: "",
      creada: await horaDeLaFoto(archivo),
      blob: await comprimir(archivo),
    };
    await operar("readwrite", (a) => a.put(p), BORRADOR);
  }
}

export function quitarDelBorrador(id: string) {
  return operar("readwrite", (a) => a.delete(id), BORRADOR);
}

/**
 * Guarda lo que hay en el borrador. El texto de la caja va con la primera foto.
 * Cada foto pasa primero a "pendientes" (ya no se pierde) y de ahi intenta subir.
 */
export async function guardarBorradorDeFotos(
  texto: string
): Promise<{ total: number; subidas: number }> {
  const fotos = await fotosDelBorrador();
  let subidas = 0;
  for (const [i, f] of fotos.entries()) {
    const p = { ...f, texto: i === 0 ? texto : "" };
    await poner(p);
    await quitarDelBorrador(f.id);
    if (navigator.onLine && (await subir(p).catch(() => false))) {
      await quitar(p.id);
      subidas++;
    }
  }
  return { total: fotos.length, subidas };
}

/** Sube las fotos que se quedaron en el telefono. Devuelve cuantas subieron. */
export async function vaciarFotos(): Promise<number> {
  let subidas = 0;
  for (const p of await fotosPendientes()) {
    if (await subir(p).catch(() => false)) {
      await quitar(p.id);
      subidas++;
    }
  }
  return subidas;
}
