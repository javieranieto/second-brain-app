# CLAUDE.md — Second Brain

Instrucciones para Claude Code en este repo. Tres piezas:

| | Qué es | Dónde |
|---|---|---|
| **La app** | Captura por voz o foto, historial y pendientes (tablero en «estilo Mirlo») | `app/` · se publica en Cloudflare Pages |
| **El cuaderno** | Las notas procesadas, en Markdown (se abre con Obsidian) | `cuaderno/` (lo crea la instalación, con su propio git privado) |
| **Tú, Claude** | «Procesa las notas»: bajar, limpiar, acomodar, conectar y llevar la lista | `cuaderno/CLAUDE.md` + `.claude/skills/procesa-notas` |

**Hablas en el idioma de la persona y le explicas qué haces y por qué.** Esto es como lo usa Javier Nieto,
que lo hizo; si la persona quiere cambiar algo, adelante, pero primero que sepa cómo está pensado.

## Reglas que no se rompen

- 🔴 **Las llaves van a un archivo, NUNCA al chat.** El access token de Supabase va en
  `.secrets/supabase-token.txt`; la persona lo pega ahí. Si te lo pega en el chat, dile que lo borre del
  chat, que lo revoque en Supabase y que cree otro.
- 🔴 **La contraseña de la app la escribe la persona en su terminal** (`npm run crear-usuario`), no tú.
- 🔴 **Lo de la persona no va a este repo:** `config.local.json`, `.secrets/` y `cuaderno/` están en
  `.gitignore`. El cuaderno tiene su propio git y va a un repo **privado**.
- La app solo lleva la **clave publicable**. Quien protege las notas son los permisos por usuario (RLS)
  de la base; la llave de servicio se pide en el momento y nunca se guarda ni se imprime.
- **El estado se le pregunta a la base, no a este documento:** `npm run doctor` dice qué falta.

## Instalar

Sigue estos pasos en orden. Después de cada uno di qué hiciste y qué sigue. Si algo falla, lee el
mensaje completo antes de reintentar.

**Lo que hace falta:** Windows o Mac · Node 18 o más nuevo · Git · Claude Code · un teléfono para dictar.
Cuentas gratis: **Supabase** (la base), **Cloudflare** (donde vive la app) y, recomendado, **GitHub**
(para respaldar el cuaderno en un repo privado).

1. **Programas.** Revisa `node --version` y `git --version`. Si falta alguno, instálalo (winget en
   Windows, Homebrew en Mac) o dile a la persona cómo.
2. **Proyecto de Supabase.** Que entre a supabase.com, cree un proyecto (plan Free; la región más cercana)
   y te diga **la dirección** (`https://XXXX.supabase.co`): las letras `XXXX` son el `supabase_ref`.
3. **Su access token.** Que cree uno en supabase.com/dashboard/account/tokens y **lo pegue en
   `.secrets/supabase-token.txt`** (crea tú la carpeta y el archivo vacío, y ábreselo). Nunca en el chat.
4. **Su configuración.** Copia `config.ejemplo.json` a `config.local.json` y llénalo preguntándole: su
   nombre, el correo con el que va a entrar, el `supabase_ref` y el nombre de su sitio
   (`second-brain-<nombre>`; queda en `<nombre>.pages.dev`).
5. **La base.** Corre, en este orden:
   ```bash
   node herramientas/base.mjs aplicar
   node herramientas/base.mjs cerrar-registro
   node herramientas/base.mjs llaves
   ```
   Y pídele que corra **él** en su terminal `npm run crear-usuario` (le pide la contraseña sin mostrarla).
6. **El cuaderno.** Copia `plantilla-cuaderno/` a `cuaderno/`, entra y haz `git init` + un primer commit.
   Recomiéndale crear un repo **privado** en GitHub y subirlo (si usa el `gh` de GitHub, `gh repo create
   --private`). Si usa Obsidian, que abra `cuaderno/` como bóveda.
   Pregúntale si quiere el **módulo de salud**; si no, borra `cuaderno/Notes/Salud/` y la sección
   «Salud» de `cuaderno/CLAUDE.md`. Ofrécele cambiar las áreas (`Personal`, `Trabajo`) por las suyas.
7. **Publicar la app.** `cd app && npm install`, luego `npx wrangler login` (abre el navegador para
   entrar a su Cloudflare) y desde la raíz `npm run publicar`. Al final sale su dirección.
8. **El teléfono.** Que abra su dirección en el teléfono, entre con su correo y contraseña y la **agregue
   a la pantalla de inicio** (Android: menú ⋮ → Agregar a la pantalla principal; iPhone: Compartir →
   Agregar a inicio). Recomiéndale **Wispr Flow** para dictar (o el dictado del teclado).
9. **Comprobar.** `npm run doctor`. Luego que dicte una nota de prueba en la app y te diga «procesa las
   notas»: tiene que aparecer en `cuaderno/`. Si sale, terminó. Despídete con la sección «Así lo usa
   Javier» del README en una línea.

## Operar (todos los días)

| Lo que dice la persona | Qué haces |
|---|---|
| «procesa las notas», «revisa mi second brain» | `cuaderno/CLAUDE.md` §3, completo (con pendientes, salud si está, y un consejo) |
| «¿cómo voy?», «resumen de la semana» | Lee `pendientes.mjs logros` y `abiertos`, y las notas de la semana; responde corto: qué hizo, dónde se atoró, una sugerencia |
| «agrega un pendiente…» | `pendientes.mjs agregar`, con grupo y esfuerzo |
| «publica», «actualiza la app» | `npm run publicar` |
| «no funciona» | `npm run doctor` primero |

## Cómo está hecha la app (por si la cambias)

- React + Vite + Tailwind 4, sin servidor. `app/src/App.tsx` arma las pantallas; `app/src/pantallas/`.
- **En el teléfono abre en Notas** (dictar en 10 segundos); **en la computadora, en Inicio** (el tablero).
  Si algo agrega un toque antes de poder dictar, no va.
- Nada bloquea el guardado: sin señal, la nota se queda en el teléfono y sube después (`app/src/lib/cola.ts`).
- Estilo: fondo claro, barra lateral, un solo color fuerte por pantalla (el botón principal). Los colores
  están en `app/src/index.css`; ahí se cambian por los de cada quien.
- **Medir en el teléfono antes de dar algo por terminado:** 320, 390 y 430 px, sin scroll de lado y sin
  botones de menos de 44 px.
