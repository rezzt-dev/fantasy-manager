# Autenticación con LALIGA FANTASY

Última actualización: 2026-07-31

## Método recomendado para el MVP

Dado que no somos la aplicación oficial ni tenemos un `redirect_uri` registrado en Azure B2C de LaLiga, el método más seguro y sencillo es el **token manual**.

### Pasos para el usuario

1. Abrir la web oficial de LALIGA FANTASY: `https://fantasy.laliga.com` (o la URL que use la app/web oficial).
2. Iniciar sesión con su cuenta habitual (Google, email, etc.).
3. Abrir las herramientas de desarrollo del navegador (F12) → pestaña **Consola**.
4. Ejecutar el siguiente snippet:

```javascript
JSON.parse(localStorage.getItem("auth")).status.authenticate.access_token
```

5. Copiar el valor largo que devuelve (sin comillas).
6. Pegarlo en el fichero `.env.local` del proyecto (ver `credentials.md`).

> El token caduca aproximadamente cada 24 horas. Si la app empieza a dar 401, se debe repetir el proceso.

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
