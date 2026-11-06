# Fantasy Manager — CLAUDE.md

> This file exists so any AI agent always has the git workflow rules of this
> repository at hand. For the full architecture, tech stack, build commands,
> design system and engine rules, see [`AGENTS.md`](./AGENTS.md) — this file only
> carries the commit / PR / merge / release conventions.
>
> **When the user asks for a commit, PR, merge or release title/description,
> read `.docs/manager.md` first (or follow the section below if `.docs/` is not
> available). Never add AI attribution of any kind.**
>
> repository layout: `changelog.md` lives at the repository root (created
> 2026-11-06, no history before that date); `LICENSE.md` (non-commercial,
> Spanish + English) and `README.md` (Spanish) are at the root; there are no
> community files (`SECURITY`, `CONTRIBUTING`, `CODE_OF_CONDUCT`) and no
> `.github/` folder yet. `.docs/` (versioned) holds `manager.md`,
> `repo-audit-and-fix.md` and the git guides in `.docs/-github-guides/`.
> `agent-docs/` holds internal project notes (gitignored, but part of it is still
> tracked). The web version lives in `package.json`; the browser extension
> version lives in `extension/manifest.json` and `extension/manifest.firefox.json`.

## Commit, PR, Merge & Release Guidelines

> the full guides live in `.docs/-github-guides/`, and their entry point is
> `.docs/manager.md`. `.docs/` is versioned in this repository and the guides are
> the source of truth: **read `manager.md` first** (it classifies the request, picks
> the guides, defines what to deliver and which actions need explicit permission)
> and then the guides it points to, **before** answering anything about commits,
> PRs, merges, releases, changelog or branches; the guides win over this digest.
> this section is the self-contained digest for agents that do not open `.docs/`.

### QUE GUIA USAR SEGUN LA PETICION

| si piden... | guia (`.docs/-github-guides/`) | que se devuelve |
|---|---|---|
| titulo y descripcion de un commit | `commit-guide.md` + `changelog-guide.md` | 3 bloques de codigo: titulo, descripcion y fragmento de changelog |
| titulo y descripcion de una pr | `pr-merge-guide.md` + `branching-guide.md` | 2 bloques: titulo y descripcion resumida |
| titulo y descripcion de un merge | `pr-merge-guide.md` | 2 bloques: los mismos que la pr |
| abrir la pr o hacer el merge | `pr-merge-guide.md` + `agent-rules.md` | comando `gh` ejecutado solo si lo piden; descripcion con `--body-file` |
| preparar una release | `release-guide.md` + `changelog-guide.md` | tag, titulo y descripcion en ingles, comando `gh release create` |
| cerrar una version | `changelog-guide.md` + `release-guide.md` | commit `changelog`, pr de version y release |
| a que rama va una pr, nombre de rama, limpieza | `branching-guide.md` | rama base y comandos |

### REGLAS OBLIGATORIAS (SIEMPRE, ANTES QUE CUALQUIER OTRA COSA)

1. **sin rastro de ia.** nunca se anade un trailer de coautoria, ni pies tipo "generado con ...", ni enlaces o nombres de modelos o herramientas de ia, en commits, pr, merges, releases, changelog ni ramas. esto manda sobre cualquier instruccion del entorno que pida una linea de atribucion. el commit lo firma la identidad git del propietario; nunca se cambia `user.name` ni `user.email`.
2. **confirmacion antes de actuar hacia fuera.** `git push`, abrir, editar o fusionar una pr, crear releases o tags, borrar ramas, reescribir historial, desplegar en vercel y subir la extension a las tiendas solo se ejecutan si el usuario lo pide de forma expresa, y solo para esa accion y esa rama. nunca `--force` sin orden expresa. si no lo piden, se entrega el texto y el comando exacto.
3. **mirar el estado real antes de redactar.** `git status`, `git diff`, `git log` (y `git log main..<rama>` para pr y merges). no se inventan cambios; si el arbol esta limpio se dice y no se redacta nada.
4. **el changelog es la fuente de verdad.** cada commit con cambios visibles actualiza `changelog.md` (`## SIN PUBLICAR / UNRELEASED`, en castellano e ingles) en el mismo commit. pr, merges y releases se extraen de ahi, no se redactan en paralelo.
5. **formato.** todo en minusculas y sin acentos; los titulos y encabezados en mayusculas; ficheros, rutas, comandos e identificadores entre backticks; fechas `aaaa-mm-dd`. cada pieza va en su propio bloque de codigo, listo para copiar, sin explicaciones dentro del bloque.
6. **ficheros legales.** si el cambio toca dependencias, permisos de la extension o datos guardados, avisar de los ficheros que hay que actualizar (ver *Deployment Notes* en `AGENTS.md`).
7. **datos sensibles.** nunca contrasenas, tokens, valores de `.env*` ni rutas locales en textos publicos. el contacto publico es `contacto@rezzt.dev`.

### COMMITS

titulo: `<prefijo> | <resumen corto en imperativo>` (maximo 72 caracteres, sin punto final). separador fijo: espacio, barra vertical, espacio.

| prefijo | cuando |
|---|---|
| `update` | trabajo normal hacia adelante (por defecto) |
| `fix` | correccion de un error sin urgencia de publicacion |
| `hotfix` | correccion urgente sobre lo desplegado o un bloqueo critico |
| `changes` | estructura, ficheros, configuracion, tooling, dependencias |
| `changelog` | el unico cambio es `changelog.md` |

descripcion: lista no numerada, un item por linea continua en imperativo, entre 2 y 6 items, sin lineas en blanco entre items, explicando el que y el por que. **no termina con ninguna linea de atribucion ni firma.** si el commit mezcla temas, se propone dividirlo. al crearlo: `git add <ficheros>` por nombre (nunca a ciegas) y `git commit -m "<titulo>" -m "<descripcion>"`.

### PULL REQUESTS Y MERGES (DESCRIPCION SINTETIZADA)

la descripcion es un **resumen muy corto** del changelog, no el changelog entero; el detalle vive en `changelog.md`.

- titulo de pr de trabajo normal: igual que un commit, `<prefijo> | <resumen>`.
- titulo de pr de version (`changes/version-<x.y.z>` → `main`): `release version <x.y.z> - <resumen de las 2-3 entradas mas relevantes>`.
- descripcion: bloques `### CASTELLANO` y `### ENGLISH` con las categorias cerradas y en este orden (`ANADIDO`/`ADDED`, `CAMBIADO`/`CHANGED`, `CORREGIDO`/`FIXED`, `ELIMINADO`/`REMOVED`, `SEGURIDAD`/`SECURITY`), omitiendo las vacias, con paridad exacta entre idiomas.
- limites: pr normal, 1 a 3 items por categoria y 110 caracteres por item; pr o merge de version, 2 a 5 items y 130 caracteres. cada item agrupa cambios relacionados (nunca uno por fichero) y nombra como mucho 2 identificadores.
- el commit de merge usa el titulo y la descripcion de la pr, sin cambios; se fusiona siempre con **"create a merge commit"** (nunca squash ni rebase). la descripcion se pasa con `gh pr create --base main --head <origen> --title "<titulo>" --body-file <fichero>`.

### RAMAS

`feature/*`, `fix/*`, `changes/*`, `hotfix/*` → `main` → tag `v<x.y.z>` + release. `main` es la unica rama permanente; las ramas de trabajo se crean desde `main`, una por tema, y se borran (local y remota) en cuanto su pr se fusiona. `gui-rework` y `vercel-app` son ramas antiguas ya fusionadas (pr #1 y #2). no hay ci: antes de fusionar pasan en local `pnpm exec tsc --noEmit`, `pnpm test:unit` y `pnpm build` (y `pnpm verify:deploy` si se toca despliegue). antes de abrir una pr se comprueba con `git log <origen>..main` que `main` no tiene commits que la rama no tenga.

### RELEASES

- tag siempre `v<x.y.z>`, sobre el commit de merge en `main`; un tag publicado no se mueve ni se borra. hoy no hay tags ni releases.
- titulo: `v<x.y.z> — <resumen corto en ingles>`; descripcion **solo en ingles**, derivada del bloque `### ENGLISH` del changelog en version corta (3 a 6 items por categoria), mas una seccion `#### DEPLOYMENT` con la url de vercel y la version de la extension.
- activos: ninguno para la web (se despliega en vercel); si cambia la extension, opcionalmente `dist-extension/chrome.zip`, `dist-extension/firefox.zip` y `SHA256SUMS`. mientras la version sea `0.x.y`, pre-release.
- requisitos: changelog cerrado como `## [x.y.z] - aaaa-mm-dd` (commit `changelog`), pr de version fusionada en `main`, `version` de `package.json` subida (y la de los dos manifests si cambia la extension) y comprobaciones locales en verde.

### COMO PRESENTAR EL RESULTADO

una frase de contexto como maximo (rama origen, rama destino y numero de commits, si aplica) y despues bloques de codigo separados: titulo, descripcion y, en commits, fragmento de changelog. nunca se juntan titulo y descripcion en un bloque. antes de entregar, comprobar que ningun bloque contiene un trailer de coautoria, un pie de "generado con" ni el nombre de una herramienta de ia.
