// Design Ref: ft-zod-validation §2.1, §5.1 — Generic Zod request-body validation primitive.
//
// Purpose:
//   Replace `await req.json() as Type` unsafe casts (arc-ads 20 write routes) with
//   runtime-verified parsing. Returns 400 `{error, fieldErrors}` on validation failure.
//
// Module Isolation:
//   This helper lives under `src/lib/api/` and has zero coupling to any feature module.
//   Depends only on `zod` and `next/server`. Usable by any module; arc-ads is the first
//   adopter (other modules may follow in separate PDCAs — `ft-zod-validation-ip` etc.).
//
// Usage (default — parseBody):
//   import { parseBody } from '@/lib/api/validate-body'
//   import { createCampaignSchema } from '@/modules/ads/features/campaigns/schemas'
//
//   export const POST = withAuth(async (req) => {
//     // Plan SC-3: Zod validation applied
//     const parsed = await parseBody(req, createCampaignSchema)
//     if (!parsed.success) return parsed.response
//     const body = parsed.data  // typed as z.infer<typeof createCampaignSchema>
//     ...
//   }, ['admin', 'editor'])
//
// Usage (opt-in HOC — withValidatedBody):
//   export const POST = withValidatedBody(createCampaignSchema, async (req, body) => {
//     // body is already validated & typed
//     ...
//   })

import { ZodError, type ZodSchema } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse }

export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<ParseResult<T>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid JSON body', fieldErrors: {} },
        { status: 400 },
      ),
    }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    return { success: false, response: validationErrorResponse(result.error) }
  }
  return { success: true, data: result.data }
}

export function validationErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation failed',
      fieldErrors: error.flatten().fieldErrors,
    },
    { status: 400 },
  )
}

export function withValidatedBody<T, Args extends unknown[]>(
  schema: ZodSchema<T>,
  handler: (req: NextRequest, body: T, ...args: Args) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ...args: Args): Promise<NextResponse> => {
    const parsed = await parseBody(req, schema)
    if (!parsed.success) return parsed.response
    return handler(req, parsed.data, ...args)
  }
}
