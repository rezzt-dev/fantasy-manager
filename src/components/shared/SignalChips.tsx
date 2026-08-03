import { cn } from '../../lib/utils';
import type { ExternalSignal } from '../../types/fantasy';

const CATEGORY_LABELS: Record<string, string> = {
  injury: 'Lesión',
  illness: 'Enfermo',
  suspension: 'Sanción',
  doubt: 'Duda',
  return: 'Vuelta',
  form: 'Racha',
  rotation: 'Rotación',
  transfer: 'Mercado',
};

interface SignalChipsProps {
  signals: ExternalSignal[];
  className?: string;
  max?: number;
}

/**
 * Chips con las señales externas de un jugador (noticias clasificadas).
 * Muestra fuente, categoría en español y confianza; enlaza a la noticia
 * original cuando hay URL.
 */
export default function SignalChips({ signals, className, max = 6 }: SignalChipsProps) {
  if (!signals || signals.length === 0) return null;

  const visible = signals.slice(0, max);
  const remaining = signals.length - max;

  return (
    <div className={cn('mt-2 flex flex-wrap gap-1.5', className)}>
      {visible.map((signal, idx) => {
        const category = signal.category ? CATEGORY_LABELS[signal.category] || signal.category : null;
        const label = `${signal.source}${category ? ` · ${category}` : ''}`;
        const chipClass = cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-opacity',
          signal.signal === 'buy'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:opacity-80'
            : signal.signal === 'sell'
            ? 'border-rose-500/20 bg-rose-500/10 text-rose-400 hover:opacity-80'
            : 'border-white/[0.08] bg-surface-2 text-muted-foreground hover:text-foreground',
        );

        const content = (
          <>
            {label}
            <span className="opacity-70">{Math.round(signal.confidence * 100)}%</span>
          </>
        );

        if (signal.url) {
          return (
            <a
              key={idx}
              href={signal.url}
              target="_blank"
              rel="noopener noreferrer"
              className={chipClass}
              title={signal.reason}
            >
              {content} ↗
            </a>
          );
        }

        return (
          <span key={idx} className={chipClass} title={signal.reason}>
            {content}
          </span>
        );
      })}
      {remaining > 0 && (
        <span className="inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-muted-foreground">
          +{remaining} más
        </span>
      )}
    </div>
  );
}
