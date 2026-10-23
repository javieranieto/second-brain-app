import { useState } from "react";
import { supabase } from "../lib/supabase";

// Se ve una sola vez. Despues la sesion se guarda en el telefono y se
// renueva sola: entrar a la app no vuelve a pedir contrasena.
export function Login() {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: clave,
    });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Correo o contrasena incorrectos."
          : error.message
      );
      setEntrando(false);
    }
    // Si entro bien, App detecta la sesion y cambia de pantalla solo.
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={entrar} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-texto">Notas</h1>

        <input
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="Correo"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
          className="w-full rounded-xl border border-linea bg-tarjeta px-4 py-3 text-texto placeholder-texto3 outline-none focus:border-azul"
        />

        <input
          type="password"
          autoComplete="current-password"
          placeholder="Contrasena"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          required
          className="w-full rounded-xl border border-linea bg-tarjeta px-4 py-3 text-texto placeholder-texto3 outline-none focus:border-azul"
        />

        {error && <p className="text-sm text-rojo">{error}</p>}

        <button
          type="submit"
          disabled={entrando}
          className="w-full rounded-xl bg-naranja py-3 font-medium text-texto active:bg-naranja-osc disabled:opacity-50"
        >
          {entrando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
