import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { cleanupStaleModules } from '../scripts/preinstall-clean-node-modules.mjs';

const exists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

test('cleanupStaleModules removes apache-arrow folders before install', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'preinstall-clean-'));
  const nodeModulesPath = path.join(tempDir, 'node_modules');
  await fs.mkdir(nodeModulesPath, { recursive: true });

  const staleDir = path.join(nodeModulesPath, 'apache-arrow');
  await fs.mkdir(staleDir, { recursive: true });
  await fs.writeFile(path.join(staleDir, 'placeholder.txt'), 'stale');

  const prefixedDir = path.join(nodeModulesPath, '.apache-arrow-temp');
  await fs.mkdir(prefixedDir, { recursive: true });

  const safeDir = path.join(nodeModulesPath, 'react');
  await fs.mkdir(safeDir, { recursive: true });

  const removed = await cleanupStaleModules({ projectRoot: tempDir });

  assert.equal(removed, true);
  assert.equal(await exists(staleDir), false);
  assert.equal(await exists(prefixedDir), false);
  assert.equal(await exists(safeDir), true);
});

test('cleanupStaleModules is a no-op when node_modules is missing', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'preinstall-clean-missing-'));
  const removed = await cleanupStaleModules({ projectRoot: tempDir });
  assert.equal(removed, false);
});
