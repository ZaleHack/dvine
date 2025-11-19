import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_STALE_FOLDERS = ['apache-arrow'];
const DEFAULT_STALE_PREFIXES = ['.apache-arrow-'];

const resolveNodeModulesPath = (rootDir = path.resolve(__dirname, '..')) =>
  path.join(rootDir, 'node_modules');

const shouldRemoveEntry = (entry, { names, prefixes }) => {
  if (names.has(entry)) {
    return true;
  }
  return prefixes.some((prefix) => entry.startsWith(prefix));
};

const removeDirectory = async (targetPath) => {
  await fs.rm(targetPath, { recursive: true, force: true });
};

export async function cleanupStaleModules(options = {}) {
  const {
    projectRoot = path.resolve(__dirname, '..'),
    staleFolderNames = DEFAULT_STALE_FOLDERS,
    stalePrefixes = DEFAULT_STALE_PREFIXES
  } = options;

  const nodeModulesPath = resolveNodeModulesPath(projectRoot);

  try {
    const stats = await fs.stat(nodeModulesPath);
    if (!stats.isDirectory()) {
      return false;
    }
  } catch {
    return false;
  }

  const removalTargets = new Set();
  const configuredNames = new Set(
    staleFolderNames.filter((name) => typeof name === 'string' && name.trim().length > 0)
  );
  const configuredPrefixes = stalePrefixes.filter(
    (prefix) => typeof prefix === 'string' && prefix.trim().length > 0
  );

  let entries;
  try {
    entries = await fs.readdir(nodeModulesPath);
  } catch {
    return false;
  }

  await Promise.all(
    entries.map(async (entry) => {
      if (!shouldRemoveEntry(entry, { names: configuredNames, prefixes: configuredPrefixes })) {
        return;
      }
      const targetPath = path.join(nodeModulesPath, entry);
      try {
        await removeDirectory(targetPath);
        removalTargets.add(entry);
      } catch (error) {
        console.warn(
          `⚠️ préinstall: impossible de supprimer ${entry} (${error.message ?? error}).`
        );
      }
    })
  );

  if (removalTargets.size > 0) {
    for (const entry of removalTargets) {
      console.log(`🧹 préinstall: suppression du dossier obsolète ${entry}`);
    }
    return true;
  }

  return false;
}

const isDirectExecution = () => {
  if (!process?.argv?.[1]) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
};

if (isDirectExecution()) {
  cleanupStaleModules().catch((error) => {
    console.warn('⚠️ préinstall: nettoyage des modules obsolètes échoué:', error);
  });
}
