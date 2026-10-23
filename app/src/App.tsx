import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { esEspera } from "./lib/pendientes";
import { Login } from "./pantallas/Login";
import { Capturar } from "./pantallas/Capturar";
import { Historial } from "./pantallas/Historial";
import { Marco, type Pantalla } from "./pantallas/Marco";
import {
  Estado,
  usePendientes,
  VistaEsperas,
  VistaInicio,
  VistaLogros,
  VistaNegocios,
} from "./pantallas/Pendientes";

const PANTALLAS: Pantalla[] = ["capturar", "historial", "inicio", "negocios", "esperas", "logros"];

// En el telefono la app abre en Capturar, siempre: es para dictar en diez segundos.
// En la computadora abre en Inicio (el tablero). Una direccion con #inicio, #esperas... abre esa.
function pantallaInicial(): Pantalla {
  const h = location.hash.slice(1);
  if (h === "pendientes") return "inicio"; // la liga vieja del 23-oct
  if ((PANTALLAS as string[]).includes(h)) return h as Pantalla;
  return window.matchMedia("(min-width: 1024px)").matches ? "inicio" : "capturar";
}

export function App() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pantalla, setPantallaEstado] = useState<Pantalla>(pantallaInicial);
  const [grupo, setGrupo] = useState("Todos");
  const enPendientes = pantalla !== "capturar" && pantalla !== "historial";
  // Los pendientes se leen la primera vez que se entra a cualquiera de sus vistas, no al dictar.
  const [yaEntro, setYaEntro] = useState(enPendientes);
  const datos = usePendientes(!!sesion && yaEntro);

  function ir(p: Pantalla) {
    setPantallaEstado(p);
    if (p !== "capturar" && p !== "historial") setYaEntro(true);
    history.replaceState(null, "", "#" + p);
    window.scrollTo(0, 0);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSesion(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Pantalla en blanco un instante mientras se lee la sesion guardada.
  // Sin esto parpadea el login aunque ya estes dentro.
  if (cargando) return <div className="min-h-dvh" />;

  if (!sesion) return <Login />;

  let contenido: React.ReactNode;
  if (pantalla === "capturar") contenido = <Capturar irAlHistorial={() => ir("historial")} />;
  else if (pantalla === "historial") contenido = <Historial volver={() => ir("capturar")} />;
  else if (!datos.todos) contenido = <Estado datos={datos} />;
  else if (pantalla === "inicio")
    contenido = (
      <VistaInicio
        datos={datos}
        irA={ir}
        irANegocio={(g) => {
          setGrupo(g);
          ir("negocios");
        }}
      />
    );
  else if (pantalla === "negocios") contenido = <VistaNegocios datos={datos} grupo={grupo} setGrupo={setGrupo} />;
  else if (pantalla === "esperas") contenido = <VistaEsperas datos={datos} />;
  else contenido = <VistaLogros datos={datos} />;

  const esperas = datos.todos ? datos.todos.filter(esEspera).length : null;

  return (
    <Marco pantalla={pantalla} ir={ir} esperas={esperas} correo={sesion.user.email ?? ""}>
      {contenido}
    </Marco>
  );
}
