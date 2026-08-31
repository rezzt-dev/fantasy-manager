'use client';

import { useMemo } from 'react';
import { Command } from 'cmdk';
import {
  Search,
  LayoutDashboard,
  Users,
  ClipboardList,
  Store,
  Trophy,
  Shield,
  BarChart3,
  Compass,
  Target,
  Rows3,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Swords,
  Gavel,
  CornerDownLeft,
} from 'lucide-react';
import { useSidebarCollapsed } from '../../hooks/useSidebarCollapsed';
import type { DashboardTab } from './Sidebar';
import { cn } from '../../lib/utils';

/**
 * Paleta de comandos (⌘K).
 *
 * Los rótulos y los iconos son EXACTAMENTE los del panel lateral: si aquí una
 * sección se llamara distinto, el usuario tendría que aprenderse dos nombres
 * para el mismo sitio.
 */
const TABS: Record<DashboardTab, { label: string; icon: React.ElementType; keywords: string }> = {
  overview: { label: 'Resumen', icon: LayoutDashboard, keywords: 'inicio general dashboard' },
  team: { label: 'Plantilla', icon: Users, keywords: 'equipo jugadores mi equipo' },
  lineup: { label: 'Alineación', icon: ClipboardList, keywords: 'once titular capitan formacion' },
  matches: { label: 'Partidos', icon: Swords, keywords: 'directo vivo marcador calendario' },
  market: { label: 'Mercado', icon: Store, keywords: 'fichajes comprar vender pujas' },
  'clause-market': { label: 'Clausulazos', icon: Gavel, keywords: 'clausula clausulazo robar' },
  recommendations: { label: 'Centro Estrategia', icon: Compass, keywords: 'recomendaciones consejos motor' },
  standings: { label: 'Clasificación', icon: Trophy, keywords: 'tabla liga posiciones ranking' },
  rivals: { label: 'Rivales', icon: Shield, keywords: 'oponentes managers comparar' },
  statistics: { label: 'Estadísticas', icon: BarChart3, keywords: 'analisis graficos datos' },
  'score-predictions': { label: 'Predicción', icon: Radar, keywords: 'puntuacion xp esperados' },
  'track-record': { label: 'Acierto del motor', icon: Target, keywords: 'track record metricas mae' },
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players?: { id: string; nickname: string; team?: string; position?: string }[];
  rivals?: { teamId: number; managerName: string }[];
  onNavigate: (tab: DashboardTab) => void;
  onPlayerClick?: (playerId: string) => void;
  onRivalClick?: (teamId: number) => void;
  dense?: boolean;
  onToggleDensity?: () => void;
}

const itemClass = cn(
  'group flex cursor-pointer select-none items-center gap-3 rounded-md px-2.5 py-2 text-sm text-content-secondary',
  'outline-none transition-colors duration-instant',
  'aria-selected:bg-white/[0.09] aria-selected:text-content',
);

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="numeral rounded-xs border border-ink-600 bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-content-tertiary">
      {children}
    </kbd>
  );
}

/**
 * El atajo ⌘K/Ctrl+K lo registra `DashboardContainer`, NO este componente.
 * Cuando lo registraban los dos, cada pulsación disparaba dos alternancias
 * sobre el mismo estado y la paleta no llegaba a abrirse nunca.
 */
export default function CommandPalette({
  open,
  onOpenChange,
  players = [],
  rivals = [],
  onNavigate,
  onPlayerClick,
  onRivalClick,
  dense,
  onToggleDensity,
}: CommandPaletteProps) {
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();

  const tabEntries = useMemo(() => Object.entries(TABS) as [DashboardTab, (typeof TABS)[DashboardTab]][], []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Búsqueda global"
      className={cn(
        'fixed inset-0 z-modal flex items-start justify-center overflow-y-auto p-4 pt-[10vh] sm:pt-[14vh]',
        'bg-ink-0/70 backdrop-blur-sm',
        'data-[state=open]:animate-fade-in',
      )}
    >
      <div
        className={cn(
          'w-full max-w-xl overflow-hidden rounded-lg border border-white/[0.14] bg-surface-overlay shadow-5',
          'animate-scale-in',
          // Los encabezados de grupo comparten el estilo de `.eyebrow`.
          '[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3',
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-white/[0.09] px-4">
          <Search className="h-4 w-4 shrink-0 text-content-tertiary" aria-hidden="true" />
          <Command.Input
            placeholder="Busca una sección, un jugador o un rival…"
            className="h-14 flex-1 bg-transparent py-4 text-sm text-content outline-none placeholder:text-content-tertiary"
          />
          <Kbd>ESC</Kbd>
        </div>

        <Command.List className="scrollbar-thin max-h-[min(28rem,60vh)] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-10 text-center text-sm text-content-tertiary">
            Sin resultados. Prueba con el apodo del jugador o el nombre de la sección.
          </Command.Empty>

          <Command.Group heading="Ir a">
            {tabEntries.map(([id, { label, icon: Icon, keywords }]) => (
              <Command.Item
                key={id}
                value={`${label} ${keywords}`}
                onSelect={() => {
                  onNavigate(id);
                  onOpenChange(false);
                }}
                className={itemClass}
              >
                <Icon className="h-4 w-4 shrink-0 text-content-tertiary" aria-hidden="true" />
                <span className="flex-1 truncate">{label}</span>
                <CornerDownLeft className="h-3.5 w-3.5 text-content-tertiary opacity-0 transition-opacity group-aria-selected:opacity-100" aria-hidden="true" />
              </Command.Item>
            ))}
          </Command.Group>

          {onToggleDensity && (
            <Command.Group heading="Ajustes de vista">
              <Command.Item
                value="modo compacto densidad espaciado"
                onSelect={() => {
                  onToggleDensity();
                  onOpenChange(false);
                }}
                className={itemClass}
              >
                <Rows3 className="h-4 w-4 shrink-0 text-content-tertiary" aria-hidden="true" />
                <span className="flex-1">
                  Modo compacto
                  <span className="ml-2 text-xs text-content-tertiary">
                    {dense ? 'activado' : 'desactivado'}
                  </span>
                </span>
                <Kbd>D</Kbd>
              </Command.Item>

              <Command.Item
                value="panel lateral sidebar plegar desplegar"
                onSelect={() => {
                  toggleCollapsed();
                  onOpenChange(false);
                }}
                className={itemClass}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4 shrink-0 text-content-tertiary" aria-hidden="true" />
                ) : (
                  <PanelLeftClose className="h-4 w-4 shrink-0 text-content-tertiary" aria-hidden="true" />
                )}
                <span className="flex-1">
                  Panel lateral
                  <span className="ml-2 text-xs text-content-tertiary">
                    {collapsed ? 'plegado' : 'desplegado'}
                  </span>
                </span>
                <Kbd>B</Kbd>
              </Command.Item>
            </Command.Group>
          )}

          {players.length > 0 && (
            <Command.Group heading="Tus jugadores">
              {players.map((p) => (
                <Command.Item
                  key={p.id}
                  value={`${p.nickname} ${p.team ?? ''} ${p.position ?? ''}`}
                  onSelect={() => {
                    onPlayerClick?.(p.id);
                    onOpenChange(false);
                  }}
                  className={itemClass}
                >
                  <Users className="h-4 w-4 shrink-0 text-content-tertiary" aria-hidden="true" />
                  <span className="flex-1 truncate">
                    {p.nickname}
                    {(p.position || p.team) && (
                      <span className="ml-2 text-xs text-content-tertiary">
                        {[p.position, p.team].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {rivals.length > 0 && (
            <Command.Group heading="Rivales de la liga">
              {rivals.map((r) => (
                <Command.Item
                  key={r.teamId}
                  value={r.managerName}
                  onSelect={() => {
                    onRivalClick?.(r.teamId);
                    onOpenChange(false);
                  }}
                  className={itemClass}
                >
                  <Shield className="h-4 w-4 shrink-0 text-content-tertiary" aria-hidden="true" />
                  <span className="flex-1 truncate">{r.managerName}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div className="flex items-center gap-4 border-t border-white/[0.09] px-4 py-2.5 text-[11px] text-content-tertiary">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navegar
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> abrir
          </span>
        </div>
      </div>
    </Command.Dialog>
  );
}
