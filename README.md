<div align="center">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Astro.svg" alt="Astro Logo" width="80" height="80" />
  <h1 align="center">LALIGA FANTASY Manager</h1>

  <p align="center">
    <strong>Aplicación web avanzada para gestionar, analizar y optimizar tus equipos de LALIGA FANTASY.</strong>
    <br />
    Conexión directa a la API oficial mediante proxy, recomendaciones inteligentes de mercado, gestión de cláusulas y análisis de rivales.
  </p>

  <p align="center">
    <a href="https://astro.build/"><img src="https://img.shields.io/badge/Astro-7.0-FF5D01?style=for-the-badge&logo=astro&logoColor=white" alt="Astro" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/TailwindCSS-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
    <a href="https://playwright.dev/"><img src="https://img.shields.io/badge/Playwright-E2E-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" /></a>
  </p>
</div>

<hr />

## <img src="https://api.iconify.design/lucide/list.svg?color=white" width="24" height="24" align="absbottom" /> Tabla de Contenidos

- [<img src="https://api.iconify.design/lucide/sparkles.svg?color=white" width="16" height="16" align="absbottom" /> Características Principales](#-características-principales)
- [<img src="https://api.iconify.design/lucide/layers.svg?color=white" width="16" height="16" align="absbottom" /> Stack Tecnológico](#-stack-tecnológico)
- [<img src="https://api.iconify.design/lucide/rocket.svg?color=white" width="16" height="16" align="absbottom" /> Instalación y Uso](#-instalación-y-uso)
- [<img src="https://api.iconify.design/lucide/settings.svg?color=white" width="16" height="16" align="absbottom" /> Configuración](#-configuración)
- [<img src="https://api.iconify.design/lucide/brain.svg?color=white" width="16" height="16" align="absbottom" /> Sistema de Recomendaciones](#-sistema-de-recomendaciones)
- [<img src="https://api.iconify.design/lucide/book-open.svg?color=white" width="16" height="16" align="absbottom" /> Documentación Técnica](#-documentación-técnica)

---

## <img src="https://api.iconify.design/lucide/sparkles.svg?color=white" width="24" height="24" align="absbottom" /> Características Principales

<details open>
<summary><b><img src="https://api.iconify.design/lucide/shield-check.svg?color=white" width="18" height="18" align="absbottom" /> Autenticación Segura y Flexible</b></summary>
<br/>
Inicia sesión usando tu email y contraseña de LALIGA FANTASY (mediante flujo ROPC de Azure B2C) o utilizando tu <i>access token</i> JWT (ideal para cuentas vinculadas con Google). Los tokens se almacenan de forma segura en las sesiones del servidor Astro.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/layout-dashboard.svg?color=white" width="18" height="18" align="absbottom" /> Panel de Control y Resumen de Ligas</b></summary>
<br/>
Visualiza todas tus ligas en un solo lugar. Obtén un desglose del <b>dinero disponible, valor total del equipo, estado del mercado de fichajes y alertas críticas de alineación</b> para que nunca dejes puntos en el banquillo.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/users.svg?color=white" width="18" height="18" align="absbottom" /> Análisis de Rivales y Mercado</b></summary>
<br/>
Explora la plantilla completa de cada miembro de tu liga. Visualiza fácilmente el <b>estado de protección</b> de cada jugador (Disponible / Protegido por fecha / Blindado). Además, el sistema identifica automáticamente oportunidades de <b>Clausulazos</b> basadas en tu presupuesto actual.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/newspaper.svg?color=white" width="18" height="18" align="absbottom" /> Integración de Noticias en Tiempo Real</b></summary>
<br/>
Procesa canales RSS de la prensa deportiva (Marca, AS, Mundo Deportivo, Sport, 20minutos) asociándolas a los jugadores de LaLiga. Obtén alertas categorizadas sobre <b>lesiones, sanciones, dudas médicas o rotaciones</b>, influyendo directamente en las recomendaciones del asistente.
</details>

<details open>
<summary><b><img src="https://api.iconify.design/lucide/bar-chart-3.svg?color=white" width="18" height="18" align="absbottom" /> Estadísticas Profesionales</b></summary>
<br/>
Disfruta de gráficos avanzados y profesionales para comparar el valor de los equipos, entender la distribución por posiciones, evaluar el riesgo de tus cláusulas y seguir la evolución de la clasificación de la liga.
</details>

---

## <img src="https://api.iconify.design/lucide/layers.svg?color=white" width="24" height="24" align="absbottom" /> Stack Tecnológico

La aplicación ha sido desarrollada con un stack moderno enfocado en la velocidad, el rendimiento y una excelente experiencia de desarrollador:

| Tecnología | Rol en el Proyecto |
|------------|--------------------|
| **[Astro 7](https://astro.build/)** | Core del framework. Maneja el SSR, las rutas de la API, y el almacenamiento en sesiones del servidor a través del adaptador `@astrojs/node`. |
| **[React 18](https://react.dev/)** | Encargado de los componentes interactivos. Se mantiene en v18 para evitar problemas de hidratación conocidos en ciertas configuraciones. |
| **[Tailwind CSS 3](https://tailwindcss.com/)** | Sistema de diseño principal que permite estilos escalables, rápidos y consistentes. |
| **[TanStack Query](https://tanstack.com/query)** | Gestión del estado asíncrono, fetching de la API oficial y caché de datos en el cliente. |
| **[Zustand](https://github.com/pmndrs/zustand)** | Gestión ligera del estado global sincrónico en el cliente. |
| **[Playwright](https://playwright.dev/)** | Pruebas *End-to-End* (E2E) para asegurar la estabilidad de los flujos críticos como el login. |

---

## <img src="https://api.iconify.design/lucide/rocket.svg?color=white" width="24" height="24" align="absbottom" /> Instalación y Uso

### Prerrequisitos

- <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg" alt="Node.js" width="16" height="16" /> Node.js `>= 22.12.0`
- <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/pnpm/pnpm-original.svg" alt="pnpm" width="16" height="16" /> pnpm (Gestor de paquetes)

### Pasos de Instalación

1. **Clona el repositorio e instala las dependencias**:
   ```bash
   pnpm install
   ```

2. **Inicia el servidor en modo desarrollo**:
   ```bash
   pnpm dev
   ```
   > <img src="https://api.iconify.design/lucide/link.svg?color=white" width="14" height="14" align="absbottom" /> *La aplicación estará disponible localmente en `http://localhost:4321`*

3. **Compilación para Producción** (Opcional):
   ```bash
   CI=true pnpm build
   pnpm preview
   ```
   > <img src="https://api.iconify.design/lucide/package.svg?color=white" width="14" height="14" align="absbottom" /> *El proceso de compilación genera un servidor standalone en la carpeta `dist/` gracias a `@astrojs/node`*.

---

## <img src="https://api.iconify.design/lucide/settings.svg?color=white" width="24" height="24" align="absbottom" /> Configuración

Antes de ejecutar la aplicación, debes crear un archivo `.env.local` en el directorio raíz. Puedes basarte en el archivo `.env.example`:

```env
# Token de acceso de LALIGA FANTASY (fallback para uso en desarrollo)
LALIGA_FANTASY_TOKEN="ey..."

# Configuración del proxy local hacia la API oficial
PROXY_FANTASY_TARGET="https://fantasy-api.llt-services.com"
PROXY_DEFAULT_X_APP="2"
PROXY_DEFAULT_X_LANG="es"
PROXY_TIMEOUT_MS="15000"
PROXY_DEFAULT_USER_AGENT="fantasy-manager/0.1"

# Configuración de los endpoints de autenticación (Azure B2C)
LALIGA_AUTH_BASE_URL="https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token"
LALIGA_CLIENT_ID="af88bcff-1157-40a0-b579-030728aacf0b"
LALIGA_REDIRECT_URI="authredirect://com.lfp.laligafantasy"
PORT=4321
```

> <img src="https://api.iconify.design/lucide/alert-triangle.svg?color=white" width="16" height="16" align="absbottom" /> **IMPORTANTE:** Nunca incluyas en tus commits los archivos `.env.local`, `.env.credentials` o el contenido de la carpeta `.astro/sessions`.

### <img src="https://api.iconify.design/lucide/key.svg?color=white" width="20" height="20" align="absbottom" /> ¿Cómo obtener el Token de Acceso Manualmente?

Si tu cuenta utiliza Google Sign-In, el flujo de usuario/contraseña tradicional no funcionará. Para obtener tu token:
1. Inicia sesión normalmente desde tu navegador en la web oficial de LALIGA FANTASY.
2. Abre la consola de herramientas de desarrollador (F12) y ejecuta el siguiente comando:
   ```js
   JSON.parse(localStorage.getItem('fz-accessToken')).access_token
   ```
3. Copia el resultado y pégalo en la pestaña "Token" de nuestra aplicación, o asígnalo a la variable `LALIGA_FANTASY_TOKEN` en tu `.env.local`.

---

## <img src="https://api.iconify.design/lucide/brain.svg?color=white" width="24" height="24" align="absbottom" /> Sistema de Recomendaciones

El verdadero potencial de **LALIGA FANTASY Manager** reside en su motor de recomendaciones inteligentes, el cual procesa constantemente noticias, datos de mercado y análisis de rendimiento:

- <img src="https://api.iconify.design/lucide/trending-up.svg?color=white" width="16" height="16" align="absbottom" /> **Comprar**: Descubre jugadores del mercado con excelente relación precio/puntos esperados. El sistema prioriza titulares habituales y descarta a aquellos con noticias recientes negativas.
- <img src="https://api.iconify.design/lucide/trending-down.svg?color=white" width="16" height="16" align="absbottom" /> **Vender**: Sugerencias basadas en partes médicos (lesiones/dudas), sanciones o jugadores que son suplentes habituales que apenas puntúan y retienen valor de tu equipo.
- <img src="https://api.iconify.design/lucide/refresh-cw.svg?color=white" width="16" height="16" align="absbottom" /> **Alineación Óptima**: Un simulador interno prueba todas las formaciones posibles con tus jugadores disponibles, seleccionando el XI inicial que maximiza tus **puntos esperados** para la jornada.
- <img src="https://api.iconify.design/lucide/coins.svg?color=white" width="16" height="16" align="absbottom" /> **Clausulazos Estratégicos**: El algoritmo cruza tu presupuesto con las plantillas rivales, mostrando qué jugadores clave de otros equipos están desprotegidos y pueden mejorar tu once de forma inmediata.
- <img src="https://api.iconify.design/lucide/shield-alert.svg?color=white" width="16" height="16" align="absbottom" /> **Protección de Cláusulas**: El sistema calcula de forma dinámica el riesgo de que otros mánagers te roben un jugador, sugiriéndote a quién proteger (subir cláusula) y a quién no (evitando gastos innecesarios).
- <img src="https://api.iconify.design/lucide/crown.svg?color=white" width="16" height="16" align="absbottom" /> **Mejor Capitán**: Análisis predictivo para elegir al mejor capitán entre tus titulares disponibles, penalizando a aquellos envueltos en noticias negativas o rotaciones.
- <img src="https://api.iconify.design/lucide/star.svg?color=white" width="16" height="16" align="absbottom" /> **Mejores Movimientos**: Un resumen top 5 de las acciones de mayor impacto que debes realizar de forma prioritaria en cada jornada.

---

## <img src="https://api.iconify.design/lucide/test-tube.svg?color=white" width="24" height="24" align="absbottom" /> Pruebas (Tests)

La aplicación cuenta con una suite de pruebas End-to-End gestionada a través de Playwright:

```bash
# 1. Instalar los binarios de Chromium (solo necesario la primera vez)
pnpm exec playwright install chromium

# 2. Ejecutar la suite de tests (Asegúrate de que la app esté corriendo con `pnpm dev` en otra terminal)
pnpm exec playwright test
```
*El test actual de login verifica que el formulario de autenticación por token redirecciona correctamente al dashboard principal.*

---

## <img src="https://api.iconify.design/lucide/book-open.svg?color=white" width="24" height="24" align="absbottom" /> Documentación Técnica

Para información más profunda orientada al desarrollo, consulta la carpeta `agent-docs/useful-docs/`:

- <img src="https://api.iconify.design/lucide/file-text.svg?color=white" width="16" height="16" align="absbottom" /> [`api-reference.md`](./agent-docs/useful-docs/api-reference.md) — Endpoints oficiales y proxys.
- <img src="https://api.iconify.design/lucide/layout-template.svg?color=white" width="16" height="16" align="absbottom" /> [`architecture.md`](./agent-docs/useful-docs/architecture.md) — Visión general de la arquitectura y el flujo de datos.
- <img src="https://api.iconify.design/lucide/edit.svg?color=white" width="16" height="16" align="absbottom" /> [`implementation-notes.md`](./agent-docs/useful-docs/implementation-notes.md) — Notas, problemas resueltos y próximos pasos.

---

<div align="center">
  <sub>Desarrollado para uso personal. Este proyecto no está afiliado ni patrocinado oficialmente por LALIGA ni LALIGA FANTASY.</sub>
</div>
