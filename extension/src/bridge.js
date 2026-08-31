/**
 * Puente entre la web de Fantasy Manager y el service worker.
 *
 * La página no puede hablar con `runtime` (mundo aislado), así que este content
 * script traduce en los dos sentidos. Se inyecta únicamente en los orígenes de
 * `content_scripts.matches`, y sólo acepta mensajes emitidos por la propia
 * ventana: nadie de fuera puede pedir un login ni leer los tokens.
 *
 * Los content scripts no admiten `import`, así que el alias de navegador se
 * repite aquí en lugar de venir de `config.js`. Se usa la forma con promesas
 * porque el `chrome.*` de Firefox es de callbacks (ver `config.js`).
 */
const api = globalThis.browser ?? globalThis.chrome;

const PAGE_SOURCE = 'fantasy-manager';
const EXT_SOURCE = 'fantasy-manager-extension';

function toPage(payload) {
  window.postMessage({ source: EXT_SOURCE, ...payload }, window.location.origin);
}

window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== PAGE_SOURCE) return;

  if (data.type === 'FM_PING') {
    try {
      const response = await api.runtime.sendMessage({ type: 'FM_PING' });
      toPage({ type: 'FM_PONG', requestId: data.requestId, ok: Boolean(response?.ok), version: response?.version });
    } catch {
      toPage({ type: 'FM_PONG', requestId: data.requestId, ok: false });
    }
    return;
  }

  if (data.type === 'FM_LOGIN') {
    try {
      const response = await api.runtime.sendMessage({ type: 'FM_LOGIN' });
      if (!response?.ok) throw new Error(response?.error || 'No se ha podido iniciar el login');
      toPage({ type: 'FM_LOGIN_STARTED', requestId: data.requestId, ok: true });
    } catch (err) {
      toPage({
        type: 'FM_AUTH_RESULT',
        requestId: data.requestId,
        ok: false,
        error: err instanceof Error ? err.message : 'No se ha podido iniciar el login',
      });
    }
  }
});

// El resultado llega más tarde (el usuario tarda lo que tarde en loguearse) y
// el worker lo empuja a esta pestaña.
api.runtime.onMessage.addListener((message) => {
  if (message?.type === 'FM_AUTH_RESULT') {
    toPage({ type: 'FM_AUTH_RESULT', ok: message.ok, tokens: message.tokens, error: message.error });
  }
});

// Aviso para las páginas que ya estén escuchando cuando se inyecta el script.
// Sólo se anuncia si el fondo responde: tras recargar la extensión el content
// script antiguo sigue vivo pero huérfano, y anunciarse sin más haría que la
// web ofreciera un botón que no funciona.
(async () => {
  try {
    const response = await api.runtime.sendMessage({ type: 'FM_PING' });
    if (response?.ok) toPage({ type: 'FM_EXTENSION_READY', version: response.version });
  } catch {
    // Contexto invalidado: la web se queda con las opciones manuales.
  }
})();
