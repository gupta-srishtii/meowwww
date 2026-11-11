import { NextRequest } from 'next/server';
import { PRIVATE_HEADERS, SESSION_COOKIE, verifySession } from '@/lib/server/experienceAccess';
import { readPrivateMedia } from '@/lib/server/privateStorage';

export const runtime = 'nodejs';
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  if (!verifySession(request.cookies.get(SESSION_COOKIE)?.value)) return new Response(null, { status: 401, headers: PRIVATE_HEADERS });
  const response = await readPrivateMedia((await context.params).id, request.headers.get('range'));
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) response.headers.set(name, value);
  return response;
}
export async function HEAD(request: NextRequest, context: Context) {
  if (!verifySession(request.cookies.get(SESSION_COOKIE)?.value)) return new Response(null, { status: 401, headers: PRIVATE_HEADERS });
  const response = await readPrivateMedia((await context.params).id, request.headers.get('range'), true);
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) response.headers.set(name, value);
  return response;
}
