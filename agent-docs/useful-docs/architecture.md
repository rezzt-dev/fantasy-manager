# Arquitectura técnica de `fantasy-manager`

> Fecha: 2026-07-31  
> Stack: Astro 7 + React 19 + TypeScript + pnpm + Tailwind CSS  
> Objetivo: aplicación web que se conecta a la API oficial de LALIGA FANTASY y recomienda gestión de equipo por liga.

## Stack tecnológico

| Capa | Tecnología | Motivo |
|------|------------|--------|
| Framework web | Astro | SSR, rutas API integradas, rendimiento, islands para React. |
| Componentes interactivos | React 18 | Formularios, dashboards, gráficos. Se bajó de React 19 por problemas de hidratación con Vite. |
| Lenguaje | TypeScript | Tipado para modelos de datos y endpoints. |
| Gestor de paquetes | pnpm | Rápido y eficiente en disco. |
| Estilos | Tailwind CSS 3 | Utilidades rápidas, paleta `primary` personalizada. |
| Estado cliente | Zustand | Ligero para auth. |
| Fetching | React Query (TanStack) | Caché, refresco, estados de carga. |
| Sesiones | Astro sessions (`Astro.session`) | Guarda el token en el servidor; al cliente solo se envía un ID de sesión. |
| Proxy | Astro API routes (`src/pages/api/proxy`) | Evita CORS y oculta tokens de la API oficial. |
| Gráficos | Recharts | Tendencias de valor, puntos, etc. (preparado para futuro). |
| Adapter | `@astrojs/node` (standalone) | Build autocontenido para Node. |
| Tests e2e | Playwright | Verifica flujos críticos como login → dashboard. |

## Estructura de carpetas actual

```
fantasy-manager/
├── .env.credentials              # Email y password (no versionar)
├── .env.local                  # Tokens y config del proxy (no versionar)
├── .env.example                # Plantilla
├── astro.config.mjs
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tailwind.config.mjs
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── auth/LoginForm.tsx
│   │   ├── QueryProvider.tsx
│   │   ├── DashboardContainer.tsx
│   │   ├── league/LeagueSummary.tsx
│   │   └── recommendations/RecommendationPanel.tsx
│   ├── lib/
│   │   ├── env.ts              # Helper para leer env (import.meta.env + process.env)
│   │   ├── fantasy/
│   │   │   └── api.ts          # Cliente hacia nuestro proxy
│   │   └── recommendations/
│   │       └── engine.ts       # Motor v1 de recomendaciones
│   ├── pages/
│   │   ├── index.astro
│   │   ├── login.astro
│   │   ├── dashboard.astro
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login.ts
│   │       │   └── logout.ts
│   │       ├── proxy/[...path].ts
│   │       └── recommendations.ts
│   ├── stores/
│   │   └── authStore.ts
│   ├── styles/
│   │   └── global.css
│   └── types/
│       └── fantasy.ts
└── agent-docs/
    └── useful-docs/
        ├── api-reference.md
        ├── architecture.md
        └── implementation-notes.md
```

## Flujo de datos

1. **Login**
   - El usuario introduce email y password en la UI.
   - `POST /api/auth/login` llama al endpoint ROPC de Azure B2C.
   - Se guarda `access_token` (y el resto de tokens) en cookie `fantasy_tokens` HttpOnly.
   - Si no hay cookie, el proxy y el endpoint de recomendaciones usan `LALIGA_FANTASY_TOKEN` como fallback de desarrollo.

2. **Selección de liga**
   - `DashboardContainer` llama a `GET /api/proxy/v1/competition/1/leagues?x-lang=es`.
   - El usuario elige una liga. El componente pasa el objeto `FantasyLeague` a `LeagueSummary` y `RecommendationPanel`.

3. **Carga de datos de una liga**
   - `LeagueSummary` carga plantilla, dinero, alineación y mercado vía `/api/proxy/v1/competition/1/...`.
   - `RecommendationPanel` llama a `GET /api/recommendations?leagueId=...&teamId=...`, que internamente carga todos los datos y genera recomendaciones.

4. **Motor de recomendaciones**
   - Recibe liga, plantilla, alineación, mercado, dinero, clasificación, jornada y calendario.
   - Genera recomendaciones: vender, comprar, cambiar alineación, subir cláusula.
   - Ordena por prioridad (alta/media/baja).

5. **Acciones (futuro)**
   - Pujar, vender, aceptar ofertas, cambiar alineación, etc., vía endpoints POST/PUT/DELETE del proxy.

## API propia (rutas actuales)

| Ruta propia | Método | Descripción |
|-------------|--------|-------------|
| `/api/auth/login` | POST | Login con email/password. Devuelve cookie de sesión. |
| `/api/auth/logout` | POST | Cierra sesión. |
| `/api/auth/token` | POST | Guarda un access token JWT en la cookie (cuentas Google). |
| `/api/proxy/{ruta-oficial}` | GET/POST/PUT/DELETE/PATCH | Proxy genérico a la API de LALIGA FANTASY. |
| `/api/recommendations?leagueId=&teamId=` | GET | Recomendaciones para una liga y equipo. |

## Seguridad

- **Nunca exponer el token de LaLiga en el cliente**. Siempre pasar por el proxy backend o por los endpoints propios.
- Usar **cookies httpOnly** para la sesión de nuestra app.
- No versionar `.env.credentials`, `.env.local` ni ficheros con tokens.
- En producción, encriptar la cookie y usar `Secure` + `SameSite=Strict` bajo HTTPS.
- Implementar renovación automática de token con `refresh_token`.

## Motor de recomendaciones v1

### Entradas

- `league`: datos de la liga (premium, cláusulas, formaciones permitidas).
- `teamData`: plantilla con jugadores, posiciones, estados, cláusulas, valor de mercado.
- `lineup`: alineación actual.
- `market`: jugadores en venta.
- `money`: dinero disponible e inversión.
- `standing`: clasificación de la liga.
- `allPlayers`: catálogo completo de jugadores.
- `matches`: partidos de la jornada actual.
- `currentWeek`: número de jornada.

### Salidas

- `type`: `buy`, `sell`, `change_lineup`, `increase_clause`, `decrease_clause`, `wait`, `watch`.
- `priority`: `high`, `medium`, `low`.
- `player`: jugador implicado.
- `reason`: explicación corta.
- `details`: datos de soporte (precio, puntos esperados, cláusula, etc.).
- `suggestedAction`: acción concreta para el usuario.

### Reglas actuales

1. **Vender**: jugadores propios lesionados/dudosos o con cláusula muy por encima del valor de mercado y baja expectativa de puntos.
2. **Comprar**: jugadores del mercado asequibles con buena relación puntos esperados/precio.
3. **Alinear**: sustituir titulares no disponibles por reservas sanas de la misma posición.
4. **Cláusulas**: subir cláusulas de jugadores clave con alta expectativa de puntos y cláusula accesible.

## Próximos pasos

1. Añadir endpoint `/api/auth/refresh` y renovación automática de token.
2. Implementar acciones desde el panel (pujar, vender, cambiar alineación, subir cláusula).
3. Enriquecer el motor con datos históricos, dureza del rival y formaciones premium.
4. Añadir tests con Vitest/Playwright.
5. Mejorar UI/UX: navegación, gráficos, notificaciones.
