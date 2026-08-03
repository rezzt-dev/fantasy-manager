'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent } from './dialog';
import { cn } from '../../lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function CommandPalette({ open, onOpenChange, children }: CommandPaletteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl border-white/[0.08] bg-[#1c1c1c]/95 backdrop-blur-xl">
        {children}
      </DialogContent>
    </Dialog>
  );
}

interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onValueChange: (value: string) => void;
}

const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, value, onValueChange, ...props }, ref) => (
    <div className="flex items-center border-b border-white/[0.08] px-4">
      <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          'flex h-12 w-full rounded-md bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  ),
);
CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('max-h-[60vh] overflow-y-auto p-2', className)} {...props} />
  ),
);
CommandList.displayName = 'CommandList';

const CommandEmpty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('py-6 text-center text-sm text-muted-foreground', className)} {...props} />
  ),
);
CommandEmpty.displayName = 'CommandEmpty';

const CommandGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('overflow-hidden py-2 px-1 text-foreground', className)}
      {...props}
    />
  ),
);
CommandGroup.displayName = 'CommandGroup';

const CommandGroupHeading = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground', className)}
      {...props}
    />
  ),
);
CommandGroupHeading.displayName = 'CommandGroupHeading';

interface CommandItemProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  onSelect?: () => void;
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, selected, onSelect, ...props }, ref) => (
    <div
      ref={ref}
      onClick={onSelect}
      className={cn(
        'flex cursor-pointer items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors',
        selected ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
        className,
      )}
      {...props}
    />
  ),
);
CommandItem.displayName = 'CommandItem';

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)} {...props} />
);
CommandShortcut.displayName = 'CommandShortcut';

export {
  CommandPalette,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  CommandShortcut,
};
