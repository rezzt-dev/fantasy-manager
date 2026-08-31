'use client';

import { cn } from '../../lib/utils';
import type { DashboardTab } from './Sidebar';
import { LayoutDashboard, Users, CalendarDays, ShoppingCart, Trophy, Shield, BarChart3, Lightbulb, TrendingUp, MoreHorizontal, Rows3, Check, Gauge, Swords, Gavel } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';

const mainItems: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'team', label: 'Equipo', icon: Users },
  { id: 'lineup', label: 'Alineación', icon: CalendarDays },
  { id: 'matches', label: 'Partidos', icon: Swords },
  { id: 'market', label: 'Mercado', icon: ShoppingCart },
];

const moreItems: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
  { id: 'clause-market', label: 'Clausulazos', icon: Gavel },
  { id: 'recommendations', label: 'Recomendaciones', icon: Lightbulb },
  { id: 'standings', label: 'Clasificación', icon: Trophy },
  { id: 'rivals', label: 'Rivales', icon: Shield },
  { id: 'statistics', label: 'Estadísticas', icon: BarChart3 },
  { id: 'score-predictions', label: 'Puntuación', icon: Gauge },
  { id: 'track-record', label: 'Track Record', icon: TrendingUp },
];

interface MobileNavProps {
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  dense?: boolean;
  onToggleDensity?: (dense: boolean) => void;
}

export default function MobileNav({ activeTab, onChangeTab, dense, onToggleDensity }: MobileNavProps) {
  const activeMore = moreItems.some((i) => i.id === activeTab);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 overflow-hidden border-t border-white/[0.06] bg-background/90 backdrop-blur-xl lg:hidden">
      <div className="flex h-16 items-center justify-around px-1 sm:px-2">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                  isActive ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="w-full truncate text-center">{item.label}</span>
            </button>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'flex h-auto min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-medium',
                activeMore ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                  activeMore ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground',
                )}
              >
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </span>
              <span className="w-full truncate text-center">Más</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onChangeTab(item.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
            {onToggleDensity && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onToggleDensity(!dense)}
                  className="flex items-center gap-2"
                >
                  <Rows3 className="h-4 w-4" />
                  Modo compacto
                  {dense && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
