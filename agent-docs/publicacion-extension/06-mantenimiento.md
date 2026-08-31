# Mantenimiento

## Publicar una actualización

La versión tiene que subir **siempre**, y en los dos manifests a la vez. Las dos
tiendas rechazan una versión repetida.

```bash
cd /home/rezzt/repositorios/webpage-projects/fantasy-manager
# 1.0.0 → 1.0.1 en los dos manifests
sed -i 's/"version": "1.0.0"/"version": "1.0.1"/' \
  extension/manifest.json extension/manifest.firefox.json

# validar antes de empaquetar
./agent-docs/publicacion-extension/empaquetar.sh
```

Luego:

- **Chrome**: Dashboard → tu item → *Package* → *Upload new package* →
  *Submit for review*. Las actualizaciones se revisan más rápido que el alta,
  salvo que añadas permisos.
- **Firefox**: Developer Hub → tu add-on → *Upload New Version*.

> **Añadir un permiso nuevo dispara revisión completa** en las dos tiendas, y en
> Chrome además deja la extensión desactivada en los usuarios hasta que acepten
> el permiso nuevo. Piénsalo antes de tocar `permissions` o `host_permissions`.

## Cambiar de dominio la aplicación

Si mueves la web fuera de `fantasy-manager-mauve.vercel.app`, hay que tocarlo en
tres sitios que deben coincidir, o el puente deja de inyectarse:

- `extension/manifest.json` → `host_permissions`
- `extension/manifest.json` → `content_scripts[0].matches`
- `extension/src/config.js` → `ALLOWED_APP_ORIGINS`

Y lo mismo en `manifest.firefox.json`. Es un cambio de permisos de host, así que
implica el aviso del recuadro de arriba.

## Si LaLiga cambia algo

Todo lo específico de su OAuth está en un único fichero,
[extension/src/config.js](../../extension/src/config.js): `clientId`, `policy`,
`redirectUri` y los dos endpoints. Lo demás no depende de LaLiga.

Cómo comprobar qué se ha roto sin tener que hacer un login real, con los mismos
comandos con los que se verificó el diseño:

```bash
AUTH=https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/authorize

# ¿sigue registrado el redirect_uri nativo? -> debe dar 200 (página de login)
curl -s -o /dev/null -w "%{http_code}\n" -G "$AUTH" \
  --data-urlencode "p=B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN" \
  --data-urlencode "client_id=af88bcff-1157-40a0-b579-030728aacf0b" \
  --data-urlencode "redirect_uri=authredirect://com.lfp.laligafantasy" \
  --data-urlencode "response_type=code" --data-urlencode "scope=openid" \
  --data-urlencode "nonce=x"

# ¿sigue el cliente sin exigir secreto? -> debe dar AADB2C90090 (code inválido),
# NO un error de autenticación de cliente
curl -s -X POST "https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "client_id=af88bcff-1157-40a0-b579-030728aacf0b" \
  --data-urlencode "redirect_uri=authredirect://com.lfp.laligafantasy" \
  --data-urlencode "code=PRUEBA"
```

Interpretación:

| Síntoma | Qué ha pasado | Dónde tocar |
|---|---|---|
| `AADB2C90006` en el authorize | Han cambiado el `redirect_uri` registrado | `config.js` → `redirectUri` |
| `AADB2C90002` / política no encontrada | Han renombrado la política | `config.js` → `policy` |
| Error de cliente en el token | Han dejado de ser cliente público | Se acabó este enfoque; volver al token manual |
| Todo responde bien pero no llega el `code` | Chromium ha dejado de exponer la redirección nativa | Ver abajo |

## Si Chrome deja de exponer la redirección nativa

Es el único supuesto del diseño que depende del navegador y no de LaLiga. Hay ya
una red de seguridad por `tabs.onUpdated` en
[background.js](../../extension/src/background.js), pero si ambas fallan el flujo
se queda sin el `code`.

Para comprobarlo sin credenciales reales existe un banco de pruebas que levanta
un B2C falso y ejecuta la extensión en un Chromium real. Fue lo que validó el
diseño antes de escribirlo. Merece la pena reconstruirlo si algún día hay dudas:
un servidor que responda 302 a `authredirect://…?code=…&state=<el que llegue>` y
un `chromium.launchPersistentContext` con `--load-extension`.

## Retirada por marca

Si LaLiga denuncia la ficha, las tiendas la retiran primero y preguntan después.
Ten previsto:

- El `.xpi` firmado de Firefox alojado en tu dominio sigue funcionando aunque
  caiga la ficha de AMO (por eso se recomienda la autodistribución).
- La instalación descomprimida de Chrome (`chrome://extensions` → modo
  desarrollador) sigue funcionando siempre, y es lo que documenta hoy
  [extension.astro](../../src/pages/extension.astro). Conviene no borrar esas
  instrucciones de la web al publicar en la tienda, sólo relegarlas.
