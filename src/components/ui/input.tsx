import * as React from 'react';
import { TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Marca visual y semántica de error. El mensaje lo pinta `Field`. */
  invalid?: boolean;
}

/**
 * El borde usa `--border-control` (#757575) y no un blanco translúcido: cuando el
 * borde es lo único que identifica el control, WCAG 1.4.11 exige 3:1 contra el
 * fondo. Altura 44 px en móvil (touch-friendly-input) y 40 px desde `sm`.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-11 w-full rounded-md border bg-surface-raised px-3 text-base text-content sm:h-10 sm:text-sm',
        'transition-[border-color,background-color] duration-fast ease-out',
        'placeholder:text-content-tertiary',
        'hover:border-ink-700',
        'disabled:cursor-not-allowed disabled:bg-surface disabled:text-content-disabled',
        'read-only:bg-surface read-only:text-content-secondary',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-content',
        invalid ? 'border-negative' : 'border-ink-600',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export interface FieldProps {
  /** Etiqueta visible. Nunca un placeholder haciendo de etiqueta. */
  label: string;
  /** `id` del control; enlaza label, ayuda y error. */
  htmlFor: string;
  /** Texto de ayuda persistente, no un placeholder que desaparece al escribir. */
  hint?: string;
  /** Mensaje de error. Debe decir la causa y cómo arreglarlo. */
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Envoltorio de campo de formulario. Coloca el error **debajo** del control
 * (regla error-placement) y lo anuncia con `role="alert"` para lectores de
 * pantalla. El control interno debe recibir
 * `aria-describedby={`${htmlFor}-hint ${htmlFor}-error`}`.
 */
export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="flex items-baseline gap-1 text-sm font-medium text-content">
        {label}
        {required && (
          <span className="text-negative-text" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(obligatorio)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs leading-normal text-content-tertiary">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-xs leading-normal text-negative-text"
        >
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export { Input };
