# Análisis funcional: asistente web para LALIGA FANTASY

## 1. Resumen ejecutivo

Se propone construir una aplicación web **no oficial** que permita al usuario iniciar sesión con su cuenta de **LALIGA FANTASY** (Relevo), elegir una de sus ligas y recibir recomendaciones de gestión por cada liga de forma independiente:

- Jugadores a **vender** (sobrevalorados, bajando de valor, lesionados, suplentes fijos, baja demanda).
- Jugadores a **comprar** (subvalorados, alta forma, buen fixture, tendencia alcista en el mercado).
- Jugadores a **cambiar** (sustitutos de la misma posición con mejor rendimiento/valor o que liberen dinero).
- Alineación óptima considerando el **dinero disponible** real del equipo (efectivo + crédito por valor de plantilla + 20 % del valor de equipo según la regla de mercado de LaLiga Fantasy).
- Alertas de mercado, cláusulas de compra y fixture.

Stack propuesto: **Astro** (páginas estáticas/server islands), **React** (componentes interactivos), **pnpm** y un pequeño proxy/backend propio para evitar CORS y proteger secretos.

## 2. Estado de los repositorios y fuentes guía analizadas

| Fuente | Estado / utilidad para este proyecto |
|--------|--------------------------------------|
| [carlosgeos/laligafantasy](https://github.com/carlosgeos/laligafantasy) | Herramienta en Clojure (2020). Requiere `USERNAME`, `PASSWORD`, `LEAGUE_ID`, `MANAGER_ID`. Los endpoints que usaba están obsoletos, pero sus ideas de análisis (rendimiento vs precio, picker de alineación, tendencias de mercado) son aplicables. **No usable directamente.** |
| [alxgarci/marca-fantasy-api-scraper-updated](https://github.com/alxgarci/marca-fantasy-api-scraper-updated) | Scraper Python. El propio README dice: *"Actualmente no funciona el código, dado que han cambiado endpoints de la Api (ya no existe acceso web, solo en app)"*. **No usable como base.** |
| [Externoak/LaLigaApp](https://github.com/Externoak/LaLigaApp) | Aplicación React + Electron actualizada a la temporada 2026/27. Contiene los endpoints, adaptadores de respuesta y flujo OAuth de Azure B2C de LaLiga. **Es la guía más fiable y completa.** |
| `https://api-contenthub.laliga.com/` | API pública de contenido multimedia de LaLiga (noticias, imágenes, vídeos). **No proporciona datos de fantasy** ni plantillas/mercado. No es útil para el objetivo principal. |
| [futbolfantasy.com](https://www.futbolfantasy.com/) y `/analytics` | Página de terceros con tendencias de mercado, onces probables y análisis. Se puede scrapear selectivamente (con limitaciones legales) como fuente de enriquecimiento, no como fuente principal. |

Conclusión: la única vía realista es replicar/limpiar la arquitectura de **LaLigaApp**, adaptándola a una web Astro/React y centralizando las recomendaciones.

## 3. API de LALIGA FANTASY: autenticación y endpoints necesarios

La API oficial es `https://fantasy-api.llt-services.com`. Requiere un **token JWT** obtenido a través del **Azure AD B2C de LaLiga** (`login.laliga.es`). No existe documentación pública oficial, por lo que los endpoints y campos se infieren de los repositorios guía.

### 3.1 Autenticación

- Flujo OAuth2 / OpenID Connect sobre Azure B2C.
- Existen dos `client_id` documentados en el código de LaLigaApp:
  - Web: `6457fa17-1224-416a-b21a-ee6ce76e9bc0`
  - Email/password y nativo: `af88bcff-1157-40a0-b579-030728aacf0b`
- Para una aplicación web que no es el dominio oficial, el inicio de sesión más sencillo es pedir al usuario que **inicie sesión en la web/app oficial de LaLiga Fantasy** y nos proporcione el `id_token` (o `access_token`) resultante. El backend lo usa como Bearer para llamar a la API.
- El token caduca aproximadamente cada 24 horas. Si se proporciona `refresh_token`, el backend puede renovarlo automáticamente.

**Opciones de login para esta web:**

1. **Modo manual seguro (recomendado para MVP):** el usuario pega su token en un campo de configuración. El token se almacena solo en `localStorage` (o en memoria) y se envía a nuestro proxy, que añade el `Authorization: Bearer <token>` a las llamadas a LaLiga.
2. **Modo OAuth popup:** abrir la pantalla oficial de LaLiga en popup, interceptar el token mediante service worker (como hace LaLigaApp). Más complejo, requiere service worker y configuración de redirect URI no registrada por nosotros (frágil).
3. **Email/password:** usar directamente el endpoint de Azure B2C con Resource Owner Password Credentials. Poco recomendable porque el usuario confiaría su contraseña a una app no oficial y la política de LaLiga puede bloquearlo o requerir captchas.

Para la primera versión se sugiere la **opción 1** (token manual), con el backend gestionando el refresh opcional.

### 3.2 Endpoints clave (temporada 2026/27)

Base: `https://fantasy-api.llt-services.com`
Competición: `1` (LaLiga) → prefijo `/api/v1/competition/1`

| Método | Endpoint | Uso en el proyecto |
|--------|----------|--------------------|
| GET | `/api/v4/user/me?x-lang=es` | Obtener usuario actual y `managerId`. |
| GET | `/api/v1/competition/1/leagues?x-lang=es` | Listar las ligas del usuario. |
| GET | `/api/v1/competition/1/leagues/{leagueId}/standing?x-lang=es` | Clasificación y datos de todos los equipos de la liga (para contextualizar rivales). |
| GET | `/api/v1/competition/1/leagues/{leagueId}/teams/{teamId}?x-lang=es` | Plantilla completa de un equipo (tus jugadores, posiciones, puntos, valor, estado, cláusulas). |
| GET | `/api/v1/competition/1/teams/{teamId}/money?x-lang=es` | **Dinero disponible** del equipo (efectivo). |
| GET | `/api/v1/competition/1/league/{leagueId}/market?x-lang=es` | Mercado de la liga: jugadores en venta, pujas, ofertas, propietarios. |
| GET | `/api/v1/competition/1/players?x-lang=es` | Catálogo maestro de jugadores de LaLiga (precios, posiciones, puntos, medias, equipos). |
| GET | `/api/v1/competition/1/player/{playerId}/league/{leagueId}?x-lang=es` | Detalle de un jugador en una liga concreta. |
| GET | `/api/v1/competition/1/teams/{teamId}/lineup?x-lang=es` | Alineación actual. |
| GET | `/api/v1/competition/1/teams/{teamId}/lineup/week/{week}?x-lang=es` | Alineación por jornada. |
| GET | `/api/v1/competition/1/calendar?weekNumber={n}&x-lang=es` | Partidos de la jornada (local/visitante). |
| GET | `/api/v1/competition/1/week/current?x-lang=es` | Jornada actual. |
| GET | `/api/v3/teams-master?x-lang=es` | Mapeo de IDs de equipos a nombres, escudos, slugs. |
| POST | `/api/v1/competition/1/league/{leagueId}/market/{marketId}/bid?x-lang=es` | Pujar (si se implementan acciones). |
| POST/PUT/DELETE | Variantes de mercado, cláusulas y alineación | Opcionales en fases avanzadas. |

> **Nota:** la temporada 2026/27 cambió endpoints y shapes. LaLigaApp usa `responseAdapters` para normalizar respuestas (`/v6/players`, `/v1/competition/.../leagues`, etc.). Nuestro backend debe incluir adaptadores similares.

### 3.3 Cálculo del dinero real disponible para recomendaciones

Según la lógica de LaLigaApp y la propia mecánica del juego, el dinero disponible para operar no es solo el efectivo:

```
efectivo           = GET /teams/{teamId}/money
valor_plantilla    = suma de valores de mercado de los jugadores de tu equipo
bono_20_plantilla  = floor(valor_plantilla * 0.20)
dinero_para_pujas  = efectivo + bono_20_plantilla - dinero_bloqueado_en_pujas
```

El motor de recomendaciones debe usar `dinero_para_pujas` como tope realista para compras/pujas, y no solo el efectivo en caja.

## 4. Arquitectura propuesta

### 4.1 Stack tecnológico

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Package manager | **pnpm** | Velocidad, ahorro de disco, consistente con el ecosistema moderno. |
| Framework web | **Astro** | Excelente para páginas con poca JS, islands de React donde se necesite interactividad, SSR/SSG flexible. |
| UI interactiva | **React 18+** | Componentes de tablas, formularios, gráficos, modales. |
| Estilos | Tailwind CSS (o CSS modules) | Rápido y coherente con Astro/React. |
| Estado cliente | Zustand o React Query | Ligero, persistente para preferencias. |
| Backend / proxy | **Astro endpoints** (`src/pages/api`) o un servidor Node/Express aparte | Evita CORS y protege el `client_id`/token de LaLiga. |
| Gráficos | Recharts o Chart.js | Tendencias de valor, puntos, fixture. |
| Cálculo de alineación | Algoritmo propio en JS | Maximizar puntos esperados respetando formaciones y restricciones. |

### 4.2 Estructura de directorios sugerida

```
fantasy-manager/
├── .env.example                 # Variables de entorno (sin secretos)
├── .env                         # Fichero de credenciales (NO versionar)
├── astro.config.mjs
├── package.json
├── pnpm-lock.yaml
├── public/
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── react/
│   │   │   ├── LoginToken.jsx
│   │   │   ├── LeagueSelector.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── PlayerCard.jsx
│   │   │   ├── RecommendationPanel.jsx
│   │   │   └── MarketTrends.jsx
│   │   └── astro/
│   │       ├── Header.astro
│   │       └── Footer.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── ligas/
│   │   │   └── [leagueId].astro
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── refresh.ts
│   │       │   └── user.ts
│   │       ├── leagues.ts
│   │       ├── teams/
│   │       │   ├── [teamId].ts
│   │       │   └── [teamId]/money.ts
│   │       ├── market/
│   │       │   └── [leagueId].ts
│   │       ├── players.ts
│   │       ├── recommendations/
│   │       │   └── [leagueId].ts
│   │       └── scrapes/
│   │           └── futbolfantasy.ts
│   ├── lib/
│   │   ├── api-client.ts        # Cliente hacia fantasy-api.llt-services.com
│   │   ├── adapters.ts          # Normalización de respuestas
│   │   ├── auth.ts              # Gestión de tokens
│   │   ├── recommendations.ts   # Motor de recomendaciones
│   │   ├── lineup-optimizer.ts  # Algoritmo de alineación
│   │   └── money.ts             # Cálculo de dinero disponible
│   └── stores/
│       └── authStore.ts
└── tests/
    └── recommendations.test.ts
```

### 4.3 Flujo de usuario

1. **Login:** el usuario introduce su token Bearer de LALIGA FANTASY (copiado de la app/web oficial). El backend lo valida llamando a `/user/me`.
2. **Selección de liga:** se listan las ligas con `/leagues`; el usuario elige una. Cada liga se analiza de forma independiente.
3. **Identificación del equipo:** con `/standing` se encuentra el `teamId` del usuario en esa liga.
4. **Carga de datos:** se obtienen en paralelo:
   - Plantilla del usuario (`/teams/{teamId}`).
   - Dinero (`/teams/{teamId}/money`).
   - Mercado (`/league/{leagueId}/market`).
   - Catálogo de jugadores (`/players`).
   - Calendario y jornada actual (`/calendar`, `/week/current`).
   - Tendencias de mercado de futbolfantasy.com (scraping opcional vía proxy).
5. **Panel de recomendaciones:** el motor genera sugerencias agrupadas por categoría (vender, comprar, cambiar, alinear).
6. **Acciones (futuras):** desde el panel se podría pujar, vender o ajustar la alineación si el usuario lo autoriza.

## 5. Módulos funcionales

### 5.1 Gestión multi-liga

- Guardar en el estado el `leagueId` seleccionado.
- Cada liga tiene su propio `teamId`, plantilla, dinero y mercado.
- La página `/ligas/[leagueId]` carga todo el contexto de esa liga.
- No compartir caché de mercado ni plantilla entre ligas.

### 5.2 Motor de recomendaciones (core)

Entradas:
- Plantilla del usuario (jugadores, posición, valor, puntos, media, estado, cláusula, blindaje).
- Dinero efectivo y bono del 20 %.
- Mercado de la liga (jugadores en venta, pujas, precios).
- Catálogo general de jugadores (puntos, medias, fixture, posición, equipo).
- Tendencias de valor de futbolfantasy.com (subidas/bajadas).
- Calendario (rival, localía, dificultad estimada).

Recomendaciones a generar:

| Tipo | Reglas heurísticas iniciales | Ejemplo de salida |
|------|------------------------------|-------------------|
| **Vender** | Jugador con valor de mercado alto y media baja; lesionado/sancionado; titularidad dudosa; tendencia bajista; oferta activa superior a su valor esperado. | "Vende a Vini Jr. Hay ofertas de 45 M y su media (4.8) no justifica el precio." |
| **Comprar** | Jugador subvalorado, media alta, fixture favorable, tendencia alcista, disponible en mercado o por cláusula, y cabe dentro del dinero para pujas. | "Puja por Isak (22 M, media 7.2, próximo rival recibe 1.8 goles/esperado)." |
| **Cambiar** | Sustituir un titular problemático por un jugador de similar posición con mejor ratio puntos/valor y que libere o no consuma demasiado dinero. | "Cambia a Pedri por Baena: ahorras 8 M y ganas 0.4 puntos/jornada de media." |
| **Alinear** | Resolver la formación óptima (11 titulares) maximizando puntos esperados, respetando posiciones y jugadores disponibles. | "Formación 4-4-2: portero X; defensas Y; ...; suplentes Z." |
| **Cláusulas / blindaje** | Alertar si un jugador clave tiene cláusula baja o no está blindado. | "Blinda a Raphinha: cláusula 28 M, valor de mercado 35 M." |
| **Fixture** | Jugadores con rivales débiles en las próximas jornadas. | "Fichajes interesantes esta jornada: delanteros vs Celta, Alavés." |

> La primera versión puede usar heurísticas simples y pesos configurables. En fases posteriores se puede añadir un modelo de puntos esperados (xPoints) basado en stats oficiales o en datos históricos de la propia API.

### 5.3 Algoritmo de alineación óptima

- Input: lista de jugadores disponibles (no lesionados/sancionados), formaciones permitidas (3-4-3, 3-5-2, 4-3-3, 4-4-2, 4-5-1, 5-3-2, 5-4-1).
- Criterio: maximizar suma de puntos esperados por jornada (media ponderada por fixture y estado).
- Restricciones: 1 portero, exactamente 11 titulares, formación válida.
- Implementación: fuerza bruta con poda (7 formaciones × combinaciones de jugadores) es viable porque el equipo tiene ~20 jugadores.

### 5.4 Cálculo de dinero y viabilidad de compras

- `dinero_para_pujas = efectivo + floor(valor_plantilla * 0.20) - pujas_pendientes`.
- El motor de "comprar" filtra jugadores cuyo precio de mercado ≤ `dinero_para_pujas`.
- Para cláusulas, el coste es la cláusula exacta del jugador (que se lee de `/teamData`).
- Se descartan jugadores cuyo valor supera el presupuesto, evitando recomendaciones irreales.

### 5.5 Enriquecimiento con datos de futbolfantasy.com

- Proxy propio a `https://www.futbolfantasy.com/analytics/laliga-fantasy/mercado`.
- Parsear el HTML para extraer subidas/bajadas de valor por jugador, posición y equipo.
- Emparejar jugadores por nombre + posición + equipo (con normalización de nombres y apellidos).
- Usar como un factor más del motor de recomendaciones, no como dato primario.

## 6. Consideraciones legales, éticas y de seguridad

- **No es una aplicación oficial.** Debe incluir avisos claros de que no está afiliada a LaLiga Fantasy ni a Relevo.
- **No almacenar credenciales del usuario.** El token se guarda solo en el cliente (`localStorage` o memoria) y se envía al proxy. Idealmente, el backend no persiste tokens ni logs de tokens.
- **No hacer scraping masivo.** Usar la API oficial siempre que sea posible. El scraping de futbolfantasy.com debe ser puntual, con caché y respetando `robots.txt` y rate limits.
- **Respetar los Términos de Servicio de LaLiga Fantasy.** Evitar automatizar acciones que den ventaja injusta (por ejemplo, bots de puja automática). Las recomendaciones son informativas; las acciones requieren confirmación explícita del usuario.
- **CORS:** todas las llamadas a `fantasy-api.llt-services.com` deben pasar por el proxy backend propio. El navegador no puede llamar directamente porque la API no envía CORS para orígenes arbitrarios.

## 7. Credenciales y fichero de configuración

Para empezar el proyecto necesito que el usuario proporcione **su token de sesión de LALIGA FANTASY** (no su email/contraseña). El token se usará para validar los endpoints y desarrollar/testear el proxy.

### Fichero de credenciales

Crea en la raíz del proyecto un fichero llamado:

```
.env.local
```

Con el siguiente contenido (rellena solo el token; el resto puede dejarse con los valores por defecto):

```ini
# Token Bearer obtenido desde la web/app oficial de LALIGA FANTASY.
# Caduca aproximadamente cada 24h. Si caduca, solo hay que actualizarlo.
LALIGA_FANTASY_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1Ni...

# Opcional: si tienes refresh_token, inclúyelo para que el proxy lo renueve automáticamente.
LALIGA_FANTASY_REFRESH_TOKEN=...

# Cliente de Azure B2C. Usar el de email/nativo por defecto.
LALIGA_CLIENT_ID=af88bcff-1157-40a0-b579-030728aacf0b

# Competición (1 = LaLiga)
COMPETITION_ID=1

# Puerto de desarrollo
PORT=3000
```

> **Importante:** `.env.local` debe estar incluido en `.gitignore` y nunca subirse al repositorio.

### Cómo obtener el token

1. Abre la web oficial de LALIGA FANTASY e inicia sesión con tu cuenta.
2. Abre las herramientas de desarrollo (F12) → Consola.
3. Pega y ejecuta:

```javascript
JSON.parse(localStorage.getItem("auth")).status.authenticate.access_token
```

4. Copia el valor (sin comillas) y pégalo en `LALIGA_FANTASY_TOKEN` del `.env.local`.

Alternativa: si usas la app móvil, es más complicado; lo habitual es usar la versión web.

## 8. Roadmap sugerido

### Fase 0: Setup y descubrimiento (1-2 días)
- Crear proyecto Astro + React + pnpm.
- Configurar proxy base hacia `fantasy-api.llt-services.com`.
- Validar el token del usuario contra `/user/me`.
- Documentar shapes de respuesta reales.

### Fase 1: Multi-liga y datos básicos (2-3 días)
- Listar ligas del usuario.
- Seleccionar liga y cargar equipo, dinero y mercado.
- Mostrar plantilla y clasificación.

### Fase 2: Motor de recomendaciones (3-5 días)
- Heurísticas de comprar/vender/cambiar/alinear.
- Integrar cálculo de dinero real (efectivo + 20 % plantilla).
- Panel de recomendaciones con explicaciones.

### Fase 3: Enriquecimiento (2-3 días)
- Scraping de tendencias de futbolfantasy.com.
- Calendario y fixture.
- Alertas de cláusulas y blindaje.

### Fase 4: Acciones y pulido (opcional)
- Pujar, vender, ajustar alineación desde la web (requiere confirmación del usuario).
- Tests, responsive, modo oscuro, PWA.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| LaLiga cambia endpoints o autenticación | Mantener adaptadores centralizados (como `responseAdapters.js` de LaLigaApp) y monitorizar. |
| Token caduca rápido | Implementar refresh automático si el usuario proporciona `refresh_token`. |
| CORS / bloqueo del proxy | Proxy propio en el backend Astro. No exponer secretos en el cliente. |
| Datos de scraping de futbolfantasy cambian de estructura | Aislar el parser; fallar graciosamente y usar caché. |
| Términos de servicio de LaLiga | No realizar acciones automáticas; solo recomendaciones informativas. Aviso legal visible. |
| Dependencia de un token manual | En fase 2 valorar OAuth popup o email/password con el consentimiento del usuario. |

## 10. Conclusión

El proyecto es viable técnicamente. La fuente de verdad debe ser la **API oficial de LALIGA FANTASY** (`fantasy-api.llt-services.com`), usando la arquitectura de autenticación y proxy demostrada por **LaLigaApp**. El motor de recomendaciones debe considerar el **dinero real disponible** (efectivo + 20 % del valor de plantilla) para ser útil. El scraper de **futbolfantasy.com** es un enriquecimiento opcional, no una dependencia crítica.

**Próximo paso:** crear el proyecto Astro + React + pnpm y, una vez que el usuario proporcione el `.env.local` con su token, validar el acceso a la API y comenzar a implementar el proxy y la carga de datos por liga.
