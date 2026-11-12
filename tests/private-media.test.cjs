const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function fixture(extra = {}, fetcher = async () => { throw Error('No real network calls allowed'); }) {
  const env = { NODE_ENV: 'production', EXPERIENCE_ENABLED: 'true', EXPERIENCE_ACCESS_CODE: 'synthetic-gift-code-only',
    EXPERIENCE_SESSION_SECRET: 'synthetic-session-secret-for-tests-only-32', ...extra };
  const cache = new Map();
  const load = (file) => {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { exports, Buffer, URL, URLSearchParams, Request, Response, Headers, AbortSignal, setTimeout,
      process: { env }, fetch: fetcher, require: name => name.startsWith('@/') ? load(`src/${name.slice(2)}.ts`) : require(name) });
    return exports;
  };
  return { env, load, access: load('src/lib/server/experienceAccess.ts') };
}

test('production fails closed without explicit enablement and strong credentials', () => {
  for (const config of [{ EXPERIENCE_ENABLED: 'false' }, { EXPERIENCE_ACCESS_CODE: '' }, { EXPERIENCE_SESSION_SECRET: '' }]) {
    const f = fixture(config);
    assert.equal(f.access.accessConfigured(), false);
    assert.equal(f.access.verifySession('anything'), false);
    assert.equal(f.access.verifyAccessCode('anything'), false);
  }
});

test('signed sessions reject tampering, expiry and credential rotation', () => {
  const f = fixture(), now = Date.now(), token = f.access.createSession(now);
  assert(f.access.verifySession(token, now));
  assert(!f.access.verifySession(token + 'x', now));
  assert(!f.access.verifySession(token, now + 8 * 3600 * 1000));
  assert(!f.access.verifySession('9999999999999999.nonce.signature', now));
  f.env.EXPERIENCE_ACCESS_CODE = 'different-synthetic-code';
  assert(!f.access.verifySession(token, now));
});

test('login enforces Origin, rejects wrong codes and issues secure HttpOnly session', async () => {
  const f = fixture(), { POST } = f.load('src/app/api/access/route.ts');
  const make = (code, origin = 'https://gift.test') => new (require('next/server').NextRequest)('https://gift.test/api/access', {
    method: 'POST', headers: { Origin: origin }, body: new URLSearchParams({ code }).toString(),
  });
  assert.equal((await POST(make(f.env.EXPERIENCE_ACCESS_CODE, 'https://attacker.test'))).status, 403);
  assert.equal((await POST(make('wrong'))).headers.get('set-cookie'), null);
  const result = await POST(make(f.env.EXPERIENCE_ACCESS_CODE));
  assert.equal(result.status, 303);
  const cookie = result.headers.get('set-cookie');
  assert(cookie.includes('HttpOnly') && cookie.includes('Secure') && cookie.toLowerCase().includes('samesite=strict'));
});

test('anonymous catalog and media requests never contact storage', async () => {
  const f = fixture(), RequestClass = require('next/server').NextRequest;
  const request = new RequestClass('https://gift.test/api/media');
  assert.equal((await f.load('src/app/api/media/route.ts').GET(request)).status, 401);
  assert.equal((await f.load('src/app/api/media/[id]/route.ts').GET(request, { params: Promise.resolve({ id: 'scene03_tea_stop' }) })).status, 401);
});

test('proxy-internal localhost URLs retain the verified public login origin', async () => {
  const f = fixture(), { POST } = f.load('src/app/api/access/route.ts');
  const make = origin => new (require('next/server').NextRequest)('http://localhost:3000/api/access', {
    method: 'POST', headers: { Origin: origin, Host: 'gift.test', 'x-forwarded-proto': 'https' },
    body: new URLSearchParams({ code: f.env.EXPERIENCE_ACCESS_CODE }).toString(),
  });
  const result = await POST(make('https://gift.test'));
  assert.equal(result.status, 303);
  assert.equal(result.headers.get('location'), 'https://gift.test/');
  assert.equal((await POST(make('https://attacker.test'))).status, 403);
});

const storageEnv = { SUPABASE_URL: 'https://qa-only.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key',
  PRIVATE_MEDIA_BUCKET: 'trip-memories', PRIVATE_MEDIA_OBJECTS: JSON.stringify({ scene02_day1_stream_video: 'stream.mp4' }) };

test('storage configuration rejects arbitrary IDs, traversal and non-HTTPS destinations', () => {
  for (const config of [{ SUPABASE_URL: 'http://localhost' }, { PRIVATE_MEDIA_OBJECTS: '{"unknown":"x.jpg"}' },
    { PRIVATE_MEDIA_OBJECTS: '{"scene03_tea_stop":"../x.jpg"}' }]) {
    const f = fixture({ ...storageEnv, ...config });
    assert.equal(f.load('src/lib/server/privateStorage.ts').storageConfiguration(), null);
  }
});

test('public buckets are rejected before signing or downloading', async () => {
  let calls = 0;
  const f = fixture(storageEnv, async () => { calls++; return Response.json({ public: true }); });
  assert.equal((await f.load('src/lib/server/privateStorage.ts').readPrivateMedia('scene02_day1_stream_video', null)).status, 503);
  assert.equal(calls, 1);
});

test('private media preserves Range, 206 and no-store without exposing provider tokens', async () => {
  const calls = [];
  const f = fixture(storageEnv, async (url, options) => {
    calls.push({ url: String(url), options });
    if (calls.length === 1) return Response.json({ public: false });
    if (calls.length === 2) return Response.json({ signedURL: '/object/sign/trip-memories/stream.mp4?token=synthetic-only' });
    return new Response('TEST', { status: 206, headers: { 'Content-Type': 'video/mp4', 'Content-Range': 'bytes 0-3/10', 'Content-Length': '4', 'Accept-Ranges': 'bytes' } });
  });
  const response = await f.load('src/lib/server/privateStorage.ts').readPrivateMedia('scene02_day1_stream_video', 'bytes=0-3');
  assert.equal(response.status, 206);
  assert.equal(await response.text(), 'TEST');
  assert.equal(response.headers.get('content-range'), 'bytes 0-3/10');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert(![...response.headers.values()].some(v => v.includes('synthetic')));
  assert.equal(JSON.parse(calls[1].options.body).expiresIn, 300);
  assert.equal(calls[2].options.headers.Range, 'bytes=0-3');
});

test('unlisted objects and invalid range requests are rejected without a provider call', async () => {
  const storage = fixture(storageEnv).load('src/lib/server/privateStorage.ts');
  assert.equal((await storage.readPrivateMedia('not-approved', null)).status, 404);
  assert.equal((await storage.readPrivateMedia('scene02_day1_stream_video', 'bytes=0-2,4-8')).status, 416);
  assert.equal((await storage.readPrivateMedia('scene02_day1_stream_video', 'bytes=-')).status, 416);
});

test('space-containing bucket names are accepted and encoded as one path segment', async () => {
  const calls = [];
  const f = fixture({ ...storageEnv, PRIVATE_MEDIA_BUCKET: 'trip memories', SUPABASE_URL: 'https://qa-only.supabase.co/' }, async (url, options) => {
    calls.push({ url: String(url), options });
    if (calls.length === 1) return Response.json({ public: false });
    if (calls.length === 2) return Response.json({ signedURL: '/object/sign/trip%20memories/stream.mp4?token=synthetic-only' });
    return new Response(null, { headers: { 'Content-Type': 'video/mp4', 'Content-Length': '100' } });
  });
  const storage = f.load('src/lib/server/privateStorage.ts');
  assert(storage.storageConfiguration());
  const result = await storage.readPrivateMedia('scene02_day1_stream_video', null, true);
  assert.equal(result.status, 200);
  assert(calls[0].url.endsWith('/bucket/trip%20memories'));
  assert(calls[1].url.includes('/object/sign/trip%20memories/stream.mp4'));
  assert.equal(calls[2].options.method, 'HEAD');
  assert.equal(await result.text(), '');
});

test('bucket names cannot introduce path segments or invisible whitespace', () => {
  for (const bucket of ['trip/memories', '../memories', ' trip memories', 'trip memories ', 'trip\nmemories']) {
    assert.equal(fixture({ ...storageEnv, PRIVATE_MEDIA_BUCKET: bucket }).load('src/lib/server/privateStorage.ts').storageConfiguration(), null);
  }
});
