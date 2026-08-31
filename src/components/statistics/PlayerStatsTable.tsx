'use client';

import { useMemo, useState } from 'react';
import type { TeamPlayer, PlayerMaster } from '../../types/fantasy';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import PlayerAvatar from '../shared/PlayerAvatar';
import PlayerStatusBadge from '../shared/PlayerStatusBadge';
import Currency from '../shared/Currency';
import { positionShortName, positionBgClass, getPositionName } from '../../lib/format';
import { Search } from 'lucide-react';

interface PlayerStatsTableProps {
  teamPlayers: TeamPlayer[];
  ownPlayerIds: Set<string>;
}

type SortKey = 'points' | 'marketValue' | 'buyoutClause';

export default function PlayerStatsTable({ teamPlayers, ownPlayerIds }: PlayerStatsTableProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('points');
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    let list = [...teamPlayers];

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.playerMaster.nickname.toLowerCase().includes(q) ||
          p.playerMaster.team?.name?.toLowerCase().includes(q) ||
          getPositionName(p.playerMaster.positionId).toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      let valueA = 0;
      let valueB = 0;
      switch (sortKey) {
        case 'points':
          valueA = a.playerMaster.points || a.playerMaster.lastSeasonPoints || 0;
          valueB = b.playerMaster.points || b.playerMaster.lastSeasonPoints || 0;
          break;
        case 'marketValue':
          valueA = a.playerMaster.marketValue;
          valueB = b.playerMaster.marketValue;
          break;
        case 'buyoutClause':
          valueA = a.buyoutClause;
          valueB = b.buyoutClause;
          break;
      }
      return sortDesc ? valueB - valueA : valueA - valueB;
    });

    return list;
  }, [teamPlayers, query, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
        <Input
          placeholder="Buscar jugador, equipo o posición..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]"></TableHead>
              <TableHead>Jugador</TableHead>
              <TableHead>Posición</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('points')}>Puntos {sortArrow('points')}</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('marketValue')}>Valor {sortArrow('marketValue')}</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('buyoutClause')}>Cláusula {sortArrow('buyoutClause')}</TableHead>
              <TableHead>Equipo real</TableHead>
              <TableHead>Propio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((player) => (
              <PlayerRow key={player.playerTeamId} player={player.playerMaster} buyoutClause={player.buyoutClause} isOwn={ownPlayerIds.has(player.playerMaster.id)} />
            ))}
          </TableBody>
        </Table>
      </div>
      {filtered.length === 0 && <div className="py-8 text-center text-sm text-content-tertiary">No se encuentran jugadores.</div>}
    </div>
  );

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return <span className="text-content-tertiary">↕</span>;
    return <span className="text-content">{sortDesc ? '↓' : '↑'}</span>;
  }
}

function PlayerRow({
  player,
  buyoutClause,
  isOwn,
}: {
  player: PlayerMaster;
  buyoutClause: number;
  isOwn: boolean;
}) {
  const points = player.points || player.lastSeasonPoints || 0;
  const posColor = positionBgClass(player.position || '', player.positionId);

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell>
        <PlayerAvatar player={player} size="sm" showPosition />
      </TableCell>
      <TableCell>
        <div className="font-semibold">{player.nickname}</div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={`font-display font-bold tracking-wide text-white ${posColor} border-0`}>
          {positionShortName(player.position, player.positionId)}
        </Badge>
      </TableCell>
      <TableCell>
        <PlayerStatusBadge status={player.playerStatus} />
      </TableCell>
      <TableCell className="font-semibold">{points}</TableCell>
      <TableCell>
        <Currency value={player.marketValue} className="text-content-tertiary" />
      </TableCell>
      <TableCell>
        <Currency value={buyoutClause} />
      </TableCell>
      <TableCell className="text-sm text-content-tertiary">{player.team?.name || '-'}</TableCell>
      <TableCell>
        {isOwn && (
          <Badge variant="outline" className="text-xs">
            Tuyo
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}
