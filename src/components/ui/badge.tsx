import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand text-background hover:bg-white',
        secondary: 'border-transparent bg-surface-3 text-secondary-foreground hover:bg-surface-4',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'border border-white/[0.12] text-foreground hover:bg-white/[0.05]',
        'outline-muted': 'border border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:border-white/[0.10]',
        success: 'border-transparent bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
        warning: 'border-transparent bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
        danger: 'border-transparent bg-rose-500/10 text-rose-400 hover:bg-rose-500/20',
        info: 'border-transparent bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20',
        muted: 'border-transparent bg-white/[0.06] text-brand-muted hover:bg-white/[0.09]',
        glow: 'border-white/[0.10] bg-white/[0.06] text-foreground shadow-glow-sm hover:bg-white/[0.10]',
        dot: 'gap-1.5 border-transparent bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
