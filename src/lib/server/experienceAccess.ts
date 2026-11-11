import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'gift_session';
export const SESSION_SECONDS = 8 * 60 * 60;
export const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };

function credentials() {
  const code = process.env.EXPERIENCE_ACCESS_CODE ?? '';
  const secret = process.env.EXPERIENCE_SESSION_SECRET ?? '';
  return code.length >= 16 && secret.length >= 32 ? { code, secret } : null;
}

export function accessConfigured(): boolean {
  return process.env.EXPERIENCE_ENABLED === 'true' && credentials() !== null;
}

export function localDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.REQUIRE_ACCESS_IN_DEVELOPMENT !== 'true';
}

export function verifyAccessCode(input: string): boolean {
  const config = credentials();
  if (!accessConfigured() || !config || input.length > 1024) return false;
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(input), digest(config.code));
}

function signature(payload: string): string {
  const config = credentials();
  if (!config) throw new Error('Access is not configured');
  // Rotating either credential revokes existing sessions.
  return createHmac('sha256', config.secret).update(payload).update(config.code).digest('base64url');
}

export function createSession(now = Date.now()): string {
  if (!accessConfigured()) throw new Error('Access is not configured');
  const payload = `${Math.floor(now / 1000) + SESSION_SECONDS}.${randomBytes(16).toString('base64url')}`;
  return `${payload}.${signature(payload)}`;
}

export function verifySession(token: string | undefined, now = Date.now()): boolean {
  if (!accessConfigured() || !token || token.length > 180) return false;
  const [expiry, nonce, mac, extra] = token.split('.');
  if (extra || !/^\d+$/.test(expiry ?? '') || !/^[\w-]{22}$/.test(nonce ?? '') || !/^[\w-]{43}$/.test(mac ?? '')) return false;
  const expires = Number(expiry);
  const seconds = Math.floor(now / 1000);
  if (!Number.isSafeInteger(expires) || expires <= seconds || expires > seconds + SESSION_SECONDS) return false;
  const expected = Buffer.from(signature(`${expiry}.${nonce}`));
  const actual = Buffer.from(mac);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function sameOrigin(request: Request): boolean {
  // Next's internal URL can use localhost behind a proxy; compare the browser's
  // Origin with the actual request host and the platform's forwarded protocol.
  const internal = new URL(request.url);
  const host = request.headers.get('host') ?? internal.host;
  const protocol = request.headers.get('x-forwarded-proto') ?? internal.protocol.slice(0, -1);
  if (protocol !== 'https' && protocol !== 'http') return false;
  return request.headers.get('origin') === `${protocol}://${host}`;
}
