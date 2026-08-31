// @ts-check
import { defineConfig, sessionDrivers } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

// Este fichero se carga antes de que Vite resuelva los .env, así que para
// decidir el driver de sesión hay que cargarlos a mano. En Vercel las
// variables ya vienen en process.env y no hay ficheros que leer.
for (const file of ['.env', '.env.local']) {
  try {
    process.loadEnvFile(file);
  } catch {
    // El fichero no existe: normal en producción.
  }
}
const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const isServerless = Boolean(process.env.VERCEL);

/**
 * El driver de sesión se decide AQUÍ, es decir en build time, y queda cocido en
 * el bundle: en Vercel las variables tienen que estar en el entorno de Build,
 * no solo en el de Runtime, o el despliegue sale con el driver equivocado.
 *
 *  - Con Upstash: sesión compartida entre instancias y despliegues. Es lo que
 *    se quiere en producción.
 *  - Sin Upstash y en serverless: /tmp. Es por instancia y efímero (la sesión
 *    se pierde al reciclarse), pero el filesystem del despliegue es de solo
 *    lectura y escribir en una ruta relativa hacía fallar CADA login con un
 *    500. Degradado y funcionando es mejor que roto.
 *  - En local: disco del proyecto.
 */
function resolveSessionDriver() {
  if (hasUpstash) return sessionDrivers.upstash();
  if (isServerless) {
    console.warn(
      '[session] Sin UPSTASH_REDIS_REST_URL/TOKEN en el entorno de Build: la sesión ' +
        'se guarda en /tmp y no sobrevive al reciclado de la instancia. Configúralas ' +
        'en Vercel > Settings > Environment Variables marcando el entorno Build.',
    );
    return sessionDrivers.fsLite({ base: '/tmp/fantasy-manager/sessions' });
  }
  return sessionDrivers.fsLite({ base: '.astro/sessions' });
}

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  server: {
    port: parseInt(process.env.PORT || '4321', 10),
  },
  session: {
    driver: resolveSessionDriver(),
  },
  vite: {
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client'],
    },
  },
});
