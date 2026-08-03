'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Sheet, SheetContent } from '../ui/sheet';
import { Trophy, LayoutDashboard, Users, CalendarDays, ShoppingCart, Lightbulb, BarChart3, Shield, TrendingUp } from 'lucide-react';

export type DashboardTab =
  | 'overview'
  | 'team'
  | 'lineup'
  | 'market'
  | 'standings'
  | 'rivals'
  | 'statistics'
  | 'recommendations'
  | 'track-record';

interface NavSection {
  label: string;
  items: { id: DashboardTab; label: string; icon: React.ElementType; badge?: number }[];
}

const navigation: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
      { id: 'team', label: 'Mi Equipo', icon: Users },
      { id: 'lineup', label: 'Alineación', icon: CalendarDays },
    ],
  },
  {
    label: 'Mercado',
    items: [
      { id: 'market', label: 'Mercado', icon: ShoppingCart },
      { id: 'recommendations', label: 'Recomendaciones', icon: Lightbulb },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { id: 'standings', label: 'Clasificación', icon: Trophy },
      { id: 'rivals', label: 'Rivales', icon: Shield },
      { id: 'statistics', label: 'Estadísticas', icon: BarChart3 },
    ],
  },
  {
    label: 'Motor',
    items: [{ id: 'track-record', label: 'Track Record', icon: TrendingUp }],
  },
];

interface SidebarProps {
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

function NavContent({ activeTab, onChangeTab, onItemClick }: { activeTab: DashboardTab; onChangeTab: (tab: DashboardTab) => void; onItemClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {navigation.map((section) => (
        <div key={section.label}>
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {section.label}
          </div>
          <div className="flex flex-col gap-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onChangeTab(item.id);
                    onItemClick?.();
                  }}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-white/[0.08] text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-foreground" />
                  )}
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                      isActive
                        ? 'border-white/[0.10] bg-white/[0.06] text-foreground'
                        : 'border-transparent bg-white/[0.03] text-muted-foreground group-hover:text-foreground',
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-foreground px-1.5 text-[10px] font-bold text-background">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function Sidebar({ activeTab, onChangeTab, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-white/[0.06] bg-surface-2/40 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.06] px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.10] bg-surface-3">
            <Trophy className="h-[18px] w-[18px] text-foreground" />
          </div>
          <span className="font-display text-base font-semibold tracking-tight text-foreground">
            Fantasy<span className="text-brand-muted">Manager</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          <NavContent activeTab={activeTab} onChangeTab={onChangeTab} />
        </div>

        <div className="border-t border-white/[0.06] p-4">
          <div className="rounded-xl border border-white/[0.06] bg-surface-3/60 p-4">
            <div className="text-xs font-semibold text-foreground">Consejo</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Revisa las recomendaciones antes de cada jornada para no perder puntos.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar as sheet */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="left" className="w-[280px] border-r border-white/[0.06] bg-surface-2 p-0 sm:max-w-sm">
          <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.06] px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.10] bg-surface-3">
              <Trophy className="h-[18px] w-[18px] text-foreground" />
            </div>
            <span className="font-display text-base font-semibold tracking-tight text-foreground">
              Fantasy<span className="text-brand-muted">Manager</span>
            </span>
          </div>
          <div className="overflow-y-auto py-4 scrollbar-thin">
            <NavContent activeTab={activeTab} onChangeTab={onChangeTab} onItemClick={onClose} />
          </div>
          <div className="border-t border-white/[0.06] p-4">
            <div className="rounded-xl border border-white/[0.06] bg-surface-3/60 p-4">
              <div className="text-xs font-semibold text-foreground">Consejo</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Revisa las recomendaciones antes de cada jornada.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export { navigation };
