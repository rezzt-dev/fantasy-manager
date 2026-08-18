'use client';

import { useState } from 'react';
import {
  Trophy,
  LogOut,
  ChevronDown,
  Shield,
  Users,
  Menu,
  Search,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCcw,
  PanelLeftClose,
  PanelLeftOpen,
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
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import type { FantasyLeague } from '../../types/fantasy';

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
  alerts?: { id: string; type: 'warning' | 'danger' | 'info'; title: string; description?: string }[];
  onMarkAllNotificationsAsRead?: () => void;
}

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
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6 [.density-dense_&]:h-14">
        {/* Izquierda: navegación */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onToggleSidebar}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden text-muted-foreground hover:text-foreground lg:inline-flex"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Desplegar panel lateral' : 'Ocultar panel lateral'}
            title={collapsed ? 'Desplegar panel lateral' : 'Ocultar panel lateral'}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </Button>

          <a
            href="/dashboard"
            className="flex items-center gap-2.5 pl-1 text-lg font-semibold tracking-tight text-foreground sm:pl-2 lg:hidden"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.10] bg-surface-2">
              <Trophy className="h-[18px] w-[18px] text-foreground" />
            </div>
            <span className="hidden font-display tracking-tight sm:inline">
              Fantasy<span className="text-brand-muted">Manager</span>
            </span>
          </a>
        </div>

        {/* Centro: búsqueda */}
        <div className="flex min-w-0 flex-1 justify-center lg:px-2">
          <button
            onClick={onOpenCommand}
            className="hidden h-9 w-full max-w-md items-center gap-2 rounded-lg border border-white/[0.08] bg-surface-2/60 px-3 text-sm text-muted-foreground backdrop-blur-sm transition-colors hover:border-white/[0.14] hover:bg-surface-3 hover:text-foreground lg:flex"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate text-left">Buscar jugadores, pestañas, rivales…</span>
            <kbd className="shrink-0 rounded-md border border-white/[0.08] bg-background px-1.5 py-0.5 text-[10px] font-medium">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Derecha: vista · acciones · liga · sesión */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onOpenCommand}
            aria-label="Buscar"
          >
            <Search className="h-[18px] w-[18px]" />
          </Button>

          {onToggleDensity && (
            <div className="hidden items-center gap-2 lg:flex" title="Modo compacto (D)">
              <span className="text-xs text-muted-foreground">Compacto</span>
              <Switch checked={dense} onCheckedChange={onToggleDensity} aria-label="Densidad compacta" />
            </div>
          )}

          <Separator orientation="vertical" className="hidden h-5 lg:block" />

          {onRefresh && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Recargar datos"
              title="Recargar datos (R)"
            >
              <RefreshCcw className={`h-[18px] w-[18px] ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}

          <NotificationBell count={alertCount} alerts={alerts} onMarkAllAsRead={onMarkAllNotificationsAsRead} />

          <Separator orientation="vertical" className="h-5" />

          {leagues.length > 0 && (
            <LeagueSelector
              leagues={leagues}
              selectedLeague={selectedLeague}
              onSelectLeague={onSelectLeague}
            />
          )}

          <form action="/api/auth/logout" method="POST" className="hidden sm:block">
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-[18px] w-[18px]" />
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
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 border-white/[0.10] bg-surface-2/60 px-2.5 backdrop-blur-sm hover:bg-white/[0.05]"
        >
          <Shield className="h-4 w-4 text-brand-muted" />
          <span className="hidden max-w-[160px] truncate sm:inline">
            {selectedLeague?.name || 'Seleccionar liga'}
          </span>
          <span className="hidden max-w-[100px] truncate min-[480px]:inline sm:hidden">
            {selectedLeague?.name?.slice(0, 10) || 'Liga'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Mis ligas
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {leagues.map((league) => (
          <DropdownMenuItem
            key={league.id}
            onClick={() => onSelectLeague(league)}
            className="flex items-center justify-between"
          >
            <span className="truncate pr-2">{league.name}</span>
            {league.id === selectedLeague?.id && (
              <Users className="h-4 w-4 text-foreground" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationBell({
  count,
  alerts,
  onMarkAllAsRead,
}: {
  count: number;
  alerts: { id: string; type: 'warning' | 'danger' | 'info'; title: string; description?: string }[];
  onMarkAllAsRead?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const handleMarkAllAsRead = () => {
    onMarkAllAsRead?.();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Notificaciones"
        >
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <span className="font-semibold text-foreground">Alertas</span>
          {count > 0 && <Badge variant="secondary">{count} activas</Badge>}
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {alerts.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No hay alertas activas
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="px-4 py-2">
                <div className="flex items-start gap-3">
                  {alert.type === 'danger' ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  ) : alert.type === 'warning' ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  ) : (
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                    {alert.description && (
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                    )}
                  </div>
                </div>
                <Separator className="mt-2 bg-white/[0.04]" />
              </div>
            ))
          )}
        </div>
        {alerts.length > 0 && (
          <div className="border-t border-white/[0.06] px-4 py-2">
            <Button variant="ghost" size="sm" className="h-8 w-full justify-start gap-2 text-xs" onClick={handleMarkAllAsRead}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Marcar como leídas
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
