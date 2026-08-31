'use client';

import { useState } from 'react';
import {
  LogOut,
  ChevronDown,
  Shield,
  Check,
  Menu,
  Search,
  Bell,
  AlertTriangle,
  OctagonAlert,
  Info,
  CheckCheck,
  RefreshCcw,
  PanelLeftClose,
  PanelLeftOpen,
  Rows3,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useSidebarCollapsed } from '../../hooks/useSidebarCollapsed';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import Logo from '../brand/Logo';
import { cn } from '../../lib/utils';
import type { FantasyLeague } from '../../types/fantasy';

export interface HeaderAlert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  description?: string;
}

interface HeaderProps {
  leagues: FantasyLeague[];
  selectedLeague: FantasyLeague | null;
  onSelectLeague: (league: FantasyLeague) => void;
  onToggleSidebar?: () => void;
  onOpenCommand?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  dense?: boolean;
  onToggleDensity?: (dense: boolean) => void;
  alertCount?: number;
  alerts?: HeaderAlert[];
  onMarkAllNotificationsAsRead?: () => void;
}

/**
 * Barra superior.
 *
 * Tres zonas con pesos distintos a propósito: a la izquierda la navegación
 * (ligera), en el centro la búsqueda (es la acción más usada, así que ocupa el
 * espacio libre), y a la derecha el contexto de liga y la sesión. La única
 * pieza con borde propio es el selector de liga, porque es lo que cambia todo
 * lo que hay debajo.
 */
export default function Header({
  leagues,
  selectedLeague,
  onSelectLeague,
  onToggleSidebar,
  onOpenCommand,
  onRefresh,
  isRefreshing,
  dense,
  onToggleDensity,
  alertCount = 0,
  alerts = [],
  onMarkAllNotificationsAsRead,
}: HeaderProps) {
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();

  return (
    <header className="glass sticky top-0 z-header w-full border-b border-white/[0.09]">
      <div className="flex h-16 items-center gap-2 px-3 sm:px-4 lg:px-6 [.density-dense_&]:h-14">
        {/* Izquierda */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-touch"
            className="lg:hidden"
            onClick={onToggleSidebar}
            aria-label="Abrir menú de secciones"
          >
            <Menu />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Desplegar panel lateral' : 'Plegar panel lateral'}
            title={`${collapsed ? 'Desplegar' : 'Plegar'} panel lateral (B)`}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>

          <a href="/dashboard" className="rounded-sm pl-1 lg:hidden" aria-label="Fantasy Manager">
            <Logo size="sm" markOnly className="sm:hidden" />
            <Logo size="sm" className="hidden sm:inline-flex" />
          </a>
        </div>

        {/* Centro: búsqueda global */}
        <div className="flex min-w-0 flex-1 justify-center px-1 lg:px-4">
          <button
            type="button"
            onClick={onOpenCommand}
            className={cn(
              'hidden h-9 w-full max-w-lg items-center gap-2 rounded-md border border-ink-600 bg-surface-raised px-3',
              'text-sm text-content-tertiary transition-colors duration-fast ease-out',
              'hover:border-ink-700 hover:text-content-secondary lg:flex',
            )}
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate text-left">Buscar jugador, sección o rival…</span>
            <kbd className="numeral shrink-0 rounded-xs border border-ink-600 bg-canvas px-1.5 py-0.5 text-[10px] font-medium">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Derecha */}
        <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
          <Button
            variant="ghost"
            size="icon-touch"
            className="lg:hidden"
            onClick={onOpenCommand}
            aria-label="Buscar"
          >
            <Search />
          </Button>

          {onToggleDensity && (
            <label className="hidden cursor-pointer items-center gap-2 pl-1 pr-2 xl:flex">
              <Rows3 className="h-4 w-4 text-content-tertiary" aria-hidden="true" />
              <span className="text-xs font-medium text-content-tertiary">Compacto</span>
              <Switch
                checked={dense}
                onCheckedChange={onToggleDensity}
                aria-label="Activar modo compacto (atajo: D)"
              />
            </label>
          )}

          {onRefresh && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label={isRefreshing ? 'Recargando datos' : 'Recargar datos'}
              title="Recargar datos (R)"
            >
              <RefreshCcw className={cn(isRefreshing && 'motion-essential animate-spin')} />
            </Button>
          )}

          <NotificationBell
            count={alertCount}
            alerts={alerts}
            onMarkAllAsRead={onMarkAllNotificationsAsRead}
          />

          <Separator orientation="vertical" className="mx-1 hidden h-6 bg-white/[0.09] sm:block" />

          {leagues.length > 0 && (
            <LeagueSelector
              leagues={leagues}
              selectedLeague={selectedLeague}
              onSelectLeague={onSelectLeague}
            />
          )}

          <form action="/api/auth/logout" method="POST" className="hidden sm:block">
            <Button type="submit" variant="ghost" size="icon-sm" aria-label="Cerrar sesión">
              <LogOut />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}

function LeagueSelector({
  leagues,
  selectedLeague,
  onSelectLeague,
}: {
  leagues: FantasyLeague[];
  selectedLeague: FantasyLeague | null;
  onSelectLeague: (league: FantasyLeague) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[132px] gap-1.5 px-2 sm:max-w-[200px] sm:gap-2 sm:px-3">
          <Shield className="text-content-tertiary" aria-hidden="true" />
          <span className="truncate">{selectedLeague?.name || 'Elegir liga'}</span>
          <ChevronDown className="shrink-0 text-content-tertiary" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="eyebrow px-2 py-1.5">Mis ligas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {leagues.map((league) => {
          const active = league.id === selectedLeague?.id;
          return (
            <DropdownMenuItem
              key={league.id}
              onClick={() => onSelectLeague(league)}
              className="flex items-center gap-2"
            >
              <Check className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : 'opacity-0')} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{league.name}</span>
              <span className="numeral shrink-0 text-xs text-content-tertiary">
                {league.team.position ? `${league.team.position}º` : ''}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ALERT_ICON = {
  danger: { Icon: OctagonAlert, className: 'text-negative-text' },
  warning: { Icon: AlertTriangle, className: 'text-caution-text' },
  info: { Icon: Info, className: 'text-info-text' },
} as const;

function NotificationBell({
  count,
  alerts,
  onMarkAllAsRead,
}: {
  count: number;
  alerts: HeaderAlert[];
  onMarkAllAsRead?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={count > 0 ? `Avisos: ${count} sin leer` : 'Avisos: ninguno pendiente'}
        >
          <Bell />
          {count > 0 && (
            <span
              className="numeral absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-fg"
              aria-hidden="true"
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-white/[0.09] px-4 py-3">
          <h2 className="text-sm font-semibold text-content">Avisos de la jornada</h2>
          {count > 0 && (
            <span className="numeral text-xs text-content-tertiary">{count} sin leer</span>
          )}
        </div>

        <div className="scrollbar-thin max-h-[min(24rem,60vh)] overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-content-tertiary">
              Nada que revisar. Tu plantilla está disponible al completo.
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.09]">
              {alerts.map((alert) => {
                const { Icon, className } = ALERT_ICON[alert.type];
                return (
                  <li key={alert.id} className="flex items-start gap-3 px-4 py-3">
                    <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', className)} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug text-content">{alert.title}</p>
                      {alert.description && (
                        <p className="mt-0.5 text-xs leading-relaxed text-content-tertiary">
                          {alert.description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {alerts.length > 0 && (
          <div className="border-t border-white/[0.09] p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                onMarkAllAsRead?.();
                setOpen(false);
              }}
            >
              <CheckCheck />
              Marcar todo como leído
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
