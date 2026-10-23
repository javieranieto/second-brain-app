<p align="center"><img src="app/public/marca/second-brain-icono.svg" width="96" alt=""></p>

# Second Brain

**Dicta lo que piensas desde el teléfono. Claude lo ordena por ti.** Tus notas quedan limpias, conectadas
y en tu propio cuaderno; lo que tienes que hacer queda en una lista con racha y logros.

Lo hice para mí y lo uso todos los días: camino, voy platicando lo que traigo en la cabeza, y en la
computadora le digo a Claude *«procesa las notas»*. Lo comparto gratis y como código abierto (licencia
MIT). — **Javier Nieto**

> **Esto es como lo hago yo.** Te digo qué uso y por qué. Si quieres cambiar algo (otra base, otro
> hosting, otras carpetas), adelante: el código es tuyo. Pero arranca como está y cambia lo que te estorbe.

## Qué hace

| | |
|---|---|
| 🎙️ **Capturar** | Una app en tu teléfono que abre directo en un campo vacío. Dictas (o mandas una foto) y guardas. Sin señal, se guarda en el teléfono y sube después. |
| 🧠 **Procesar** | En la computadora le dices a Claude Code *«procesa las notas»*: las baja, corrige el dictado sin cambiar tu forma de hablar, separa los temas, las pone en su carpeta y las conecta con lo que ya tenías. |
| ✅ **Pendientes** | Lo que sale de tus notas y tienes que hacer va a una lista: por proyecto, de lo más fácil a lo más urgente, con 5 sugeridos al día. Claude cierra solo lo que ve que ya hiciste. |
| 🔥 **Logros** | Tu racha, lo que hiciste cada día y por proyecto. Solo cuenta lo tuyo. |
| 🥗 **Salud** *(opcional)* | Mandas la foto del plato o de la báscula y Claude lleva tu registro: calorías estimadas, peso por promedio de 7 días, y un consejo sacado de lo que tú sí comes. |

Tus notas viven en **tu** base y en **tu** cuaderno. Nadie más las ve; yo tampoco.

## Así lo uso yo

- **Dicto caminando, en la mañana.** 20-30 minutos, 4 o 5 notas: lo que pienso hacer, lo que me preocupa,
  una idea para un cliente, lo que comí ayer. Sin pensar en dónde va.
- **Dicto con Wispr Flow** en el teléfono (también sirve el dictado del teclado).
- **Proceso en la computadora**, casi diario: *«procesa las notas»*. Leo el resumen, contesto las dudas, y listo.
- **Abro Pendientes en la computadora** cuando me siento a trabajar: hago los rápidos primero, y de ahí
  uno de los que pesan.
- **Comento en los pendientes** en vez de explicarle a Claude: *«ya lo hice»*, *«esto ya no va»*. Lo lee
  en la siguiente pasada.

**Mi equipo:** Claude Code (plan Max) en Windows 11, Wispr Flow en Android, Obsidian para leer el cuaderno.

## ¿Sabías que puedes…?

- **…dictar tres temas en una sola nota?** Claude los separa.
- **…mandar solo la foto?** Un pizarrón, una pantalla, un plato: la foto sola ya es una nota.
- **…preguntarle a tu cuaderno?** *«¿Cuántas veces he hablado de X?»*, *«¿qué decidí sobre Y?»*.
- **…pedir el resumen de tu semana?** Qué hiciste, dónde te atoraste, qué sigue.
- **…sacar ideas de contenido de tus notas?** *«Revisa qué contenido puedo sacar de mis notas»*.
- **…dictar justo al salir de una junta?** Cinco minutos después ya se perdió la mitad.

Cada vez que procesas, Claude te da **un** consejo de estos que todavía no uses, y no lo repite.

## Lo que necesitas

| | |
|---|---|
| Computadora | **Windows o Mac** |
| Programas | **Node 18+** y **Git** (Claude los instala si faltan) · **Claude Code** (lo uso con el plan de paga) |
| Cuentas gratis | **Supabase** (tu base) · **Cloudflare** (donde vive tu app) · **GitHub** (recomendado, para respaldar tu cuaderno en privado) |
| Teléfono | Android o iPhone. Para dictar, **Wispr Flow** (recomendado) o el teclado |

**Por qué estas:** Supabase te da base, inicio de sesión y lugar para fotos, gratis. Cloudflare publica
la app gratis y sin tope de visitas; no necesita servidor. ¿Prefieres Vercel u otro? Funciona: la app es
un sitio estático (`app/dist`).

## Instalar

Abre una **carpeta vacía** en Claude Code (en la terminal o en VS Code) y pégale esto:

```text
Instala Second Brain de https://github.com/javieranieto/second-brain-app en esta carpeta. Clónalo, sigue la sección «Instalar» de su CLAUDE.md paso por paso conmigo, y al final corre npm run doctor y dime qué quedó listo y qué me toca a mí.
```

Claude te va a pedir crear tus cuentas, pegar tu llave de Supabase **en un archivo** (nunca en el chat),
y escribir tu contraseña **tú** en la terminal. Al final tienes tu app en `tu-nombre.pages.dev`, tu
cuaderno en `cuaderno/`, y tu primera nota procesada.

<details>
<summary>Los pasos a mano (si no usas Claude Code para instalar)</summary>

```bash
git clone https://github.com/javieranieto/second-brain-app && cd second-brain-app
cp config.ejemplo.json config.local.json      # llénalo
mkdir .secrets                                 # pega tu access token de Supabase en .secrets/supabase-token.txt
node herramientas/base.mjs aplicar
node herramientas/base.mjs cerrar-registro
node herramientas/base.mjs llaves
npm run crear-usuario
cp -r plantilla-cuaderno cuaderno && cd cuaderno && git init && cd ..
cd app && npm install && npx wrangler login && cd ..
npm run publicar
npm run doctor
```
</details>

## Cómo está armado

```text
app/                  la app (React + Supabase), se publica con: npm run publicar
supabase/esquema.sql  tablas, fotos y permisos por usuario
herramientas/         lo que usa Claude: bajar notas, pendientes, publicar, doctor
plantilla-cuaderno/   tu cuaderno de arranque (la instalación lo copia a cuaderno/)
.claude/skills/       «procesa las notas»
CLAUDE.md             las instrucciones para Claude: instalar y operar
```

## Sin soporte, pero con ayuda si la quieres

Se comparte tal cual. Cada tantos meses le paso las mejoras que le hago al mío. Si quieres que te ayude
a instalarlo o a adaptarlo a tu forma de trabajar, eso sí lo cobro: escríbeme por mensaje en cualquiera
de mis redes. Y si te sirvió, dale una estrella al repo y cuéntame qué le mejorarías.

Hecho por **Javier Nieto** · javiernieto.net · Licencia MIT.
