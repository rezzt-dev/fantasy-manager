# Credenciales y configuración del entorno

Última actualización: 2026-07-31

## Fichero de credenciales

Crear en la raíz del proyecto un fichero llamado:

```
.env.local
```

> Este fichero debe estar incluido en `.gitignore` y **nunca subirse al repositorio**.

## Contenido mínimo

```ini
# Token Bearer obtenido desde la web/app oficial de LALIGA FANTASY.
# Caduca aproximadamente cada 24h. Si la app da errores 401, actualizar.
LALIGA_FANTASY_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1Ni...

# Cliente de Azure B2C. Valor por defecto para email/nativo.
LALIGA_CLIENT_ID=af88bcff-1157-40a0-b579-030728aacf0b

# Competición (1 = LaLiga)
COMPETITION_ID=1

# Puerto de desarrollo
PORT=3000
```

## Contenido opcional (refresh automático)

```ini
# Si se proporciona, el proxy intentará renovar el token antes de que caduque.
LALIGA_FANTASY_REFRESH_TOKEN=...

# Endpoint de refresh de Azure B2C. Valor por defecto.
LALIGA_AUTH_BASE_URL=https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token
```

## Contenido completo recomendado

```ini
# --- Credenciales del usuario (requeridas) ---
LALIGA_FANTASY_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1Ni...
LALIGA_FANTASY_REFRESH_TOKEN=

# --- Configuración de Azure B2C ---
LALIGA_CLIENT_ID=af88bcff-1157-40a0-b579-030728aacf0b
LALIGA_AUTH_BASE_URL=https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token

# --- Configuración de la competición ---
COMPETITION_ID=1

# --- Configuración del servidor/proxy ---
PORT=3000
PROXY_FANTASY_TARGET=https://fantasy-api.llt-services.com
PROXY_BASE_PATH=/api
PROXY_STATS_BASE_PATH=/stats
PROXY_TIMEOUT_MS=15000

# --- Orígenes permitidos para CORS (desarrollo) ---
APP_ALLOWED_ORIGINS=http://localhost:*,http://127.0.0.1:*

# --- Headers por defecto del proxy ---
PROXY_DEFAULT_X_APP=2
PROXY_DEFAULT_X_LANG=es
```

## Cómo obtener el token

1. Iniciar sesión en la web oficial de LALIGA FANTASY.
2. Abrir consola (F12) y ejecutar:

```javascript
JSON.parse(localStorage.getItem("auth")).status.authenticate.access_token
```

3. Copiar el resultado (sin comillas) y pegarlo en `LALIGA_FANTASY_TOKEN`.

## Cómo obtener el refresh token (opcional)

En la misma consola, tras iniciar sesión:

```javascript
JSON.parse(localStorage.getItem("auth")).status.authenticate.refresh_token
```

Copiar el valor en `LALIGA_FANTASY_REFRESH_TOKEN`.

> Nota: el refresh también puede caducar. Si falla, el proxy pedirá al usuario que vuelva a introducir el token manual.

## Comprobación rápida

Una vez configurado, el primer endpoint a probar es:

```bash
curl -H "Authorization: Bearer $LALIGA_FANTASY_TOKEN" \
     "https://fantasy-api.llt-services.com/api/v4/user/me?x-lang=es"
```

Si responde con datos del usuario, la configuración es correcta.

## Notas de seguridad

- No compartir `.env.local`.
- No incluir tokens en commits, logs ni capturas de pantalla.
- El token debe tratarse como un secreto de sesión del usuario.
- Si se detecta un token expuesto, revocar la sesión desde la app oficial.
