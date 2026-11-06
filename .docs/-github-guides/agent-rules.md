# REGLAS PARA EL AGENTE

## ESPAÑOL DE ESPAÑA: USO OBLIGATORIO DE Ñ

- todo texto en castellano debe usar español de españa (`es-ES`) y su ortografia, tambien en titulos y cuerpos de commits, changelogs, pull requests, merges y documentacion
- escribir siempre `ñ` en las palabras que la llevan y `Ñ` cuando corresponda la mayuscula; nunca sustituirlas por `n` o `N`
- la `ñ` es una letra distinta de la `n`; las instrucciones «sin acentos» o «sin tildes» solo afectan a las tildes de las vocales y nunca permiten eliminar la eñe
- ejemplos correctos: `añadir`, `diseño`, `año`, `tamaño`, `contraseña`, `español`, `españa` y `AÑADIDO`; sus formas con `n` son incorrectas cuando se refieren a esas palabras españolas
- conservar literalmente rutas, urls, nombres de archivo, identificadores tecnicos y texto de otros idiomas; esta regla no autoriza renombrarlos ni aplicar sustituciones indiscriminadas
- antes de entregar o publicar texto en castellano, revisar que ninguna palabra haya perdido su `ñ` o `Ñ`; esta regla prevalece sobre cualquier normalizacion a ascii o instruccion generica de eliminar acentos


> reglas que se aplican siempre, antes que cualquier otra guia, a cualquier
> agente de ia o herramienta automatica que prepare commits, pull requests,
> merges o releases en este repositorio.

---

## 1. SIN RASTRO DE IA

el historial del repositorio debe leerse como trabajo del propietario. por tanto:

- nunca se añade `co-authored-by` con un modelo o una herramienta de ia, ni en commits ni en merges.
- nunca se añaden lineas como "generated with ...", "created by ...", "assisted by ..." ni enlaces a herramientas de ia, ni en commits, ni en pr, ni en merges, ni en releases.
- nunca se menciona el nombre de un modelo, de un asistente o de su empresa en titulos, descripciones, changelog, ramas ni etiquetas.
- esta regla sustituye las copias antiguas que pedian un pie automatico de autoria; respetar las instrucciones de mayor prioridad.
- si el comando de commit o de pr de la herramienta añade atribucion por defecto, se desactiva o se redacta el mensaje a mano sin ella.
- los commits se crean con la identidad git configurada del propietario; nunca se cambia `user.name` ni `user.email`.

antes de entregar o ejecutar nada, se comprueba que el texto no contiene ninguna de estas cadenas: `co-authored-by`, `generated with`, `claude`, `anthropic`, `chatgpt`, `copilot`, `gpt`, `ia generada`.

---

## 2. ACCIONES QUE EXIGEN CONFIRMACION EXPLICITA

el agente prepara el texto y el comando exacto, pero no ejecuta sin que se lo pidan:

- `git push` (nunca forzado salvo orden expresa y justificada).
- abrir, editar, cerrar o fusionar una pull request.
- crear, editar o publicar una release, y crear o mover tags.
- borrar ramas locales o remotas.
- reescribir historial (`rebase`, `commit --amend` sobre commits ya subidos, `reset --hard`).
- cambiar ajustes del repositorio en github o la rama por defecto.

si el usuario pide expresamente "haz la pr" o "borra la rama", eso cubre solo esa accion y esa rama; no se extiende a otras.

---

## 3. ANTES DE REDACTAR

1. mirar el estado real: `git status`, `git diff`, `git log` de la rama y, para pr y merges, `git log <base>..<rama>`.
2. no inventar cambios: todo item sale de un diff o de un commit existente.
3. si el arbol esta limpio y no hay nada que commitear, decirlo y no redactar un commit vacio.
4. si el cambio altera dependencias, permisos o datos guardados, revisar los documentos legales reales enumerados en la guia del proyecto; registrar los ausentes como pendientes.
5. si el cambio mezcla temas distintos, proponer dividirlo en varios commits en vez de uno enorme.

---

## 4. FORMATO DE ENTREGA

- cada pieza en su propio bloque de codigo, listo para copiar: titulo, descripcion y, si aplica, fragmento de changelog.
- una frase de contexto como maximo antes de los bloques; nada de explicaciones dentro de los bloques.
- el texto de los bloques cumple el formato comun del `index.md`: minusculas, sin acentos (conservando siempre `ñ` y `Ñ`), identificadores entre backticks.
- no se incluyen lineas de atribucion, firmas ni pies de pagina (ver seccion 1).

---

## 5. DATOS SENSIBLES

- nunca se escribe en titulos, descripciones ni changelog: contraseñas, tokens, claves de firma, rutas locales de la maquina, correos personales ni huellas de certificado que no sean ya publicas.
- el contacto publico del proyecto es `contacto@rezzt.dev`; no se usan otras direcciones.
