import { createHash } from 'crypto';

export function stableParamHash(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj)
    .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '')
    .sort()
    .map((k) => `${k}=${String(obj[k])}`)
    .join('&');
  return createHash('sha1').update(sorted).digest('hex').slice(0, 16);
}
