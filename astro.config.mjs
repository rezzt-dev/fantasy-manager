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
    // En producción la sesión vive en Upstash: el filesystem de Vercel es de
    // solo lectura fuera de /tmp y no persiste entre invocaciones. Sin
    // credenciales (local), el driver de Upstash hace fetch a una URL relativa
    // ("/pipeline") y revienta CADA request que toque la sesión, así que se
    // cae a disco.
    driver: hasUpstash ? sessionDrivers.upstash() : sessionDrivers.fsLite({ base: '.astro/sessions' }),
  },
  vite: {
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client'],
    },
  },
});
