// This module is imported only by Node server routes. Never import it into client components.
export const MEDIA_KINDS: Record<string, 'image' | 'video' | 'audio'> = {
  scene02_day1_stream_video: 'video',
  scene02_day1_stream_video_2: 'video',
  scene03_tea_stop: 'image', scene05_viewpoint_shree: 'image',
  scene05_viewpoint_solo: 'image', scene05_viewpoint_group: 'image',
  scene06_dhaba: 'image', scene07_neelkanth_food: 'image',
  scene09_stairs_landing: 'image', scene10_baalkuwari: 'image',
  scene10_baalkuwari_book: 'image', temple_song: 'audio', finale_song: 'audio',
};

export function storageConfiguration() {
  const project = (process.env.SUPABASE_URL ?? '').trim().replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const bucket = process.env.PRIVATE_MEDIA_BUCKET ?? '';
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(project) || !key ||
    !/^[a-zA-Z0-9_-][a-zA-Z0-9 _-]*$/.test(bucket) || bucket.trim() !== bucket) return null;
  try {
    const raw: unknown = JSON.parse(process.env.PRIVATE_MEDIA_OBJECTS ?? '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const objects: Record<string, string> = {};
    for (const [id, object] of Object.entries(raw)) {
      if (!Object.hasOwn(MEDIA_KINDS, id) || typeof object !== 'string' ||
        !/^[\w /.-]+\.(jpg|jpeg|png|webp|mp4|webm|mp3|wav|m4a|ogg|aac|flac)$/i.test(object) ||
        object.split('/').some(p => p === '..' || p === '.' || p === '')) return null;
      objects[id] = object;
    }
    return Object.keys(objects).length ? { project, key, bucket, objects } : null;
  } catch { return null; }
}

/** Short-lived provider URLs stay server-side; Range requests keep videos/audio seekable. */
export async function readPrivateMedia(id: string, range: string | null, head = false): Promise<Response> {
  const config = storageConfiguration();
  if (!config) return Response.json({ error: 'Private media is not configured' }, { status: 503 });
  if (!Object.hasOwn(config.objects, id)) return new Response(null, { status: 404 });
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return new Response(null, { status: 416 });
  const path = [config.bucket, ...config.objects[id].split('/')].map(encodeURIComponent).join('/');
  try {
    const bucket = await fetch(`${config.project}/storage/v1/bucket/${encodeURIComponent(config.bucket)}`, {
      headers: { Authorization: `Bearer ${config.key}`, apikey: config.key },
      cache: 'no-store', signal: AbortSignal.timeout(10_000),
    });
    if (!bucket.ok || (await bucket.json() as { public?: boolean }).public !== false) {
      return Response.json({ error: 'Private bucket required' }, { status: 503 });
    }
    const signed = await fetch(`${config.project}/storage/v1/object/sign/${path}`, {
      method: 'POST', headers: { Authorization: `Bearer ${config.key}`, apikey: config.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 300 }), cache: 'no-store', signal: AbortSignal.timeout(10_000),
    });
    if (!signed.ok) return new Response(null, { status: signed.status === 404 ? 404 : 502 });
    const data = await signed.json() as { signedURL?: string };
    if (!data.signedURL?.startsWith('/object/sign/')) return new Response(null, { status: 502 });
    const url = new URL(`${config.project}/storage/v1${data.signedURL}`);
    if (url.origin !== config.project) return new Response(null, { status: 502 });
    const media = await fetch(url, { method: head ? 'HEAD' : 'GET', headers: range ? { Range: range } : {}, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30_000) });
    if (![200, 206, 416].includes(media.status)) return new Response(null, { status: media.status === 404 ? 404 : 502 });
    const type = media.headers.get('content-type') ?? '';
    if (media.status !== 416 && !type.startsWith(`${MEDIA_KINDS[id]}/`)) return new Response(null, { status: 502 });
    const headers = new Headers({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const value = media.headers.get(name); if (value) headers.set(name, value);
    }
    return new Response(head ? null : media.body, { status: media.status, headers });
  } catch { return Response.json({ error: 'Media temporarily unavailable' }, { status: 502 }); }
}
