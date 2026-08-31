'use client';

import type { CaptainCandidate, CaptainRecommendation } from '../../types/analysis';
import type { PlayerMaster } from '../../types/fantasy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import PlayerAvatar from '../shared/PlayerAvatar';
import PlayerStatusBadge from '../shared/PlayerStatusBadge';
import { Crown, AlertTriangle, Home, Plane, Lock, Sparkles } from 'lucide-react';
import { positionShortName } from '../../lib/format';

interface CaptainCardProps {
  captain: CaptainRecommendation;
  /** Abre la ficha del jugador. */
  onSelectPlayer?: (player: PlayerMaster) => void;
  /** Texto de la cabecera; por defecto el del centro de estrategia. */
  description?: string;
  className?: string;
}

const POOL_LABEL: Record<CaptainRecommendation['pool'], string> = {
  lineup: 'De tu once actual',
  optimal: 'Del mejor once',
  squad: 'De tu plantilla',
};

const CONFIDENCE_LABEL: Record<CaptainCandidate['confidence'], string> = {
  high: 'Confianza alta',
  medium: 'Confianza media',
  low: 'Confianza baja',
};

/**
 * Capitán recomendado de la jornada. El brazalete duplica los puntos del
 * jugador, así que la tarjeta enseña las dos cifras que importan: los puntos
 * esperados y lo que se gana frente a la siguiente mejor opción.
 */
export default function CaptainCard({ captain, onSelectPlayer, description, className }: CaptainCardProps) {
  const cap = captain.captain;

  return (
    <Card variant="accent" className={className}>
      <CardHeader className="border-b border-white/[0.09] pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-accent-300">
            <Crown className="h-4 w-4 shrink-0" />
            Capitán de la jornada
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline-muted" className="text-[10px]">{POOL_LABEL[captain.pool]}</Badge>
            {!captain.enabled && (
              <Badge variant="outline-muted" className="gap-1 text-[10px]">
                <Lock className="h-3 w-3" /> No activo en tu liga
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {description ?? 'El capitán duplica sus puntos: es la decisión más apalancada de la jornada.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <button
          type="button"
          onClick={() => onSelectPlayer?.(cap.player)}
          disabled={!onSelectPlayer}
          className="flex w-full items-center gap-4 rounded-lg border border-caution/25 bg-caution/[0.04] p-4 text-left transition-colors enabled:hover:bg-caution/[0.08] disabled:cursor-default"
        >
          <div className="relative shrink-0">
            <PlayerAvatar player={cap.player} size="xl" showPosition />
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-caution text-background shadow-sm">
              <Crown className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-lg font-bold text-content">{cap.player.nickname}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-content-tertiary">
              <span>{cap.player.team?.name || '—'}</span>
              <span>·</span>
              <span className="font-display font-semibold">
                {positionShortName(cap.player.position, cap.player.positionId)}
              </span>
              {cap.hasFixture && cap.isHome !== null && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    {cap.isHome ? <Home className="h-3 w-3" /> : <Plane className="h-3 w-3" />}
                    {cap.isHome ? 'En casa' : 'Fuera'}
                  </span>
                </>
              )}
              <PlayerStatusBadge status={cap.player.playerStatus} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-content-tertiary">{cap.reasoning}</p>
          </div>

          <div className="shrink-0 text-right">
            <div className="font-display text-3xl font-bold text-caution-text">{cap.totalWithArmband.toFixed(1)}</div>
            <div className="text-[11px] text-content-tertiary">
              pts con brazalete
              <span className="block">
                ({cap.expectedPoints.toFixed(1)} × 2)
              </span>
            </div>
          </div>
        </button>

        <div className="grid gap-2 sm:grid-cols-3">
          <Metric label="Bonus del brazalete" value={`+${cap.captainBonus.toFixed(1)} pts`} accent="text-caution-text" />
          <Metric
            label="Gana a la alternativa"
            value={`+${captain.gainOverAlternative.toFixed(1)} pts`}
            accent={captain.gainOverAlternative >= 1 ? 'text-positive-text' : 'text-content-tertiary'}
          />
          <Metric
            label={CONFIDENCE_LABEL[cap.confidence]}
            value={`Suelo ${cap.floorPoints.toFixed(1)} pts`}
            accent={cap.confidence === 'high' ? 'text-positive-text' : cap.confidence === 'medium' ? 'text-caution-text' : 'text-negative-text'}
          />
        </div>

        {cap.risks.length > 0 && (
          <div className="rounded-lg border border-caution/25 bg-caution-quiet p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-caution-text">
              <AlertTriangle className="h-3.5 w-3.5" /> A tener en cuenta
            </div>
            <ul className="space-y-1 text-xs leading-relaxed text-content-tertiary">
              {cap.risks.map((risk) => (
                <li key={risk}>· {risk}</li>
              ))}
            </ul>
          </div>
        )}

        {captain.optimalCaptain && (
          <div className="flex items-start gap-2 rounded-lg border border-white/[0.09] bg-surface-raised p-3 text-xs leading-relaxed text-content-tertiary">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-content" />
            <span>
              Si aplicas el <span className="font-semibold text-content">mejor once</span>, el brazalete debería ir a{' '}
              <span className="font-semibold text-content">{captain.optimalCaptain.player.nickname}</span> (
              {captain.optimalCaptain.expectedPoints.toFixed(1)} pts esperados).
            </span>
          </div>
        )}

        {captain.alternatives.length > 0 && (
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-content-tertiary">
              Alternativas
            </div>
            <div className="space-y-1.5">
              {captain.alternatives.map((alt, index) => (
                <button
                  key={alt.player.id}
                  type="button"
                  onClick={() => onSelectPlayer?.(alt.player)}
                  disabled={!onSelectPlayer}
                  className="flex w-full items-center gap-3 rounded-lg border border-white/[0.09] bg-surface-raised p-2.5 text-left transition-colors enabled:hover:bg-surface-overlay disabled:cursor-default"
                >
                  <span className="w-4 shrink-0 text-center font-display text-xs font-bold text-content-tertiary">
                    {index + 2}
                  </span>
                  <PlayerAvatar player={alt.player} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-content">{alt.player.nickname}</div>
                    <div className="truncate text-[11px] text-content-tertiary">
                      {alt.risks[0] ?? alt.reasoning}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-sm font-bold text-content">
                      {alt.totalWithArmband.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-content-tertiary">
                      −{Math.max(0, cap.expectedPoints - alt.expectedPoints).toFixed(1)} pts
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!captain.enabled && (
          <p className="text-[11px] leading-relaxed text-content-tertiary">
            Tu liga no tiene activada la función de capitán, así que este cálculo es solo informativo: nadie duplica
            puntos esta jornada.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-white/[0.09] bg-surface-raised p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-content-tertiary">{label}</div>
      <div className={`mt-0.5 font-display text-lg font-bold ${accent}`}>{value}</div>
    </div>
  );
}
