# GUIA DEL CHANGELOG

> como se escribe y se cierra `changelog.md`. es la fuente de verdad
> de commits, pull requests, merges y releases: nada se redacta en paralelo,
> todo se extrae de aqui.

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
- conservar los marcadores de variantes existentes; no crear marcadores de otra aplicacion.
- sin menciones a herramientas de ia ni a quien escribio el item.

---

## 4. CUANDO SE ACTUALIZA

1. **en cada commit** con cambios visibles: se anaden los items a `## SIN PUBLICAR / UNRELEASED`, en los dos idiomas, en el mismo commit.
2. **al preparar una pr o un merge**: se comprueba que el changelog cubre todo el diff; si falta algo, se anade antes de abrirla.
3. **al cerrar una version**: ver seccion 5.

---

## 5. CERRAR UNA VERSION

1. comprobar que `## SIN PUBLICAR / UNRELEASED` esta completo y con paridad entre idiomas.
2. cerrar la version como `## [x.y.z] - aaaa-mm-dd` y mantener una nueva seccion `## SIN PUBLICAR / UNRELEASED` arriba.
3. actualizar la version en los manifiestos reales del proyecto si se ha acordado una publicacion; no cambiar versiones para una pr de documentacion.
4. commit con prefijo `changelog`:

```
changelog | cerrar la seccion de changelog para la version <x.y.z>
```

5. abrir la pr de version (ver `pr-merge-guide.md`) y, al fusionar en `main`, crear la release (ver `release-guide.md`).

---

## 6. NUMERACION

- fuentes de version comprobadas: `package.json`: `0.0.1`.
- no inventar versiones ni tags para proyectos sin politica de publicacion.
- conservar el formato historico de las versiones publicadas; acordar cualquier migracion.
- las variantes y sus marcadores solo se usan cuando existen en este proyecto.

---

## 7. LISTA DE COMPROBACION

- [ ] los dos idiomas tienen los mismos items.
- [ ] solo hay categorias de la lista cerrada.
- [ ] ningun item queda sin backticks en identificadores.
- [ ] la fecha de la version cerrada usa `aaaa-mm-dd`.
- [ ] no hay atribucion de ia.
