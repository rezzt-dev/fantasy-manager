import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'circle' | 'text';
}

function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  const variantClasses = {
    default: 'rounded-lg',
    card: 'rounded-xl',
    circle: 'rounded-full',
    text: 'rounded-md',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white/[0.06]',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </div>
  );
}

export { Skeleton };
