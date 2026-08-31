'use client';

import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.05] hover:text-content disabled:pointer-events-none disabled:opacity-40 data-[state=on]:bg-white/[0.1] data-[state=on]:text-content',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'border border-white/[0.09] bg-transparent hover:bg-white/[0.05] hover:border-white/[0.14]',
      },
      size: {
        default: 'h-10 px-3',
        sm: 'h-8 px-2.5',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size, className }))} {...props} />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
