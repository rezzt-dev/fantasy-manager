# Material gráfico

## Qué pide cada tienda

| Recurso | Medida | Chrome | Firefox |
|---|---|---|---|
| Icono de la tienda | 128×128 PNG | Obligatorio | Obligatorio |
| Capturas | 1280×800 (o 640×400) | Obligatorio, 1 a 5 | Recomendado |
| Promo tile pequeño | 440×280 PNG | Opcional | — |
| Promo tile marquesina | 1400×560 PNG | Opcional | — |

Chrome exige que las capturas tengan **exactamente** una de las dos medidas. Una
captura de 1280×720 se rechaza; es el error tonto más habitual.

## Iconos

Ya están generados en [extension/icons/](../../extension/icons/) a partir de
`public/fantasy-manager-icon.png`. Si cambias el icono del proyecto:

```bash
cd /home/rezzt/repositorios/webpage-projects/fantasy-manager
for s in 16 32 48 128; do
  magick public/fantasy-manager-icon.png -resize ${s}x${s} extension/icons/icon-${s}.png
done
```

> Recuerda el punto de marca de [00-antes-de-empezar.md](00-antes-de-empezar.md):
> el icono no puede llevar el logo de LaLiga ni escudos de equipos.

## Capturas

Tres que cuentan la historia completa, en este orden:

1. La pantalla de login con el botón "Entrar con Google" activo.
2. La ventana de login oficial abierta (demuestra que la contraseña se teclea
   fuera de la extensión).
3. El panel ya cargado con datos.

Para generarlas con la medida exacta, con el servidor de desarrollo levantado
(`pnpm exec astro dev --background`):

```js
// guardar como /tmp/capturas.mjs y ejecutar con:
//   node /tmp/capturas.mjs
import { chromium } from './agent-docs/browser-automation/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto('http://localhost:4321/login');
await page.waitForTimeout(2000);
await page.screenshot({ path: 'dist-extension/captura-1-login.png' });

// …repetir navegando a las pantallas que quieras retratar

await browser.close();
```

Si ya tienes una captura con otra medida, encájala sin deformarla añadiendo
fondo del color base del proyecto:

```bash
magick captura.png -resize 1280x800 \
  -background '#151515' -gravity center -extent 1280x800 \
  dist-extension/captura-1-login.png

# comprobar que salió exacta
magick identify dist-extension/captura-1-login.png
```

**No metas datos reales** en las capturas: nombres de tus rivales de liga,
emails o tokens visibles. Si hace falta, tapa con un rectángulo:

```bash
magick captura.png -fill '#2a2a2a' -draw 'rectangle 100,200 400,230' captura-limpia.png
```

## Promo tiles (opcionales)

Sólo importan si algún día quieres aparecer destacado en Chrome. Con la ficha no
listada no sirven de nada. Si los haces: fondo `#151515`, el icono y el nombre,
sin capturas dentro y sin texto pequeño.

```bash
magick -size 440x280 xc:'#151515' \
  \( public/fantasy-manager-icon.png -resize 96x96 \) -gravity center -composite \
  dist-extension/promo-440x280.png
```

## Comprobación final

```bash
cd dist-extension
for f in captura-*.png; do echo -n "$f: "; magick identify -format '%wx%h\n' "$f"; done
# todas tienen que decir 1280x800 (o 640x400)
```
