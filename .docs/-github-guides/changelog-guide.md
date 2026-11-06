# GUIA DEL CHANGELOG

> como se escribe y se cierra `changelog.md` (raiz del repositorio). es la
> fuente de verdad de commits, pull requests, merges y releases: nada se
> redacta en paralelo, todo se extrae de aqui.

---

## 1. ESTRUCTURA

```
# CHANGELOG

## SIN PUBLICAR / UNRELEASED

## [x.y.z] - aaaa-mm-dd

### CASTELLANO

#### ANADIDO
- <cambio>

### ENGLISH

#### ADDED
- <change>
```

- la seccion `## SIN PUBLICAR / UNRELEASED` esta siempre arriba y recoge lo que aun no se ha publicado.
- las versiones cerradas van de la mas reciente a la mas antigua.
- cada version lleva `### CASTELLANO` y `### ENGLISH` con paridad exacta de items.
- el changelog empezo el 2026-11-06; el historial anterior esta solo en `git log` y no se reconstruye.

---

## 2. CATEGORIAS (CERRADAS Y EN ESTE ORDEN)

| castellano | english | que va |
|---|---|---|
| `ANADIDO` | `ADDED` | funcionalidades, ficheros o documentos nuevos |
| `CAMBIADO` | `CHANGED` | cambios en comportamiento, estructura o documentacion existente |
| `CORREGIDO` | `FIXED` | errores corregidos |
| `ELIMINADO` | `REMOVED` | codigo, ficheros o funciones retirados |
| `SEGURIDAD` | `SECURITY` | correcciones o endurecimiento con impacto de seguridad |

se omite la categoria que no tenga items. no se crean otras.

---

## 3. REGLAS DE ESTILO

- minusculas y sin acentos en el contenido; titulos y encabezados en mayusculas.
- un item por linea, en imperativo ("anadir", "corregir", "mover"), empezando por `-`.
- ficheros, rutas, comandos e identificadores entre backticks.
- explica el efecto visible o el motivo, no el detalle de implementacion linea a linea.
- si un cambio solo afecta a la extension del navegador, el item nombra `extension/` para que no se confunda con la web.
- sin menciones a herramientas de ia ni a quien escribio el item.

---

## 4. CUANDO SE ACTUALIZA

1. **en cada commit** con cambios visibles: se anaden los items a `## SIN PUBLICAR / UNRELEASED`, en los dos idiomas, en el mismo commit.
2. **al preparar una pr o un merge**: se comprueba que el changelog cubre todo el diff; si falta algo, se anade antes de abrirla.
3. **al cerrar una version**: ver seccion 5.

---

## 5. CERRAR UNA VERSION

1. comprobar que `## SIN PUBLICAR / UNRELEASED` esta completo y con paridad entre idiomas.
2. renombrarlo a `## [x.y.z] - aaaa-mm-dd` (fecha de cierre) y dejar debajo una seccion `## SIN PUBLICAR / UNRELEASED` vacia.
3. subir `version` en `package.json` si aun no se ha hecho y, si la version cambia la extension, la `version` de `extension/manifest.json` y `extension/manifest.firefox.json` (commit `changes`).
4. commit con prefijo `changelog`:

```
changelog | cerrar la seccion de changelog para la version <x.y.z>
```

5. abrir la pr de version (ver `pr-merge-guide.md`) y, al fusionar en `main`, crear la release (ver `release-guide.md`).

---

## 6. NUMERACION

- esquema `x.y.z` (semver). `package.json` esta hoy en `0.0.1` y nunca se ha subido; la primera version cerrada fija el numero de partida (ver `.docs/repo-audit-and-fix.md`).
- `x` cambia con rupturas grandes; `y` con funcionalidades nuevas; `z` con correcciones.
- la extension lleva su propia `version` en sus dos manifests (hoy `1.0.0`); solo sube cuando cambia `extension/` y nunca baja.

---

## 7. LISTA DE COMPROBACION

- [ ] los dos idiomas tienen los mismos items.
- [ ] solo hay categorias de la lista cerrada.
- [ ] ningun item queda sin backticks en identificadores.
- [ ] la fecha de la version cerrada usa `aaaa-mm-dd`.
- [ ] no hay atribucion de ia.
