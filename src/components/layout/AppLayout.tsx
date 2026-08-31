'use client';

import { useState } from 'react';
import { Toaster } from 'sonner';
import Header, { type HeaderAlert } from './Header';
import Sidebar, { type DashboardTab } from './Sidebar';
import MobileNav from './MobileNav';
import { cn } from '../../lib/utils';
import { MotionProvider } from '../ui/motion';
import { useSidebarCollapsed } from '../../hooks/useSidebarCollapsed';
import type { FantasyLeague } from '../../types/fantasy';

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
  alerts?: HeaderAlert[];
  onMarkAllNotificationsAsRead?: () => void;
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
  onMarkAllNotificationsAsRead,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed } = useSidebarCollapsed();

  /* `MotionProvider` monta un único `MotionConfig reducedMotion="user"` para
     todo el panel: cualquier animación de Motion que cuelgue de aquí respeta la
     preferencia del sistema sin que cada componente tenga que preguntarlo, y sin
     que se pueda olvidar en el siguiente componente que se escriba. Motion anula
     por su cuenta las transformadas y deja pasar la opacidad, que es exactamente
     la reducción que buscamos. */
  return (
    <MotionProvider>
      <div className="min-h-dvh bg-canvas text-content">
        {/* Primer tabulador de la página: saltar la navegación. */}
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>

        <Sidebar
          activeTab={activeTab}
          onChangeTab={onChangeTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          alertCount={alertCount}
          league={selectedLeague}
        />

        <div
          className={cn(
            'flex min-h-dvh flex-col transition-[padding-left] duration-slow ease-out',
            collapsed ? 'lg:pl-[72px]' : 'lg:pl-[248px]',
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
            onMarkAllNotificationsAsRead={onMarkAllNotificationsAsRead}
          />

          <main
            id="contenido"
            tabIndex={-1}
            className={cn(
              'flex-1 px-4 py-6 sm:px-6 lg:px-8',
              // Deja sitio a la barra inferior en móvil.
              'pb-24 lg:pb-10',
              '[.density-dense_&]:px-3 [.density-dense_&]:py-4 [.density-dense_&]:sm:px-4 [.density-dense_&]:lg:px-6',
            )}
          >
            {/* El contenido no se estira sin fin: por encima de ~1360 px las
                tablas se vuelven ilegibles de tan anchas. */}
            <div className="mx-auto w-full max-w-[1360px]">{children}</div>
          </main>

          <MobileNav
            activeTab={activeTab}
            onChangeTab={onChangeTab}
            dense={dense}
            onToggleDensity={onToggleDensity}
          />
        </div>

        <Toaster
          position="bottom-right"
          offset={16}
          toastOptions={{
            classNames: {
              toast:
                'group !bg-surface-overlay !border !border-white/[0.09] !text-content !rounded-lg !shadow-3 !font-sans',
              title: '!text-sm !font-semibold',
              description: '!text-xs !text-content-tertiary',
              actionButton: '!bg-accent !text-accent-fg',
            },
          }}
        />
      </div>
    </MotionProvider>
  );
}
