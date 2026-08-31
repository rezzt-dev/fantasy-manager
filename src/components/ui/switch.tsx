'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '../../lib/utils';

/**
 * El estado encendido usa el acento, no el blanco de marca: es el único
 * control cuyo estado hay que poder leer de reojo desde el otro lado de la
 * cabecera. El pulgar mantiene 3:1 contra ambos fondos de la pista.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
      'transition-colors duration-fast ease-out',
      'disabled:cursor-not-allowed disabled:opacity-40',
      'data-[state=checked]:bg-accent data-[state=unchecked]:bg-ink-400',
      className,
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-4 w-4 rounded-full shadow-2 ring-0',
        'data-[state=checked]:bg-ink-0 data-[state=unchecked]:bg-ink-800',
        'transition-transform duration-fast ease-spring',
        'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
