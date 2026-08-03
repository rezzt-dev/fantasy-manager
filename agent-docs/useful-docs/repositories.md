# Repositorios y fuentes útiles

Última actualización: 2026-07-31

## Repositorios GitHub analizados

### 1. Externoak/LaLigaApp (referencia principal)
- **URL:** https://github.com/Externoak/LaLigaApp
- **Importancia:** Alta. Es la única aplicación actualizada a la temporada 2026/27.
- **Contenido clave:**
  - Endpoints oficiales de `fantasy-api.llt-services.com`.
  - Autenticación OAuth2 con Azure B2C de LaLiga.
  - Proxy CORS propio en `server/`.
  - Adaptadores de respuesta para los nuevos endpoints `/v1/competition/...`.
  - Gestión de tokens, mercado, alineaciones, cláusulas y scraping de futbolfantasy.com.
- **Tecnología:** React 18 + Electron + Node/Express proxy.
- **Uso para este proyecto:** Tomar los endpoints, adaptadores y flujo de auth como base, pero migrar a Astro + React + pnpm.
- **Ruta clonada local (temporal):** `/tmp/fantasy-research/LaLigaApp/`

### 2. carlosgeos/laligafantasy (obsoleto, ideas útiles)
- **URL:** https://github.com/carlosgeos/laligafantasy
- **Importancia:** Media. Proyecto en Clojure de 2020.
- **Contenido útil:**
  - Conceptos: picker de alineación, análisis de beneficios, cláusulas, sabotaje, mercado.
  - Requería `DATABASE_URL`, `USERNAME`, `PASSWORD`, `LEAGUE_ID`, `MANAGER_ID`.
- **Problema:** Los endpoints que usaba están obsoletos.
- **Uso para este proyecto:** Inspiración para el motor de recomendaciones y análisis de valor/rendimiento.
- **Ruta clonada local (temporal):** `/tmp/fantasy-research/laligafantasy/`

### 3. alxgarci/marca-fantasy-api-scraper-updated (obsoleto)
- **URL:** https://github.com/alxgarci/marca-fantasy-api-scraper-updated
- **Importancia:** Baja. Proyecto Python para scrapear datos públicos.
- **Problema:** El README indica explícitamente que ya no funciona: *"Actualmente no funciona el código, dado que han cambiado endpoints de la Api (ya no existe acceso web, solo en app)"*.
- **Uso para este proyecto:** Recordatorio de que el scraping directo de la API antigua no es viable. La API oficial móvil es la única vía realista.
- **Ruta clonada local (temporal):** `/tmp/fantasy-research/marca-fantasy-api-scraper-updated/`

## Fuentes web

### API oficial de LALIGA FANTASY
- **Base:** `https://fantasy-api.llt-services.com`
- **Autenticación:** OAuth2 / Azure B2C (`login.laliga.es`)
- **Documentación:** No existe documentación pública oficial. Los endpoints se infieren del código de LaLigaApp.

### Portal de LaLiga Content Hub
- **URL:** https://api-contenthub.laliga.com/
- **Uso:** API pública de contenido multimedia (noticias, imágenes, vídeos).
- **Relevancia para fantasy:** **Baja**. No proporciona datos de jugadores, plantillas, mercado ni puntuaciones.

### Fútbol Fantasy (fuente de enriquecimiento)
- **URL principal:** https://www.futbolfantasy.com/
- **Analytics de mercado:** https://www.futbolfantasy.com/analytics/laliga-fantasy/mercado
- **Uso:** Tendencias de subida/bajada de valor de jugadores, onces probables.
- **Relevancia:** Media. Puede usarse como fuente secundaria mediante scraping controlado, siempre respetando términos de uso y rate limits.

## Notas rápidas

- LaLigaApp es la referencia técnica actualizada.
- No usar endpoints de `api.laligafantasymarca.com` (antigua API de Marca) ni del scraper de alxgarci.
- El contenido de `api-contenthub.laliga.com` no aporta datos operativos para fantasy.
- Futbolfantasy.com es útil solo como enriquecimiento, nunca como fuente principal.
