'use client';

import { useState } from 'react';
import { Toaster } from 'sonner';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
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
  alertCount = 0,
  alerts = [],
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Sidebar
        activeTab={activeTab}
        onChangeTab={onChangeTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-col lg:pl-[260px]">
        <Header
          leagues={leagues}
          selectedLeague={selectedLeague}
          onSelectLeague={onSelectLeague}
          onToggleSidebar={() => setSidebarOpen(true)}
          onOpenCommand={onOpenCommand}
          alertCount={alertCount}
          alerts={alerts}
        />

        <main className="flex-1 overflow-x-hidden p-4 sm:p-5 lg:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        <MobileNav activeTab={activeTab} onChangeTab={onChangeTab} />
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
