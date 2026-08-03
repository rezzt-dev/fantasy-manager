'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export default function ErrorState({
  title = 'Ha ocurrido un error',
  description = 'No se han podido cargar los datos.',
  onRetry,
  compact,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-card p-8 text-center"
    >
      <div className={compact ? 'mb-2 h-10 w-10' : 'mb-3 h-14 w-14'}>
        <div className="flex h-full w-full items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
        </div>
      </div>
      <h3 className={compact ? 'text-sm font-semibold text-destructive' : 'text-base font-semibold text-destructive'}>
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </motion.div>
  );
}
