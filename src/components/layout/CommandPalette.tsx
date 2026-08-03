'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CommandPalette as CommandPaletteRoot,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  CommandShortcut,
} from '../ui/command';
import { LayoutDashboard, Users, CalendarDays, ShoppingCart, Trophy, Shield, BarChart3, Lightbulb, TrendingUp } from 'lucide-react';
import type { DashboardTab } from './Sidebar';

export interface CommandPaletteItem {
  id: string;
  type: 'tab' | 'player' | 'rival' | 'market';
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

const tabIcons: Record<DashboardTab, React.ReactNode> = {
  overview: <LayoutDashboard className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />,
  lineup: <CalendarDays className="h-4 w-4" />,
  market: <ShoppingCart className="h-4 w-4" />,
  recommendations: <Lightbulb className="h-4 w-4" />,
  standings: <Trophy className="h-4 w-4" />,
  rivals: <Shield className="h-4 w-4" />,
  statistics: <BarChart3 className="h-4 w-4" />,
  'track-record': <TrendingUp className="h-4 w-4" />,
};

const tabLabels: Record<DashboardTab, string> = {
  overview: 'Resumen',
  team: 'Mi Equipo',
  lineup: 'Alineación',
  market: 'Mercado',
  recommendations: 'Recomendaciones',
  standings: 'Clasificación',
  rivals: 'Rivales',
  statistics: 'Estadísticas',
  'track-record': 'Track Record',
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players?: { id: string; nickname: string; team?: string; position?: string }[];
  rivals?: { teamId: number; managerName: string }[];
  onNavigate: (tab: DashboardTab) => void;
  onPlayerClick?: (playerId: string) => void;
  onRivalClick?: (teamId: number) => void;
}

export default function CommandPalette({
  open,
  onOpenChange,
  players = [],
  rivals = [],
  onNavigate,
  onPlayerClick,
  onRivalClick,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const tabItems: CommandPaletteItem[] = (Object.keys(tabLabels) as DashboardTab[]).map((tab) => ({
    id: `tab-${tab}`,
    type: 'tab',
    title: tabLabels[tab],
    icon: tabIcons[tab],
    onSelect: () => {
      onNavigate(tab);
      onOpenChange(false);
    },
  }));

  const playerItems: CommandPaletteItem[] = players.map((p) => ({
    id: `player-${p.id}`,
    type: 'player',
    title: p.nickname,
    subtitle: [p.position, p.team].filter(Boolean).join(' · '),
    icon: <Users className="h-4 w-4" />,
    onSelect: () => {
      onPlayerClick?.(p.id);
      onOpenChange(false);
    },
  }));

  const rivalItems: CommandPaletteItem[] = rivals.map((r) => ({
    id: `rival-${r.teamId}`,
    type: 'rival',
    title: r.managerName,
    subtitle: 'Rival',
    icon: <Shield className="h-4 w-4" />,
    onSelect: () => {
      onRivalClick?.(r.teamId);
      onOpenChange(false);
    },
  }));

  const allItems = useMemo(() => [...tabItems, ...playerItems, ...rivalItems], [tabItems, playerItems, rivalItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.type.toLowerCase().includes(q),
    );
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        filtered[selectedIndex]?.onSelect();
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filtered, selectedIndex, onOpenChange]);

  const grouped = useMemo(() => {
    const groups: Record<string, CommandPaletteItem[]> = { tab: [], player: [], rival: [] };
    for (const item of filtered) {
      groups[item.type].push(item);
    }
    return groups;
  }, [filtered]);

  let globalIndex = 0;

  return (
    <CommandPaletteRoot open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar jugadores, rivales, pestañas…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {filtered.length === 0 ? (
          <CommandEmpty>No se han encontrado resultados.</CommandEmpty>
        ) : (
          <>
            {grouped.tab.length > 0 && (
              <CommandGroup>
                <CommandGroupHeading>Pestañas</CommandGroupHeading>
                {grouped.tab.map((item) => renderItem(item, globalIndex++, selectedIndex))}
              </CommandGroup>
            )}
            {grouped.player.length > 0 && (
              <CommandGroup>
                <CommandGroupHeading>Jugadores</CommandGroupHeading>
                {grouped.player.map((item) => renderItem(item, globalIndex++, selectedIndex))}
              </CommandGroup>
            )}
            {grouped.rival.length > 0 && (
              <CommandGroup>
                <CommandGroupHeading>Rivales</CommandGroupHeading>
                {grouped.rival.map((item) => renderItem(item, globalIndex++, selectedIndex))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandPaletteRoot>
  );
}

function renderItem(item: CommandPaletteItem, index: number, selectedIndex: number) {
  const selected = index === selectedIndex;
  return (
    <CommandItem
      key={item.id}
      selected={selected}
      onSelect={item.onSelect}
    >
      {item.icon && <span className="mr-2 text-muted-foreground">{item.icon}</span>}
      <div className="flex flex-col">
        <span className={selected ? 'text-foreground' : ''}>{item.title}</span>
        {item.subtitle && <span className="text-xs text-muted-foreground">{item.subtitle}</span>}
      </div>
      <CommandShortcut>
        {item.type === 'tab' ? 'Ir' : item.type === 'player' ? 'Ver' : 'Ver'}
      </CommandShortcut>
    </CommandItem>
  );
}
