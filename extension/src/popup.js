import { api, ALLOWED_APP_ORIGINS, isAllowedOrigin } from './config.js';

const statusEl = document.getElementById('status');
statusEl.textContent = `Extensión activa · v${api.runtime.getManifest().version}`;

/** Reutiliza una pestaña de la app si ya hay una abierta; si no, abre la primera configurada. */
document.getElementById('open').addEventListener('click', async () => {
  const tabs = await api.tabs.query({});
  const existing = tabs.find((tab) => {
    try {
      return tab.url && isAllowedOrigin(new URL(tab.url).origin);
    } catch {
      return false;
    }
  });

  if (existing) {
    await api.tabs.update(existing.id, { active: true });
    await api.windows.update(existing.windowId, { focused: true });
  } else {
    await api.tabs.create({ url: `${ALLOWED_APP_ORIGINS.at(-1)}/login` });
  }
  window.close();
});
