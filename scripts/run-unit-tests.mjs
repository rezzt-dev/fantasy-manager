#!/usr/bin/env node
/**
 * Runner de los tests unitarios (`src/test/*.test.ts`).
 *
 * Node ejecuta TypeScript de forma nativa, pero no resuelve los imports sin
 * extensión que usa todo el proyecto (Astro/Vite sí). En vez de ensuciar el
 * código de producción con extensiones `.ts`, se empaqueta cada test con el
 * binario de esbuild que ya instala Vite y se ejecuta con `node --test`.
 *
 * Uso: `pnpm test:unit` o `pnpm test:unit fixture-model`.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testDir = path.join(projectRoot, 'src', 'test');

const filters = process.argv.slice(2);
const entries = (await readdir(testDir))
  .filter((file) => file.endsWith('.test.ts'))
  .filter((file) => filters.length === 0 || filters.some((filter) => file.includes(filter)))
  .map((file) => path.join(testDir, file));

if (entries.length === 0) {
  console.error(filters.length > 0 ? `Ningún test casa con: ${filters.join(', ')}` : 'No hay tests en src/test.');
  process.exit(1);
}

function run(command, args) {
  const child = spawn(command, args, { stdio: 'inherit', cwd: projectRoot });
  return new Promise((resolve) => child.on('close', (code) => resolve(code ?? 1)));
}

const esbuild = path.join(projectRoot, 'node_modules', '.bin', 'esbuild');
const outdir = await mkdtemp(path.join(tmpdir(), 'fantasy-manager-tests-'));
try {
  await symlink(path.join(projectRoot, 'node_modules'), path.join(outdir, 'node_modules'), 'junction');
  const bundled = await run(esbuild, [
    ...entries,
    '--bundle',
    `--outdir=${outdir}`,
    '--platform=node',
    '--format=esm',
    '--target=node22',
    '--sourcemap=inline',
    // Las dependencias de node_modules se cargan desde el propio proyecto.
    '--packages=external',
    '--log-level=warning',
  ]);
  if (bundled !== 0) {
    process.exitCode = bundled;
  } else {
    process.exitCode = await run(process.execPath, ['--test', outdir]);
  }
} finally {
  await rm(outdir, { recursive: true, force: true });
}
