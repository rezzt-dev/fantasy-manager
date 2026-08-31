import { cn } from '../../lib/utils';

/**
 * Marca de Fantasy Manager.
 *
 * El símbolo es la línea de medio campo con su círculo central —el dibujo que
 * cualquiera reconoce como «campo»— cortada por un punto de acento fuera del
 * eje: la decisión que desequilibra el partido, que es lo que vende el
 * producto. Se dibuja a mano y no se toma de una librería de iconos, porque un
 * trofeo genérico no es una marca.
 *
 * Trazo de 1,5 px a 24 px, igual que el resto de iconografía (Lucide), para
 * que conviva con ella sin desentonar.
 */

interface LogoMarkProps {
  className?: string;
  /** Apaga el punto de acento (versión monocroma, p. ej. sobre el acento). */
  monochrome?: boolean;
  /**
   * Marca el símbolo para que se DIBUJE al cargar la página, en lugar de
   * aparecer ya hecho.
   *
   * Solo se activa en las dos pantallas cuyo trabajo es presentar el producto
   * —portada y acceso—, y una única vez por visita. Dentro del panel el logo es
   * un elemento de orientación que el usuario ve doscientas veces al día:
   * animarlo ahí sería puro adorno.
   *
   * El trazo lo ejecuta Anime.js (ver `src/lib/motion-brand.ts`). Si el
   * JavaScript no llega a cargarse, el símbolo se queda tal cual está aquí:
   * completo y correcto.
   */
  draw?: boolean;
}

export function LogoMark({ className, monochrome = false, draw = false }: LogoMarkProps) {
  const mark = draw ? { 'data-logo-mark': '' } : {};
  const stroke = draw ? { 'data-logo-stroke': '' } : {};
  const dot = draw ? { 'data-logo-dot': '' } : {};

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('h-6 w-6', className)}
      aria-hidden="true"
      focusable="false"
      {...mark}
    >
      {/* Perímetro del campo */}
      <rect
        x="2.75"
        y="4.75"
        width="18.5"
        height="14.5"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.55"
        {...stroke}
      />
      {/* Línea de medio campo */}
      <path d="M12 4.75v14.5" stroke="currentColor" strokeWidth="1.5" opacity="0.55" {...stroke} />
      {/* Círculo central */}
      <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.5" {...stroke} />
      {/* El punto: la jugada que desequilibra */}
      <circle
        cx="15.1"
        cy="9.4"
        r="2.1"
        fill={monochrome ? 'currentColor' : 'hsl(var(--accent))'}
        {...dot}
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  /** `sm` para barras densas, `md` por defecto, `lg` para portada e inicio de sesión. */
  size?: 'sm' | 'md' | 'lg';
  /** Oculta el texto y deja solo el símbolo (raíl plegado). */
  markOnly?: boolean;
  /** Dibuja el símbolo al cargar. Ver `LogoMarkProps.draw`. */
  draw?: boolean;
}

export default function Logo({ className, size = 'md', markOnly = false, draw = false }: LogoProps) {
  const mark = { sm: 'h-5 w-5', md: 'h-6 w-6', lg: 'h-8 w-8' }[size];
  const text = { sm: 'text-sm', md: 'text-[15px]', lg: 'text-xl' }[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5 text-content', className)}>
      <LogoMark className={mark} draw={draw} />
      {!markOnly && (
        <span className={cn('font-display font-semibold tracking-[-0.03em] leading-none', text)}>
          Fantasy<span className="text-content-tertiary">Manager</span>
        </span>
      )}
    </span>
  );
}
