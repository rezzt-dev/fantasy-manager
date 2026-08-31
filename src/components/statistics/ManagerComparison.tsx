import type { RivalTeam } from '../../types/analysis';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import Currency from '../shared/Currency';
import { Badge } from '../ui/badge';

interface ManagerComparisonProps {
  rivals: RivalTeam[];
  ownMoney: { teamMoney: number };
  ownTeamValue: number;
}

interface RowData {
  managerName: string;
  teamValue: number;
  teamMoney: number | null;
  players: number;
  isOwn: boolean;
}

export default function ManagerComparison({ rivals, ownMoney, ownTeamValue }: ManagerComparisonProps) {
  const rows: RowData[] = [
    {
      managerName: 'Tu equipo',
      teamValue: ownTeamValue,
      teamMoney: ownMoney.teamMoney,
      players: 0, // Se rellena abajo
      isOwn: true,
    },
    ...rivals.map((r) => ({
      managerName: r.managerName,
      teamValue: r.teamValue,
      teamMoney: r.teamMoney,
      players: r.players.length,
      isOwn: false,
    })),
  ];

  // Para tu equipo no tenemos players aquí, así que lo dejamos como guión o lo ocultamos.
  // A futuro se puede pasar la plantilla propia también.

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Manager</TableHead>
            <TableHead className="text-right">Valor plantilla</TableHead>
            <TableHead className="text-right">Dinero</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Jugadores</TableHead>
            <TableHead className="text-right">Poder adquisitivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows
            .sort((a, b) => b.teamValue - a.teamValue)
            .map((row) => (
              <TableRow key={row.managerName} className={row.isOwn ? 'bg-surface-raised/60' : undefined}>
                <TableCell>
                  <div className="font-semibold text-content">{row.managerName}</div>
                  {row.isOwn && <Badge variant="outline" className="mt-1 text-[10px]">Tú</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <Currency value={row.teamValue} />
                </TableCell>
                <TableCell className="text-right text-content-tertiary">
                  {row.teamMoney === null ? '—' : <Currency value={row.teamMoney} />}
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell text-content-tertiary">
                  {row.players > 0 ? row.players : '-'}
                </TableCell>
                <TableCell className="text-right font-semibold text-content">
                  <Currency value={row.teamValue + (row.teamMoney ?? 0)} />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
