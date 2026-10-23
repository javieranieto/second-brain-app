import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !clave) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.local.example a .env.local."
  );
}

// La clave publicable viaja dentro de la app: es publica por diseno.
// Lo que protege las notas son las politicas RLS de la base, no esta clave.
export const supabase = createClient(url, clave, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export type Nota = {
  id: string;
  texto: string;
  foto: string | null; // ruta en el bucket "fotos"; la foto sola ya es una nota
  procesada: boolean;
  created_at: string;
};
