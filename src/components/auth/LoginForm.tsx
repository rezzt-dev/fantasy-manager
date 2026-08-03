'use client';

import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertCircle, Mail, KeyRound, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginForm() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<'password' | 'token'>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await login(username, password);
    if (ok) {
      window.location.href = '/dashboard';
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTokenError(null);
    setTokenLoading(true);
    try {
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTokenError(data.error || 'No se ha podido guardar el token');
        return;
      }
      window.location.href = '/dashboard';
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'Error de red');
    } finally {
      setTokenLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border border-white/[0.08] bg-card shadow-none animate-fade-in">
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'password' | 'token')} className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-display tracking-tight">Bienvenido de nuevo</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Elige cómo quieres conectar tu cuenta de LALIGA FANTASY.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="token" className="gap-2">
              <KeyRound className="h-4 w-4" />
              Token
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password" className="mt-4 space-y-4">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="username"
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="tu@email.com"
                  className="flex h-10 w-full rounded-lg border border-white/[0.10] bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-white/[0.20] focus-visible:ring-2 focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex h-10 w-full rounded-lg border border-white/[0.10] bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-white/[0.20] focus-visible:ring-2 focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="token" className="mt-4 space-y-4">
            <form onSubmit={handleTokenSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Si iniciaste sesión con Google o el login con email no funciona, pega aquí el access token de la web oficial. Puedes obtenerlo ejecutando en la consola:
                <code className="mt-2 block rounded-lg bg-surface-2 border border-white/[0.06] px-3 py-2 text-xs font-mono text-foreground">
                  JSON.parse(localStorage.getItem('fz-accessToken')).access_token
                </code>
              </p>

              {tokenError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{tokenError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="token" className="text-sm font-medium text-foreground">
                  Access token
                </label>
                <textarea
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  rows={4}
                  placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs..."
                  className="flex min-h-[80px] w-full rounded-lg border border-white/[0.10] bg-background px-3 py-2 text-sm font-mono text-foreground ring-offset-background placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-white/[0.20] focus-visible:ring-2 focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={tokenLoading}>
                {tokenLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando token...
                  </>
                ) : (
                  <>
                    Entrar con token
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
