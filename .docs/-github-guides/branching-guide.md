# GUIA DE RAMAS

## 1. RAMAS VERIFICADAS

ramas remotas consultadas el 2026-11-06: `gui-rework`, `main`, `vercel-app`.

la rama por defecto de github es `main`. el trabajo actual de documentacion parte de `main`; no se cambia la rama por defecto ni se fusionan lineas de version por copiar este modelo.

## 2. RAMAS DE TRABAJO

| prefijo | uso | destino |
| --- | --- | --- |
| `feature/` | funcionalidad nueva | rama de desarrollo acordada |
| `fix/` | correcciones | rama que contiene el fallo |
| `changes/` | documentacion, estructura y tooling | `main` para esta tarea |
| `hotfix/` | urgencia sobre una version publicada | rama del codigo publicado verificada |

una rama por tema. este trabajo usa `changes/repo-management-complete`. comprobar siempre `git log <base>..<rama>` y `git diff <base>...<rama>` antes de abrir la pr.

## 3. FLUJO Y VERSIONES

`changes/repo-management-complete` → `main` mediante pull request. usar merge commit si se solicita fusionar. una pr de documentacion no cierra una version ni publica artefactos.

para otras versiones, verificar el historial y las ramas vigentes antes de decidir la base. no crear ramas de alfa, beta o release inexistentes. no copiar un modelo de promociones de otro proyecto.

## 4. VERIFICACION

workflows versionados: no tracked github actions workflows. comprobar los checks reales de la pr; la ausencia de ci no equivale a una ejecucion correcta. para documentacion, revisar enlaces y `git diff --check`; para codigo, seguir los comandos de la guia del proyecto.

antes de publicar, comprobar que el destino no introduce cambios incompatibles. actualizar la rama mediante un merge autorizado cuando haga falta; no reescribir commits publicados.

## 5. LIMPIEZA

conservar las ramas permanentes. borrar una rama de trabajo solo tras confirmar su merge y cuando se haya solicitado su eliminacion. no cambiar la copia de trabajo del propietario para limpiar un worktree auxiliar.
