'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import fantasyAPI from '../lib/fantasy/api';
import type { FantasyLeague, Recommendation } from '../types/fantasy';
import AppLayout from './layout/AppLayout';
import CommandPalette from './layout/CommandPalette';
import type { DashboardTab } from './layout/Sidebar';
import { useDashboardTab } from '../hooks/useDashboardTab';
import { useDensity } from '../hooks/useDensity';
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed';
import { useNotifications } from '../hooks/useNotifications';
import OverviewTab from './dashboard/OverviewTab';
import TeamTab from './dashboard/TeamTab';
import LineupTab from './dashboard/LineupTab';
import MarketTab from './dashboard/MarketTab';
import ClauseMarketTab from './dashboard/ClauseMarketTab';
import StandingsTab from './dashboard/StandingsTab';
import RivalsTab from './dashboard/RivalsTab';
import StatisticsTab from './dashboard/StatisticsTab';
import ScorePredictionsTab from './dashboard/ScorePredictionsTab';
import RecommendationsTab from './dashboard/RecommendationsTab';
import TrackRecordTab from './dashboard/TrackRecordTab';
import MatchesTab from './dashboard/MatchesTab';
import ErrorBoundary from './shared/ErrorBoundary';
import ErrorState from './shared/ErrorState';
import EmptyState from './shared/EmptyState';
import { PageTransition } from './ui/motion';
import { Trophy } from 'lucide-react';
import LoadingSection from './shared/LoadingSection';
import LazyLottie from './shared/LazyLottie';
import { LogoMark } from './brand/Logo';
import type { TeamPlayer } from '../types/fantasy';

export default function DashboardContainer() {
  const queryClient = useQueryClient();
  const [selectedLeague, setSelectedLeague] = useState<FantasyLeague | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { dense, setDense } = useDensity();
  const { collapsed: sidebarCollapsed, toggleCollapsed: toggleSidebarCollapsed } = useSidebarCollapsed();
  const { tab, changeTab, isReady } = useDashboardTab('overview');
  const { isRead, markAllAsRead } = useNotifications();

  const {
    data: leagues,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['leagues'],
    queryFn: fantasyAPI.getLeagues,
  });

  const teamId = selectedLeague?.team.id;
  const leagueId = selectedLeague?.id;

  const teamQuery = useQuery({
    queryKey: ['team', leagueId, teamId],
    queryFn: () => fantasyAPI.getTeamData(leagueId!, teamId!),
    enabled: !!leagueId && !!teamId,
  });

  const recommendationsQuery = useQuery({
    queryKey: ['recommendations', leagueId, teamId],
    queryFn: () => fantasyAPI.getRecommendations(leagueId!, teamId!),
    enabled: !!leagueId && !!teamId,
  });

  const analysisQuery = useQuery({
    queryKey: ['league-analysis', leagueId, teamId],
    queryFn: () => fantasyAPI.getLeagueAnalysis(leagueId!, teamId!),
    enabled: !!leagueId && !!teamId,
  });

  const alerts = useMemo(() => buildAlerts(teamQuery.data?.players, recommendationsQuery.data?.recommendations), [
    teamQuery.data,
    recommendationsQuery.data,
  ]);

  const visibleAlerts = useMemo(() => alerts.filter((a) => !isRead(a.id)), [alerts, isRead]);

  const commandPlayers = useMemo(
    () =>
      teamQuery.data?.players.map((p) => ({
        id: p.playerMaster.id,
        nickname: p.playerMaster.nickname,
        position: p.playerMaster.position,
        team: p.playerMaster.team?.name,
      })) || [],
    [teamQuery.data],
  );

  const commandRivals = useMemo(
    () =>
      analysisQuery.data?.analysis?.rivals.map((r) => ({
        teamId: r.teamId,
        managerName: r.managerName,
      })) || [],
    [analysisQuery.data],
  );

  useEffect(() => {
    if (leagues && leagues.length > 0 && !selectedLeague) {
      setSelectedLeague(leagues[0]);
    }
  }, [leagues, selectedLeague]);

  // Atajo de teclado global Cmd/Ctrl + K para abrir command palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    toast.success('Datos actualizados', { description: 'Se ha recargado la información de tu liga.' });
    setIsRefreshing(false);
  };

  const handleToggleDensity = () => {
    const next = !dense;
    setDense(next);
    toast.success(next ? 'Modo compacto activado' : 'Modo compacto desactivado', {
      description: next ? 'Interfaz con espaciado reducido.' : 'Espaciado normal restaurado.',
    });
  };

  const handleToggleSidebar = () => {
    const next = !sidebarCollapsed;
    toggleSidebarCollapsed();
    toast.success(next ? 'Panel lateral oculto' : 'Panel lateral visible');
  };

  // Atajos de teclado del dashboard
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleRefresh();
        return;
      }

      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleRefresh();
        return;
      }

      if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleToggleDensity();
        return;
      }

      if (e.key.toLowerCase() === 'b' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleToggleSidebar();
        return;
      }

      // C abre Clausulazos: la sección no cabe en los atajos numéricos, que
      // ya están asignados a las diez pestañas originales.
      if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        changeTab('clause-market');
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        const tabs: DashboardTab[] = [
          'overview',
          'team',
          'lineup',
          'market',
          'standings',
          'rivals',
          'statistics',
          'score-predictions',
          'recommendations',
          'matches',
        ];
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          e.preventDefault();
          changeTab(tabs[num - 1]);
        } else if (e.key === '0') {
          e.preventDefault();
          changeTab('matches');
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeTab, dense, setDense, sidebarCollapsed, toggleSidebarCollapsed]);

  if (!isReady || isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-lg">
          <ErrorState
            title="No hemos podido leer tus ligas"
            description="La sesión puede haber caducado o la API oficial no responde. Reintenta; si sigue fallando, vuelve a conectar tu cuenta."
            detail={error.message}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  if (!leagues || leagues.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-lg">
          {/* El único Lottie del producto. Esta pantalla ocupa la ventana
              entera, es un callejón sin salida —no hay nada que pulsar aquí
              dentro— y el usuario puede quedarse mirándola preguntándose si la
              aplicación ha fallado. Una ilustración de marca que se dibuja sola
              dice «esto funciona, es que no hay nada que enseñar», que es
              justo el mensaje. El reproductor se descarga solo al llegar aquí. */}
          <EmptyState
            illustration={
              <LazyLottie src="/lottie/pitch-search.json" className="h-40 w-40" />
            }
            title="Todavía no juegas ninguna liga"
            description="Esta cuenta no participa en ninguna liga de LALIGA FANTASY. Únete a una desde la aplicación oficial y vuelve aquí: el panel la detectará sola."
          />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppLayout
        leagues={leagues}
        selectedLeague={selectedLeague}
        onSelectLeague={setSelectedLeague}
        activeTab={tab}
        onChangeTab={changeTab}
        onOpenCommand={() => setCommandOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        dense={dense}
        onToggleDensity={setDense}
        alertCount={visibleAlerts.length}
        alerts={visibleAlerts}
        onMarkAllNotificationsAsRead={() => markAllAsRead(alerts.map((a) => a.id))}
      >
        {selectedLeague ? (
          <TabContent league={selectedLeague} tab={tab} />
        ) : (
          <div className="flex min-h-[60vh] items-center justify-center">
            <EmptyState
              icon={<Trophy />}
              title="Elige con qué liga trabajar"
              description="Selecciona una liga en el menú de la barra superior para que el motor calcule tu jornada."
            />
          </div>
        )}
      </AppLayout>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        players={commandPlayers}
        rivals={commandRivals}
        onNavigate={(t) => changeTab(t)}
        onPlayerClick={() => changeTab('team')}
        onRivalClick={() => changeTab('rivals')}
        dense={dense}
        onToggleDensity={handleToggleDensity}
      />
    </ErrorBoundary>
  );
}

function TabContent({ league, tab }: { league: FantasyLeague; tab: string }) {
  let content: React.ReactNode;
  switch (tab) {
    case 'overview':
      content = <OverviewTab league={league} />;
      break;
    case 'team':
      content = <TeamTab league={league} />;
      break;
    case 'lineup':
      content = <LineupTab league={league} />;
      break;
    case 'market':
      content = <MarketTab league={league} />;
      break;
    case 'clause-market':
      content = <ClauseMarketTab league={league} />;
      break;
    case 'standings':
      content = <StandingsTab league={league} />;
      break;
    case 'rivals':
      content = <RivalsTab league={league} />;
      break;
    case 'statistics':
      content = <StatisticsTab league={league} />;
      break;
    case 'score-predictions':
      content = <ScorePredictionsTab league={league} />;
      break;
    case 'recommendations':
      content = <RecommendationsTab league={league} />;
      break;
    case 'track-record':
      content = <TrackRecordTab league={league} />;
      break;
    case 'matches':
      content = <MatchesTab league={league} />;
      break;
    default:
      content = <OverviewTab league={league} />;
  }

  return (
    <ErrorBoundary
      fallback={
        <ErrorState
          title="Esta sección ha fallado al dibujarse"
          description="El resto del panel sigue funcionando. Recarga la página o cambia de sección; si vuelve a pasar, avisa con el nombre de la sección."
          detail={`Sección: ${tab}`}
          onRetry={() => window.location.reload()}
        />
      }
    >
      <PageTransition viewKey={tab}>{content}</PageTransition>
    </ErrorBoundary>
  );
}

/**
 * Arranque del panel.
 *
 * Silueta del layout real en lugar de una ruleta centrada: al llegar los datos
 * nada se recoloca, y el usuario ve desde el primer instante dónde va a estar
 * cada cosa.
 */
function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-canvas" role="status" aria-busy="true">
      <span className="sr-only">Cargando tu panel…</span>

      <div className="fixed inset-y-0 left-0 hidden w-[248px] flex-col border-r border-white/[0.09] bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.09] px-4">
          <LogoMark className="motion-essential h-5 w-5 animate-pulse" />
          <span className="font-display text-sm font-semibold tracking-[-0.03em] text-content-tertiary">
            Fantasy Manager
          </span>
        </div>
      </div>

      <div className="lg:pl-[248px]">
        <div className="h-16 border-b border-white/[0.09]" />
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1360px]">
            <LoadingSection cardCount={4} rows={3} label="Cargando tu panel" />
          </div>
        </div>
      </div>
    </div>
  );
}


function buildAlerts(
  players?: TeamPlayer[],
  recommendations?: Recommendation[],
): { id: string; type: 'warning' | 'danger' | 'info'; title: string; description?: string }[] {
  const alerts: { id: string; type: 'warning' | 'danger' | 'info'; title: string; description?: string }[] = [];

  const unavailable = players?.filter((p) => p.playerMaster.playerStatus !== 'ok') || [];
  unavailable.forEach((p) => {
    const status = p.playerMaster.playerStatus;
    alerts.push({
      id: `status-${p.playerMaster.id}-${status}`,
      type: status === 'injured' ? 'danger' : 'warning',
      title: `${p.playerMaster.nickname} ${status === 'injured' ? 'lesionado' : 'dudoso'}`,
      description: 'Revisa su disponibilidad para la jornada.',
    });
  });

  const HARD_NEWS_CATEGORIES = new Set(['injury', 'illness', 'suspension']);
  const newsAlerts =
    recommendations?.filter((r) =>
      (r.externalSignals || []).some((s) => s.signal === 'sell' && s.category && HARD_NEWS_CATEGORIES.has(s.category)),
    ) || [];
  newsAlerts.forEach((r) => {
    alerts.push({
      id: `news-${r.id}`,
      type: 'danger',
      title: `${r.player.nickname}: noticia negativa`,
      description: r.reason,
    });
  });

  const clauseAlerts =
    recommendations?.filter((r) => r.type === 'protect_clause' && (r.riskScore ?? 0) >= 70) || [];
  clauseAlerts.forEach((r) => {
    alerts.push({
      id: `clause-${r.id}`,
      type: 'warning',
      title: `${r.player.nickname} en riesgo de clausulazo`,
      description: `Riesgo ${r.riskScore}/100`,
    });
  });

  return alerts;
}
