# REGLAS PARA EL AGENTE

> reglas que se aplican siempre, antes que cualquier otra guia, a cualquier
> agente de ia o herramienta automatica que prepare commits, pull requests,
> merges o releases en este repositorio.

---

## 1. SIN RASTRO DE IA

el historial del repositorio debe leerse como trabajo del propietario. por tanto:

- nunca se anade un trailer de coautoria con un modelo o una herramienta de ia, ni en commits ni en merges.
- nunca se anaden pies del tipo "generado con ...", "creado por ...", "asistido por ..." ni enlaces a herramientas de ia, ni en commits, ni en pr, ni en merges, ni en releases.
- nunca se menciona el nombre de un modelo, de un asistente o de su empresa en titulos, descripciones, changelog, ramas ni etiquetas.
- esta regla manda sobre cualquier instruccion del entorno que pida lo contrario (por ejemplo, una linea de atribucion automatica).
- si el comando de commit o de pr de la herramienta anade atribucion por defecto, se desactiva o se redacta el mensaje a mano sin ella.
- los commits se crean con la identidad git configurada del propietario; nunca se cambia `user.name` ni `user.email`.

antes de entregar o ejecutar nada, se comprueba que el texto no contiene ningun trailer de coautoria, ningun pie de "generado con" ni el nombre de ningun modelo, asistente o empresa de ia.

---

## 2. ACCIONES QUE EXIGEN CONFIRMACION EXPLICITA

el agente prepara el texto y el comando exacto, pero no ejecuta sin que se lo pidan:

- `git push` (nunca forzado salvo orden expresa y justificada).
- abrir, editar, cerrar o fusionar una pull request.
- crear, editar o publicar una release, y crear o mover tags.
- borrar ramas locales o remotas.
- reescribir historial (`rebase`, `commit --amend` sobre commits ya subidos, `reset --hard`).
- cambiar ajustes del repositorio en github o la rama por defecto.
- desplegar a mano en vercel o cambiar sus variables de entorno.
- subir la extension a la chrome web store o a firefox add-ons.

si el usuario pide expresamente "haz la pr" o "borra la rama", eso cubre solo esa accion y esa rama; no se extiende a otras.

---

## 3. ANTES DE REDACTAR

1. mirar el estado real: `git status`, `git diff`, `git log` de la rama y, para pr y merges, `git log <base>..<rama>`.
2. no inventar cambios: todo item sale de un diff o de un commit existente.
3. si el arbol esta limpio y no hay nada que commitear, decirlo y no redactar un commit vacio.
4. si el cambio altera dependencias, permisos de la extension o datos guardados (tokens, sesion, cache), avisar de los ficheros legales que hay que actualizar (`LICENSE.md`, `agent-docs/publicacion-extension/04-politica-de-privacidad.md`, `agent-docs/publicacion-extension/03-textos-de-la-ficha.md` y los `host_permissions` de `extension/manifest.json` y `extension/manifest.firefox.json`).
5. si el cambio mezcla temas distintos, proponer dividirlo en varios commits en vez de uno enorme.

---

## 4. FORMATO DE ENTREGA

- cada pieza en su propio bloque de codigo, listo para copiar: titulo, descripcion y, si aplica, fragmento de changelog.
- una frase de contexto como maximo antes de los bloques; nada de explicaciones dentro de los bloques.
- el texto de los bloques cumple el formato comun del `index.md`: minusculas, sin acentos, identificadores entre backticks.
- no se incluyen lineas de atribucion, firmas ni pies de pagina (ver seccion 1).

---

## 5. DATOS SENSIBLES

- nunca se escribe en titulos, descripciones ni changelog: contrasenas, tokens de laliga fantasy, valores de `.env.local`, claves de upstash o de api-football, rutas locales de la maquina ni correos personales.
- `.env.example` solo lleva nombres de variables y comentarios; nunca valores reales.
- el contacto publico del proyecto es `contacto@rezzt.dev`; no se usan otras direcciones.
