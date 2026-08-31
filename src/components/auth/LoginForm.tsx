'use client';

import { useId, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { loginWithExtension, persistTokens } from '../../lib/auth/extension-bridge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input, Field } from '../ui/input';
import { Mail, KeyRound, ArrowRight, Eye, EyeOff, OctagonAlert, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Logo de Google: colores de marca de un tercero, exentos del sistema propio. */
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

/** Aviso de formulario. `role="alert"` lo anuncia sin que el usuario tenga que buscarlo. */
function FormAlert({ children, tone = 'danger' }: { children: React.ReactNode; tone?: 'danger' | 'info' }) {
  const Icon = tone === 'danger' ? OctagonAlert : Info;
  return (
    <p
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-md border p-3 text-sm leading-relaxed',
        tone === 'danger'
          ? 'border-negative/30 bg-negative-quiet text-content-secondary'
          : 'border-info/25 bg-info-quiet text-content-secondary',
      )}
    >
      <Icon
        className={cn('mt-0.5 h-4 w-4 shrink-0', tone === 'danger' ? 'text-negative-text' : 'text-info-text')}
        aria-hidden="true"
      />
      <span>{children}</span>
    </p>
  );
}

export default function LoginForm() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<'password' | 'token'>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);

  const ids = useId();
  const emailId = `${ids}-email`;
  const passwordId = `${ids}-password`;
  const tokenId = `${ids}-token`;

  // El acceso con Google necesita la extensión del navegador, que todavía no
  // está publicada en las tiendas. Hasta entonces el botón explica el motivo en
  // lugar de fallar en silencio.
  const googleDisabled = true;

  const handleGoogle = async () => {
    if (googleDisabled) {
      setGoogleNotice(
        'El acceso con Google necesita la extensión del navegador, que aún no está publicada en las tiendas de Chrome y Firefox. Mientras tanto entra con email y contraseña, o pegando tu token.',
      );
      return;
    }
    setGoogleNotice(null);
    try {
      const tokens = await loginWithExtension();
      await persistTokens(tokens);
      window.location.href = '/dashboard';
    } catch (err) {
      setGoogleNotice(err instanceof Error ? err.message : 'El login no se ha completado.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await login(username, password);
    if (ok) window.location.href = '/dashboard';
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
        setTokenError(data.error || 'El token no es válido o ha caducado. Cópialo de nuevo desde la web oficial.');
        return;
      }
      window.location.href = '/dashboard';
    } catch (err) {
      setTokenError(
        err instanceof Error
          ? `No se ha podido contactar con el servidor (${err.message}). Revisa tu conexión y vuelve a intentarlo.`
          : 'No se ha podido contactar con el servidor.',
      );
    } finally {
      setTokenLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg border border-white/[0.09] bg-surface p-6 shadow-3 sm:p-8">
      <h1 className="font-display text-xl font-semibold tracking-[-0.025em] text-content">
        Conecta tu cuenta
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-content-tertiary">
        Usamos tu propia sesión de LALIGA FANTASY para leer tu liga. No guardamos tu contraseña.
      </p>

      {/* Acceso con Google */}
      <div className="mt-6 space-y-3">
        <Button
          variant="secondary"
          size="touch"
          className="w-full"
          onClick={handleGoogle}
          aria-disabled={googleDisabled}
          aria-describedby={`${ids}-google-note`}
        >
          <GoogleIcon className="h-[18px] w-[18px]" />
          Entrar con Google
        </Button>
        <p id={`${ids}-google-note`} className="text-xs leading-relaxed text-content-tertiary">
          Requiere la extensión del navegador, todavía no publicada.
        </p>
        {googleNotice && <FormAlert tone="info">{googleNotice}</FormAlert>}
      </div>

      {/* Separador */}
      <div className="my-6 flex items-center gap-3" role="presentation">
        <span className="h-px flex-1 bg-white/[0.09]" />
        <span className="eyebrow text-[10px]">o con tus datos</span>
        <span className="h-px flex-1 bg-white/[0.09]" />
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as 'password' | 'token')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Email
          </TabsTrigger>
          <TabsTrigger value="token">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Token
          </TabsTrigger>
        </TabsList>

        {/* ── Email y contraseña ─────────────────────────────────────────── */}
        <TabsContent value="password">
          <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
            {error && <FormAlert>{error}</FormAlert>}

            <p className="text-xs leading-relaxed text-content-tertiary">
              Solo funciona con cuentas creadas con email y contraseña. Si te registraste con Google,
              usa el token.
            </p>

            <Field label="Email" htmlFor={emailId} required>
              <Input
                id={emailId}
                type="email"
                inputMode="email"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tu@email.com"
                invalid={!!error}
                required
              />
            </Field>

            <Field label="Contraseña" htmlFor={passwordId} required>
              <div className="relative">
                <Input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-12"
                  invalid={!!error}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-content-tertiary transition-colors duration-fast hover:text-content"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Button
              type="submit"
              variant="accent"
              size="touch"
              className="w-full"
              loading={isLoading}
              loadingText="Comprobando…"
            >
              Entrar
              <ArrowRight aria-hidden="true" />
            </Button>
          </form>
        </TabsContent>

        {/* ── Token manual ───────────────────────────────────────────────── */}
        <TabsContent value="token">
          <form onSubmit={handleTokenSubmit} className="space-y-4" noValidate>
            {tokenError && <FormAlert>{tokenError}</FormAlert>}

            <div className="rounded-md border border-white/[0.09] bg-surface-sunken p-3">
              <p className="text-xs leading-relaxed text-content-tertiary">
                Inicia sesión en la web oficial de LALIGA FANTASY, abre la consola del navegador y
                ejecuta:
              </p>
              <code className="mt-2 block overflow-x-auto rounded-sm bg-canvas px-2.5 py-2 font-mono text-xs text-content">
                localStorage.getItem('fz-accessToken')
              </code>
            </div>

            <Field
              label="Access token"
              htmlFor={tokenId}
              hint="Pega el resultado completo. Si incluye el refresh_token, la sesión se renovará sola."
              required
            >
              <textarea
                id={tokenId}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                rows={4}
                aria-describedby={`${tokenId}-hint`}
                spellCheck={false}
                placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs…"
                className={cn(
                  'block min-h-[92px] w-full resize-y rounded-md border bg-surface-raised px-3 py-2',
                  'font-mono text-xs leading-relaxed text-content',
                  'transition-colors duration-fast placeholder:text-content-tertiary hover:border-ink-700',
                  tokenError ? 'border-negative' : 'border-ink-600',
                )}
                required
              />
            </Field>

            <Button
              type="submit"
              variant="accent"
              size="touch"
              className="w-full"
              loading={tokenLoading}
              loadingText="Guardando token…"
            >
              Entrar con token
              <ArrowRight aria-hidden="true" />
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
