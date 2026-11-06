# GUIA DE RELEASES

> como preparar el titulo, la descripcion y el tag de una release de github.
> se aplica cuando una pr de version ya esta fusionada en `main`. lee antes
> `agent-rules.md`: la release no lleva ningun rastro de ia. hoy el repositorio
> no tiene ningun tag ni ninguna release: la primera seguira esta guia.

---

## 1. REQUISITOS PREVIOS

1. `changelog.md` tiene la version cerrada como `## [x.y.z] - aaaa-mm-dd` (ver `changelog-guide.md`).
2. la pr de version (`changes/version-<x.y.z>` → `main`) esta fusionada con "create a merge commit".
3. `package.json` tiene `version` `x.y.z`. si la version cambia la extension, `extension/manifest.json` y `extension/manifest.firefox.json` llevan la misma `version` entre si (las dos tiendas exigen subirla en cada envio).
4. no hay ci: sobre el commit que se va a etiquetar pasan en local `pnpm exec tsc --noEmit`, `pnpm test:unit`, `pnpm build` y `pnpm verify:deploy`.
5. el despliegue de vercel de ese commit (`https://fantasy-manager-mauve.vercel.app`) responde en `/`, `/login` y `/dashboard`.

---

## 2. TAG

- siempre `v<x.y.z>`, mismo numero que la cabecera del changelog, sin sufijos extra (ejemplo: `v1.0.0`).
- se crea sobre el commit de merge en `main`, nunca sobre una rama de trabajo.
- no se mueve ni se borra un tag ya publicado; si hay un error, se publica una version nueva.

```
git tag -a v<x.y.z> -m "v<x.y.z>"
git push origin v<x.y.z>
```

---

## 3. TITULO

```
v<x.y.z> — <resumen corto en ingles>
```

- en ingles, minusculas y sin acentos; resume las 2-3 entradas mas relevantes.
- ejemplo: `v1.0.0 — clause market, live matches & european load in the engine`.

---

## 4. DESCRIPCION

- **solo en ingles**: la release es la cara publica del proyecto.
- reutiliza el bloque `### ENGLISH` de la version cerrada, con sus encabezados `####` en mayusculas, pero en version corta: de 3 a 6 items por categoria, agrupando cambios relacionados (misma regla de sintesis que `pr-merge-guide.md`, seccion 2).
- se omite la categoria sin items; no se reordenan las categorias.
- cierra con una seccion de despliegue:

```
#### DEPLOYMENT

- live at `https://fantasy-manager-mauve.vercel.app`
- browser extension version: `<x.y.z>` (unchanged | updated in the stores)
```

- sin lineas de atribucion ni enlaces a herramientas de ia.

---

## 5. ACTIVOS

- la web no genera binarios: se despliega en vercel y la release no lleva activos.
- si la version cambia la extension, se pueden adjuntar `dist-extension/chrome.zip` y `dist-extension/firefox.zip` (generados con `agent-docs/publicacion-extension/empaquetar.sh`) y su `SHA256SUMS`; nunca `.env*`, tokens ni capturas con datos de una cuenta.
- mientras la version sea `0.x.y`, la release se marca como pre-release (`--prerelease`).

---

## 6. COMANDO

```
gh release create v<x.y.z> --title "<titulo>" --notes-file <fichero>
```

si hay zips de la extension, se anaden como argumentos despues del tag (`dist-extension/chrome.zip dist-extension/firefox.zip SHA256SUMS`). se entrega el comando sin ejecutar; publicar una release es visible para todos y exige confirmacion (ver `agent-rules.md`).

---

## 7. LISTA DE COMPROBACION

- [ ] el tag coincide con la cabecera del changelog y con `version` de `package.json`.
- [ ] titulo y descripcion estan en ingles.
- [ ] los items salen del bloque `### ENGLISH` del changelog.
- [ ] si hay zips de la extension, corresponden a la misma version de los dos manifests y a `SHA256SUMS`.
- [ ] no hay atribucion de ia ni datos sensibles.
