# GUIA DE RAMAS

> ramas del repositorio, flujo de versiones y que rama es la base de cada pull
> request. sirve para decidir el destino de una pr sin tener que preguntarlo.
> el modelo sale del historial real (`git log --graph`): una sola rama
> permanente, `main`, que recibe ramas de trabajo por pr con merge commit.

---

## 1. RAMAS PERMANENTES

| rama | funcion |
|---|---|
| `main` | rama por defecto y unica permanente; codigo desplegado en vercel; recibe las ramas de trabajo por pr; de aqui salen los tags `v<x.y.z>` |

ramas antiguas que siguen en el remoto aunque ya estan fusionadas: `gui-rework` (pr #1) y `vercel-app` (pr #2). no reciben cambios nuevos y pueden borrarse si el propietario lo pide.

---

## 2. RAMAS DE TRABAJO

nombre en minusculas, con barra y guiones:

| prefijo | uso | ejemplo |
|---|---|---|
| `feature/` | funcionalidad nueva | `feature/clause-market` |
| `fix/` | correccion de error | `fix/matches-vercel` |
| `changes/` | estructura, tooling, documentacion, cierre de version | `changes/repo-management-guides` |
| `hotfix/` | urgencia sobre lo desplegado en produccion | `hotfix/login-session` |

- se crean siempre desde `main` actualizada.
- una rama, un tema; si el tema crece, se divide.
- una rama de trabajo se borra (local y remota) en cuanto su pr esta fusionada.

---

## 3. FLUJO DE UNA VERSION

```
feature/* , fix/* , changes/* , hotfix/*   →   main   →   tag v<x.y.z> + release
```

| paso | origen | destino | tipo de pr | titulo |
|---|---|---|---|---|
| 1 | `feature/*`, `fix/*`, `changes/*`, `hotfix/*` | `main` | trabajo normal | `<prefijo> \| <resumen>` |
| 2 | `changes/version-<x.y.z>` (commit `changelog`) | `main` | version | `release version <x.y.z> - <resumen>` |
| 3 | `main` | — | release de github | `v<x.y.z> — <resumen en ingles>` |

- todos los pasos se fusionan con "create a merge commit".
- antes de abrir una pr se comprueba que el destino no tiene commits que la rama no tenga: `git log <origen>..<destino>`. si los tiene, se actualiza la rama primero.

---

## 4. CI

- no hay ci: el repositorio no tiene `.github/workflows/`.
- hasta que exista, antes de fusionar se ejecutan en local `pnpm exec tsc --noEmit`, `pnpm test:unit` y `pnpm build`, y `pnpm verify:deploy` si el cambio toca despliegue, sesion o rutas de datos.
- cuando exista ci, no se fusiona una pr con el ci en rojo.

---

## 5. LIMPIEZA

tras fusionar una pr de trabajo:

```
git checkout main
git pull --ff-only
git branch -d <rama>
git push origin --delete <rama>
```

`main` nunca se borra.
