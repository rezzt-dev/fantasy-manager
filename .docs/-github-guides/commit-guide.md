# GUIA DE COMMITS

## ESPAÑOL DE ESPAÑA: USO OBLIGATORIO DE Ñ

- todo texto en castellano debe usar español de españa (`es-ES`) y su ortografia, tambien en titulos y cuerpos de commits, changelogs, pull requests, merges y documentacion
- escribir siempre `ñ` en las palabras que la llevan y `Ñ` cuando corresponda la mayuscula; nunca sustituirlas por `n` o `N`
- la `ñ` es una letra distinta de la `n`; las instrucciones «sin acentos» o «sin tildes» solo afectan a las tildes de las vocales y nunca permiten eliminar la eñe
- ejemplos correctos: `añadir`, `diseño`, `año`, `tamaño`, `contraseña`, `español`, `españa` y `AÑADIDO`; sus formas con `n` son incorrectas cuando se refieren a esas palabras españolas
- conservar literalmente rutas, urls, nombres de archivo, identificadores tecnicos y texto de otros idiomas; esta regla no autoriza renombrarlos ni aplicar sustituciones indiscriminadas
- antes de entregar o publicar texto en castellano, revisar que ninguna palabra haya perdido su `ñ` o `Ñ`; esta regla prevalece sobre cualquier normalizacion a ascii o instruccion generica de eliminar acentos


> como redactar el titulo y la descripcion de un commit. se aplica siempre que
> se pida algo equivalente a "sacame el titulo y la descripcion del commit con
> los cambios desde el ultimo commit" y cada vez que se vaya a crear un commit.
> lee antes `agent-rules.md`: el commit no lleva ningun rastro de ia.

---

## 1. TITULO

```
<prefijo> | <resumen corto en imperativo>
```

- separador fijo: espacio, barra vertical, espacio.
- maximo 72 caracteres; sin punto final; todo en minusculas y sin acentos (conservando siempre `ñ` y `Ñ`).
- el resumen describe el conjunto del commit, no un fichero concreto.

### prefijos (cerrados, no se inventan otros)

| prefijo | cuando usarlo |
|---|---|
| `update` | trabajo normal hacia adelante: añade o mejora funcionalidad, contenido o documentacion. es el prefijo por defecto |
| `fix` | corrige un error detectado durante el desarrollo, sin urgencia de publicacion |
| `hotfix` | corrige algo urgente que afecta a una version ya publicada o bloquea el trabajo |
| `changes` | cambios estructurales o no funcionales: mover o renombrar ficheros, configuracion, tooling, dependencias |
| `changelog` | el unico proposito del commit es editar `changelog.md` |

si un commit mezcla un fix y una mejora, se divide en dos. si no es posible, gana el prefijo del cambio principal.

### ejemplos

```
update | completar la documentacion del proyecto
fix | corregir una referencia rota en la documentacion
hotfix | corregir un fallo critico de la version publicada
changes | reorganizar la documentacion del proyecto
changelog | cerrar la seccion de la version 1.4.0
```

---

## 2. DESCRIPCION

- lista de markdown no numerada: cada item empieza por `-`; nunca parrafos sueltos ni listas numeradas.
- cada item es una sola linea continua en imperativo, sin saltos internos y sin lineas en blanco entre items.
- explica el que y el por que, no el detalle linea a linea.
- entre 2 y 6 items; si hacen falta mas, el commit es demasiado grande.
- ficheros, rutas, comandos e identificadores siempre entre backticks.
- no termina con ninguna linea de atribucion, firma ni `co-authored-by` (ver `agent-rules.md`).

ejemplo:

```text
- adaptar las guias de gestion a las rutas y ramas del proyecto
- conservar las convenciones tecnicas y retirar instrucciones duplicadas
```

---

## 3. CHANGELOG

todo commit con cambios visibles para usuarios o desarrolladores actualiza `changelog.md` en el mismo commit, dentro de `## SIN PUBLICAR / UNRELEASED`, en castellano e ingles. las reglas estan en `changelog-guide.md`. solo se exceptuan los commits `changelog` (que ya son el cambio) y los que no tocan nada publicable (por ejemplo, ajustes de `.gitignore` locales).

---

## 4. COMO SE ENTREGA

tres bloques separados, en este orden:

1. titulo del commit.
2. descripcion del commit.
3. fragmento de changelog que se añade (bloque `### CASTELLANO` y bloque `### ENGLISH`, solo con los items nuevos).

nunca se juntan el titulo y la descripcion en el mismo bloque.

---

## 5. COMANDO

si se pide crear el commit, se usa un archivo temporal o dos `-m` (titulo y descripcion), sin plantillas ni pies automaticos:

```
git add <ficheros>
git commit -m "<titulo>" -m "<descripcion>"
```

se añaden los ficheros por nombre, nunca `git add -A` a ciegas; se comprueba antes con `git status` que no entran ficheros ignorados, claves ni artefactos de compilacion.

---

## 6. LISTA DE COMPROBACION

- [ ] el prefijo es uno de los cinco.
- [ ] el titulo cabe en 72 caracteres y esta en imperativo.
- [ ] cada item ocupa una sola linea y empieza por `-`.
- [ ] el changelog esta actualizado en los dos idiomas.
- [ ] no hay atribucion de ia ni `co-authored-by`.
