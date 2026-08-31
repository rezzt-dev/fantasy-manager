import type { ClauseRiskAnalysis } from '../../types/analysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import Currency from '../shared/Currency';
import { Badge } from '../ui/badge';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface RiskAnalysisPanelProps {
  clauseRisks: ClauseRiskAnalysis[];
}

export default function RiskAnalysisPanel({ clauseRisks }: RiskAnalysisPanelProps) {
  const highRisk = clauseRisks.filter((r) => r.riskScore >= 70);
  const mediumRisk = clauseRisks.filter((r) => r.riskScore >= 40 && r.riskScore < 70);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <MiniAlert
          icon={<ShieldAlert className="h-5 w-5 text-negative-text" />}
          title="Riesgo alto"
          count={highRisk.length}
          description="Jugadores que deberías proteger cuanto antes"
          variant="high"
        />
        <MiniAlert
          icon={<ShieldCheck className="h-5 w-5 text-caution-text" />}
          title="Riesgo medio"
          count={mediumRisk.length}
          description="Revisa su cláusula antes de la jornada"
          variant="medium"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking de riesgo de cláusula</CardTitle>
          <CardDescription>Jugadores ordenados por probabilidad de ser fichados por otro manager</CardDescription>
        </CardHeader>
        <CardContent>
          {clauseRisks.length === 0 ? (
            <div className="text-sm text-content-tertiary">No hay datos de riesgo disponibles.</div>
          ) : (
            <div className="space-y-3">
              {clauseRisks.slice(0, 10).map((risk) => (
                <RiskRow key={risk.playerId} risk={risk} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RiskRow({ risk }: { risk: ClauseRiskAnalysis }) {
  const scoreVariant = risk.riskScore >= 70 ? 'high' : risk.riskScore >= 40 ? 'medium' : 'low';
  // El riesgo se lee por color Y por posición en la escala («82/100»), que es
  // la señal que funciona sin percepción de color.
  const scoreClass = {
    high: 'border-negative/25 bg-negative-quiet text-negative-text',
    medium: 'border-caution/25 bg-caution-quiet text-caution-text',
    low: 'border-white/[0.09] bg-white/[0.05] text-content-tertiary',
  }[scoreVariant];

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/[0.09] bg-surface-raised p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-content">{risk.nickname}</span>
          <Badge size="sm" className={`numeral ${scoreClass}`}>
            {risk.riskScore}/100
          </Badge>
        </div>
        <p className="text-xs text-content-tertiary">{risk.reasoning}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div>
          <p className="eyebrow text-[10px]">Actual</p>
          <Currency value={risk.currentClause} compact className="text-content-secondary" />
        </div>
        <div>
          <p className="eyebrow text-[10px]">Recomendada</p>
          <Currency value={risk.recommendedClause} compact className="font-semibold text-content" />
        </div>
      </div>
    </div>
  );
}

function MiniAlert({
  icon,
  title,
  count,
  description,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  description: string;
  variant: 'high' | 'medium';
}) {
  const colors = {
    high: 'border-negative/30 bg-negative-quiet',
    medium: 'border-caution/25 bg-caution-quiet',
  };

  return (
    <Card className={colors[variant]}>
      <CardContent className="p-5 pt-5">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-content">{title}</span>
        </div>
        <p className="numeral mt-2 text-3xl font-bold tracking-[-0.03em] text-content">{count}</p>
        <p className="mt-1 text-xs leading-relaxed text-content-tertiary">{description}</p>
      </CardContent>
    </Card>
  );
}
