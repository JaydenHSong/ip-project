// Design Ref: §3.3 Error codes + §9 Error Handling
// Plan SC: SC-07 (Provider v1 error shapes)
//
// Response helpers — unified shapes for all products API routes.
// Keeps route.ts files slim (NFR-06) by centralizing JSON envelope logic.

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// =============================================================================
// Success shapes (typed via generics so callers keep full type info)
// =============================================================================

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// =============================================================================
// Error shapes
// =============================================================================

export function badRequest(error: string, fieldErrors?: Record<string, string[]>) {
  return NextResponse.json({ error, ...(fieldErrors ? { fieldErrors } : {}) }, { status: 400 });
}

export function unauthorized(error = 'Unauthorized') {
  return NextResponse.json({ error }, { status: 401 });
}

export function forbidden(error = 'Forbidden') {
  return NextResponse.json({ error }, { status: 403 });
}

export function notFound(error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...(extra ?? {}) }, { status: 404 });
}

export function conflict(error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...(extra ?? {}) }, { status: 409 });
}

export function tooManyRequests(error: string, retryAfter?: number) {
  const headers = retryAfter ? { 'Retry-After': String(retryAfter) } : undefined;
  return NextResponse.json({ error }, { status: 429, headers });
}

export function notImplemented(error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...(extra ?? {}) }, { status: 501 });
}

export function serverError(error = 'Internal server error') {
  return NextResponse.json({ error }, { status: 500 });
}

// =============================================================================
// Zod wrapper — convert Zod issues to fieldErrors for badRequest()
// =============================================================================

export function zodError(err: ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_root';
    (fieldErrors[key] ||= []).push(issue.message);
  }
  return badRequest('invalid', fieldErrors);
}

// =============================================================================
// Common catch handler — converts thrown errors to HTTP responses
// =============================================================================

export function handleError(err: unknown): NextResponse {
  if (err instanceof ZodError) return zodError(err);

  const message = err instanceof Error ? err.message : String(err);

  // Postgres UNIQUE violation (Supabase error code "23505")
  if (typeof err === 'object' && err && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (code === '23505') {
      return conflict('UNIQUE constraint violation', { message });
    }
    if (code === '23503') {
      return badRequest('Foreign key violation', { _root: [message] });
    }
  }

  // Development: log full stack (production: Sentry hook if available)
  if (process.env.NODE_ENV !== 'production') {
    console.error('[products][api] error:', err);
  }

  return serverError(message || 'Internal server error');
}
