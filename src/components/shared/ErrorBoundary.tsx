'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '../ui/button';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-destructive/20 bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-card-foreground">Algo ha fallado</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Se ha producido un error inesperado al cargar el dashboard.
                </p>
                {this.state.error && (
                  <div className="mt-3 max-h-32 overflow-auto rounded-lg bg-muted p-3 text-xs font-mono text-muted-foreground">
                    {this.state.error.message}
                  </div>
                )}
                <Button
                  className="mt-4 gap-2"
                  onClick={() => {
                    this.setState({ hasError: false, error: undefined });
                    window.location.reload();
                  }}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Recargar página
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
