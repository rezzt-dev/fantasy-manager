'use client';

import { useEffect, useMemo } from 'react';
import { Command } from 'cmdk';
import { Search, LayoutDashboard, Users, CalendarDays, ShoppingCart, Trophy, Shield, BarChart3, Lightbulb, TrendingUp, Rows3, PanelLeftClose, PanelLeftOpen, Gauge, Swords, Gavel } from 'lucide-react';
import { useSidebarCollapsed } from '../../hooks/useSidebarCollapsed';
import type { DashboardTab } from './Sidebar';

const tabIcons: Record<DashboardTab, React.ReactNode> = {
  overview: <LayoutDashboard className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />,
  lineup: <CalendarDays className="h-4 w-4" />,
  market: <ShoppingCart className="h-4 w-4" />,
  'clause-market': <Gavel className="h-4 w-4" />,
  recommendations: <Lightbulb className="h-4 w-4" />,
  standings: <Trophy className="h-4 w-4" />,
  rivals: <Shield className="h-4 w-4" />,
  statistics: <BarChart3 className="h-4 w-4" />,
  'score-predictions': <Gauge className="h-4 w-4" />,
  'track-record': <TrendingUp className="h-4 w-4" />,
  matches: <Swords className="h-4 w-4" />,
};

const tabLabels: Record<DashboardTab, string> = {
  overview: 'Resumen',
  team: 'Mi Equipo',
  lineup: 'Alineación',
  market: 'Mercado',
  'clause-market': 'Clausulazos',
  recommendations: 'Recomendaciones',
  standings: 'Clasificación',
  rivals: 'Rivales',
  statistics: 'Estadísticas',
  'score-predictions': 'Puntuación',
  'track-record': 'Track Record',
  matches: 'Partidos',
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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onOpenChange, open]);

  const tabItems = useMemo(
    () =>
      (Object.keys(tabLabels) as DashboardTab[]).map((tab) => ({
        id: `tab-${tab}`,
        value: tab,
        title: tabLabels[tab],
        icon: tabIcons[tab],
        onSelect: () => {
          onNavigate(tab);
          onOpenChange(false);
        },
      })),
    [onNavigate, onOpenChange],
  );

  const playerItems = useMemo(
    () =>
      players.map((p) => ({
        id: `player-${p.id}`,
        value: p.nickname,
        title: p.nickname,
        subtitle: [p.position, p.team].filter(Boolean).join(' · '),
        icon: <Users className="h-4 w-4" />,
        onSelect: () => {
          onPlayerClick?.(p.id);
          onOpenChange(false);
        },
      })),
    [players, onPlayerClick, onOpenChange],
  );

  const rivalItems = useMemo(
    () =>
      rivals.map((r) => ({
        id: `rival-${r.teamId}`,
        value: r.managerName,
        title: r.managerName,
        subtitle: 'Rival',
        icon: <Shield className="h-4 w-4" />,
        onSelect: () => {
          onRivalClick?.(r.teamId);
          onOpenChange(false);
        },
      })),
    [rivals, onRivalClick, onOpenChange],
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Búsqueda global"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1c1c1c]/95 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center border-b border-white/[0.08] px-4">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Command.Input
            placeholder="Buscar jugadores, rivales, pestañas…"
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="ml-2 hidden rounded-md border border-white/[0.08] bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
            ESC
          </kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No se han encontrado resultados.
          </Command.Empty>

          <Command.Group heading="Pestañas" className="py-2">
            {tabItems.map((item) => (
              <Command.Item
                key={item.id}
                value={item.value}
                onSelect={item.onSelect}
                className="flex cursor-pointer items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors aria-selected:bg-white/[0.08] aria-selected:text-foreground"
              >
                <span className="mr-2 text-muted-foreground">{item.icon}</span>
                {item.title}
                <span className="ml-auto text-xs text-muted-foreground">Ir</span>
              </Command.Item>
            ))}
          </Command.Group>

          {onToggleDensity && (
            <Command.Group heading="Acciones" className="py-2">
              <Command.Item
                value="modo compacto densidad"
                onSelect={() => {
                  onToggleDensity();
                  onOpenChange(false);
                }}
                className="flex cursor-pointer items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors aria-selected:bg-white/[0.08] aria-selected:text-foreground"
              >
                <span className="mr-2 text-muted-foreground">
                  <Rows3 className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <span>Modo compacto</span>
                  <span className="text-xs text-muted-foreground">
                    {dense ? 'Activado' : 'Desactivado'}
                  </span>
                </div>
                <span className="ml-auto">
                  <kbd className="rounded-md border border-white/[0.08] bg-background px-1.5 py-0.5 text-[10px] font-medium">
                    D
                  </kbd>
                </span>
              </Command.Item>
              <Command.Item
                value="panel lateral sidebar ocultar desplegar"
                onSelect={() => {
                  toggleCollapsed();
                  onOpenChange(false);
                }}
                className="flex cursor-pointer items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors aria-selected:bg-white/[0.08] aria-selected:text-foreground"
              >
                <span className="mr-2 text-muted-foreground">
                  {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </span>
                <div className="flex flex-col">
                  <span>Panel lateral</span>
                  <span className="text-xs text-muted-foreground">
                    {collapsed ? 'Oculto' : 'Visible'}
                  </span>
                </div>
                <span className="ml-auto">
                  <kbd className="rounded-md border border-white/[0.08] bg-background px-1.5 py-0.5 text-[10px] font-medium">
                    B
                  </kbd>
                </span>
              </Command.Item>
            </Command.Group>
          )}

          {playerItems.length > 0 && (
            <Command.Group heading="Jugadores" className="py-2">
              {playerItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.value}
                  onSelect={item.onSelect}
                  className="flex cursor-pointer items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors aria-selected:bg-white/[0.08] aria-selected:text-foreground"
                >
                  <span className="mr-2 text-muted-foreground">{item.icon}</span>
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    {item.subtitle && <span className="text-xs text-muted-foreground">{item.subtitle}</span>}
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">Ver</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {rivalItems.length > 0 && (
            <Command.Group heading="Rivales" className="py-2">
              {rivalItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.value}
                  onSelect={item.onSelect}
                  className="flex cursor-pointer items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors aria-selected:bg-white/[0.08] aria-selected:text-foreground"
                >
                  <span className="mr-2 text-muted-foreground">{item.icon}</span>
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    {item.subtitle && <span className="text-xs text-muted-foreground">{item.subtitle}</span>}
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">Ver</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
