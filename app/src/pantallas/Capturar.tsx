import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  encolar,
  guardarBorrador,
  leerBorrador,
  leerCola,
  vaciarCola,
} from "../lib/cola";
import {
  agregarAlBorrador,
  fotosDelBorrador,
  fotosPendientes,
  guardarBorradorDeFotos,
  quitarDelBorrador,
  vaciarFotos,
} from "../lib/fotos";

type Vista = { id: string; url: string };

// La pantalla que se abre. Un campo vacio con el cursor ya dentro.
// Nunca muestra texto viejo: no hay donde poner el cursor ni riesgo de
// escribir encima de nada. Cada Guardar es una nota nueva.
export function Capturar({ irAlHistorial }: { irAlHistorial: () => void }) {
  const [texto, setTexto] = useState(leerBorrador);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [hoy, setHoy] = useState<number | null>(null);
  const [pendientes, setPendientes] = useState(leerCola().length);
  const campo = useRef<HTMLTextAreaElement>(null);
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  // Las fotos elegidas que todavia no se guardan: se ven aqui antes de tocar Guardar.
  const [fotos, setFotos] = useState<Vista[]>([]);
  const [preparando, setPreparando] = useState(false);

  async function cargarFotos() {
    const lista = await fotosDelBorrador();
    setFotos((antes) => {
      antes.forEach((v) => URL.revokeObjectURL(v.url));
      return lista.map((f) => ({ id: f.id, url: URL.createObjectURL(f.blob) }));
    });
  }

  // Cuantas notas llevo hoy. Solo el numero: no me interesa releerlas aqui.
  async function contarHoy() {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("notas")
      .select("id", { count: "exact", head: true })
      .gte("created_at", inicio.toISOString());
    setHoy(count ?? 0);
  }

  async function contarPendientes() {
    setPendientes(leerCola().length + (await fotosPendientes()).length);
  }

  async function sincronizar() {
    const subidas = (await vaciarCola()) + (await vaciarFotos());
    await contarPendientes();
    if (subidas > 0) {
      setAviso(`${subidas} ${subidas === 1 ? "nota subida" : "notas subidas"}`);
      contarHoy();
    }
  }

  useEffect(() => {
    campo.current?.focus();
    contarHoy();
    sincronizar();
    cargarFotos(); // si quedo una foto elegida sin guardar, sigue aqui

    // Volvio la senal: sube lo que quedo pendiente.
    window.addEventListener("online", sincronizar);
    return () => window.removeEventListener("online", sincronizar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    guardarBorrador(texto);
  }, [texto]);

  async function guardar() {
    const limpio = texto.trim();
    if ((!limpio && fotos.length === 0) || guardando) return;

    setGuardando(true);
    setAviso("");

    // Con fotos: se guardan juntas, con el texto en la primera.
    if (fotos.length > 0) {
      const { total, subidas } = await guardarBorradorDeFotos(limpio);
      const cuantas = total === 1 ? "Foto guardada" : `${total} fotos guardadas`;
      if (subidas === total) {
        setAviso(cuantas);
        setHoy((n) => (n === null ? n : n + subidas));
      } else {
        setAviso(`${cuantas} en el telefono, suben cuando haya senal`);
      }
      await cargarFotos();
      await contarPendientes();
      setTexto("");
      guardarBorrador("");
      setGuardando(false);
      campo.current?.focus();
      return;
    }

    const { error } = navigator.onLine
      ? await supabase.from("notas").insert({ texto: limpio })
      : { error: new Error("sin senal") };

    if (error) {
      // No se pierde: se queda en el telefono y sube cuando haya senal.
      encolar(limpio);
      setPendientes(leerCola().length);
      setAviso("Guardada en el telefono, sube cuando haya senal");
    } else {
      setAviso("Guardada");
      setHoy((n) => (n === null ? n : n + 1));
    }

    setTexto("");
    guardarBorrador("");
    setGuardando(false);
    campo.current?.focus();
  }

  // La foto se guarda con el texto que haya en la caja (por ejemplo "fueron dos
  // porciones"). Sin texto tambien vale: la foto sola ya es una nota.
  // Elegir una foto NO la guarda: la pone en la vista previa. Se guarda con Guardar,
  // junto con lo que escriba ("fueron dos porciones"). De la galeria se pueden varias.
  async function alTomarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = ""; // para poder elegir la misma foto otra vez
    if (archivos.length === 0) return;
    setPreparando(true);
    setAviso("");
    await agregarAlBorrador(archivos);
    await cargarFotos();
    setPreparando(false);
    campo.current?.focus();
  }

  async function quitarFoto(id: string) {
    await quitarDelBorrador(id);
    await cargarFotos();
  }

  function alTeclear(e: React.KeyboardEvent) {
    // Ctrl+Enter guarda, para cuando escribo desde la computadora.
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      guardar();
    }
  }

  return (
    // Vive dentro del Marco (barra lateral en la computadora); aqui solo ocupa el alto que queda.
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <header className="flex items-center justify-between pb-3">
        <h1 className="text-xl font-semibold text-texto">Notas</h1>
        <button
          onClick={irAlHistorial}
          className="min-h-11 rounded-lg px-3 text-sm text-texto2 active:bg-hover"
        >
          Historial
        </button>
      </header>

      <textarea
        ref={campo}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={alTeclear}
        placeholder="Habla o escribe..."
        autoFocus
        className="min-h-48 flex-1 resize-none rounded-2xl border border-linea bg-tarjeta p-4 text-lg leading-relaxed text-texto placeholder-texto3 outline-none focus:border-azul"
      />

      {(fotos.length > 0 || preparando) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {fotos.map((f) => (
            <div key={f.id} className="relative">
              <img
                src={f.url}
                alt="Foto por guardar"
                className="h-24 w-24 rounded-xl object-cover"
              />
              <button
                onClick={() => quitarFoto(f.id)}
                aria-label="Quitar esta foto"
                className="absolute -right-3 -top-3 flex h-11 w-11 items-center justify-center"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tarjeta text-lg leading-none text-texto ring-1 ring-linea">
                  ×
                </span>
              </button>
            </div>
          ))}
          {preparando && (
            <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-linea text-xs text-texto3">
              Preparando...
            </div>
          )}
        </div>
      )}

      <button
        onClick={guardar}
        disabled={(!texto.trim() && fotos.length === 0) || guardando || preparando}
        className="mt-4 w-full rounded-2xl bg-naranja py-4 text-lg font-medium text-texto active:bg-naranja-osc disabled:opacity-30"
      >
        {guardando
          ? "Guardando..."
          : fotos.length === 0
            ? "Guardar"
            : fotos.length === 1
              ? "Guardar con la foto"
              : `Guardar con ${fotos.length} fotos`}
      </button>

      {/* Las fotos van debajo de Guardar: no agregan ningun toque antes de escribir. */}
      <input
        ref={camara}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={alTomarFoto}
        className="hidden"
      />
      <input
        ref={galeria}
        type="file"
        accept="image/*"
        multiple
        onChange={alTomarFoto}
        className="hidden"
      />
      <div className="mt-3 flex gap-3">
        <button
          onClick={() => camara.current?.click()}
          disabled={guardando}
          className="flex-1 rounded-2xl border border-linea py-3 text-base text-texto active:bg-hover disabled:opacity-30"
        >
          Tomar foto
        </button>
        <button
          onClick={() => galeria.current?.click()}
          disabled={guardando}
          className="flex-1 rounded-2xl border border-linea py-3 text-base text-texto active:bg-hover disabled:opacity-30"
        >
          De la galeria
        </button>
      </div>

      <footer className="flex h-6 items-center justify-between pt-3 text-sm">
        <span className="text-texto3">
          {hoy === null ? "" : `Hoy: ${hoy} ${hoy === 1 ? "nota" : "notas"}`}
        </span>
        <span className="text-texto2">
          {aviso ||
            (pendientes > 0
              ? `${pendientes} sin subir`
              : "")}
        </span>
      </footer>
    </div>
  );
}
