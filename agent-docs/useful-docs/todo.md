# Tareas pendientes

Última actualización: 2026-07-31

## Fase 0: Setup y descubrimiento

- [ ] Crear proyecto Astro con pnpm (`pnpm create astro@latest`).
- [ ] Configurar integración de React (`pnpm astro add react`).
- [ ] Configurar Tailwind CSS (`pnpm astro add tailwind`).
- [ ] Añadir Zustand y React Query (`pnpm add zustand @tanstack/react-query`).
- [ ] Añadir Vitest para tests (`pnpm add -D vitest`).
- [ ] Crear `.env.example` con todas las variables necesarias.
- [ ] Crear `.gitignore` adecuado (excluir `.env.local`, `node_modules`, `dist`).
- [ ] Crear estructura de directorios sugerida en `architecture.md`.
- [ ] Crear proxy base en `src/pages/api/[...path].ts` o endpoints específicos.
- [ ] Validar token del usuario contra `/api/v4/user/me`.
- [ ] Documentar shapes reales de respuesta de los endpoints tras primeras pruebas.

## Fase 1: Multi-liga y datos básicos

- [ ] Endpoint `GET /api/leagues` que liste ligas del usuario.
- [ ] Componente `LeagueSelector` para elegir liga activa.
- [ ] Guardar `leagueId` en estado global (Zustand) y localStorage.
- [ ] Endpoint `GET /api/teams/[teamId]` para obtener plantilla.
- [ ] Endpoint `GET /api/teams/[teamId]/money` para obtener dinero.
- [ ] Endpoint `GET /api/market/[leagueId]` para obtener mercado.
- [ ] Endpoint `GET /api/players` para obtener catálogo maestro.
- [ ] Implementar adaptadores de respuesta (`adapters.ts`).
- [ ] Mostrar dashboard básico: clasificación, plantilla, dinero, mercado.
- [ ] Asegurar que cada liga se analiza de forma independiente.

## Fase 2: Motor de recomendaciones

- [ ] Calcular dinero real disponible: efectivo + 20 % plantilla - pujas.
- [ ] Implementar heurísticas de recomendación:
  - [ ] Vender.
  - [ ] Comprar.
  - [ ] Cambiar.
  - [ ] Alinear.
  - [ ] Cláusulas / blindaje.
- [ ] Componente `RecommendationPanel` agrupado por categorías.
- [ ] Añadir explicaciones a cada recomendación (por qué se sugiere).
- [ ] Permitir pesos configurables en las heurísticas.
- [ ] Tests unitarios del motor de recomendaciones.

## Fase 3: Enriquecimiento

- [ ] Endpoint proxy para scraping de `futbolfantasy.com/analytics/laliga-fantasy/mercado`.
- [ ] Parser HTML robusto con fallback si cambia la estructura.
- [ ] Emparejador de jugadores por nombre + posición + equipo.
- [ ] Endpoint `GET /api/calendar` para fixture.
- [ ] Análisis de dificultad del fixture por jornada.
- [ ] Integrar tendencias de mercado en el motor de recomendaciones.
- [ ] Cachear tendencias (TTL 24h en localStorage).

## Fase 4: Acciones y pulido (opcional)

- [ ] Implementar puja desde el panel (confirmación explícita).
- [ ] Implementar venta al mercado.
- [ ] Implementar ajuste de alineación.
- [ ] Implementar subida de cláusula / blindaje.
- [ ] Modo oscuro / claro.
- [ ] Diseño responsive.
- [ ] PWA básica (manifest, service worker).
- [ ] Tests E2E con Playwright.
- [ ] Documentación de usuario final.

## Tareas técnicas transversales

- [ ] Rate limiting en el proxy.
- [ ] Manejo de errores 401/403/429 con mensajes claros al usuario.
- [ ] Refresco automático de token si se proporciona `refresh_token`.
- [ ] Logs sanitizados (sin tokens ni datos personales).
- [ ] Aviso legal y privacidad en la UI.
- [ ] Optimización de rendimiento (caché, staleTime, React Query).
- [ ] Revisión de dependencias y vulnerabilidades (`pnpm audit`).

## Investigación pendiente

- [ ] Confirmar endpoints exactos y shapes de respuesta con token real.
- [ ] Identificar si la API devuelve histórico de puntos por jornada para cada jugador.
- [ ] Confirmar cómo se identifica el equipo del usuario en `/standing` (campos exactos de manager/user).
- [ ] Verificar si el endpoint `/players` sigue siendo `/v6/players` o cambia en futuras temporadas.
- [ ] Evaluar si es necesario proxy para imágenes de jugadores/equipos.

## Notas

- Prioridad inmediata: Fase 0 y Fase 1.
- El motor de recomendaciones es el núcleo del producto; priorizarlo tras tener datos básicos.
- No implementar acciones automáticas (pujas masivas) por riesgo legal y de Términos de Servicio.
- Mantener todos los endpoints y adaptadores centralizados para facilitar futuros cambios de API.
