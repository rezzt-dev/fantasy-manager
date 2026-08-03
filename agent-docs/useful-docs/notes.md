# Notas calientes / información importante

Última actualización: 2026-07-31

## Repositorios clonados localmente (temporal)

- `/tmp/fantasy-research/LaLigaApp/` — referencia principal actualizada.
- `/tmp/fantasy-research/laligafantasy/` — ideas de análisis, endpoints obsoletos.
- `/tmp/fantasy-research/marca-fantasy-api-scraper-updated/` — scraper obsoleto.

Si se reinicia el entorno, estos clones desaparecerán. La información clave ya está extraída en este directorio.

## API oficial: descubrimientos clave

- **Host real:** `https://fantasy-api.llt-services.com` (no `api.laligafantasymarca.com`, que es antiguo).
- **Path base:** `/api`.
- **Competición LaLiga:** `1`.
- **Autenticación:** token JWT de Azure B2C, se usa como `Authorization: Bearer <id_token>`.
- **Duración del token:** ~24 horas.
- **Header `x-app`:** la app oficial usa `2` (según config de proxy de LaLigaApp).
- **Header `x-lang`:** `es`.
- **CORS:** la API oficial no permite orígenes arbitrarios. Es obligatorio usar un proxy backend propio.

## Endpoints que cambiaron en 2026/27

- Antiguo `/api/v4/players` → ahora `/api/v6/players` (o `/api/v1/competition/1/players`). LaLigaApp normaliza con `responseAdapters`.
- Antiguo `/api/v4/leagues` → ahora `/api/v1/competition/1/leagues`.
- Antiguo `/api/v4/leagues/{id}/ranking` → ahora `/api/v1/competition/1/leagues/{id}/standing`.
- `/calendar` ahora devuelve `localId`/`visitorId` en lugar de objetos `local`/`visitor`.
- `/v3/teams-master` ahora devuelve array plano de equipos.

**Implicación:** cualquier implementación debe incluir adaptadores centralizados y no asumir shapes fijos.

## Dinero real disponible: fórmula clave

LaLiga Fantasy permite pujar con más dinero del que se tiene en caja. La fórmula real es:

```
efectivo           = GET /teams/{teamId}/money
valor_plantilla    = suma(valor_mercado de cada jugador de tu equipo)
bono_20_plantilla  = floor(valor_plantilla * 0.20)
pujas_pendientes   = suma de tus pujas activas en el mercado
dinero_para_pujas  = efectivo + bono_20_plantilla - pujas_pendientes
```

**Esto es crítico para las recomendaciones de compra.** Si solo usamos el efectivo, muchas recomendaciones serán incorrectas.

## Client IDs de Azure B2C

- Web oficial: `6457fa17-1224-416a-b21a-ee6ce76e9bc0` (no usable para nosotros, solo permite redirecciones oficiales).
- Email/nativo: `af88bcff-1157-40a0-b579-030728aacf0b` (usar por defecto para refresh y configuración).
- El client ID de la app móvil sería el ideal para OAuth popup, pero no se conoce con certeza; LaLigaApp usa el de email como fallback.

## Fuentes de datos: jerarquía de confianza

1. **API oficial de LaLiga Fantasy** (`fantasy-api.llt-services.com`): fuente primaria de todo.
2. **futbolfantasy.com/analytics**: fuente secundaria de tendencias de mercado y onces probables. Vulnerable a cambios de HTML.
3. **api-contenthub.laliga.com**: irrelevante para este proyecto (contenido multimedia).

## Decisiones de diseño tomadas

- **Stack:** Astro + React + pnpm.
- **Backend proxy:** integrado en Astro endpoints (`src/pages/api`), no servidor Express separado (salvo que Astro resulte limitado para ciertos casos).
- **Login:** token manual para el MVP, OAuth popup solo en fase avanzada.
- **Análisis por liga:** cada liga tiene su propio contexto; no mezclar datos de mercado ni plantillas entre ligas.
- **Recomendaciones:** heurísticas configurables en primera versión; modelo predictivo más avanzado en el futuro.
- **Acciones:** informativas en MVP; acciones reales (pujar, vender) con confirmación explícita en fases posteriores.

## Fragmentos de código útiles

### Obtener token desde consola (para dar al usuario)

```javascript
JSON.parse(localStorage.getItem("auth")).status.authenticate.access_token
```

### Obtener refresh token desde consola

```javascript
JSON.parse(localStorage.getItem("auth")).status.authenticate.refresh_token
```

### Normalizar dinero de respuesta (de LaLigaApp)

```javascript
function readTeamMoney(response) {
  const data = response?.data;
  const raw = typeof data === 'number' ? data : (data?.teamMoney ?? data?.money);
  if (raw == null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
```

### Formaciones permitidas gratuitas

- 3-4-3
- 3-5-2
- 4-3-3
- 4-4-2
- 4-5-1
- 5-3-2
- 5-4-1

## Riesgos y mitigaciones actuales

| Riesgo | Estado |
|--------|--------|
| LaLiga cambia endpoints | Mitigado con adaptadores centralizados. |
| Token caduca cada 24h | Mitigado con refresh automático si se proporciona refresh_token. |
| CORS/bloqueo del proxy | Mitigado con proxy propio. |
| Futbolfantasy cambia HTML | Mitigado con parser aislado y cache. |
| Términos de servicio de LaLiga | Mitigado con avisos legales y acciones no automáticas. |

## Contactos / referencias a mantener

- LaLigaApp: https://github.com/Externoak/LaLigaApp
- LaLiga Fantasy web oficial: https://fantasy.laliga.com (verificar URL actual)
- Futbolfantasy analytics: https://www.futbolfantasy.com/analytics/laliga-fantasy/mercado

## Dudas por resolver

- ¿La API oficial devuelve histórico de puntos por jornada por jugador? (necesario para tendencias)
- ¿Cómo se comporta exactamente el endpoint `/standing` cuando la liga está en pretemporada?
- ¿Es posible obtener el refresh token sin depender de la web oficial?
- ¿Hay un API de estadísticas (xG, tiros, etc.) público que podamos usar para enriquecer xPoints?

## Recordatorio final

Si se reanuda el proyecto sin contexto previo, el orden de lectura debe ser:
1. `repositories.md`
2. `api-endpoints.md`
3. `authentication.md`
4. `credentials.md`
5. `architecture.md`
6. `todo.md`
7. `notes.md` (este fichero)
