# LALIGA FANTASY Manager

Aplicación web para gestionar equipos de LALIGA FANTASY. Se conecta a la API oficial a través de un proxy propio, permite iniciar sesión con la cuenta de la app y genera recomendaciones de compra, venta, alineación y cláusulas por cada liga en la que participes.

## Stack

- [Astro 7](https://astro.build/) — SSR + rutas API + sesiones del servidor
- [React 18](https://react.dev/) — componentes interactivos (React 19 daba problemas de hidratación con Vite)
- [Tailwind CSS 3](https://tailwindcss.com/) — estilos
- [pnpm](https://pnpm.io/) — gestor de paquetes
- [TanStack Query](https://tanstack.com/query) — fetching y caché
- [Zustand](https://github.com/pmndrs/zustand) — estado cliente
- [@astrojs/node](https://docs.astro.build/es/guides/integrations-guide/node/) — adapter standalone
- [Playwright](https://playwright.dev/) — tests end-to-end (opcional)

## Requisitos

- Node.js >= 22.12.0
- pnpm

## Instalación

```bash
pnpm install
```

## Configuración

Crea un fichero `.env.local` en la raíz del proyecto (ya lo has creado si has seguido la guía). Plantilla en `.env.example`:

```env
# Token de acceso de LALIGA FANTASY (fallback para desarrollo)
LALIGA_FANTASY_TOKEN="ey..."

# Configuración del proxy (valores por defecto)
PROXY_FANTASY_TARGET="https://fantasy-api.llt-services.com"
PROXY_DEFAULT_X_APP="2"
PROXY_DEFAULT_X_LANG="es"
PROXY_TIMEOUT_MS="15000"
PROXY_DEFAULT_USER_AGENT="fantasy-manager/0.1"

# Configuración de login ROPC (usados por /api/auth/login)
LALIGA_AUTH_BASE_URL="https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token"
LALIGA_CLIENT_ID="af88bcff-1157-40a0-b579-030728aacf0b"
LALIGA_REDIRECT_URI="authredirect://com.lfp.laligafantasy"
PORT=4321
```

> **Nota:** `.env.local`, `.env.credentials` y la carpeta `.astro/sessions` no deben versionarse.

### Cómo obtener el token

Hay tres formas:

1. **Login con email/password**: usa el formulario principal. Llama al flujo ROPC de Azure B2C. Solo funciona si la cuenta de LALIGA FANTASY tiene una contraseña local en B2C (normalmente no funciona si iniciaste sesión exclusivamente con Google).
2. **Token de la web oficial**: abre la web de LALIGA FANTASY, inicia sesión con Google y ejecuta en la consola:
   ```js
   JSON.parse(localStorage.getItem('fz-accessToken')).access_token
   ```
   Pega el valor en la pestaña “Token” del login de esta app.
3. **Manual**: guarda el `access_token` en `LALIGA_FANTASY_TOKEN` del `.env.local` para desarrollo.

## Desarrollo

```bash
pnpm dev
```

La app estará en `http://localhost:4321`.

## Build de producción

```bash
CI=true pnpm build
pnpm preview
```

El build genera un servidor standalone en `dist/` gracias a `@astrojs/node`.

## Tests

```bash
# Instalar navegador de Chromium la primera vez
pnpm exec playwright install chromium

# Ejecutar tests e2e (requiere `pnpm dev` en otra terminal)
pnpm exec playwright test
```

Un test de login verifica que el formulario de token redirige correctamente al dashboard.

## Funcionalidades actuales

- Login con email/password de LALIGA FANTASY (ROPC) o con access token JWT (para cuentas de Google).
- Almacenamiento de token en sesiones del servidor Astro para evitar cookies grandes.
- Listado de ligas del usuario.
- Resumen de cada liga: dinero disponible, valor del equipo, jugadores, mercado, alineación.
- Panel de recomendaciones:
  - **Comprar**: jugadores del mercado con buena relación precio/puntos esperados, cubriendo necesidades de la plantilla, priorizando titulares habituales y descartando jugadores con noticias negativas recientes.
  - **Vender**: jugadores lesionados, dudosos, con noticias negativas (enfermedad, sanción, lesión), suplentes habituales que apenas suman o con cláusula desproporcionada; también cuando hay alta demanda rival.
  - **Cambiar alineación**: sustituir titulares no disponibles o con noticias negativas recientes, eligiendo al suplente con mejor combinación de puntos esperados y titularidad habitual.
  - **Clausulazo**: jugadores de equipos rivales disponibles (sin blindar y sin cláusula bloqueada — respeta las 2 semanas de protección tras un clausulazo) cuya cláusula puedes pagar y que mejoran tu plantilla.
  - **Subir cláusula / Proteger cláusula**: proteger jugadores clave calculando el riesgo real de que otro manager los clausule (los blindados o con cláusula bloqueada se consideran protegidos y no generan falsas alarmas).
  - **Capitán**: sugerir el mejor capitán de la jornada entre los titulares disponibles, penalizando noticias negativas y suplentes habituales.
- **Titularidad habitual**: el sistema estima si cada jugador de tu plantilla es titular o suplente en su equipo real (minutos jugados por jornada cuando la temporada está en curso; proxy por puntos de la temporada pasada en pretemporada) y lo tiene en cuenta en vender, alinear, fichar y elegir capitán. Visible con un badge en "Mi Equipo".
- **Noticias de prensa**: el sistema consulta RSS de prensa deportiva española (Marca, AS, Mundo Deportivo, Sport y 20minutos), asocia las noticias a los jugadores por nombre y las clasifica por categorías (lesión, enfermedad, sanción, duda, vuelta, racha, rotación, mercado). Esas señales alimentan las recomendaciones y se muestran con enlace a la noticia original. Configurable con `NEWS_RSS_FEEDS` y `NEWS_CACHE_TTL_MS`.
- Pestaña **Rivales**: plantilla completa de cada miembro de la liga con el estado de protección de cada jugador (Disponible / Protegido hasta fecha / Blindado) y marca los que puedes clausular con tu dinero disponible.
- **Alineación óptima recomendada**: prueba todas las formaciones disponibles y elige el once que maximiza los puntos esperados de la jornada, mostrando la formación ganadora, los puntos esperados frente a tu alineación actual, los cambios sugeridos y el banquillo. Visible en la pestaña "Alineación".
- **Estimador de puntos v2**: mezcla hasta 2 temporadas (65% temporada en curso + 35% temporada pasada cuando hay datos suficientes; en pretemporada usa la 25/26) y ajusta por posición, localía, dificultad del rival (valor agregado del equipo contrario), estado físico, titularidad habitual y noticias recientes.
- **Mejores movimientos de la jornada**: sub-sección destacada en "Recomendaciones" con las 5 acciones de mayor impacto (máx. 2 por tipo) considerando plantilla propia, mercado y plantillas rivales, cada una con su origen y puntuación de impacto (0-100).
- Mercado enriquecido: badges de titularidad, chips de noticias y relación precio/valor en cada jugador en venta.
- Resumen con **alertas de plantilla**: jugadores no disponibles, noticias negativas duras y cláusulas en riesgo alto de un vistazo.
- Sección completa de **Estadísticas** con gráficos profesionales: clasificación, valor de equipos, distribución por posición, jugadores, mercado, comparativa de rivales y análisis de riesgo de cláusulas.
- Análisis independiente por cada liga en la que participa el usuario.

## Estructura de rutas API

| Ruta | Descripción |
|------|-------------|
| `POST /api/auth/login` | Login ROPC con email/password. Guarda token en sesión. |
| `POST /api/auth/token` | Guarda un access token JWT en la sesión (útil para cuentas de Google). |
| `POST /api/auth/logout` | Cierra sesión. |
| `GET /api/proxy/{ruta-oficial}` | Proxy genérico a la API oficial. |
| `GET /api/recommendations?leagueId=&teamId=` | Recomendaciones para una liga/equipo. |
| `GET /api/league-analysis?leagueId=&teamId=` | Análisis completo de la liga: rivales, estadísticas, riesgos y capitán. |

## Datos de prueba

- Liga: `princesos` (`leagueId: 017833924`)
- Equipo: `teamId: 37390189`
- Usuario: `nicotiza fc`

## Documentación técnica

Ver `agent-docs/useful-docs/`:

- `api-reference.md` — endpoints oficiales y propios.
- `architecture.md` — arquitectura y stack.
- `implementation-notes.md` — notas de implementación, problemas resueltos y próximos pasos.

## Licencia

Privado — uso personal del autor.
