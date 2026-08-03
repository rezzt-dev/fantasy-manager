'use client';

import { cn } from '../../lib/utils';
import type { DashboardTab } from './Sidebar';
import { LayoutDashboard, Users, CalendarDays, ShoppingCart, Trophy, Shield, BarChart3, Lightbulb, TrendingUp, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';

const mainItems: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'team', label: 'Equipo', icon: Users },
  { id: 'lineup', label: 'Alineación', icon: CalendarDays },
  { id: 'market', label: 'Mercado', icon: ShoppingCart },
  { id: 'recommendations', label: 'Recom.', icon: Lightbulb },
];

const moreItems: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
  { id: 'standings', label: 'Clasificación', icon: Trophy },
  { id: 'rivals', label: 'Rivales', icon: Shield },
  { id: 'statistics', label: 'Estadísticas', icon: BarChart3 },
  { id: 'track-record', label: 'Track Record', icon: TrendingUp },
];

interface MobileNavProps {
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
}

export default function MobileNav({ activeTab, onChangeTab }: MobileNavProps) {
  const activeMore = moreItems.some((i) => i.id === activeTab);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-background/90 backdrop-blur-xl lg:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                  isActive ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {item.label}
            </button>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'flex h-auto flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 text-[10px] font-medium',
                activeMore ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                  activeMore ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground',
                )}
              >
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </span>
              Más
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
