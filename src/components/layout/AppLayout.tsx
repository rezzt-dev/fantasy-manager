'use client';

import { useState } from 'react';
import { Toaster } from 'sonner';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { cn } from '../../lib/utils';
import { useSidebarCollapsed } from '../../hooks/useSidebarCollapsed';
import type { FantasyLeague } from '../../types/fantasy';
import type { DashboardTab } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  leagues: FantasyLeague[];
  selectedLeague: FantasyLeague | null;
  onSelectLeague: (league: FantasyLeague) => void;
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  onOpenCommand?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  dense?: boolean;
  onToggleDensity?: (dense: boolean) => void;
  alertCount?: number;
  alerts?: { id: string; type: 'warning' | 'danger' | 'info'; title: string; description?: string }[];
}

export default function AppLayout({
  children,
  leagues,
  selectedLeague,
  onSelectLeague,
  activeTab,
  onChangeTab,
  onOpenCommand,
  onRefresh,
  isRefreshing,
  dense,
  onToggleDensity,
  alertCount = 0,
  alerts = [],
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed } = useSidebarCollapsed();

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Sidebar
        activeTab={activeTab}
        onChangeTab={onChangeTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        alertCount={alertCount}
      />

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out',
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]',
        )}
      >
        <Header
          leagues={leagues}
          selectedLeague={selectedLeague}
          onSelectLeague={onSelectLeague}
          onToggleSidebar={() => setSidebarOpen(true)}
          onOpenCommand={onOpenCommand}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          dense={dense}
          onToggleDensity={onToggleDensity}
          alertCount={alertCount}
          alerts={alerts}
        />

        <main className="flex-1 overflow-x-hidden p-4 sm:p-5 lg:p-6 [.density-dense_&]:p-3 [.density-dense_&]:sm:p-4 [.density-dense_&]:lg:p-5">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        <MobileNav activeTab={activeTab} onChangeTab={onChangeTab} dense={dense} onToggleDensity={onToggleDensity} />
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(28, 28, 28, 0.95)',
            border: '1px solid rgba(236, 236, 236, 0.08)',
            color: '#ececec',
          },
        }}
      />
    </div>
  );
}
