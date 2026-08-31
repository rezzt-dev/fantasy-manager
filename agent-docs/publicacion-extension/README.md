# Publicar el conector en las stores

Todo lo necesario para llevar `extension/` a la Chrome Web Store y a
addons.mozilla.org (AMO).

| Documento | Qué contiene |
|---|---|
| [00-antes-de-empezar.md](00-antes-de-empezar.md) | Decisiones que hay que tomar **antes** de subir nada: nombre, visibilidad, marca. Empieza aquí. |
| [01-chrome-web-store.md](01-chrome-web-store.md) | Alta, cuota, formulario de privacidad, subida y revisión. |
| [02-firefox-amo.md](02-firefox-amo.md) | Alta, firma, listada vs autodistribuida, diferencias de MV3. |
| [03-textos-de-la-ficha.md](03-textos-de-la-ficha.md) | Textos listos para copiar y pegar en los dos formularios. |
| [04-politica-de-privacidad.md](04-politica-de-privacidad.md) | Política de privacidad publicable. Chrome la exige. |
| [05-material-grafico.md](05-material-grafico.md) | Medidas exactas de iconos, capturas y promo tiles, con comandos. |
| [06-mantenimiento.md](06-mantenimiento.md) | Publicar actualizaciones y qué hacer si LaLiga cambia algo. |
| [07-licencia-y-categorias.md](07-licencia-y-categorias.md) | Qué licencia declarar y qué categoría elegir en cada tienda. |
| [empaquetar.sh](empaquetar.sh) | Genera `chrome.zip` y `firefox.zip` listos para subir. |

## Resumen del camino

```
1. Decidir nombre y visibilidad        → 00-antes-de-empezar.md
2. Preparar capturas e iconos          → 05-material-grafico.md
3. Publicar la política de privacidad  → 04-politica-de-privacidad.md
4. ./empaquetar.sh                     → dist-extension/chrome.zip + firefox.zip
5. Chrome:  alta (5 USD) → subir → privacidad → enviar   → 01-chrome-web-store.md
6. Firefox: alta (gratis) → subir → firma                → 02-firefox-amo.md
```

Coste total: **5 USD una sola vez** (Chrome). Firefox es gratis.

Tiempo realista: una tarde de preparación, más 1-3 días de revisión en Chrome.
La firma de Firefox autodistribuida es cuestión de minutos.

## Lo que más probabilidad tiene de salir mal

Por orden, y todo está desarrollado en los documentos:

1. **La marca "LALIGA FANTASY" en el nombre.** Es el motivo de rechazo más
   probable en las dos tiendas y además expone a una retirada por denuncia de
   LaLiga. Ver [00-antes-de-empezar.md](00-antes-de-empezar.md).
2. **El revisor no tiene cuenta de LaLiga** y no puede probar el flujo. Hay que
   darle credenciales de prueba o el add-on se rechaza por "no se ha podido
   verificar la funcionalidad".
3. **Justificar `webRequest`.** Es un permiso que dispara revisión manual. La
   justificación honesta está redactada en
   [03-textos-de-la-ficha.md](03-textos-de-la-ficha.md).
