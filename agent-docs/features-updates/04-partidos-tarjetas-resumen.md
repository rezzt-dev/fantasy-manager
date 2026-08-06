# 04 — Vista principal de partidos: tarjetas resumidas

> **Funcionalidad**: vista principal de la sección «Partidos» en **tarjetas resumidas** (el formato habitual). Cada tarjeta contiene: los **2 equipos con su escudo y nombre**, un **contador de resultado** y otro más pequeño de **tiempo**, un **indicador de la parte** en la que está el partido (1ª parte, 2ª parte o descanso) y, cuando haya goles, el **gol con el jugador que lo ha marcado y el minuto** (como mucho — es decir, sin saturar la tarjeta).

---

## 1. Objetivo

Una cuadrícula de tarjetas que permita «leer la jornada de un vistazo»: quién juega contra quién, cómo va el resultado, en qué minuto/parte está y qué goles ha habido. Es la vista por defecto de la pestaña «Partidos».

## 2. Contexto actual

- Datos disponibles vía `/api/matches` (doc 02): `MatchEvent` con `phase`, `period`, `minute`, `home/away` (escudo, nombre, `score`), `startTimestamp`, e incidencias (`MatchIncident`) para partidos en juego/jugados.
- Componentes base reutilizables: `Card`/`CardContent` (`src/components/ui/card.tsx`), `Badge`, `Skeleton`, `shared/EmptyState`, `shared/SectionHeader`.
- Iconos: `lucide-react` ya instalado.
- La clasificación importancia/normal viene de `MatchEvent.importance.group` (doc 03).

## 3. Contenido de la tarjeta (maquetación)

### 3.1 Estados y elementos

| Elemento | Fuente | Comportamiento |
|---|---|---|
| **Escudo local + nombre** | `home.shieldUrl`, `home.name`/`shortName` | Imagen `lazy`, `alt` del equipo, fallback con inicial del equipo (componente `TeamShield`) |
| **Contador de resultado** | `home.score` / `away.score` | Fuente grande; animación de «pulso» al cambiar (microinteracción) |
| **Contador de tiempo pequeño** | `period` + `minute` (o `startTimestamp` → cálculo cliente, doc 02) | `45'`, `56'`, `HT`, `FT`, `-` |
| **Indicador de parte** | `period` | Chip: «1ª parte», «Descanso», «2ª parte», «Prórroga», «No comenzado», «Finalizado» |
| **Goles** (como mucho) | `incidents` tipo `goal` | Icono ⚽ + jugador + minuto, máx. 2–3 goles por tarjeta (el resto en el detalle). Goles de local a la izquierda, visitante a la derecha. `own_goal` con matiz visual |
| **Badge importancia** | `importance.ownPlayersCount` | «2 jugadores tuyos» (si > 0); ver doc 03 |
| **Punto en vivo** | `phase === 'live'` | Dot rojo pulsante (animación CSS) + borde/acento |
| **Hora de inicio** | `startTimestamp` | Para pendientes: `Sáb 20:00` en lugar del contador |

### 3.2 Estados de la tarjeta

1. **Pendiente**: escudos, nombres, hora de inicio, badge de importancia. Sin resultado.
2. **En juego**: resultado grande, minuto + parte, dot pulsante, goles. **Polling activo** (doc 02).
3. **Finalizado**: resultado fijo, parte `FT`, resumen de goles. Se ve algo más «apagada» (opacidad ligeramente reducida, sin pulso) para diferenciarla de las vivas.

### 3.3 Comportamiento

- **Clic** en la tarjeta cuando `phase !== 'pending'` → abre el **detalle** (doc 05). Las pendientes no son clicables (no hay nada que ver aún) o abren el detalle en modo «próximo partido» (decisión de producto; recomendación: no clicables en fase 1).
- **Hover**: elevación de la tarjeta (`hover:shadow`, `transition`), subrayado del nombre del equipo.
- **Microinteracción de gol**: al aparecer un gol nuevo, breve resaltado del contador (clase CSS/animation) — se consigue comparando el `incident.id` más reciente entre renders.
- **Responsive**: grid `1 / 2 / 3` columnas (móvil / tablet / escritorio), igual que el resto del dashboard.

## 4. Diseño propuesto

```
src/components/dashboard/partidos/
├── PartidosTab.tsx        # orquestación (docs 02 + 03): filtros, secciones, polling
├── MatchCard.tsx          # tarjeta resumen (este documento)
├── TeamShield.tsx         # escudo con fallback (compartido con el detalle)
└── MatchDetailDialog.tsx  # doc 05
```

### `MatchCard` (interfaz)

```tsx
interface MatchCardProps {
  match: MatchEvent;                      // incluye importance (doc 03)
  incidents?: MatchIncident[];            // goles para mostrar (solo si phase !== 'pending')
  onClick?: () => void;                   // habilita el clic (doc 05)
}
```

Reglas de presentación de goles:

- Solo `type: 'goal' | 'penalty_goal' | 'own_goal'`.
- Máximo **3 líneas de gol** por tarjeta; si hay más, «+N goles →» (acceso al detalle).
- Formato: `⚽ Lamine Yamal 34'` alineado bajo el escudo correspondiente; `own_goal` → `(p.p.)`.
- Orden: cronológico por `minute`.

## 5. Fases de implementación

| Fase | Tarea | Verificación |
|------|-------|--------------|
| 1 | `TeamShield.tsx` (escudo + fallback) y `MatchCard.tsx` estático (pendiente) | Snapshot visual |
| 2 | Estados en juego/finalizado: resultado, minuto, parte, goles, dot vivo | E2E con fixture de partido live |
| 3 | Microinteracciones: hover, pulso de gol, responsive grid | Revisión visual + Lighthouse |
| 4 | Integración en `PartidosTab.tsx` con secciones y clic → detalle | E2E completo |

## 6. Riesgos y mitigaciones

- **Escudos que fallan o lentos** → `TeamShield` con fallback (inicial + color del equipo desde `teams-master`) e imágenes `lazy`.
- **Tarjeta saturada con muchos goles** → límite de 3 líneas + «ver detalle».
- **Contador que no cuadra con la fuente** (minuto oficial vs calculado) → priorizar `status.displayed.minute`; usar cálculo propio solo como respaldo y marcar `minuteSource: 'official' | 'computed'`.
- **Rendimiento con decenas de tarjetas** → `React.memo` en `MatchCard`, incidentes solo de partidos en juego, imágenes `loading="lazy"`.

## 7. Validación

- `pnpm typecheck` y `pnpm lint`.
- E2E Playwright: tarjeta pendiente (hora), en juego (minuto + parte + gol), finalizada (FT + goles); el clic abre el detalle solo en los estados permitidos.
- Revisión visual en móvil y escritorio (grid responsive).
