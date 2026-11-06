# MANAGER DE GUIAS DE GITHUB

## ESPAÑOL DE ESPAÑA: USO OBLIGATORIO DE Ñ

- todo texto en castellano debe usar español de españa (`es-ES`) y su ortografia, tambien en titulos y cuerpos de commits, changelogs, pull requests, merges y documentacion
- escribir siempre `ñ` en las palabras que la llevan y `Ñ` cuando corresponda la mayuscula; nunca sustituirlas por `n` o `N`
- la `ñ` es una letra distinta de la `n`; las instrucciones «sin acentos» o «sin tildes» solo afectan a las tildes de las vocales y nunca permiten eliminar la eñe
- ejemplos correctos: `añadir`, `diseño`, `año`, `tamaño`, `contraseña`, `español`, `españa` y `AÑADIDO`; sus formas con `n` son incorrectas cuando se refieren a esas palabras españolas
- conservar literalmente rutas, urls, nombres de archivo, identificadores tecnicos y texto de otros idiomas; esta regla no autoriza renombrarlos ni aplicar sustituciones indiscriminadas
- antes de entregar o publicar texto en castellano, revisar que ninguna palabra haya perdido su `ñ` o `Ñ`; esta regla prevalece sobre cualquier normalizacion a ascii o instruccion generica de eliminar acentos


> punto de entrada para cualquier agente de ia. cuando el usuario pida algo
> relacionado con git o github (commits, pull requests, merges, releases,
> changelog, ramas), este fichero dice como interpretar la peticion, que guias
> abrir, que comprobar, que entregar y que no hacer sin permiso. se lee primero,
> antes que cualquier otra guia. todas las guias que cita (`agent-rules.md`,
> `commit-guide.md`, `pr-merge-guide.md`, `release-guide.md`,
> `changelog-guide.md`, `branching-guide.md` e `index.md`) estan en
> `.docs/-github-guides/`.

---

## 1. PROTOCOLO (SIEMPRE EN ESTE ORDEN)

1. **leer `agent-rules.md`.** manda sobre todo lo demas: sin rastro de ia y confirmacion antes de actuar hacia fuera.
2. **clasificar la peticion** con la tabla de la seccion 2. si encaja en varias, se resuelven en el orden de la seccion 8.
3. **abrir solo las guias que indica la tabla**; no hace falta leer las demas.
4. **mirar el estado real** con los comandos de lectura de la tabla. nunca se redacta de memoria ni a partir de lo que se hizo antes en la conversacion.
5. **redactar** siguiendo literalmente el formato de la guia.
6. **comprobar** con la lista de la seccion 7.
7. **entregar** en el formato de la seccion 6.
8. **actuar** (push, pr, merge, release, borrar) solo si la peticion lo pide de forma expresa (seccion 5).

---

## 2. TABLA DE INTENCIONES

las frases son ejemplos; vale cualquier peticion equivalente en castellano o ingles.

| intencion | frases tipicas | guias | comandos de lectura | entrega |
|---|---|---|---|---|
| texto de commit | "sacame el titulo y la descripcion del commit", "que pongo en el commit" | `commit-guide`, `changelog-guide` | `git status`, `git diff`, `git diff --cached`, `git log -5 --oneline` | titulo, descripcion, fragmento de changelog |
| crear commit | "haz el commit", "commitea esto" | `commit-guide`, `changelog-guide` | los mismos | texto + commit ejecutado |
| actualizar changelog | "actualiza el changelog", "añade esto al changelog" | `changelog-guide` | `git diff`, lectura de `changelog.md` | fragmento aplicado en `## SIN PUBLICAR / UNRELEASED` |
| texto de pr | "titulo y descripcion de la pr", "merge request de x a y" | `pr-merge-guide`, `branching-guide` | `git log <base>..<rama>`, `git diff <base>...<rama> --stat` | titulo y descripcion resumida |
| abrir pr | "haz la pr", "abre la pr" | `pr-merge-guide`, `branching-guide`, `agent-rules` | los de arriba, `gh auth status`, `gh pr list` | texto + pr abierta + enlace |
| texto de merge | "titulo y descripcion para el merge", "para fusionar" | `pr-merge-guide` | `gh pr view <n>` | titulo y descripcion de la pr, sin cambios |
| fusionar | "fusiona la pr", "haz el merge" | `pr-merge-guide`, `agent-rules` | `gh pr view <n>`, `gh pr checks <n>` | `gh pr merge <n> --merge` ejecutado |
| texto de release | "titulo y descripcion de la release" | `release-guide`, `changelog-guide` | lectura del changelog cerrado, `git tag` | titulo, descripcion en ingles, tag |
| publicar release | "publica la release", "crea la release" | `release-guide`, `agent-rules` | `gh release list`, `gh pr view` de la pr de version | tag y release creados |
| cerrar version | "cierra la version", "prepara la 1.5" | `changelog-guide`, `release-guide`, `branching-guide` | lectura del changelog, `package.json` | commit `changelog`, luego pr de version |
| ramas | "a que rama va esto", "nombre de la rama", "borra la rama" | `branching-guide` | `git branch -a`, `git log <origen>..<destino>` | rama base y comandos |
| revisar estado | "esta todo listo para fusionar", "que falta" | `branching-guide`, `pr-merge-guide` | `gh pr view`, `git log`, `git status` | lista de lo que falta |

si la peticion no encaja en ninguna fila, se aplica la guia mas cercana y se dice cual.

---

## 3. DEFAULTS (NO SE PREGUNTA)

para no hacer preguntas innecesarias, estas decisiones ya estan tomadas:

- **idioma de las descripciones:** commits en castellano; pr y merges bilingues (`CASTELLANO` + `ENGLISH`); releases solo en ingles.
- **longitud:** descripciones de pr y merge siempre sintetizadas (limites de `pr-merge-guide.md`, seccion 2). si el usuario pide "resumida" o "muy sintetizada", se usa el limite inferior.
- **tipo de merge:** siempre "create a merge commit".
- **prefijo de commit:** `update` si no hay un motivo claro para otro.
- **rama actual:** la peticion habla de la rama en la que esta el repositorio (`git branch --show-current`) salvo que nombre otra.
- **entrega de texto:** si el usuario pide "titulo y descripcion", solo se entregan los bloques, sin ejecutar nada.

---

## 4. CUANDO SE PREGUNTA

solo se pregunta cuando la respuesta cambia lo que se hace y no hay default:

- la rama base de una pr cuando la rama de origen no encaja en `branching-guide.md` (por ejemplo, una rama `changes/*` sin `main` activa).
- el numero y el resumen de una version nueva que aun no esta en el changelog.
- si hay dos cambios no relacionados en el arbol y no se puede decidir si van en un commit o en dos.

nunca se pregunta por formato, prefijos, idioma, tipo de merge ni por comprobaciones que pueden hacerse con un comando de lectura.

---

## 5. ACCIONES CON PERMISO

el verbo de la peticion decide si se ejecuta algo:

| el usuario pide... | se hace | no se hace |
|---|---|---|
| "titulo y descripcion", "sacame", "dame", "redacta" | solo se entrega el texto | nada de `git commit`, `push`, `gh` |
| "haz el commit" | `git add` por nombre y `git commit` | `git push` |
| "haz la pr" | `git push -u origin <rama>` (si no esta subida) y `gh pr create` | merge |
| "fusiona" | `gh pr merge <n> --merge` | borrar la rama |
| "borra la rama" | borrado local y remoto de **esa** rama | borrar otras |
| "publica la release" | tag y `gh release create` | modificar el changelog |

la autorizacion se mantiene durante toda la tarea solicitada. abrir una pr incluye subir esa rama, pero no autoriza fusionarla ni publicar releases. no volver a pedir permiso para pasos ya solicitados.

---

## 6. FORMATO DE ENTREGA

1. una linea de contexto como maximo: rama origen → rama destino y numero de commits, o el resultado de la accion.
2. un bloque de codigo por pieza, en este orden: titulo, descripcion, fragmento de changelog (solo en commits).
3. despues de los bloques, solo si hace falta: avisos concretos (algo que falta, algo que no cuadra) en una o dos lineas.
4. si se ejecuto una accion, el enlace o el hash resultante.
5. sin atribucion, firmas ni pies de pagina.

ejemplo de entrega: indicar la rama origen y destino, presentar titulo y descripcion en bloques separados y devolver el enlace si se abrio la pr.

---

## 7. LISTA DE COMPROBACION ANTES DE ENTREGAR O EJECUTAR

- [ ] la peticion esta clasificada y se han leido las guias que le tocan.
- [ ] el texto sale del diff, del log y del changelog reales.
- [ ] el titulo cumple el formato (prefijo, `release version`, `v<x.y.z> —`).
- [ ] las descripciones respetan los limites de longitud y la paridad entre idiomas.
- [ ] el changelog esta actualizado y coincide con el texto.
- [ ] todo esta en minusculas y sin acentos (conservando siempre `ñ` y `Ñ`) (titulos aparte) y con backticks en identificadores.
- [ ] no aparece `co-authored-by`, "generated with" ni el nombre de ninguna herramienta de ia.
- [ ] solo se ha ejecutado lo que el usuario pidio de forma expresa.

---

## 8. PETICIONES COMPUESTAS

cuando una peticion junta varias acciones, se ejecutan en este orden y cada una solo si fue pedida:

1. actualizar el changelog.
2. commit.
3. push de la rama.
4. abrir la pr.
5. fusionar la pr.
6. cambiar a la rama destino y traer los cambios (`git checkout <destino>`, `git pull --ff-only`).
7. borrar la rama de trabajo.
8. preparar la siguiente promocion solo si el flujo real del proyecto la requiere y el usuario la ha solicitado.
9. tag y release.

si un paso falla (conflictos, `available local checks` en rojo, pr no fusionable), se detiene la cadena, se explica el motivo y no se intenta saltarlo ni forzarlo.

---

## 9. ERRORES QUE NO SE COMETEN

- redactar un commit cuando el arbol esta limpio.
- entregar la descripcion completa del changelog cuando se pidio la sintetizada.
- usar squash o rebase al fusionar.
- olvidar la paridad castellano / ingles o las categorias en su orden.
- copiar a la release el bloque en castellano; la release es solo en ingles.
- dejar la rama de trabajo viva despues de fusionarla (si el usuario pidio borrarla).
- ejecutar `git push --force`, mover tags o reescribir historial sin orden expresa.
- añadir cualquier linea que delate la intervencion de una ia.
