'use client';

import * as React from 'react';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Swords,
  Store,
  Gavel,
  Compass,
  Trophy,
  Shield,
  BarChart3,
  Target,
  Radar,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Sheet, SheetContent } from '../ui/sheet';
import { useSidebarCollapsed } from '../../hooks/useSidebarCollapsed';
import Logo from '../brand/Logo';
import { ActiveIndicator } from '../ui/motion';
import type { FantasyLeague } from '../../types/fantasy';

export type DashboardTab =
  | 'overview'
  | 'team'
  | 'lineup'
  | 'market'
  | 'clause-market'
  | 'standings'
  | 'rivals'
  | 'statistics'
  | 'score-predictions'
  | 'recommendations'
  | 'track-record'
  | 'matches';

interface NavSection {
  label: string;
  items: { id: DashboardTab; label: string; icon: React.ElementType; hint: string }[];
}

/**
 * Los tres grupos responden a las tres preguntas que se hace un manager, en
 * orden: «¿cómo voy?», «¿qué muevo?», «¿qué va a pasar?». No son categorías
 * administrativas.
 *
 * Cada icono se elige por su relación con el contenido —un mazo para los
 * clausulazos, un radar para las predicciones— y no por rellenar la fila.
 */
const navigation: NavSection[] = [
  {
    label: 'Mi jornada',
    items: [
      { id: 'overview', label: 'Resumen', icon: LayoutDashboard, hint: 'Estado general de la jornada' },
      { id: 'team', label: 'Plantilla', icon: Users, hint: 'Tus jugadores y su valor' },
      { id: 'lineup', label: 'Alineación', icon: ClipboardList, hint: 'Once titular y capitán' },
      { id: 'matches', label: 'Partidos', icon: Swords, hint: 'Marcadores en vivo' },
    ],
  },
  {
    label: 'Movimientos',
    items: [
      { id: 'market', label: 'Mercado', icon: Store, hint: 'Jugadores en venta' },
      { id: 'clause-market', label: 'Clausulazos', icon: Gavel, hint: 'Fichajes por cláusula' },
      { id: 'recommendations', label: 'Centro Estrategia', icon: Compass, hint: 'Qué hacer esta jornada' },
    ],
  },
  {
    label: 'La liga',
    items: [
      { id: 'standings', label: 'Clasificación', icon: Trophy, hint: 'Tabla de la liga' },
      { id: 'rivals', label: 'Rivales', icon: Shield, hint: 'Plantillas de tus rivales' },
      { id: 'statistics', label: 'Estadísticas', icon: BarChart3, hint: 'Análisis de la temporada' },
      { id: 'score-predictions', label: 'Predicción', icon: Radar, hint: 'Puntos esperados por equipo' },
      { id: 'track-record', label: 'Acierto del motor', icon: Target, hint: 'Cuánto acierta el modelo' },
    ],
  },
];

interface NavContentProps {
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  onItemClick?: () => void;
  alertCount?: number;
  collapsed?: boolean;
  /**
   * Identidad del filete de sección activa. El raíl de escritorio y el panel
   * deslizante de móvil dibujan la misma navegación y pueden estar montados a
   * la vez; si compartieran identificador, Motion intentaría animar UNA barra
   * entre dos árboles y la haría saltar de un panel al otro.
   */
  indicatorGroup: string;
}

function NavContent({
  activeTab,
  onChangeTab,
  onItemClick,
  alertCount,
  collapsed = false,
  indicatorGroup,
}: NavContentProps) {
  return (
    <nav aria-label="Secciones del panel" className={cn('flex flex-col gap-6 p-3 [.density-dense_&]:gap-4', collapsed && 'px-2')}>
      {navigation.map((section) => (
        <div key={section.label}>
          {collapsed ? (
            <div className="mx-2 mb-2 h-px bg-white/[0.09]" role="presentation" />
          ) : (
            <h2 className="eyebrow mb-2 px-3 [.density-dense_&]:mb-1">{section.label}</h2>
          )}

          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const badge = item.id === 'recommendations' && alertCount ? alertCount : 0;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeTab(item.id);
                      onItemClick?.();
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    title={collapsed ? `${item.label} — ${item.hint}` : undefined}
                    className={cn(
                      'group relative flex w-full items-center gap-3 rounded-md py-2.5 text-sm',
                      'transition-colors duration-fast ease-out',
                      '[.density-dense_&]:py-2',
                      collapsed ? 'justify-center px-0' : 'px-3',
                      isActive
                        ? 'bg-white/[0.05] font-semibold text-content'
                        : 'font-medium text-content-tertiary hover:bg-white/[0.05] hover:text-content',
                    )}
                  >
                    {/* La sección activa se marca con un filete de acento a la
                        izquierda: posición + color, no solo color.

                        Es un único filete compartido por toda la lista: al
                        cambiar de sección se DESLIZA hasta la nueva en lugar de
                        apagarse aquí y encenderse allá. Ese recorrido es lo que
                        dice «te has movido dentro del mismo sitio»; dos
                        parpadeos de color no dicen nada. Se coloca con `top`
                        calculado y no con `-translate-y-1/2` porque Motion
                        gobierna la transformada de este nodo. */}
                    <ActiveIndicator
                      groupId={indicatorGroup}
                      active={isActive}
                      className="absolute left-0 top-[calc(50%-10px)] h-5 w-0.5 rounded-r-full bg-accent"
                    />
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-colors',
                        isActive ? 'text-content' : 'text-content-tertiary group-hover:text-content-secondary',
                      )}
                      aria-hidden="true"
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}

                    {badge > 0 && (
                      <span
                        className={cn(
                          'numeral flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-fg',
                          collapsed ? 'absolute -right-0.5 -top-0.5 h-4 min-w-[16px] text-[9px]' : 'ml-auto',
                        )}
                      >
                        {badge > 9 ? '9+' : badge}
                        <span className="sr-only"> avisos pendientes</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Pie del panel: en lugar de un consejo genérico, el dato que el manager mira
 * de reojo cada vez que entra —dónde va en la liga y cuánto vale su plantilla—.
 */
function LeagueFoot({ league }: { league: FantasyLeague | null }) {
  if (!league) return null;

  const value = new Intl.NumberFormat('es-ES', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(league.team.teamValue ?? 0);

  return (
    <div className="border-t border-white/[0.09] p-3">
      <div className="rounded-md bg-surface-raised p-3 [.density-dense_&]:p-2.5">
        <p className="truncate text-xs font-medium text-content-secondary" title={league.name}>
          {league.name}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-[10px]">Posición</p>
            <p className="numeral text-base font-semibold leading-none text-content">
              {league.team.position ?? '—'}
              <span className="ml-0.5 text-xs font-medium text-content-tertiary">º</span>
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow text-[10px]">Valor</p>
            <p className="numeral whitespace-nowrap text-base font-semibold leading-none text-content">
              {value}
              <span className="ml-0.5 text-xs font-medium text-content-tertiary">€</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SidebarProps {
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  isOpen: boolean;
  onClose: () => void;
  alertCount?: number;
  league?: FantasyLeague | null;
}

export default function Sidebar({
  activeTab,
  onChangeTab,
  isOpen,
  onClose,
  alertCount,
  league = null,
}: SidebarProps) {
  const { collapsed } = useSidebarCollapsed();

  return (
    <>
      {/* Panel de escritorio */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-nav hidden flex-col border-r border-white/[0.09] bg-surface',
          'transition-[width] duration-slow ease-out lg:flex',
          collapsed ? 'w-[72px]' : 'w-[248px]',
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-white/[0.09] [.density-dense_&]:h-14',
            collapsed ? 'justify-center px-2' : 'px-4',
          )}
        >
          <a href="/dashboard" className="rounded-sm" aria-label="Fantasy Manager — ir al resumen">
            <Logo markOnly={collapsed} size="sm" />
          </a>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden">
          <NavContent
            activeTab={activeTab}
            onChangeTab={onChangeTab}
            alertCount={alertCount}
            collapsed={collapsed}
            indicatorGroup="sidebar-rail-indicator"
          />
        </div>

        {!collapsed && <LeagueFoot league={league} />}
      </aside>

      {/* Panel móvil */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="left"
          className="flex w-[276px] flex-col border-r border-white/[0.09] bg-surface p-0 sm:max-w-sm"
        >
          <div className="flex h-16 shrink-0 items-center border-b border-white/[0.09] px-4">
            <Logo size="sm" />
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            <NavContent
              activeTab={activeTab}
              onChangeTab={onChangeTab}
              onItemClick={onClose}
              alertCount={alertCount}
              indicatorGroup="sidebar-sheet-indicator"
            />
          </div>
          <LeagueFoot league={league} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export { navigation };
