#!/usr/bin/env node
/**
 * Comprobación previa al despliegue: arranca la función serverless YA
 * CONSTRUIDA en las mismas condiciones que Vercel y falla aquí, en local, en
 * lugar de en producción.
 *
 * Lo que Vercel tiene y `astro dev` no:
 *
 *  1. El filesystem del despliegue es de SOLO LECTURA salvo /tmp. Aquí se
 *     simula quitando el permiso de escritura al directorio de la función.
 *  2. `VERCEL=1` en el entorno, que es lo que activa las rutas de /tmp.
 *  3. La función se invoca por su handler declarado en .vc-config.json, no por
 *     el servidor de desarrollo.
 *
 * Además comprueba que `.vercel/` no esté versionado: al estarlo se desplegaba
 * una función sin `dist/server/entry.mjs` (ignorado por el patrón `dist/`) y
 * todas las rutas devolvían FUNCTION_INVOCATION_FAILED.
 *
 * Ojo con el driver de sesión: Astro lo decide en build time y lo cuece en el
 * bundle, así que un build hecho sin VERCEL=1 sale con el driver de local y la
 * comprobación no valdría de nada. Por eso el script construye él mismo con
 * VERCEL=1 en el entorno. Con --no-build se reutiliza el build existente.
 *
 * Uso: pnpm verify:deploy
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { access, chmod, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const FUNC_DIR = path.join(ROOT, '.vercel', 'output', 'functions', '_render.func');

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

// --- 1. Nada ignorado puede estar versionado ---------------------------------

/**
 * `.gitignore` no afecta a lo que ya está en el índice, así que un fichero
 * generado puede quedarse versionado para siempre sin que nadie lo note. En
 * este proyecto eso ya costó caro dos veces: `.vercel/output` commiteado
 * desplegaba una función sin handler, y `.astro/session/` filtró tokens de
 * LALIGA a un repositorio público. Cualquier fichero trackeado que además esté
 * ignorado es un error.
 */
/**
 * `data/` está ignorado en bloque porque cada ejecución local genera ficheros,
 * pero un puñado de ellos SÍ se versionan a mano: son la semilla histórica que
 * viaja en el bundle y que en serverless se copia a /tmp (ver
 * `src/lib/runtime-paths.ts`). Sin ella el track record arrancaría vacío en
 * cada despliegue. La excepción no cubre `data/cache/`, que es HTML scrapeado
 * regenerable y no tiene por qué ocupar sitio en el repo ni en la función.
 */
const INTENTIONALLY_TRACKED = /^data\/(?!cache\/)/;

function checkNotTracked() {
  let tracked = '';
  try {
    tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
  } catch {
    notes.push('git no disponible: se omite la comprobación de ficheros versionados.');
    return;
  }

  // --no-index es imprescindible: sin él, `check-ignore` se salta justamente los
  // ficheros que ya están en el índice, que son los que hay que detectar.
  const check = spawnSync('git', ['check-ignore', '--no-index', '--stdin'], {
    cwd: ROOT,
    input: tracked,
    encoding: 'utf8',
  });
  const offenders = (check.stdout || '')
    .split('\n')
    .filter(Boolean)
    .filter((file) => !INTENTIONALLY_TRACKED.test(file));
  if (offenders.length > 0) {
    const sample = offenders.slice(0, 3).join(', ');
    fail(
      `Hay ${offenders.length} fichero(s) versionados que .gitignore debería excluir ` +
        `(p. ej. ${sample}). Sácalos del índice con \`git rm -r --cached <ruta>\`: son ` +
        'artefactos generados, y en el caso de .vercel/ se despliegan encima del build ' +
        'como una copia incompleta.',
    );
  }
}

// --- 2. Construir como lo haría Vercel ---------------------------------------

function build() {
  console.log('Construyendo con VERCEL=1 (el driver de sesión se decide en build time)...\n');
  const result = spawnSync('pnpm', ['exec', 'astro', 'build'], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, VERCEL: '1' },
  });
  if (result.status !== 0) {
    fail('`astro build` falló con VERCEL=1. El despliegue fallaría igual.');
    return false;
  }
  return true;
}

// --- 3. El handler declarado tiene que existir -------------------------------

async function checkHandler() {
  const configFile = path.join(FUNC_DIR, '.vc-config.json');
  if (!(await exists(configFile))) {
    fail(`No hay build que comprobar: falta ${path.relative(ROOT, configFile)}. Ejecuta \`pnpm build\` antes.`);
    return null;
  }
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  const handler = path.join(FUNC_DIR, config.handler);
  if (!(await exists(handler))) {
    fail(
      `.vc-config.json declara el handler "${config.handler}" pero el fichero no existe. ` +
        'La función arrancaría con ERR_MODULE_NOT_FOUND (FUNCTION_INVOCATION_FAILED).',
    );
    return null;
  }
  notes.push(`handler: ${config.handler} (runtime ${config.runtime})`);
  return handler;
}

// --- 4. Arrancar la función con el FS en solo lectura ------------------------

const PROBES = [
  { method: 'GET', pathname: '/', expect: 200 },
  { method: 'GET', pathname: '/login', expect: 200 },
  { method: 'GET', pathname: '/extension', expect: 200 },
  { method: 'GET', pathname: '/dashboard', expect: 302, note: 'sin sesión debe redirigir a /login' },
  {
    method: 'POST',
    pathname: '/api/auth/token',
    body: JSON.stringify({ token: 'x'.repeat(64) }),
    expect: 200,
    note: 'escribe en la sesión: es lo que fallaba con EROFS en Vercel',
    keepCookie: true,
  },
  {
    method: 'GET',
    pathname: '/api/track-record?leagueId=1',
    expect: 200,
    note: 'lee y escribe bajo data/: comprueba la raíz escribible',
    useCookie: true,
  },
];

async function runProbes(handler) {
  const problems = [];
  process.on('unhandledRejection', (error) => {
    problems.push(`promesa sin manejar: ${error instanceof Error ? error.message : error}`);
  });

  const originalWarn = console.warn;
  const originalError = console.error;
  const logged = [];
  const capture = (original) => (...args) => {
    logged.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
    original(...args);
  };
  console.warn = capture(originalWarn);
  console.error = capture(originalError);

  const previousCwd = process.cwd();
  let restricted = false;
  try {
    // El código de la app resuelve las rutas contra process.cwd(), igual que en
    // la función real, donde el cwd es la raíz del bundle.
    process.chdir(FUNC_DIR);
    execFileSync('chmod', ['-R', 'a-w', FUNC_DIR]);
    restricted = true;

    const mod = await import(handler);
    const fetchFn = mod.default?.fetch ?? mod.default;
    if (typeof fetchFn !== 'function') {
      fail('El handler construido no exporta un `fetch` invocable.');
      return problems;
    }

    let cookie = '';
    for (const probe of PROBES) {
      const url = `https://verify.local${probe.pathname}`;
      const headers = { 'content-type': 'application/json' };
      if (probe.useCookie && cookie) headers.cookie = cookie;

      let status;
      let body = '';
      try {
        const response = await fetchFn(
          new Request(url, { method: probe.method, headers, body: probe.body }),
        );
        status = response.status;
        if (probe.keepCookie) {
          const setCookie = response.headers.get('set-cookie');
          if (setCookie) cookie = setCookie.split(';')[0];
        }
        body = (await response.text()).slice(0, 200).replace(/\s+/g, ' ');
      } catch (error) {
        problems.push(`${probe.method} ${probe.pathname} lanzó: ${error instanceof Error ? error.message : error}`);
        continue;
      }

      const ok = status === probe.expect;
      const label = `${ok ? 'ok  ' : 'FALLO'} ${String(status).padEnd(3)} ${probe.method} ${probe.pathname}`;
      console.log(ok ? label : `${label}  (esperado ${probe.expect})`);
      if (probe.note) console.log(`         ${probe.note}`);
      if (!ok) problems.push(`${probe.method} ${probe.pathname}: ${status} (esperado ${probe.expect}) — ${body}`);
    }
  } finally {
    if (restricted) execFileSync('chmod', ['-R', 'u+w', FUNC_DIR]);
    process.chdir(previousCwd);
    console.warn = originalWarn;
    console.error = originalError;
  }

  for (const line of logged) {
    if (/EROFS|EACCES|read-only file system/i.test(line)) {
      problems.push(`escritura rechazada por el filesystem: ${line}`);
    }
  }
  return problems;
}

// --- main --------------------------------------------------------------------

process.env.NODE_ENV = 'production';

checkNotTracked();

const shouldBuild = !process.argv.includes('--no-build');
const built = shouldBuild ? build() : true;

// A partir de aquí se simula el runtime de Vercel, no el build.
process.env.VERCEL = '1';

if (built) {
  const handler = await checkHandler();
  if (handler) {
    const problems = await runProbes(handler);
    for (const problem of problems) fail(problem);
  }
}

console.log('');
for (const note of notes) console.log(`· ${note}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} problema(s) que romperían el despliegue:\n`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log('\n✓ La función arranca y responde con el filesystem en solo lectura.');
