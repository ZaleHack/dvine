import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let envLoaded = false;

const stripQuotes = (value) => {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
};

const decodeValue = (value) => stripQuotes(value).replace(/\\n/g, '\n').replace(/\\r/g, '\r');

export function loadEnv() {
  if (envLoaded) {
    return;
  }
  envLoaded = true;

  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile();
      return;
    } catch (error) {
      console.warn('⚠️  Impossible de charger les variables via process.loadEnvFile:', error.message);
    }
  }

  const __filename = fileURLToPath(import.meta.url);
  const rootDir = path.resolve(path.dirname(__filename), '../..');
  const envPath = path.join(rootDir, '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .forEach((line) => {
      const equalsIndex = line.indexOf('=');
      if (equalsIndex === -1) {
        return;
      }

      const key = line.slice(0, equalsIndex).trim();
      const value = decodeValue(line.slice(equalsIndex + 1).trim());

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    });
}
