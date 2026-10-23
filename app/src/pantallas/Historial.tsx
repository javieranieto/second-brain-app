import { useEffect, useState } from "react";
import { supabase, type Nota } from "../lib/supabase";
import { leerCola, quitarDeCola, type Pendiente } from "../lib/cola";

// Dos toques en vez de una ventana emergente: el primero pregunta, el segundo borra.
// Tocar en cualquier otro lado cancela.
function Borrar({
  preguntando,
  preguntar,
  cancelar,
  confirmar,
}: {
  preguntando: boolean;
  preguntar: () => void;
  cancelar: () => void;
  confirmar: () => void;
}) {
  if (!preguntando) {
    return (
      <button
        onClick={preguntar}
        aria-label="Borrar nota"
        className="-my-1 rounded-lg px-2 py-1 text-xs text-texto3 active:bg-hover"
      >
        Borrar
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <button
        onClick={cancelar}
        className="-my-1 rounded-lg px-2 py-1 text-xs text-texto2 active:bg-hover"
      >
        Cancelar
      </button>
      <button
        onClick={confirmar}
        className="-my-1 rounded-lg bg-rojo-suave px-2 py-1 text-xs text-rojo active:bg-rojo-suave"
      >
        Borrar
      </button>
    </span>
  );
}

function cuando(iso: string) {
  const f = new Date(iso);
  const hoy = new Date();
  const mismoDia = f.toDateString() === hoy.toDateString();
  const hora = f.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (mismoDia) return `Hoy ${hora}`;
  return `${f.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} ${hora}`;
}

// Solo para consultar y borrar. La pantalla de captura nunca muestra texto viejo:
// esa separacion es a proposito.
export function Historial({ volver }: { volver: () => void }) {
  const [notas, setNotas] = useState<Nota[] | null>(null);
  const [sinSubir, setSinSubir] = useState<Pendiente[]>([]);
  const [error, setError] = useState("");
  // Borrar pide dos toques: el primero pregunta, el segundo borra.
  // Sin ventanas emergentes, y sin borrar por un roce en el bolsillo.
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  // Enlaces temporales para ver las fotos: el bucket es privado.
  const [vistas, setVistas] = useState<Record<string, string>>({});

  useEffect(() => {
    setSinSubir(leerCola());
    supabase
      .from("notas")
      .select("id, texto, foto, procesada, created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(async ({ data, error }) => {
        if (error) return setError(error.message);
        const lista = data as Nota[];
        setNotas(lista);
        const rutas = lista.map((n) => n.foto).filter((r): r is string => !!r);
        if (rutas.length === 0) return;
        const { data: firmadas } = await supabase.storage
          .from("fotos")
          .createSignedUrls(rutas, 3600);
        const mapa: Record<string, string> = {};
        firmadas?.forEach((f) => {
          if (f.path && f.signedUrl) mapa[f.path] = f.signedUrl;
        });
        setVistas(mapa);
      });
  }, []);

  async function borrar(id: string) {
    const foto = notas?.find((x) => x.id === id)?.foto;
    const { error } = await supabase.from("notas").delete().eq("id", id);
    if (!error && foto) await supabase.storage.from("fotos").remove([foto]);
    if (error) setError(error.message);
    else setNotas((n) => (n ?? []).filter((x) => x.id !== id));
    setPorBorrar(null);
  }

  function borrarSinSubir(id: string) {
    quitarDeCola(id);
    setSinSubir(leerCola());
    setPorBorrar(null);
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="flex items-center justify-between pb-3">
        <h1 className="text-xl font-semibold text-texto">Historial</h1>
        <button
          onClick={volver}
          className="min-h-11 rounded-lg px-3 text-sm text-texto2 active:bg-hover"
        >
          Capturar
        </button>
      </header>

      {error && <p className="py-4 text-sm text-rojo">{error}</p>}
      {notas === null && !error && (
        <p className="py-4 text-sm text-texto3">Cargando...</p>
      )}

      <ul className="space-y-2">
        {sinSubir.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-ambar-suave bg-ambar-suave p-3"
          >
            <p className="whitespace-pre-wrap text-texto">{p.texto}</p>
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-xs text-ambar">
                {cuando(p.creada)} · sin subir
              </span>
              <Borrar
                preguntando={porBorrar === p.id}
                preguntar={() => setPorBorrar(p.id)}
                cancelar={() => setPorBorrar(null)}
                confirmar={() => borrarSinSubir(p.id)}
              />
            </div>
          </li>
        ))}

        {notas?.map((n) => (
          <li key={n.id} className="rounded-xl border border-linea bg-tarjeta p-3">
            {n.foto &&
              (vistas[n.foto] ? (
                <img
                  src={vistas[n.foto]}
                  alt="Foto de la nota"
                  className="mb-2 max-h-56 rounded-lg"
                />
              ) : (
                <p className="mb-1 text-xs text-texto3">Foto</p>
              ))}
            {n.texto && <p className="whitespace-pre-wrap text-texto">{n.texto}</p>}
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-xs text-texto3">
                {cuando(n.created_at)}
                {n.procesada && " · procesada"}
              </span>
              <Borrar
                preguntando={porBorrar === n.id}
                preguntar={() => setPorBorrar(n.id)}
                cancelar={() => setPorBorrar(null)}
                confirmar={() => borrar(n.id)}
              />
            </div>
          </li>
        ))}
      </ul>

      {notas?.length === 0 && sinSubir.length === 0 && (
        <p className="py-8 text-center text-sm text-texto3">
          Todavia no hay notas.
        </p>
      )}
    </div>
  );
}
