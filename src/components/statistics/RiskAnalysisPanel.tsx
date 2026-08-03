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
          icon={<ShieldAlert className="h-5 w-5 text-brand-muted" />}
          title="Riesgo alto"
          count={highRisk.length}
          description="Jugadores que deberías proteger cuanto antes"
          variant="high"
        />
        <MiniAlert
          icon={<ShieldCheck className="h-5 w-5 text-brand-muted" />}
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
            <div className="text-sm text-muted-foreground">No hay datos de riesgo disponibles.</div>
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
  const scoreClass = {
    high: 'border-white/[0.12] bg-white/[0.06] text-brand',
    medium: 'border-white/[0.08] bg-white/[0.03] text-brand-muted',
    low: 'border-white/[0.06] text-muted-foreground',
  }[scoreVariant];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-card-foreground">{risk.nickname}</span>
          <Badge variant="outline" className={`text-[10px] ${scoreClass}`}>{risk.riskScore}/100</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{risk.reasoning}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Actual</div>
          <Currency value={risk.currentClause} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Recomendada</div>
          <div className="font-semibold text-brand">
            <Currency value={risk.recommendedClause} />
          </div>
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
    high: 'border-white/[0.12] bg-surface-2 text-card-foreground',
    medium: 'border-white/[0.08] bg-surface text-card-foreground',
  };

  return (
    <Card className={colors[variant]}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <div className="mt-2 text-3xl font-bold">{count}</div>
        <p className="text-xs text-brand-muted">{description}</p>
      </CardContent>
    </Card>
  );
}
