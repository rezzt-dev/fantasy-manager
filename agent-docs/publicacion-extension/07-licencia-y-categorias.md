# Licencia y categorías

## Licencia

### La que usa el proyecto hoy

[LICENSE.md](../../LICENSE.md), en la raíz del repo:

> copyright (c) 2026 juan garcia cazallas (rezzt-dev) — todos los derechos
> reservados.
>
> queda estrictamente prohibida la copia, reproducción, modificación,
> distribución o uso comercial de este proyecto, en su totalidad o en parte,
> sin el consentimiento previo y por escrito del autor.

Es una licencia **propietaria**, redactada a mano. No es de código abierto, aunque
el repositorio sea público: eso lo hace *source-available* (código a la vista),
que no es lo mismo. GitHub lo refleja marcándola como `NOASSERTION`, porque no
reconoce el texto como ninguna licencia estándar.

`package.json` no declara campo `license`.

### Qué poner en cada tienda

| | Chrome Web Store | Firefox AMO |
|---|---|---|
| ¿Pide licencia? | **No.** No hay campo. | **Sí**, si la subes *listada*. Hay un desplegable. |
| Qué elegir | — | **All Rights Reserved** |

En el desplegable de AMO aparecen las de código abierto habituales (MPL 2.0,
GPL, LGPL, MIT, BSD, Apache), las Creative Commons, **All Rights Reserved** y la
opción de pegar un texto propio. Con tu licencia actual la correcta es
*All Rights Reserved*; si prefieres que se lea el texto exacto, usa la opción de
licencia personalizada y pega el contenido de `LICENSE.md`.

Si la subes **autodistribuida** (la recomendación de
[02-firefox-amo.md](02-firefox-amo.md)) no hay ficha pública y el campo no
aparece.

Ninguna de las dos tiendas exige que la extensión sea de código abierto. Una
licencia propietaria no complica la revisión mientras el código no esté
ofuscado ni minificado, que no lo está.

### Un hueco que conviene tapar antes de publicar

Tu licencia prohíbe la distribución y **no concede ningún derecho de uso al
usuario final**. Publicar en una tienda es exactamente distribuir para que otros
lo usen, así que el texto actual contradice lo que vas a hacer con él. El
usuario que lo instala no tiene, sobre el papel, permiso para usarlo.

No es un problema de revisión —las tiendas no leen tu licencia— sino de
coherencia. Se arregla añadiendo un párrafo a `LICENSE.md`:

```
Se concede a los usuarios finales una licencia gratuita, no exclusiva e
intransferible para instalar y utilizar la extensión de navegador distribuida
por el autor, para uso personal y no comercial. Esta concesión no incluye
derechos de modificación, redistribución ni uso comercial, que siguen
requiriendo consentimiento previo y por escrito.
```

No soy quien para darte asesoría legal; lo señalo como incoherencia entre lo que
dice el fichero y lo que vas a hacer, y la redacción de arriba es un punto de
partida, no un dictamen.

### Otra cosa que corregí por esto

Los textos de la ficha decían "es software libre" y la política de privacidad
"extensión de código abierto". Con esta licencia son afirmaciones falsas, y en
una ficha de tienda eso es una declaración engañosa. Ya están cambiadas por
"código público y auditable", que sí es cierto.

---

## Categorías

### Chrome Web Store — una sola categoría

Chrome renovó su taxonomía: ya no existen las viejas *Productivity*,
*Social & Communication* o *Sports*. El listado actual es:

```
Accessibility          Games                   Social Networking
Art & Design           Household               Tools
Communication          Just for Fun            Travel
Developer Tools        News & Weather          Well-being
Education              Privacy & Security      Workflow & Planning
Entertainment          Shopping
Functionality & UI
```

**Recomendada: `Tools`.**

Es una utilidad que hace una cosa concreta y técnica. `Workflow & Planning` sería
la segunda opción, pero apunta a gestores de tareas y calendarios.
`Privacy & Security` sería incorrecta y además contraproducente: esa categoría
recibe un escrutinio mucho más duro en la revisión, y la extensión no protege la
privacidad de nadie, sólo maneja un token.

> Si el desplegable que ves no coincide con esta lista, elige la más cercana:
> la interfaz manda sobre este documento.

### Firefox AMO — hasta dos categorías

Lista para extensiones:

```
Alerts & Updates       Photos, Music & Videos   Social & Communication
Appearance             Privacy & Security       Tabs
Bookmarks              Search Tools             Web Development
Download Management    Shopping                 Other
Feeds, News & Blogging Games & Entertainment
Language Support
```

**Recomendada: `Other`.**

Ninguna encaja de verdad, y AMO prefiere `Other` a un encaje forzado. Como
segunda, déjala vacía: `Games & Entertainment` induce a error (no es un juego) y
`Privacy & Security` tiene el mismo problema que en Chrome.

Sólo hay que elegir categoría si la subes listada.

### Resumen para copiar

| Campo | Chrome | Firefox |
|---|---|---|
| Categoría | `Tools` | `Other` |
| Licencia | (no se pide) | `All Rights Reserved` |
| Idioma | Español | Español |
| Etiquetas | fantasy, futbol, oauth, login | fantasy, football, login |
