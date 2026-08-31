'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { detectExtension, loginWithExtension, persistTokens } from '../../lib/auth/extension-bridge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { AlertCircle, Mail, KeyRound, ArrowRight, Loader2, Download, ExternalLink } from 'lucide-react';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.26a12 12 0 0 0 0 10.78l4.01-3.11Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.26 6.61l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export default function LoginForm() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<'password' | 'token'>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  const [extension, setExtension] = useState<'checking' | 'ready' | 'missing'>('checking');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    let active = true;
    detectExtension().then(({ installed }) => {
      if (active) setExtension(installed ? 'ready' : 'missing');
    });
    return () => {
      active = false;
    };
  }, []);

  const handleGoogle = async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const tokens = await loginWithExtension();
      await persistTokens(tokens);
      window.location.href = '/dashboard';
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'El login no se ha completado');
    } finally {
      setGoogleLoading(false);
    }
  };

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
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-display tracking-tight">Bienvenido de nuevo</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Elige cómo quieres conectar tu cuenta de LALIGA FANTASY.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-0">
        <div className="space-y-3">
          {googleError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{googleError}</span>
            </div>
          )}

          {extension === 'missing' ? (
            <>
              <Button variant="outline" className="w-full" onClick={() => setShowInstall((v) => !v)}>
                <GoogleIcon className="mr-2 h-4 w-4" />
                Entrar con Google
                <Download className="ml-2 h-4 w-4 opacity-60" />
              </Button>
              {showInstall && (
                <div className="space-y-2 rounded-lg border border-white/[0.08] bg-surface-2/60 p-3 text-sm text-muted-foreground">
                  <p className="text-foreground">Necesitas el conector de Fantasy Manager.</p>
                  <p>
                    LaLiga sólo acepta el login de su app oficial, así que hace falta una pequeña extensión que complete el
                    proceso por ti. Se instala una vez y no vuelves a tocar ningún token.
                  </p>
                  <a
                    className="inline-flex items-center gap-1.5 text-foreground underline underline-offset-4"
                    href="/extension"
                  >
                    Cómo instalarla
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </>
          ) : (
            <Button className="w-full" onClick={handleGoogle} disabled={googleLoading || extension === 'checking'}>
              {googleLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Esperando a que termines el login...
                </>
              ) : (
                <>
                  <GoogleIcon className="mr-2 h-4 w-4" />
                  Entrar con Google
                </>
              )}
            </Button>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Te loguearás en la página oficial de LaLiga. Nosotros no vemos tu contraseña.
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/[0.08]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-2 text-xs uppercase tracking-wide text-muted-foreground">o</span>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'password' | 'token')} className="w-full">
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

              <p className="text-xs text-muted-foreground">
                Sólo funciona con cuentas creadas con email y contraseña. Si te registraste con Google, usa el botón de
                arriba.
              </p>

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="username"
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="tu@email.com"
                  className="bg-surface-2"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Contraseña
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-surface-2"
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
                Método manual, para cuando no puedes instalar la extensión. Inicia sesión en la web oficial y ejecuta esto
                en la consola del navegador:
                <code className="mt-2 block rounded-lg bg-surface-2 border border-white/[0.06] px-3 py-2 text-xs font-mono text-foreground">
                  localStorage.getItem('fz-accessToken')
                </code>
                <span className="mt-2 block text-xs">
                  Pega el resultado completo: si incluye el <code className="font-mono">refresh_token</code>, la sesión se
                  renovará sola y no tendrás que repetirlo.
                </span>
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
                  className="flex min-h-[80px] w-full rounded-lg border border-white/[0.10] bg-surface-2 px-3 py-2 text-sm font-mono text-foreground ring-offset-background placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-white/[0.20] focus-visible:ring-2 focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
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
        </Tabs>
      </CardContent>
    </Card>
  );
}
