'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Activity, ShoppingCart, ArrowUpRight, ArrowDownLeft, Gavel } from 'lucide-react';
import type { LeagueActivityEvent } from '../../lib/fantasy/activity';
import Currency from '../shared/Currency';

interface LeagueActivityFeedProps {
  events: LeagueActivityEvent[];
  managersById: Record<number, string>;
}

function activityLabel(type: number): string {
  if (type === 1) return 'Fichaje';
  if (type === 31) return 'Fichaje';
  if (type === 32) return 'Clausulazo';
  if (type === 33) return 'Venta';
  return 'Actividad';
}

function activityIcon(type: number) {
  if (type === 32) return <Gavel className="h-3.5 w-3.5" />;
  if (type === 33) return <ArrowDownLeft className="h-3.5 w-3.5" />;
  return <ShoppingCart className="h-3.5 w-3.5" />;
}

export default function LeagueActivityFeed({ events, managersById }: LeagueActivityFeedProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-content-tertiary" />
            Actividad de la liga
          </CardTitle>
          <CardDescription>Movimientos recientes de los managers</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-content-tertiary">No hay actividad reciente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-content-tertiary" />
          Actividad de la liga
        </CardTitle>
        <CardDescription>Movimientos recientes de los managers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.slice(0, 6).map((event, idx) => (
          <div key={`${event.userId}-${event.createdAt}-${idx}`} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-surface-raised text-content-tertiary">
              {activityIcon(event.activityTypeId)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-content">
                  {managersById[event.userId] || `Manager #${event.userId}`}
                </span>
                <Badge variant={event.activityTypeId === 32 ? 'warning' : event.activityTypeId === 33 ? 'secondary' : 'success'} className="text-[10px]">
                  {activityLabel(event.activityTypeId)}
                </Badge>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-content-tertiary">
                <span>{new Date(event.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                {typeof event.amount === 'number' && event.amount > 0 && (
                  <>
                    <span>·</span>
                    <Currency value={event.amount} className="font-medium text-content" />
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
