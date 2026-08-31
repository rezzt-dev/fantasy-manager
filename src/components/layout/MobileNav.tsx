'use client';

import {
  LayoutDashboard,
  ClipboardList,
  Swords,
  Store,
  MoreHorizontal,
  Users,
  Gavel,
  Compass,
  Trophy,
  Shield,
  BarChart3,
  Radar,
  Target,
  Rows3,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ActiveIndicator } from '../ui/motion';
import type { DashboardTab } from './Sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

/**
 * Barra inferior.
 *
 * Cuatro destinos y un desbordamiento: por encima de cinco elementos las
 * etiquetas se parten y deja de poder pulsarse con el pulgar (regla
 * bottom-nav-limit). Los cuatro elegidos son los que se abren cada día; el
 * resto vive en «Más», que también marca estado cuando la sección activa está
 * dentro.
 */
const mainItems: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'lineup', label: 'Alineación', icon: ClipboardList },
  { id: 'matches', label: 'Partidos', icon: Swords },
  { id: 'market', label: 'Mercado', icon: Store },
];

const moreItems: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
  { id: 'team', label: 'Plantilla', icon: Users },
  { id: 'clause-market', label: 'Clausulazos', icon: Gavel },
  { id: 'recommendations', label: 'Centro Estrategia', icon: Compass },
  { id: 'standings', label: 'Clasificación', icon: Trophy },
  { id: 'rivals', label: 'Rivales', icon: Shield },
  { id: 'statistics', label: 'Estadísticas', icon: BarChart3 },
  { id: 'score-predictions', label: 'Predicción', icon: Radar },
  { id: 'track-record', label: 'Acierto del motor', icon: Target },
];

interface MobileNavProps {
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  dense?: boolean;
  onToggleDensity?: (dense: boolean) => void;
}

export default function MobileNav({ activeTab, onChangeTab, dense, onToggleDensity }: MobileNavProps) {
  const activeInMore = moreItems.some((i) => i.id === activeTab);

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'glass fixed inset-x-0 bottom-0 z-nav border-t border-white/[0.09] lg:hidden',
        // Deja libre la barra de gestos del sistema (safe-area-awareness).
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChangeTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex h-14 w-full flex-col items-center justify-center gap-1',
                  'text-[10px] font-medium transition-colors duration-fast ease-out',
                  isActive ? 'text-content' : 'text-content-tertiary',
                )}
              >
                {/* Indicador superior: la posición hace de señal, no el color.
                    Es la misma pieza para los cinco destinos, así que al tocar
                    otro se desliza horizontalmente hasta él. En una barra de
                    pulgar, ese recorrido de 60-80 px es la confirmación de que
                    el toque ha entrado —más rápida de leer que el cambio de
                    color del icono, que queda tapado por el propio dedo—. */}
                <ActiveIndicator
                  groupId="mobilenav-indicator"
                  active={isActive}
                  className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-accent"
                />
                <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </button>
            </li>
          );
        })}

        <li className="flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Más secciones"
                className={cn(
                  'relative flex h-14 w-full flex-col items-center justify-center gap-1',
                  'text-[10px] font-medium transition-colors duration-fast ease-out',
                  activeInMore ? 'text-content' : 'text-content-tertiary',
                )}
              >
                <ActiveIndicator
                  groupId="mobilenav-indicator"
                  active={activeInMore}
                  className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-accent"
                />
                <MoreHorizontal className="h-[22px] w-[22px]" aria-hidden="true" />
                <span>Más</span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" side="top" sideOffset={12} className="w-60">
              <DropdownMenuLabel className="eyebrow px-2 py-1.5">Otras secciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => onChangeTab(item.id)}
                    className={cn('gap-2.5 py-2', isActive && 'font-semibold text-content')}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-content-tertiary" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <Check className="h-4 w-4 text-accent" aria-hidden="true" />}
                  </DropdownMenuItem>
                );
              })}

              {onToggleDensity && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onToggleDensity(!dense)} className="gap-2.5 py-2">
                    <Rows3 className="h-4 w-4 shrink-0 text-content-tertiary" aria-hidden="true" />
                    <span className="flex-1">Modo compacto</span>
                    {dense && <Check className="h-4 w-4 text-accent" aria-hidden="true" />}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      </ul>
    </nav>
  );
}
