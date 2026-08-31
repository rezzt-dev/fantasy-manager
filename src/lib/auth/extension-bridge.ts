/**
 * Cliente de la extensión "Fantasy Manager — Conector LALIGA FANTASY".
 *
 * La extensión es la única forma de completar el OAuth real de LaLiga desde el
 * navegador: su `redirect_uri` es el esquema nativo `authredirect://…`, que una
 * web no puede recibir (ver agent-docs/useful-docs/authentication.md).
 *
 * El diálogo va por `window.postMessage` contra un content script, así que no
 * hace falta conocer el ID de la extensión (que cambia al instalarla
 * descomprimida) ni configurar `externally_connectable`.
 */
import type { AuthTokens } from '../../types/fantasy';

const PAGE_SOURCE = 'fantasy-manager';
const EXT_SOURCE = 'fantasy-manager-extension';

const PING_TIMEOUT_MS = 800;
/** El usuario tiene que teclear su contraseña y quizá pasar un 2FA. */
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;

interface ExtensionMessage {
  source?: string;
  type?: string;
  requestId?: string;
  ok?: boolean;
  error?: string;
  version?: string;
  tokens?: AuthTokens;
}

function newRequestId(): string {
  return Math.random().toString(36).slice(2);
}

/** Sólo aceptamos mensajes emitidos por esta misma ventana y con nuestra marca. */
function isOwnMessage(event: MessageEvent): event is MessageEvent<ExtensionMessage> {
  return event.source === window && event.origin === window.location.origin && (event.data as ExtensionMessage)?.source === EXT_SOURCE;
}

function post(type: string, requestId: string): void {
  window.postMessage({ source: PAGE_SOURCE, type, requestId }, window.location.origin);
}

/** ¿Está instalada la extensión? Resuelve rápido: es para decidir qué UI pintar. */
export function detectExtension(timeoutMs = PING_TIMEOUT_MS): Promise<{ installed: boolean; version?: string }> {
  if (typeof window === 'undefined') return Promise.resolve({ installed: false });

  return new Promise((resolve) => {
    const requestId = newRequestId();
    let settled = false;

    const finish = (result: { installed: boolean; version?: string }) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      resolve(result);
    };

    const onMessage = (event: MessageEvent) => {
      if (!isOwnMessage(event)) return;
      const data = event.data;
      // `FM_EXTENSION_READY` cubre la carrera en la que el content script se
      // inyecta después de que React haya montado y lanzado su ping.
      if (data.type === 'FM_EXTENSION_READY') finish({ installed: true });
      if (data.type === 'FM_PONG' && data.requestId === requestId) finish({ installed: Boolean(data.ok), version: data.version });
    };

    const timer = setTimeout(() => finish({ installed: false }), timeoutMs);
    window.addEventListener('message', onMessage);
    post('FM_PING', requestId);
  });
}

/**
 * Lanza el login y espera a que la extensión devuelva los tokens.
 * Rechaza si el usuario cancela, si expira o si el canje falla.
 */
export function loginWithExtension(): Promise<AuthTokens> {
  return new Promise((resolve, reject) => {
    const requestId = newRequestId();
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      fn();
    };

    const onMessage = (event: MessageEvent) => {
      if (!isOwnMessage(event)) return;
      const data = event.data;

      // El resultado llega sin requestId: lo empuja el service worker a la
      // pestaña, no es la respuesta directa al mensaje inicial.
      if (data.type === 'FM_AUTH_RESULT') {
        if (data.ok && data.tokens) {
          const tokens = data.tokens;
          finish(() => resolve(tokens));
        } else {
          finish(() => reject(new Error(data.error || 'El login no se ha completado')));
        }
        return;
      }

      if (data.type === 'FM_LOGIN_STARTED' && data.requestId === requestId && data.ok === false) {
        finish(() => reject(new Error(data.error || 'No se ha podido abrir la ventana de login')));
      }
    };

    const timer = setTimeout(
      () => finish(() => reject(new Error('Se ha agotado el tiempo de espera del login'))),
      LOGIN_TIMEOUT_MS,
    );

    window.addEventListener('message', onMessage);
    post('FM_LOGIN', requestId);
  });
}

/** Entrega los tokens al backend, que los guarda en la sesión httpOnly. */
export async function persistTokens(tokens: AuthTokens): Promise<void> {
  const res = await fetch('/api/auth/token', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: JSON.stringify(tokens) }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || 'No se ha podido guardar la sesión');
  }
}
