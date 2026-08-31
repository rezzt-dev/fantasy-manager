import { useMemo } from 'react';
import type { MarketPlayer } from '../../types/fantasy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import PlayerAvatar from '../shared/PlayerAvatar';
import PlayerStatusBadge from '../shared/PlayerStatusBadge';
import Currency from '../shared/Currency';
import { positionShortName, positionBgClass } from '../../lib/format';
import { TrendingDown, ShoppingCart, Tag } from 'lucide-react';

interface MarketStatsPanelProps {
  market: MarketPlayer[];
}

export default function MarketStatsPanel({ market }: MarketStatsPanelProps) {
  const stats = useMemo(() => {
    const totalValue = market.reduce((sum, m) => sum + m.playerMaster.marketValue, 0);
    const avgPrice = market.length > 0 ? market.reduce((sum, m) => sum + m.salePrice, 0) / market.length : 0;
    const bargains = market
      .map((m) => ({ ...m, diffPercent: ((m.playerMaster.marketValue - m.salePrice) / Math.max(m.playerMaster.marketValue, 1)) * 100 }))
      .filter((m) => m.diffPercent > 15)
      .sort((a, b) => b.diffPercent - a.diffPercent)
      .slice(0, 5);

    return { totalValue, avgPrice, bargains };
  }, [market]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniCard icon={<ShoppingCart className="h-4 w-4" />} label="Jugadores en venta" value={market.length.toString()} />
        <MiniCard icon={<Tag className="h-4 w-4" />} label="Valor total en mercado" value={formatCompact(stats.totalValue)} />
        <MiniCard icon={<TrendingDown className="h-4 w-4" />} label="Precio medio" value={formatCompact(stats.avgPrice)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-content-secondary" />
            Oportunidades de mercado
          </CardTitle>
          <CardDescription>Jugadores con precio de venta sensiblemente por debajo de su valor de mercado</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.bargains.length === 0 ? (
            <div className="text-sm text-content-tertiary">No hay oportunidades claras en el mercado actual.</div>
          ) : (
            <div className="space-y-3">
              {stats.bargains.map((marketPlayer) => (
                <BargainRow key={marketPlayer.id} marketPlayer={marketPlayer} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BargainRow({ marketPlayer }: { marketPlayer: MarketPlayer & { diffPercent: number } }) {
  const p = marketPlayer.playerMaster;
  const posColor = positionBgClass(p.position || '', p.positionId);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.09] bg-surface-raised p-3">
      <PlayerAvatar player={p} size="md" showPosition />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-content">{p.nickname}</span>
          <Badge variant="secondary" className={`font-display font-bold text-white ${posColor} border-0`}>
            {positionShortName(p.position, p.positionId)}
          </Badge>
        </div>
        <div className="text-xs text-content-tertiary">{p.team?.name || 'Sin equipo'}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-content">{marketPlayer.diffPercent.toFixed(0)}% abajo</div>
        <div className="text-xs text-content-tertiary">
          <Currency value={marketPlayer.salePrice} /> / <Currency value={p.marketValue} />
        </div>
      </div>
      <div className="text-right">
        <PlayerStatusBadge status={p.playerStatus} />
        <div className="text-xs text-content-tertiary">{marketPlayer.numberOfBids} pujas</div>
      </div>
    </div>
  );
}

function MiniCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-content-tertiary">
          {icon}
          <span className="text-xs font-medium text-content-secondary">{label}</span>
        </div>
        <div className="mt-2 text-2xl font-bold text-content">{value}</div>
      </CardContent>
    </Card>
  );
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
