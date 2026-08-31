# Antes de subir nada

Tres decisiones que condicionan todo lo demás. Tomarlas después de haber subido
la extensión cuesta mucho más que tomarlas ahora.

## 1. El nombre no puede llevar "LALIGA FANTASY"

Ahora mismo el manifest dice:

```
"name": "Fantasy Manager — Conector LALIGA FANTASY"
```

Esto es un problema en las dos tiendas. Ambas prohíben que una extensión use
una marca ajena de forma que sugiera afiliación o respaldo, y LaLiga es una
marca muy defendida. Riesgos concretos:

- Rechazo en la revisión (Chrome lo rechaza con "Impersonation / trademark").
- Retirada posterior si LaLiga denuncia, incluso meses después de publicar.
- En el peor caso, suspensión de la cuenta de desarrollador.

**Qué hacer.** Sacar la marca del nombre y dejarla sólo donde es descriptiva
("funciona con...") y acompañada de un descargo:

| Campo | Antes | Después |
|---|---|---|
| `name` | `Fantasy Manager — Conector LALIGA FANTASY` | `Fantasy Manager Connector` |
| `description` | `...con tu cuenta de LALIGA FANTASY...` | `Conecta Fantasy Manager con tu cuenta de fantasy oficial sin copiar tokens.` |

Y en la descripción larga, en la primera línea y sin adornos:

> Herramienta no oficial. No está afiliada, asociada ni respaldada por LaLiga
> ni por ninguna de sus marcas.

Reglas que van con esto:

- **No** usar el logo de LaLiga, ni sus colores corporativos, ni escudos de
  equipos en el icono, las capturas o los promo tiles.
- **No** usar "LaLiga" en el nombre del desarrollador ni en la URL.
- Sí se puede decir "compatible con la liga fantasy oficial" en el cuerpo de la
  descripción: es uso nominativo descriptivo, que es lo que ambas tiendas
  permiten.

Si decides asumir el riesgo y publicar con la marca, que sea una decisión
consciente: la extensión funciona igual, pero la ficha puede caer en cualquier
momento.

## 2. Listada o no listada

No es lo mismo "publicar" que "publicar en el escaparate". Las dos tiendas
permiten distribuir sin aparecer en las búsquedas.

| | Chrome | Firefox |
|---|---|---|
| **Pública / listada** | Aparece en el buscador de la store. Revisión más estricta. | Aparece en addons.mozilla.org. Revisión humana. |
| **No listada / unlisted** | Alojada por Google, sólo instalable con el enlace directo. Se revisa igual, pero atrae menos atención. | Mozilla firma el `.xpi` y **te lo devuelves para distribuirlo tú**. Suele ser automático y en minutos. |

**Recomendación: empieza por no listada en las dos.** Motivos:

- El público de esto son tus usuarios, que llegan desde `/extension` en tu web.
  No necesitas descubrimiento por búsqueda.
- Reduce muchísimo la exposición al problema de marca del punto 1.
- Puedes pasar de no listada a listada cuando quieras; al revés es más
  incómodo.

El enlace de instalación se pone en
[src/pages/extension.astro](../../src/pages/extension.astro), que ahora mismo
explica la instalación manual descomprimida.

## 3. Cuenta de prueba para el revisor

Este es el punto que más gente olvida y el que más rechazos "sorpresa" causa.

El revisor abre la extensión, pulsa "Entrar con Google" y se encuentra la
pantalla de login de LaLiga. Sin una cuenta no puede pasar de ahí, no puede
verificar qué hace la extensión, y el resultado por defecto es **rechazo**.

Necesitas, antes de enviar:

- Una cuenta real de la liga fantasy oficial creada para esto (email y
  contraseña, **no** federada con Google: así el revisor entra sin depender de
  un segundo factor tuyo).
- Sus credenciales puestas en el campo correspondiente:
  - Chrome: pestaña **Privacy practices** → *Provide login credentials / test
    instructions*.
  - Firefox: campo **Notes for reviewers** al subir la versión.
- Las instrucciones paso a paso, ya redactadas en
  [03-textos-de-la-ficha.md](03-textos-de-la-ficha.md#instrucciones-para-quien-revisa).

Ojo: esa cuenta va a quedar en manos de un revisor. Que no sea la tuya y que no
tenga nada que perder.

## Checklist de salida

- [ ] Nombre sin marca ajena en `manifest.json` y `manifest.firefox.json`
- [ ] Descargo "no oficial" en la descripción larga
- [ ] Icono sin elementos de marca de LaLiga
- [ ] Decidida la visibilidad (recomendado: no listada)
- [ ] Cuenta de prueba creada y verificada a mano
- [ ] Política de privacidad publicada en una URL accesible
