/**
 * Service worker: orquesta el login OAuth de LALIGA FANTASY.
 *
 * Flujo completo:
 *   1. La web de Fantasy Manager pide un login (a través de `bridge.js`).
 *   2. Abrimos una ventana en la página de login de LaLiga, donde el usuario
 *      pulsa "Google" e inicia sesión con su cuenta habitual.
 *   3. LaLiga redirige a `authredirect://…?code=…`. El navegador no sabe abrir
 *      ese esquema, pero la extensión ve la redirección y se queda con el code.
 *   4. Canjeamos el code por tokens (PKCE, cliente público sin secreto).
 *   5. Devolvemos los tokens a la pestaña que los pidió.
 *
 * El worker puede morir mientras el usuario se loguea (puede tardar minutos),
 * así que el estado del flujo vive en `api.storage.session` y nunca en una
 * variable de módulo, y el resultado se entrega por `tabs.sendMessage` en lugar
 * de por el `sendResponse` del mensaje inicial, que no sobrevive al reinicio.
 */
import { api, AUTH, isAllowedOrigin } from './config.js';
import { createPkcePair, randomUrlSafe } from './pkce.js';

const FLOW_KEY = 'fm_auth_flow';
const FLOW_TIMEOUT_MS = 10 * 60 * 1000;
/** Prefijo de la redirección que hay que cazar, derivado del propio redirect_uri. */
const NATIVE_SCHEME = `${new URL(AUTH.redirectUri).protocol}//`;

async function getFlow() {
  const stored = await api.storage.session.get(FLOW_KEY);
  const flow = stored[FLOW_KEY];
  if (!flow) return null;
  if (Date.now() - flow.createdAt > FLOW_TIMEOUT_MS) {
    await clearFlow();
    return null;
  }
  return flow;
}

const setFlow = (flow) => api.storage.session.set({ [FLOW_KEY]: flow });
const clearFlow = () => api.storage.session.remove(FLOW_KEY);

function buildAuthorizeUrl({ challenge, state, nonce }) {
  const url = new URL(AUTH.authorizeUrl);
  url.searchParams.set('p', AUTH.policy);
  url.searchParams.set('client_id', AUTH.clientId);
  url.searchParams.set('redirect_uri', AUTH.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', AUTH.scope);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('prompt', 'login');
  return url.toString();
}

/** Extrae code/state/error de la redirección nativa, venga en query o en fragmento. */
function parseRedirect(rawUrl) {
  const params = new URLSearchParams();
  for (const chunk of rawUrl.split(/[?#]/).slice(1)) {
    for (const [key, value] of new URLSearchParams(chunk)) params.set(key, value);
  }
  return {
    code: params.get('code'),
    state: params.get('state'),
    error: params.get('error'),
    errorDescription: params.get('error_description'),
  };
}

async function exchangeCode(code, verifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: AUTH.clientId,
    redirect_uri: AUTH.redirectUri,
    scope: AUTH.scope,
    code,
    code_verifier: verifier,
  });

  const res = await fetch(`${AUTH.tokenUrl}?p=${AUTH.policy}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || `El canje del código falló (HTTP ${res.status})`);
  }
  if (!data.id_token && !data.access_token) {
    throw new Error('La respuesta de LaLiga no incluye ningún token');
  }

  // La API de Fantasy espera el id_token como Bearer (ver api-proxy.ts).
  return {
    access_token: data.id_token || data.access_token,
    refresh_token: data.refresh_token || '',
    id_token: data.id_token || '',
    token_type: data.token_type || 'Bearer',
    expires_in: data.expires_in || data.id_token_expires_in || 86400,
  };
}

async function deliver(flow, message) {
  if (flow.authWindowId !== undefined) {
    await api.windows.remove(flow.authWindowId).catch(() => {});
  }
  await clearFlow();
  if (flow.appTabId !== undefined) {
    await api.tabs.sendMessage(flow.appTabId, message).catch(() => {});
  }
}

/** Punto de entrada único de la captura: dedupe con la marca `consumed`. */
async function handleNativeRedirect(rawUrl, tabId) {
  const flow = await getFlow();
  if (!flow || flow.consumed) return;
  if (flow.authTabId !== undefined && tabId !== undefined && tabId !== flow.authTabId) return;

  await setFlow({ ...flow, consumed: true });

  const { code, state, error, errorDescription } = parseRedirect(rawUrl);

  if (error) {
    await deliver(flow, { type: 'FM_AUTH_RESULT', ok: false, error: errorDescription || error });
    return;
  }
  if (state !== flow.state) {
    await deliver(flow, { type: 'FM_AUTH_RESULT', ok: false, error: 'El "state" no coincide: se ha descartado la respuesta.' });
    return;
  }
  if (!code) {
    await deliver(flow, { type: 'FM_AUTH_RESULT', ok: false, error: 'LaLiga no ha devuelto ningún código de autorización.' });
    return;
  }

  try {
    const tokens = await exchangeCode(code, flow.verifier);
    await deliver(flow, { type: 'FM_AUTH_RESULT', ok: true, tokens });
  } catch (err) {
    await deliver(flow, { type: 'FM_AUTH_RESULT', ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}

// Captura principal: el 302 hacia el esquema nativo se ve aquí antes de que el
// navegador intente abrirlo y falle.
api.webRequest.onBeforeRedirect.addListener(
  (details) => {
    if (details.redirectUrl?.startsWith(NATIVE_SCHEME)) {
      handleNativeRedirect(details.redirectUrl, details.tabId);
    }
  },
  { urls: [`${new URL(AUTH.authorizeUrl).origin}/*`], types: ['main_frame'] },
);

// Red de seguridad: en algunas versiones la URL nativa llega a asomar en la
// pestaña antes de que el navegador la descarte.
api.tabs.onUpdated.addListener((tabId, changeInfo) => {
  const url = changeInfo.url ?? changeInfo.pendingUrl;
  if (url?.startsWith(NATIVE_SCHEME)) handleNativeRedirect(url, tabId);
});

// Si el usuario cierra la ventana de login a medias, no dejamos el flujo colgado.
api.windows.onRemoved.addListener(async (windowId) => {
  const flow = await getFlow();
  if (flow && flow.authWindowId === windowId && !flow.consumed) {
    await clearFlow();
    if (flow.appTabId !== undefined) {
      await api.tabs
        .sendMessage(flow.appTabId, {
          type: 'FM_AUTH_RESULT',
          ok: false,
          error: 'Has cerrado la ventana de login antes de terminar.',
        })
        .catch(() => {});
    }
  }
});

async function startLogin(sender) {
  const origin = sender.origin ?? (sender.url ? new URL(sender.url).origin : '');
  if (!isAllowedOrigin(origin)) {
    throw new Error(`Origen no autorizado: ${origin || 'desconocido'}`);
  }

  const existing = await getFlow();
  if (existing?.authWindowId !== undefined) {
    await api.windows.remove(existing.authWindowId).catch(() => {});
  }

  const { verifier, challenge } = await createPkcePair();
  const state = randomUrlSafe(16);
  const authUrl = buildAuthorizeUrl({ challenge, state, nonce: randomUrlSafe(16) });

  const authWindow = await api.windows.create({ url: authUrl, type: 'popup', width: 520, height: 760 });

  await setFlow({
    verifier,
    state,
    createdAt: Date.now(),
    consumed: false,
    appTabId: sender.tab?.id,
    authWindowId: authWindow.id,
    authTabId: authWindow.tabs?.[0]?.id,
  });
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'FM_PING') {
    sendResponse({ ok: true, version: api.runtime.getManifest().version });
    return false;
  }

  if (message?.type === 'FM_LOGIN') {
    startLogin(sender).then(
      () => sendResponse({ ok: true, started: true }),
      (err) => sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }),
    );
    return true; // respuesta asíncrona
  }

  return false;
});
