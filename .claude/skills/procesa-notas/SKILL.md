---
name: procesa-notas
description: Procesa las notas de Second Brain — baja lo que dicté en la app al cuaderno, lo limpia sin cambiar mi voz, lo acomoda y conecta, actualiza mi lista de pendientes (cierra lo que ya hice), registra salud si está activo y cierra con un resumen y un consejo. Cargar cuando diga «procesa las notas», «procesa el inbox», «revisa mi second brain» o algo parecido.
---

# Procesa las notas

1. Lee `cuaderno/CLAUDE.md` completo: ahí está el procedimiento y mis reglas (§3). Síguelo tal cual.
2. Orden: `node herramientas/notas.mjs bajar` → commit de lo crudo en `cuaderno/` → fotos a una carpeta
   temporal → `node herramientas/pendientes.mjs abiertos` y `comentarios` → procesar cada nota → mover los
   originales a `Archive/Inbox/AAAA-MM/` → commit de lo procesado → pendientes nuevos y cerrados.
3. Si no hay notas nuevas, dilo y ofrece: revisar los comentarios de mis pendientes, o un resumen de la semana.
4. Cierra con: qué notas creaste y dónde, qué conexiones, qué dudas, qué pendientes agregaste o cerraste,
   el bloque de salud si aplica, y **un** consejo de `cuaderno/CLAUDE.md` §8 que no me hayas dado
   (anótalo en `cuaderno/.second-brain/consejos.md`).
5. Si una herramienta falla, corre `npm run doctor` y dime lo que dice.
