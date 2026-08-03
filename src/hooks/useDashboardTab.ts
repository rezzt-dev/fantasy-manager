import { useEffect, useState } from 'react';
import type { DashboardTab } from '../components/layout/Sidebar';

const VALID_TABS: DashboardTab[] = [
  'overview',
  'team',
  'lineup',
  'market',
  'standings',
  'rivals',
  'statistics',
  'recommendations',
  'track-record',
];

export function useDashboardTab(defaultTab: DashboardTab = 'overview') {
  const [tab, setTab] = useState<DashboardTab>(defaultTab);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam as DashboardTab)) {
      setTab(tabParam as DashboardTab);
    }
    setIsReady(true);
  }, []);

  const changeTab = (newTab: DashboardTab) => {
    setTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.replaceState({}, '', url.toString());
  };

  return { tab, changeTab, isReady };
}
