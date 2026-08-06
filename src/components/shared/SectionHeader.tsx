import { cn } from '../../lib/utils';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between [.density-dense_&]:mb-4 [.density-dense_&]:gap-2',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl [.density-dense_&]:text-lg [.density-dense_&]:sm:text-xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground [.density-dense_&]:mt-1 [.density-dense_&]:text-[13px]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
