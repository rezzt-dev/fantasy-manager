/**
 * `browser` (Firefox) y `chrome` (Chromium) exponen la misma API, pero sólo las
 * dos versiones basadas en promesas son intercambiables: el `chrome.*` de
 * Firefox es de callbacks y devolvería `undefined` a cada `await`. Prefiriendo
 * `browser` cuando existe, el mismo código vale para los dos navegadores.
 */
export const api = globalThis.browser ?? globalThis.chrome;

/**
 * Configuración del flujo OAuth de LALIGA FANTASY (Azure AD B2C).
 *
 * El `redirect_uri` es el de la app móvil oficial: es el ÚNICO registrado para
 * este client_id (cualquier URL http/https devuelve AADB2C90006). El navegador
 * no sabe abrir ese esquema, así que la extensión intercepta la redirección
 * antes de que falle y se queda con el `code`.
 */
export const AUTH = {
  authorizeUrl: 'https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token',
  policy: 'B2C_1A_5ULAIP_PARAMETRIZED_SIGNIN',
  clientId: 'af88bcff-1157-40a0-b579-030728aacf0b',
  redirectUri: 'authredirect://com.lfp.laligafantasy',
  get scope() {
    return `openid ${this.clientId} offline_access`;
  },
};

/**
 * Orígenes de Fantasy Manager autorizados a pedir un login.
 *
 * Debe coincidir con `content_scripts.matches` y `host_permissions` del
 * manifest: si añades tu dominio de producción, añádelo en los tres sitios.
 */
export const ALLOWED_APP_ORIGINS = [
  'http://localhost:4321',
  'http://127.0.0.1:4321',
  'https://fantasy-manager-mauve.vercel.app',
];

export function isAllowedOrigin(origin) {
  if (ALLOWED_APP_ORIGINS.includes(origin)) return true;
  // Despliegues de preview de Vercel del propio proyecto.
  return /^https:\/\/fantasy-manager-[a-z0-9-]+\.vercel\.app$/.test(origin);
}
