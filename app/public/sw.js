// Service worker minimo. Dos trabajos:
//   1. Que la app abra sin senal (por eso se guarda el cascaron).
//   2. No estorbar nunca a Supabase (esas peticiones van siempre a la red).
//
// Las notas que se capturan sin senal NO viven aqui: viven en localStorage,
// en src/lib/cola.ts. Este archivo solo sirve para que la app arranque offline.

const CACHE = "second-brain-v1"; // subir el numero si cambia algo del cascaron (iconos, manifiesto)
const CASCARON = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CASCARON)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;

  // Guardar una nota es un POST: jamas se toca.
  if (peticion.method !== "GET") return;

  // Supabase es otro origen: siempre red, nunca cache.
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  // Abrir la app: intenta red, y si no hay, el cascaron guardado.
  if (peticion.mode === "navigate") {
    evento.respondWith(
      fetch(peticion).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Archivos estaticos: cache primero, y lo nuevo se guarda al pasar.
  evento.respondWith(
    caches.match(peticion).then((guardado) => {
      if (guardado) return guardado;
      return fetch(peticion).then((respuesta) => {
        if (respuesta.ok && respuesta.type === "basic") {
          const copia = respuesta.clone();
          caches.open(CACHE).then((c) => c.put(peticion, copia));
        }
        return respuesta;
      });
    })
  );
});
