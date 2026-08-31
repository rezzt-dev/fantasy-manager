# Conector LALIGA FANTASY

Extensión mínima que permite entrar en Fantasy Manager con la cuenta real de
LALIGA FANTASY —incluidas las cuentas de Google— sin copiar tokens a mano.

## Por qué hace falta una extensión

El login de LaLiga es Azure AD B2C. El único `redirect_uri` registrado para su
cliente público es el esquema nativo de la app móvil:

```
authredirect://com.lfp.laligafantasy
```

Cualquier URL `http`/`https` propia se rechaza con `AADB2C90006`, y un navegador
no puede devolver a una web el resultado de un esquema nativo. Una extensión sí
puede ver esa redirección antes de que el navegador la descarte, quedarse con el
`code` y canjearlo. Es la única vía para un login de un clic desde el navegador.

El login por email y contraseña que ya tiene la app usa el flujo ROPC, que en
B2C sólo funciona con cuentas locales: por eso los usuarios de Google acababan
pegando el token a mano.

## Instalación

**Chrome / Edge / Brave**

1. `chrome://extensions`
2. Activa el **modo desarrollador**.
3. **Cargar descomprimida** → selecciona esta carpeta.

**Firefox**

1. Copia `manifest.firefox.json` sobre `manifest.json` (Firefox aún no acepta
   `background.service_worker` en MV3).
2. `about:debugging#/runtime/this-firefox` → **Cargar complemento temporal** →
   elige el `manifest.json`.

## Configurar tu dominio

La extensión sólo habla con `localhost:4321` y con el dominio de producción,
`fantasy-manager-mauve.vercel.app`. Si añades otro, tiene que estar en **tres**
sitios que deben coincidir:

- `manifest.json` → `host_permissions`
- `manifest.json` → `content_scripts[0].matches`
- `src/config.js` → `ALLOWED_APP_ORIGINS`

Los despliegues de preview de Vercel (`fantasy-manager-git-…vercel.app`) pasan
el filtro de `isAllowedOrigin`, pero hay que añadirlos a mano a `matches` para
que se inyecte el puente: los patrones de Chrome no admiten comodines parciales
de dominio.

## Cómo funciona

```
web (botón)  →  bridge.js  →  background.js  →  ventana de login de LaLiga
                                    ↑                      │
                                    │              el usuario entra
                                    │              (Google, email…)
                                    │                      ↓
                          captura authredirect://…?code=…  (webRequest)
                                    ↓
                          canje del code con PKCE (sin secreto)
                                    ↓
web  ←  bridge.js  ←  tokens  ←─────┘   →  POST /api/auth/token (sesión httpOnly)
```

Detalles que importan:

- **PKCE** (`S256`) con `state` verificado: la respuesta se descarta si no
  coincide con la petición que la originó.
- El estado del flujo vive en `chrome.storage.session`, no en memoria: el
  service worker puede morir mientras el usuario se loguea (MV3 lo mata a los
  30 s de inactividad) y el flujo sobrevive.
- El resultado se entrega con `tabs.sendMessage`, no con el `sendResponse` del
  mensaje inicial, que no sobrevive a ese reinicio.
- `bridge.js` sólo acepta mensajes de la propia ventana (`event.source ===
  window`) y en los orígenes del manifest.
- Se prefiere `id_token` como Bearer, que es lo que espera la API de Fantasy
  (ver `src/lib/fantasy/api-proxy.ts`).

## Permisos y por qué

| Permiso | Para qué |
|---|---|
| `webRequest` | Ver la redirección a `authredirect://` (sólo en `login.laliga.es`). Es observacional: no bloquea ni modifica tráfico. |
| `tabs` | Abrir y cerrar la ventana de login y entregar el resultado a la pestaña correcta. |
| `storage` | Guardar el `code_verifier` y el `state` mientras dura el login. |
| `host_permissions` | `login.laliga.es` para el canje del token; el dominio de la app para el puente. |

No hay analítica, ni servidores propios, ni acceso a ninguna otra web.

## Limitaciones conocidas

- **Sin publicar en las stores.** De momento se instala descomprimida; en
  Firefox el complemento temporal se descarga al cerrar el navegador. Los pasos
  para publicarla están en `agent-docs/publicacion-extension/`.
- **Solo escritorio.** Chrome en Android no admite extensiones, y Firefox para
  Android no implementa `windows.create`, que es lo que abre la ventana de
  login. `strict_min_version` es 140 (la primera que soporta
  `data_collection_permissions`, obligatorio en AMO).
- **Depende de que Chrome exponga la redirección nativa** en
  `webRequest.onBeforeRedirect`. Hay un segundo mecanismo de captura por
  `tabs.onUpdated` como red de seguridad, pero si Chromium dejara de exponerla
  el flujo se quedaría sin el `code`.
- Si LaLiga rota su `client_id` o su política B2C, hay que actualizar
  `src/config.js`.
