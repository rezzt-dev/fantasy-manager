# Fantasy Manager — auditoría y corrección completa del repositorio

> fichero de trabajo para un agente de ia que opera en el clon local del asistente web de
> LALIGA FANTASY (`fantasy-manager/`: astro + react en la raíz, extensión del navegador en
> `extension/`). contiene todo lo necesario para auditar y corregir documentación, aspectos
> legales, higiene del repositorio y release en una sola pasada. `.docs/` se versiona en este
> repositorio, igual que este fichero.
>
> cómo usarlo: abre el agente en la raíz de este repositorio y escribe
> `lee .docs/repo-audit-and-fix.md y ejecútalo de principio a fin`.

---

## 0. PROMPT DE LANZAMIENTO

```text
Eres el agente responsable de dejar el repositorio Fantasy Manager (asistente web no oficial de
LALIGA FANTASY, astro + react desplegado en vercel, con una extensión de navegador para el login)
profesional, completo y consistente, en inglés y castellano.
Sigue este documento fase por fase, en orden. No es asesoría legal: todo texto legal que redactes
se marca para revisión de un abogado.

Reglas de ejecución:
1. Fase 1 es de solo lectura. Al terminarla, haz TODAS las preguntas de la sección 3 en una sola
   interacción (agrupadas) y espera. No preguntes nada más después, salvo bloqueo real.
   Lo que no se responda se resuelve con el valor "por defecto" de la sección 3 y se anota como
   TODO(owner) en el informe final.
2. Lee antes `CLAUDE.md`, `AGENTS.md`, `.docs/manager.md` y las guías de `.docs/-github-guides/`.
   Son la fuente de verdad: si contradicen este documento, gana el repositorio y lo indicas en el
   informe.
3. Nunca ejecutes sin confirmación expresa: push (menos aún forzado), reescritura de historial,
   mover o borrar tags, crear/editar/publicar releases, cambiar ajustes del repo en GitHub,
   cambiar la rama por defecto, desplegar o tocar variables en Vercel, subir la extensión a las
   tiendas. Prepara el comando exacto y lístalo en el informe final.
4. Verifica toda afirmación contra el código y contra GitHub (`gh`). No inventes datos legales,
   técnicos, cifras ni capturas. Si falta un dato: `TODO(owner): <qué falta>`.
5. No leas, copies ni pegues valores de `.env*`, tokens ni credenciales: solo indica dónde están.
6. Trabaja en una rama nueva `changes/repo-audit-and-fix` creada desde `main`.
   Commits pequeños y temáticos según la sección 6. Sin push ni PR hasta que yo lo apruebe.
7. Todo documento nuevo o modificado debe existir en inglés y en castellano con paridad exacta.
8. Termina con el informe de la sección 8.
```

---

## 1. CONTEXTO VERIFICADO (a 2026-11-06)

hechos comprobados con `git` y `gh`. el agente debe **re-verificarlos**, no darlos por buenos.

| tema | hallazgo |
|---|---|
| repositorio | `https://github.com/rezzt-dev/fantasy-manager` (público, no es fork). rama por defecto `main`. |
| descripción y homepage | descripción en inglés y en minúsculas ("an unofficial LALIGA FANTASY web assistant built with astro and react…"). homepage `https://fantasy-manager-mauve.vercel.app`. sin topics. |
| ramas | `main`, `gui-rework` y `vercel-app`. las dos últimas ya están fusionadas en `main` (PR #1 y PR #2, con merge commit) y siguen vivas en el remoto. |
| tags / releases | ninguno. |
| versión | `package.json` `version` `0.0.1` (nunca se ha subido). la extensión declara `1.0.0` en `extension/manifest.json` y `extension/manifest.firefox.json`. el commit inicial se titula "v1.0-beta". |
| licencia | `LICENSE.md`: licencia de uso no comercial bilingüe (castellano + inglés), © 2026 Juan García Cazallas ("rezzt-dev"), ley española, contacto `contacto@rezzt.dev`. GitHub la detecta como `Other`. `package.json` dice `"license": "SEE LICENSE IN LICENSE.md"`. |
| ficheros de comunidad | salud de comunidad 42 %: solo `README.md` (solo castellano) y `LICENSE.md`. no hay `SECURITY`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SUPPORT` ni plantillas de issue/PR. |
| changelog | no existía. se crea `changelog.md` en la raíz con `## SIN PUBLICAR / UNRELEASED` (rama `changes/repo-management-guides`). |
| ci | no hay `.github/`: ni workflows, ni dependabot, ni renovate. las comprobaciones son locales (`tsc`, `test:unit`, `build`, `verify:deploy`, `test:e2e`). |
| **posibles secretos versionados** | `agent-docs/useful-docs/web-session-token.txt` (una sola línea de 282 caracteres con forma de token) y `agent-docs/useful-docs/credentials.md` (contiene dos cadenas con forma de JWT), versionados desde el commit inicial `672b9e22` en un repo **público**. no se han leído sus valores. hay que comprobar si son reales, revocarlos/rotarlos y decidir si se purga el historial. |
| `.gitignore` incoherente | ignora `agent-docs/` y `data/`, pero hay 208 ficheros de `agent-docs/` y 17 de `data/` versionados (de antes de la regla; `git ls-files -ci --exclude-standard` lista 225). `data/` es la semilla de solo lectura que usa `src/lib/runtime-paths.ts`; `agent-docs/` incluye notas internas y documentación que el README enlaza. |
| material de terceros | `agent-docs/gui-skills/` versiona 172 ficheros de skills de terceros, con fuentes `.ttf` (licencias OFL) y `ui-styling/LICENSE.txt`. revisar licencias y atribución; no se propone purga. |
| artefactos versionados | `e2e/tmp-*.spec.ts`, `e2e/tmp-mobile-check.mjs`, `e2e/tmp-*.png`, 27 capturas en `e2e/responsive/` y capturas de `agent-docs/browser-automation/`. la regla `e2e/tmp-*/` del `.gitignore` solo cubre carpetas. |
| documentación de agentes | `AGENTS.md` existía (castellano); se reescribe en inglés sin perder reglas y se crea `CLAUDE.md`. citaba `agent-docs/coordinacion-champions.md`, que no existe en el repo. |
| privacidad | la extensión pide `host_permissions` sobre `login.laliga.es`, `localhost:4321`, `127.0.0.1:4321` y el dominio de vercel; guarda tokens en `chrome.storage.session`. la web guarda la sesión en upstash o en disco. la política de privacidad de la extensión solo existe como borrador en `agent-docs/publicacion-extension/04-politica-de-privacidad.md`. |
| enlaces externos que dependen del repo | homepage de vercel; el dominio de vercel está cableado en `extension/manifest*.json` (`host_permissions`, `content_scripts.matches`) y en `ALLOWED_APP_ORIGINS` de `extension/src/config.js`. `TODO(owner)`: confirmar si la extensión está publicada en las tiendas y con qué URL. |
| marca de terceros | el proyecto usa los nombres LALIGA y LALIGA FANTASY y la API no oficial; el README ya incluye un aviso de no afiliación (solo en castellano). |

---

## 2. FASES

### Fase 1 — auditoría (solo lectura)

1. `git fetch --all --tags`; revisa `git log --oneline --graph --decorate --all -n 40` y confirma que `gui-rework` y `vercel-app` no tienen commits fuera de `main` (`git log main..origin/<rama>`).
2. Comprueba los posibles secretos sin imprimir su valor: `git log --all --format='%h %ad' --date=short -- agent-docs/useful-docs/`, `git grep -nIcE 'eyJ[A-Za-z0-9_-]{10,}'`, y si hay `gitleaks` disponible, `gitleaks detect --no-banner --redact`.
3. Inventario real: dependencias de `package.json` y `pnpm-lock.yaml`, fuentes (Archivo, Inter y JetBrains Mono se cargan desde Google Fonts en `src/styles/global.css`: afecta a privacidad), iconos (`lucide-react`), animación lottie de `public/lottie/`, permisos de `extension/manifest*.json`, datos que se guardan (sesión, tokens, cachés en upstash y `data/`).
4. Estado de `README.md` y de `agent-docs/useful-docs/` frente al código (endpoints de `src/pages/api/`, variables de entorno de `.env.example`, scripts de `package.json`).
5. Busca datos personales y rutas locales (`git grep -nIE '/home/|@gmail|@hotmail'`) y ficheros ignorados que siguen versionados (`git ls-files -ci --exclude-standard`).
6. Entrega el informe de hallazgos (confirmados / refutados / nuevos) y pasa a la sección 3.

### Fase 2 — higiene del repositorio

- Secretos: si el token o los JWT son reales, **proponer** (sin ejecutar) revocarlos y purgar los dos ficheros del historial con `git filter-repo`, indicando el impacto (reescritura de historial, forks y clones). Como mínimo, `git rm --cached` y redactar `credentials.md` sin valores.
- `.gitignore`: decidir qué parte de `agent-docs/` y de `data/` se versiona de verdad y alinear la regla con lo que hay (por ejemplo, excepciones `!agent-docs/useful-docs/` o mover la documentación pública a otra carpeta). añadir `e2e/tmp-*` como patrón de ficheros.
- `git rm --cached` de los `e2e/tmp-*` y capturas temporales que no sean referencia de pruebas.
- Ramas: proponer el borrado remoto de `gui-rework` y `vercel-app` (ya fusionadas).
- Asegurar que `CLAUDE.md`/`AGENTS.md` siguen llevando el digest de guidelines.

### Fase 3 — documentos legales (EN + ES, cada uno con paridad)

formato bilingüe: `LICENSE.md` ya es un único fichero con castellano e inglés. para el resto de ficheros raíz, elige un único fichero bilingüe o `X.md` + `X.es.md` enlazados, justifícalo en una línea y aplícalo a todos.

| fichero | contenido mínimo |
|---|---|
| `LICENSE.md` | revisar paridad entre las dos versiones y cláusula de prevalencia (preguntar). aclarar que **no** es una licencia de código abierto aprobada por la OSI. valorar si GitHub la detecta mejor con otro nombre (`LICENSE`). |
| `NOTICE` y `THIRD_PARTY_LICENSES.md` | dependencias de `package.json` con su licencia, fuentes, iconos lucide (ISC), animaciones lottie y material de `agent-docs/gui-skills/` si se sigue versionando. |
| `PRIVACY.md` | qué datos trata la web (token de LALIGA FANTASY, sesión en upstash o disco, cachés), qué guarda la extensión y durante cuánto tiempo, terceros a los que se llama (Google Fonts, LALIGA, sofascore, clubelo, jornadaperfecta, futbolfantasy, api-football, rss), derechos RGPD, contacto. partir de `agent-docs/publicacion-extension/04-politica-de-privacidad.md`. |
| `DISCLAIMER` (o sección del readme) | proyecto no oficial, sin afiliación con LALIGA ni LALIGA FANTASY, uso de una API no documentada. |
| `SECURITY.md` | versiones soportadas, canal privado (GitHub private vulnerability reporting o `contacto@rezzt.dev`), plazos, alcance (web, extensión, proxy). |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1 con contacto `contacto@rezzt.dev`. |
| `CONTRIBUTING.md` | setup con pnpm y node `>=22.12.0`, convención de commits, changelog bilingüe, comprobaciones locales, reglas de `AGENTS.md`. |
| `.github/` | plantillas de issue y PR bilingües, `CODEOWNERS`, `SUPPORT.md`; si se añade ci, workflow con `tsc`, `test:unit` y `build`. |

### Fase 4 — readme y changelog

- `README.md` EN + ES: características verificadas, instalación con pnpm, variables de entorno (solo nombres), despliegue en vercel, extensión, pruebas, estructura, aviso de no afiliación, licencia no comercial. Sin la palabra "open source" para esta licencia ni afirmaciones no verificables.
- Corregir en el README los enlaces a `agent-docs/` si esa carpeta deja de versionarse.
- `changelog.md`: cerrar `## SIN PUBLICAR / UNRELEASED` como `## [x.y.z] - aaaa-mm-dd` con la versión acordada (commit con prefijo `changelog`). Comprobar que cada ítem existe en el código.

### Fase 5 — documentación técnica (EN + ES)

auditar `agent-docs/useful-docs/` (arquitectura, api, autenticación, notas) y `extension/README.md` contra el código y completar lo que falte:

- motor de recomendaciones: modelo por componentes, emparejamiento con modelo de goles, carga europea, shrinkage, planificador multi-jornada, calibración
- pestañas del dashboard y sus atajos
- endpoints de `src/pages/api/` y su caché
- login: token manual, email (ROPC) y extensión (PKCE)
- despliegue en vercel: `runtime-paths.ts`, upstash, `pnpm verify:deploy`
- capturas: solo si puedes generarlas; si no, `TODO(owner): screenshot <pantalla>`

### Fase 6 — versión y release (solo preparar)

preparar, sin ejecutar:

1. versión de partida acordada (sección 3) en `package.json` y, si procede, en los dos manifests de la extensión.
2. texto de release en inglés: título `v<x.y.z> — <summary en minúsculas, sin acentos>`, cuerpo = bloque `### ENGLISH` del changelog con categorías `ADDED / CHANGED / FIXED / REMOVED / SECURITY` y sección `#### DEPLOYMENT`.
3. si se publica la extensión, zips de `agent-docs/publicacion-extension/empaquetar.sh` y `SHA256SUMS`.
4. comandos `gh` exactos listos para pegar (tag, release), sin ejecutarlos.

### Fase 7 — metadatos de GitHub (lista para que los aplique el propietario)

descripción en inglés con mayúsculas normales, topics (`astro`, `react`, `laliga-fantasy`, `fantasy-football`, `vercel`), licencia detectable, social preview, private vulnerability reporting, protección de `main`, borrado de ramas fusionadas, comandos `gh api` exactos.

---

## 3. DECISIONES A PREGUNTAR (una sola vez, tras la fase 1)

| # | pregunta | por defecto si no hay respuesta |
|---|---|---|
| 1 | ¿son reales el token y los JWT de `agent-docs/useful-docs/`? ¿se purga el historial? | tratarlos como reales: revocar, dejar de versionar y proponer la purga sin ejecutarla |
| 2 | qué se versiona de `agent-docs/` y de `data/` | versionar solo la documentación pública y la semilla de `data/`; el resto, local |
| 3 | versión de partida | `1.0.0` en `package.json`, tag `v1.0.0`, sin pre-release |
| 4 | versión de la extensión | independiente; se mantiene `1.0.0` hasta que cambie `extension/` |
| 5 | idioma y formato de los docs raíz | `X.md` bilingüe (EN primero, ES después), como `LICENSE.md` |
| 6 | cláusula de prevalencia de la licencia | castellano prevalece (es la versión original) |
| 7 | correo de contacto para privacidad, seguridad y conducta | `contacto@rezzt.dev`; sugerir GitHub private vulnerability reporting |
| 8 | borrar `gui-rework` y `vercel-app` del remoto | sí, están fusionadas |
| 9 | ¿está publicada la extensión en las tiendas? | `TODO(owner)` |
| 10 | añadir ci (GitHub Actions) | proponer el workflow sin activarlo |

---

## 4. REGLAS DE ESTILO

- commits, changelog, PR y release: las guías de `.docs/-github-guides/`. changelog en minúsculas y sin acentos; fechas `aaaa-mm-dd`.
- documentación y readme: castellano e inglés con acentos normales; mismo orden, mismos títulos traducidos, mismas tablas y cifras.
- nombres de ficheros, rutas, comandos e identificadores entre backticks.
- sin emojis decorativos, sin superlativos de marketing, sin prometer resultados en el juego.
- el motor da estimaciones, no garantías: reflejarlo en readme y textos de la extensión.

---

## 5. COMPROBACIONES (ejecutar y pegar resultados en el informe)

```bash
# enlaces relativos de todos los markdown
git ls-files '*.md' | while read f; do grep -oE '\]\((\./|\.\./)?[^)#h][^)]*\)' "$f" \
  | sed -E 's/^\]\(|\)$//' | while read l; do
    [ -e "$(dirname "$f")/$l" ] || echo "ROTO: $f -> $l"; done; done

# ficheros ignorados que siguen versionados
git ls-files -ci --exclude-standard

# acentos en items del changelog (debe salir vacío en las listas)
grep -nP '^- .*[áéíóúñÁÉÍÓÚ]' changelog.md

# posibles secretos (sin imprimir valores)
git grep -nIcE 'eyJ[A-Za-z0-9_-]{10,}|UPSTASH_REDIS_REST_TOKEN=.+|API_FOOTBALL_KEY=.+'

# verificación del proyecto (si se tocó código)
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit && pnpm test:unit && pnpm build && pnpm verify:deploy

# `pnpm check` (astro check) pide instalar `@astrojs/check`, que no está en las dependencias

# e2e (con la app en marcha en otra terminal)
pnpm exec playwright install chromium && pnpm test:e2e

# extensión
pnpm dlx web-ext lint --source-dir extension
```

---

## 6. PLAN DE COMMITS (rama `changes/repo-audit-and-fix`)

orden sugerido; ajusta al estado real del repo.

1. `changes | dejar de versionar credenciales y artefactos temporales de e2e`
2. `changes | alinear el gitignore con agent-docs y data`
3. `update | anadir notice, third party licenses y aviso de no afiliacion`
4. `update | anadir la politica de privacidad de la web y la extension`
5. `update | anadir security, code of conduct y contributing bilingues`
6. `update | anadir plantillas de issue y pr bilingues y support`
7. `update | rehacer el readme bilingue con datos verificados`
8. `changes | fijar la version de partida en package.json` (solo si se acordó)
9. `changelog | cerrar la seccion de changelog para la version <x.y.z>`

cada cuerpo: lista `-` de una línea por ítem, qué y por qué. sin ninguna línea de atribución.

---

## 7. DEFINICIÓN DE HECHO

- [ ] ningún hallazgo de la sección 1 queda sin resolver, propuesto o anotado como `TODO(owner)`
- [ ] el token y los JWT de `agent-docs/useful-docs/` ya no están en `HEAD` y su revocación está confirmada o pendiente con `TODO(owner)`
- [ ] `.gitignore` y `git ls-files -ci --exclude-standard` son coherentes
- [ ] `LICENSE.md`, `NOTICE`, `THIRD_PARTY_LICENSES.md`, `PRIVACY.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md` y `README.md` existen en EN y ES con paridad
- [ ] el README no dice "open source" e incluye el aviso de no afiliación en los dos idiomas
- [ ] las comprobaciones de la sección 5 pasan o sus fallos están explicados
- [ ] `changelog.md` cerrado con versión y fecha, bilingüe
- [ ] propuesta de release en inglés y comandos `gh` listos
- [ ] ninguna acción prohibida de la sección 0 se ha ejecutado sin confirmación
- [ ] el dominio de vercel sigue coincidiendo en homepage, manifests de la extensión y `ALLOWED_APP_ORIGINS`

---

## 8. INFORME FINAL (formato de entrega)

1. **resumen**: qué se hizo, en cinco líneas como máximo.
2. **hallazgos**: tabla confirmado / refutado / nuevo, con evidencia (comando o ruta).
3. **ficheros**: creados, modificados y eliminados del índice.
4. **decisiones aplicadas**: las respondidas y las resueltas por defecto.
5. **`TODO(owner)`**: lista numerada de datos que faltan.
6. **para revisión legal**: puntos concretos que debe revisar un abogado.
7. **acciones pendientes de mi confirmación**: comandos exactos (push, PR, tag, release, ajustes de GitHub, purga de historial, revocación de tokens).
8. **título y descripción de la PR** en el formato del repositorio, en bloques de código separados.
