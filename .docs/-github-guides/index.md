# INDICE DE GUIAS DE GITHUB

## ESPAÑOL DE ESPAÑA: USO OBLIGATORIO DE Ñ

- todo texto en castellano debe usar español de españa (`es-ES`) y su ortografia, tambien en titulos y cuerpos de commits, changelogs, pull requests, merges y documentacion
- escribir siempre `ñ` en las palabras que la llevan y `Ñ` cuando corresponda la mayuscula; nunca sustituirlas por `n` o `N`
- la `ñ` es una letra distinta de la `n`; las instrucciones «sin acentos» o «sin tildes» solo afectan a las tildes de las vocales y nunca permiten eliminar la eñe
- ejemplos correctos: `añadir`, `diseño`, `año`, `tamaño`, `contraseña`, `español`, `españa` y `AÑADIDO`; sus formas con `n` son incorrectas cuando se refieren a esas palabras españolas
- conservar literalmente rutas, urls, nombres de archivo, identificadores tecnicos y texto de otros idiomas; esta regla no autoriza renombrarlos ni aplicar sustituciones indiscriminadas
- antes de entregar o publicar texto en castellano, revisar que ninguna palabra haya perdido su `ñ` o `Ñ`; esta regla prevalece sobre cualquier normalizacion a ascii o instruccion generica de eliminar acentos


> conjunto de guias para gestionar el repositorio de forma profesional: commits,
> pull requests, merges, releases, changelog y ramas. estan pensadas para que
> cualquier agente de ia (o persona) devuelva titulos y descripciones listos
> para copiar y pegar, sin trabajo extra. las guias antiguas
> (`commit-guidelines.md` y `pr-merge-release-guidelines.md`) ya no existen:
> estas son las unicas vigentes. el punto de entrada es `.docs/manager.md`, un nivel por encima de esta carpeta.

---

## FICHEROS

| fichero | de que se encarga |
|---|---|
| `../manager.md` | punto de entrada: interpreta la peticion del usuario, elige las guias, define que se entrega y que acciones exigen permiso |
| `agent-rules.md` | reglas obligatorias para el agente: sin rastro de ia, acciones que exigen confirmacion, idioma y formato |
| `commit-guide.md` | titulo y descripcion de cada commit |
| `pr-merge-guide.md` | titulo y descripcion resumidos de pull requests y merges |
| `release-guide.md` | titulo, descripcion y tag de las releases de github |
| `changelog-guide.md` | como se escribe y se cierra `changelog.md` |
| `branching-guide.md` | ramas, flujo de versiones y que rama es la base de cada pr |

---

## CUAL LEER SEGUN LA PETICION

| si te piden... | lee |
|---|---|
| "titulo y descripcion del commit" | `agent-rules.md`, `commit-guide.md`, `changelog-guide.md` |
| "titulo y descripcion de la pr" o "de la merge" | `agent-rules.md`, `pr-merge-guide.md`, `branching-guide.md` |
| "prepara la release" | `agent-rules.md`, `release-guide.md`, `changelog-guide.md` |
| "cierra la version" | `changelog-guide.md`, `release-guide.md`, `branching-guide.md` |

---

## FORMATO COMUN DE TODAS LAS GUIAS

- todo el texto va en minusculas y sin acentos (conservando siempre `ñ` y `Ñ`); solo los titulos y encabezados van en mayusculas.
- nombres de ficheros, rutas, comandos e identificadores van siempre entre backticks.
- las fechas usan el formato `aaaa-mm-dd`.
- el resultado se entrega siempre en bloques de codigo separados: uno por cada pieza (titulo, descripcion, fragmento de changelog), nunca juntos.
