import { cn } from '../../lib/utils';

interface SectionHeaderProps {
  /** Etiqueta de contexto sobre el título. Sitúa al usuario sin gastar una línea de titular. */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Acciones de la sección. Como mucho una sólida; el resto, `outline` o `ghost`. */
  action?: React.ReactNode;
  /** `h1` en la cabecera de una vista, `h2` dentro de ella. Por defecto `h2`. */
  as?: 'h1' | 'h2';
  className?: string;
}

/**
 * Cabecera de sección.
 *
 * La descripción se limita a la medida de lectura (`.measure`, ~34em) aunque el
 * contenedor sea más ancho: una línea de 140 caracteres no se lee, se ignora.
 */
export default function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  as: Heading = 'h2',
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        '[.density-dense_&]:gap-2',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2 [.density-dense_&]:mb-1">{eyebrow}</p>}
        <Heading
          className={cn(
            'font-display font-semibold tracking-[-0.025em] text-content',
            Heading === 'h1' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl',
            '[.density-dense_&]:text-lg [.density-dense_&]:sm:text-xl',
          )}
        >
          {title}
        </Heading>
        {description && (
          <p className="measure mt-2 text-sm leading-relaxed text-content-tertiary [.density-dense_&]:mt-1 [.density-dense_&]:text-xs">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
