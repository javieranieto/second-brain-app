# CLAUDE.md — mi cuaderno (Second Brain)

Esto es mi **second brain**: archivos Markdown planos que también abro como bóveda de Obsidian. No es un
proyecto de software. No agregues dependencias, plugins ni herramientas sin que yo lo pida.

Todo lo que escribas aquí va **en mi idioma y en mi voz**, no en la tuya.

> Este archivo vino de la plantilla de Second Brain (Javier Nieto). Es tuyo: cámbialo como quieras.
> Lo que está aquí es **como lo hacemos nosotros**; si algo no te sirve, quítalo.

## 1. La idea

**Capturar cuesta cero. Organizar pasa después.**

```text
Inbox → procesar → Notes → conexiones → Ideas → Projects / Content
```

Yo dicto sin pensar en estructura. Tu trabajo es convertir eso en conocimiento que pueda reusar **sin
destruir la idea original**.

## 2. Carpetas

| Carpeta | Qué vive aquí |
|---|---|
| `Inbox/` | Capturas crudas. Desordenadas a propósito. |
| `Notes/<Área>/` | Lo procesado y duradero. Áreas de arranque: `Personal`, `Trabajo`, `Salud` (opcional). Agrega las tuyas. |
| `Ideas/` | Lo que quiero explorar después. |
| `Projects/` | Lo que quiero construir o lograr. |
| `Content/Drafts`, `Content/Published` | Borradores y lo publicado, si escribo contenido. |
| `Archive/Inbox/AAAA-MM/` | Las capturas crudas ya procesadas, intactas. |
| `Templates/` | Plantillas mínimas. |

**No crees carpetas nuevas por tu cuenta.** Si algo no encaja, va a `Notes/Personal` o `Ideas/` y me
preguntas en el resumen.

## 3. «Procesa las notas»

**Paso 0 — bajar.** Desde la carpeta del repo (la de arriba de este cuaderno):

```bash
node herramientas/notas.mjs bajar
```

Escribe cada nota nueva en `Inbox/` con su hora local y la marca como procesada **después** de escribirla.
Si trae foto, el archivo dice `Foto: <ruta>`.

**Paso 0.5 — guardar lo crudo antes de tocarlo.** Un commit solo con lo nuevo de `Inbox/`
(*"Captura cruda: N notas"*). Así mi texto exacto queda en el historial antes de que lo edites.

**Paso 0.6 — fotos.** Bájalas a una carpeta **temporal, nunca al cuaderno** (las fotos no van a git) y
míralas:

```bash
node herramientas/notas.mjs fotos <carpeta-temporal> <ruta1> <ruta2>
```

**Paso 0.7 — leer mis pendientes** antes de acomodar nada:

```bash
node herramientas/pendientes.mjs abiertos
node herramientas/pendientes.mjs comentarios
```

Lo que comenté en la app ("ya lo hice", "no se va a hacer porque…") se atiende: se cierra, se ajusta, o
me preguntas antes de borrar algo.

**Después, para cada archivo nuevo de `Inbox/`:**

1. **Entiende qué estoy tratando de decir.** Ese es el objetivo, no reescribir bonito.
2. **Corrige solo errores evidentes** del dictado: ortografía, puntuación, palabras mal capturadas.
3. **Conserva mi manera de hablar.** Si dije "esto no funciona", no lo conviertas en "esta aproximación
   presenta limitaciones".
4. **No inventes nada.** Ni ejemplos, ni datos, ni conclusiones que yo no dije.
5. **Separa ideas distintas** en notas distintas. Una nota de voz puede traer tres temas.
6. **Decide el tipo** (§4) y ponla en su carpeta.
7. **Conecta** con notas existentes con `[[Nombre de nota]]`, cada enlace con una línea de por qué.
8. **Mueve el original** a `Archive/Inbox/AAAA-MM/` con `git mv`, sin modificarlo.
9. **Nunca borres una idea** por parecerte poco importante. Esa decisión es mía.
10. **Si algo no se entiende**, conserva mi texto entre comillas y marca `> ⚠️ No estoy seguro de esta parte.`

**Al final: un segundo commit** que diga qué se creó y dónde, y **un resumen corto**: qué notas, dónde,
qué conexiones, qué dudas.

### Pendientes (en la app)

- **Lo que salga de las notas y yo tenga que hacer, va a la lista**, revisando antes que no exista:
  ```bash
  node herramientas/pendientes.mjs agregar <archivo.json>
  ```
  Cada uno: `titulo` corto, `detalle` (por qué, y la nota de donde salió), `area`, `grupo` (el proyecto o
  negocio), `esfuerzo` (`rapido`: un mensaje o una decisión · `medio`: una sentada · `largo`: varias),
  `prioridad` (`semana`, `pronto`, `despues`), `fecha` si tiene día, y `quien` (`yo`, `claude` u `otro`
  con `quien_nombre`).
- **Si en mis notas sale que ya hice algo de la lista, ciérralo tú**, diciendo con qué evidencia:
  ```bash
  node herramientas/pendientes.mjs cerrar <id> "lo dijiste en la nota del 23-oct"
  ```
- La línea `- [ ] ...` al final de la nota también se pone: la nota es el contexto, la lista es lo que
  reviso a diario.

### Salud (opcional — bórralo si no lo quieres)

Si dicto algo de comida, peso o ejercicio, o mando foto de un plato o de la báscula, va a
[[Registro de salud]]: **un día = una sección**, con la hora de cada cosa sacada de la nota. Las calorías
de una foto son **estimación** y se dicen así; el peso se lee por el **promedio de 7 días**. Al final del
resumen, un bloque corto: cómo fue ayer contra mi meta, **un solo consejo sacado de lo que yo sí como**, y
un recordatorio de por qué lo hago. Un empujón, no un sermón.

### Un consejo al final (para sacarle más provecho)

Al terminar cada «procesa las notas», agrega **un solo** consejo corto de la lista de §8 que **todavía no
use** (mira cómo vienen mis notas: si nunca mando fotos, el de fotos; si todo es de trabajo, el de
caminar). Anota en `.second-brain/consejos.md` cuál diste y la fecha, para no repetirlo. Cuando se
acaben, ya no des más.

## 4. Tipos de nota

| Tipo | Qué es | Dónde va |
|---|---|---|
| `note` | Algo que aprendí y vale la pena recordar | `Notes/<Área>/` |
| `idea` | Algo que quiero explorar después | `Ideas/` |
| `project` | Algo que quiero construir o lograr | `Projects/` |
| `draft` | Borrador de contenido | `Content/Drafts/` |

Este cuaderno no es un gestor de tareas: lo que hay que hacer va a la lista de pendientes.

## 5. Voz y estilo

Directo, conversacional, sin adornos. **Palabras prohibidas** salvo que yo las diga: robusto ·
estratégico · transformador · ecosistema · potenciar · apalancar · sinergia · holístico · disruptivo ·
empoderar · "no se trata de X, se trata de Y". Tampoco introducciones que resumen ni cierres
motivacionales. Si una frase mía es simple y funciona, **déjala tal cual**.

## 6. Metadata y nombres

```yaml
---
type: note          # note | idea | project | draft
created: 2026-10-23
topics: [trabajo, procesos]
---
```

El nombre del archivo **es** el título, en español natural (`Lo que aprendí del cliente.md`), sin `/ \ : # ^ | [ ]`.
Un archivo = una idea.

## 7. Preservación

- **Git es el respaldo.** Este cuaderno tiene su propio git: súbelo a un repo **privado**.
- **Nunca sobrescribas una nota**: se agrega al final o se crea otra enlazada.
- **Nunca borres archivos**: van a `Archive/`.
- **Dos commits por cada «procesa las notas»**: lo crudo primero, lo procesado después.

## 8. Consejos (uno por vez, de los que todavía no use)

- **Dicta caminando.** Una caminata de 20 minutos son 4 o 5 notas que salen solas: el cuerpo se mueve y la
  cabeza se ordena. Sale mejor que sentado frente a la pantalla.
- **No pienses en dónde va.** Dicta tres temas en una sola nota; yo los separo.
- **Manda la foto, aunque no escribas nada.** Un plato, un pizarrón, una pantalla: la foto sola ya es una nota.
- **Comenta en la app en vez de explicarme.** Si un pendiente ya lo hiciste o ya no va, escríbelo en su
  comentario; lo leo en la siguiente pasada.
- **Pídeme un resumen de la semana**: «¿qué hice esta semana y en qué me atoré?». Sale de tus notas y tu lista.
- **Pregúntale al cuaderno**: «¿ya había pensado en esto?», «¿cuántas veces he hablado de X?». Busco en
  todo lo que has dictado.
- **Dicta lo que pensaste de una junta en cuanto sales.** Cinco minutos después ya perdiste la mitad.
- **Usa «Hoy no»** en un sugerido que no vas a hacer: no se borra, vuelve mañana.
- **Pídeme ideas de contenido**: «revisa qué contenido puedo sacar de mis notas». Te propongo temas con su
  origen; no escribo nada hasta que me digas.
- **Fija en Inicio lo que no puede esperar.** Un pendiente fijado siempre sale arriba.
