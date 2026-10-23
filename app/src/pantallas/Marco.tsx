import { supabase } from "../lib/supabase";
import {
  IconoHistorial,
  IconoInicio,
  IconoNegocios,
  IconoNota,
  IconoReloj,
  IconoSalir,
  IconoTrofeo,
} from "../lib/iconos";

// Second Brain: una sola linea que dibuja la cabeza y termina en una idea (el punto naranja).
function Logo() {
  return (
    <span className="flex items-center gap-2">
      <img src="/marca/second-brain.svg" alt="" width={34} height={24} className="h-6 w-auto" />
      <span className="text-[17px] font-semibold tracking-tight text-texto">Second Brain</span>
    </span>
  );
}

export type Pantalla = "capturar" | "historial" | "inicio" | "negocios" | "esperas" | "logros";

// El marco de toda la app, en "estilo Mirlo" (fondo claro, barra lateral, un solo color fuerte):
// en la computadora, barra lateral fija; en el telefono, logo arriba y pestanas abajo.
// En Capturar, el telefono NO muestra pestanas: esa pantalla es para dictar y nada mas.
export function Marco({
  pantalla,
  ir,
  esperas,
  correo,
  children,
}: {
  pantalla: Pantalla;
  ir: (p: Pantalla) => void;
  esperas: number | null;
  correo: string;
  children: React.ReactNode;
}) {
  const enCaptura = pantalla === "capturar" || pantalla === "historial";

  const Enlace = ({
    p,
    texto,
    Icono,
    cuenta,
  }: {
    p: Pantalla;
    texto: string;
    Icono: (x: { className?: string }) => React.ReactElement;
    cuenta?: number | null;
  }) => (
    <button
      onClick={() => ir(p)}
      aria-current={pantalla === p ? "page" : undefined}
      className={`relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] ${
        pantalla === p ? "bg-azul-suave font-medium text-azul" : "text-texto2 hover:bg-hover"
      }`}
    >
      {pantalla === p && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-azul" />}
      <Icono className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1">{texto}</span>
      {cuenta ? <span className="text-xs text-texto3 tabular-nums">{cuenta}</span> : null}
    </button>
  );

  const Rotulo = ({ children: t }: { children: React.ReactNode }) => (
    <p className="px-3 pt-5 pb-1.5 text-xs font-semibold tracking-[0.08em] text-texto3 uppercase">{t}</p>
  );

  return (
    <div className="min-h-dvh lg:pl-60">
      {/* ---------- Computadora: barra lateral ---------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-linea bg-barra lg:flex">
        <button onClick={() => ir("inicio")} className="flex min-h-16 items-center border-b border-linea px-5">
          <Logo />
        </button>
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Secciones">
          <Enlace p="inicio" texto="Inicio" Icono={IconoInicio} />
          <Rotulo>Pendientes</Rotulo>
          <Enlace p="negocios" texto="Por proyecto" Icono={IconoNegocios} />
          <Enlace p="esperas" texto="Esperas" Icono={IconoReloj} cuenta={esperas} />
          <Enlace p="logros" texto="Logros" Icono={IconoTrofeo} />
          <Rotulo>Captura</Rotulo>
          <Enlace p="capturar" texto="Notas" Icono={IconoNota} />
          <Enlace p="historial" texto="Historial" Icono={IconoHistorial} />
        </nav>
        <div className="flex items-center gap-3 border-t border-linea px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-azul text-sm font-semibold text-white uppercase">
            {correo.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-texto2">{correo}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            aria-label="Salir"
            title="Salir"
            className="grid h-11 w-11 place-items-center rounded-lg text-texto3 hover:bg-hover"
          >
            <IconoSalir className="h-[18px] w-[18px]" />
          </button>
        </div>
      </aside>

      {/* ---------- Telefono: logo arriba ---------- */}
      <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between border-b border-linea bg-barra/95 px-4 backdrop-blur lg:hidden">
        <button onClick={() => ir("inicio")} className="flex min-h-11 items-center">
          <Logo />
        </button>
        {enCaptura && (
          <button
            onClick={() => ir("inicio")}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-azul active:bg-hover"
          >
            Pendientes
          </button>
        )}
      </header>

      <main
        className={`flex min-h-[calc(100dvh-3.5rem)] flex-col px-4 pt-5 lg:min-h-dvh lg:px-10 lg:pt-10 ${
          enCaptura ? "pb-[calc(1rem+env(safe-area-inset-bottom))]" : "pb-28 lg:pb-12"
        }`}
      >
        {children}
      </main>

      {/* ---------- Telefono: pestanas abajo (no en Capturar) ---------- */}
      {!enCaptura && (
        <nav
          aria-label="Secciones"
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-linea bg-barra/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          {(
            [
              ["capturar", "Notas", IconoNota],
              ["inicio", "Inicio", IconoInicio],
              ["negocios", "Proyectos", IconoNegocios],
              ["esperas", "Esperas", IconoReloj],
              ["logros", "Logros", IconoTrofeo],
            ] as const
          ).map(([p, t, Icono]) => (
            <button
              key={p}
              onClick={() => ir(p)}
              aria-current={pantalla === p ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${
                pantalla === p ? "font-semibold text-azul" : "text-texto3"
              }`}
            >
              <Icono className="h-5 w-5" />
              {t}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
