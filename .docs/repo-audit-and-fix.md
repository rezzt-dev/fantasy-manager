# FANTASY-MANAGER: AUDITORIA Y CORRECCION DEL REPOSITORIO

## ESPAÑOL DE ESPAÑA: USO OBLIGATORIO DE Ñ

- todo texto en castellano debe usar español de españa (`es-ES`) y su ortografia, tambien en titulos y cuerpos de commits, changelogs, pull requests, merges y documentacion
- escribir siempre `ñ` en las palabras que la llevan y `Ñ` cuando corresponda la mayuscula; nunca sustituirlas por `n` o `N`
- la `ñ` es una letra distinta de la `n`; las instrucciones «sin acentos» o «sin tildes» solo afectan a las tildes de las vocales y nunca permiten eliminar la eñe
- ejemplos correctos: `añadir`, `diseño`, `año`, `tamaño`, `contraseña`, `español`, `españa` y `AÑADIDO`; sus formas con `n` son incorrectas cuando se refieren a esas palabras españolas
- conservar literalmente rutas, urls, nombres de archivo, identificadores tecnicos y texto de otros idiomas; esta regla no autoriza renombrarlos ni aplicar sustituciones indiscriminadas
- antes de entregar o publicar texto en castellano, revisar que ninguna palabra haya perdido su `ñ` o `Ñ`; esta regla prevalece sobre cualquier normalizacion a ascii o instruccion generica de eliminar acentos


procedimiento versionado para auditar este proyecto. este documento prepara una tarea futura; no declara que sus fases ya se hayan ejecutado. alcance: documentacion, higiene y gestion; las decisiones legales, publicaciones y cambios de producto se acuerdan segun la peticion.

## 0. PROMPT DE LANZAMIENTO

```text
Lee las instrucciones raiz y .docs/manager.md. Audita este repositorio
contra su codigo y el estado actual de GitHub. Conserva los cambios previos.
Empieza por una fase de lectura y registra evidencia por hallazgo.
Corrige solo lo autorizado. Agrupa las decisiones que no puedas verificar.
No inventes versiones, licencias, cifras ni resultados de pruebas.
No publiques, fusiones ni cambies ajustes por el mero hecho de leer este plan.
Entrega archivos, comprobaciones, pendientes y comandos propuestos.
```

## 1. CONTEXTO VERIFICADO A 2026-11-06

| tema | evidencia de partida |
| --- | --- |
| repositorio | `rezzt-dev/fantasy-manager`, publico; consulta de la api de github |
| producto | fantasy football dashboard with recommendations, external data sources and a browser extension |
| fuente activa | `./`, inventario local |
| rama por defecto | `main`, api de github |
| base de esta tarea | `main`, rama de desarrollo comprobada |
| ramas remotas | `gui-rework`, `main`, `vercel-app` |
| version en codigo | `package.json`: `0.0.1` |
| releases recientes | no published releases returned |
| integracion continua | no tracked github actions workflows |
| documentos legales y comunidad | `LICENSE.md` |
| changelog | `changelog.md`; conservar el historial publicado |

hallazgos concretos para contrastar:

- no se ha ejecutado una auditoria funcional completa; las comprobaciones siguientes deben producir evidencia nueva

no abrir ni imprimir valores de `.env`, `local.properties`, almacenes de claves o bases de datos privadas. enumerar rutas y usos cuando sea necesario, sin copiar contenido sensible.

## 2. FASES

### FASE 1: AUDITORIA DE LECTURA

1. revisar `git status`, diferencias sin y con staging, ramas y ultimos commits
2. verificar el contexto de esta tabla contra los manifiestos y workflows actuales
3. consultar ramas, releases y metadatos con comandos de lectura de github
4. clasificar cada hallazgo como confirmado, refutado o pendiente, con ruta o comando
5. separar problemas de documentacion de cambios de codigo o decisiones del propietario

### FASE 2: HIGIENE

revisar artefactos, dependencias instaladas, archivos del ide y patrones de exclusion. conservar `.docs/manager.md`, `.docs/-github-guides/` y este procedimiento versionados. no copiar skills ni recursos internos de otro proyecto. revisar licencias de material de terceros sin purgar ni reescribir historial.

### FASE 3: CONTEXTO TECNICO

contrastar `AGENTS.md` y `CLAUDE.md` con la estructura y los comandos reales. preservar estas decisiones: keep authentication tokens and runtime data private; preserve provider fallbacks and extension login contracts; distinguish predictions from facts. documentar los limites de lo implementado y las dependencias de entorno. no instalar ni ejecutar tareas que modifiquen datos reales para descubrir como funcionan.

### FASE 4: DOCUMENTACION Y COMUNIDAD

comprobar readme, contribucion, seguridad y enlaces relativos. registrar archivos ausentes y proponer contenido dentro del alcance autorizado. mantener paridad castellano/ingles cuando el proyecto la use. revisar la licencia existente sin cambiar sus condiciones ni inventar identidad juridica. verificar privacidad contra permisos, almacenamiento y servicios reales.

### FASE 5: VERIFICACION

para documentos, ejecutar `git diff --check`, resolver enlaces locales y revisar referencias retiradas. para codigo, usar los comandos de `AGENTS.md` desde su directorio indicado. pruebas con datos temporales; no ejecutar descargas, escaneos, suscripciones, entrenamiento o acciones de git contra recursos reales como prueba de documentacion.

### FASE 6: VERSION Y RELEASE

solo preparar una release cuando se haya pedido: contrastar version, changelog, commit, artefactos y comprobaciones. no subir versiones por editar guias. conservar tags publicados y enlaces existentes. documentar el impacto de cualquier cambio de nombre o destino antes de actuar.

### FASE 7: METADATOS DE GITHUB

revisar descripcion, homepage, topics, seguridad y proteccion de ramas. proponer cambios con su motivo; aplicarlos solo si la peticion los autoriza. no cambiar visibilidad, rama por defecto ni reglas de acceso como parte implicita de una auditoria documental.

## 3. DECISIONES QUE REQUIEREN CONTEXTO DEL PROPIETARIO

| decision | tratamiento |
| --- | --- |
| alcance funcional que no se deduce del codigo | `TODO(owner)` con la evidencia que falta |
| nueva politica de versionado o publicacion | conservar la politica vigente hasta acordarla |
| derechos, titularidad y clausulas legales | conservar el texto existente; proponer revision |
| base de una pr sin relacion verificable | preguntar una vez con alternativas concretas |
| acceso a datos o servicios reales para pruebas | preparar fixtures; solicitar datos solo si son imprescindibles |

no repetir preguntas sobre acciones ya autorizadas durante la misma tarea. no interpretar la falta de respuesta como aprobacion de una accion requerida.

## 4. REGLAS DE ESTILO

seguir el estilo markdown local y las convenciones tecnicas existentes. rutas, comandos e identificadores permanecen literales entre backticks. los mensajes de git siguen las guias; no llevan atribucion automatica. las traducciones conservan hechos, cifras y alcance. no presentar planes como capacidades implementadas.

## 5. COMPROBACIONES Y EVIDENCIA

```bash
git status --short
git diff --check
git diff --cached --check
git diff --stat
git log -5 --oneline
```

registrar las rutas validadas, comandos adicionales ejecutados y resultados. comprobar que el staging solo contiene los archivos de la tarea. si falta una herramienta o una comprobacion falla, indicarlo sin declarar una validacion completa.

## 6. PLAN DE COMMITS

1. documentacion de contexto y gestion: `changes | completar las guias de gestion del repositorio`
2. higiene o comunidad: commits separados solo si esos cambios fueron solicitados
3. correcciones funcionales: commits con pruebas del comportamiento afectado
4. cierre de version: commit `changelog` solo cuando proceda publicar

cuerpos de 2 a 6 bullets, una linea por item, sin firmas ni atribuciones. no incluir cambios locales del propietario. no reescribir los commits recuperados de trabajo anterior.

## 7. DEFINICION DE HECHO

- [ ] cada hallazgo tiene evidencia y estado
- [ ] las guias citan rutas, ramas y comandos de este proyecto
- [ ] las instrucciones raiz conservan las convenciones utiles
- [ ] el changelog refleja solo cambios realizados y mantiene paridad
- [ ] enlaces y diferencias comprobados; fallos y limites registrados
- [ ] no hay datos privados ni artefactos ajenos en el staging
- [ ] las acciones externas realizadas estan autorizadas
- [ ] no se confunde preparar este procedimiento con ejecutar la auditoria

## 8. INFORME FINAL

entregar una tabla de hallazgos y estado, archivos modificados, comprobaciones ejecutadas, pendientes `TODO(owner)` y acciones realizadas. incluir hashes y enlaces de pr cuando existan; para acciones no solicitadas, entregar propuestas concretas sin ejecutarlas.
