import * as process from 'process';

export function envMust(key: string, must = true) {
  const val = process.env[key];
  if (must && !val) {
    console.error(`env key ${key} missing`);
    process.exit(1);
  }
  return val;
}
