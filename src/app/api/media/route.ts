import { NextRequest } from 'next/server';
import { PRIVATE_HEADERS, SESSION_COOKIE, verifySession } from '@/lib/server/experienceAccess';
import { storageConfiguration, MEDIA_KINDS } from '@/lib/server/privateStorage';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  if (!verifySession(request.cookies.get(SESSION_COOKIE)?.value)) return Response.json({ error: 'Access required' }, { status: 401, headers: PRIVATE_HEADERS });
  const config = storageConfiguration();
  if (!config) return Response.json({ error: 'Private media is not configured' }, { status: 503, headers: PRIVATE_HEADERS });
  return Response.json({ media: Object.keys(config.objects).map(id => ({ id, kind: MEDIA_KINDS[id], url: `/api/media/${id}` })) }, { headers: PRIVATE_HEADERS });
}
