import { NextRequest, NextResponse } from 'next/server';
import { accessConfigured, createSession, PRIVATE_HEADERS, sameOrigin, SESSION_COOKIE, SESSION_SECONDS, verifyAccessCode } from '@/lib/server/experienceAccess';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new Response(null, { status: 403, headers: PRIVATE_HEADERS });
  if (!accessConfigured()) return new Response('This gift is not available yet.', { status: 503, headers: PRIVATE_HEADERS });
  if (Number(request.headers.get('content-length') ?? 0) > 4096) return new Response(null, { status: 413 });
  const body = await request.text();
  if (body.length > 4096) return new Response(null, { status: 413 });
  const valid = verifyAccessCode(new URLSearchParams(body).get('code') ?? '');
  if (!valid) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return NextResponse.redirect(new URL('/?access=retry', request.headers.get('origin')!), { status: 303, headers: PRIVATE_HEADERS });
  }
  const response = NextResponse.redirect(new URL('/', request.headers.get('origin')!), { status: 303, headers: PRIVATE_HEADERS });
  response.cookies.set(SESSION_COOKIE, createSession(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: SESSION_SECONDS });
  return response;
}
