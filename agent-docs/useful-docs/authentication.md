# Autenticación con LALIGA FANTASY

Última actualización: 2026-08-31

## Método recomendado: extensión de navegador (`extension/`)

Es el único login de un clic posible y el único que funciona con cuentas de
Google. La web sola no puede hacerlo: comprobado contra el B2C real, el único
`redirect_uri` registrado para el cliente público `af88bcff-…` es el esquema
nativo `authredirect://com.lfp.laligafantasy`; cualquier URL http/https propia
—incluido `http://localhost`— devuelve `AADB2C90006`. Lo mismo con el cliente
web `6457fa17-…`.

La extensión resuelve exactamente ese hueco: observa la redirección nativa con
`webRequest.onBeforeRedirect` antes de que el navegador la descarte, se queda
con el `code` y lo canjea con PKCE. El endpoint de token acepta
`grant_type=authorization_code` **sin secreto de cliente** (verificado: con un
code falso responde `AADB2C90090`, es decir, ya había pasado la autenticación
de cliente).

- Política del flujo: `B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN` (renderiza
  `CombinedSigninAndSignup`, que es la pantalla con el botón de Google —
  `GoogleExchange`).
- Detalles de implementación y permisos: `extension/README.md`.
- Lado web: `src/lib/auth/extension-bridge.ts` + `src/pages/extension.astro`.

## Método de reserva: token manual

Para quien no pueda o no quiera instalar la extensión.

### Pasos para el usuario

1. Abrir la web oficial de LALIGA FANTASY: `https://fantasy.laliga.com` (o la URL que use la app/web oficial).
2. Iniciar sesión con su cuenta habitual (Google, email, etc.).
3. Abrir las herramientas de desarrollo del navegador (F12) → pestaña **Consola**.
4. Ejecutar el siguiente snippet:

```javascript
localStorage.getItem('fz-accessToken')
```

5. Copiar el resultado **completo**, tal cual.
6. Pegarlo en la pestaña "Token" de `/login` (o en `.env.local` como
   `LALIGA_FANTASY_TOKEN`, ver `credentials.md`).

> Importante: pegar el objeto entero y no sólo el `access_token`. Si trae
> `refresh_token`, `getOrRefreshTokens` renueva la sesión sola y el usuario no
> tiene que repetir el proceso; si sólo se pega el JWT, caduca a las ~24 h y
> vuelven los 401. `parseFullTokens` (`src/pages/api/auth/token.ts`) acepta las
> dos formas.

## Alternativas (para fases posteriores)

### OAuth con popup

- Abrir una ventana popup apuntando a la página de login de LaLiga.
- Interceptar la respuesta del endpoint `/oauth2/v2.0/token` mediante service worker o monkey-patching de `fetch`/`XMLHttpRequest`.
- LaLigaApp implementa esto en `public/token-interceptor.js` y `public/sw.js`.
- **Complejidad:** alta. Requiere service worker y manejo de cross-origin.
- **Riesgo:** puede dejar de funcionar si LaLiga cambia el flujo o las políticas de seguridad.

### Email / password directo (Resource Owner Password Credentials)

- Endpoint: `https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_ResourceOwnerv2`
- Body: `grant_type=password`, `client_id`, `username`, `password`, `scope`, `response_type=id_token`.
- Implementado en `src/pages/api/auth/login.ts` (pestaña "Email" de `/login`).
- **Limitación de fondo:** ROPC en B2C sólo sirve para cuentas locales. Una
  cuenta federada con Google nunca podrá entrar por aquí, haga lo que haga el
  usuario. Ése es el motivo de existir de la extensión.
- **Riesgo:** la app no oficial recibiría la contraseña del usuario. Desaconsejado por seguridad y confianza.
- **Posible bloqueo:** captchas o políticas de Azure B2C.

### Refresh automático (opcional)

- Si el usuario también proporciona `refresh_token`, el proxy puede llamar a:
  - `POST https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN`
  - Body: `grant_type=refresh_token`, `client_id`, `refresh_token`, `scope=openid offline_access`
- La respuesta devuelve un nuevo `id_token` que se usa como Bearer.
- **Nota:** LaLigaApp prioriza `id_token` sobre `access_token` para usarlo como Bearer.

## Client IDs documentados

| Propósito | Client ID | Notas |
|-----------|-----------|-------|
| Web oficial | `6457fa17-1224-416a-b21a-ee6ce76e9bc0` | Solo permite redirecciones del dominio oficial. No usable para nosotros. |
| Email/nativo | `af88bcff-1157-40a0-b579-030728aacf0b` | Usar como `client_id` por defecto para refresh. |
| OAuth popup | `af88bcff-1157-40a0-b579-030728aacf0b` (fallback) | LaLigaApp intenta usar el client de la app móvil si se conoce. |

## Configuración del proxy

El proxy backend debe:

1. Recibir el token del cliente.
2. Añadirlo como `Authorization: Bearer <token>`.
3. Reenviar la petición a `https://fantasy-api.llt-services.com`.
4. Devolver la respuesta al frontend.

No almacenar el token en logs ni en base de datos. Guardar solo en memoria o en `localStorage` del cliente.

## Seguridad

- Nunca pedir la contraseña del usuario.
- Incluir avisos legales claros: "Aplicación no oficial, no afiliada a LaLiga Fantasy ni Relevo".
- No automatizar acciones que den ventaja injusta (pujas automáticas masivas).
- Implementar rate limiting en el proxy.
- Rechazar headers que no sean `Bearer` para evitar filtraciones.

## Validación del token

Para comprobar que el token funciona, llamar a:

```
GET /api/v4/user/me?x-lang=es
```

Si responde 200 con datos del usuario, el token es válido.
