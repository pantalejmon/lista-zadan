import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { load } from 'js-yaml';

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>,
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export default (): Record<string, unknown> => {
  const configDir = join(__dirname, '..', '..');
  const basePath = join(configDir, 'config.yaml');
  const localPath = join(configDir, 'config.local.yaml');

  const baseConfig = load(readFileSync(basePath, 'utf8')) as Record<string, unknown>;

  if (existsSync(localPath)) {
    const localConfig = load(readFileSync(localPath, 'utf8')) as Record<string, unknown>;
    return deepMerge(baseConfig, localConfig);
  }

  return baseConfig;
};
