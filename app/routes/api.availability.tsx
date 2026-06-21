import type {Route} from './+types/api.availability';
import {availabilityQuerySchema} from '~/lib/booking/schema';
import {getAvailableSlots} from '~/lib/booking/actions.server';

const rateLimitMap = new Map<string, {count: number; resetAt: number}>();

function checkRateLimit(ip: string, limit = 60): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, {count: 1, resetAt: now + 60_000});
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export async function loader({request, context}: Route.LoaderArgs) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return Response.json({error: 'Too many requests'}, {status: 429});
  }

  const url = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    serviceId: url.searchParams.get('serviceId'),
    staffId: url.searchParams.get('staffId') ?? undefined,
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
  });

  if (!parsed.success) {
    return Response.json(
      {error: 'Invalid parameters', details: parsed.error.flatten()},
      {status: 400},
    );
  }

  try {
    const slots = await getAvailableSlots(context.supabase, parsed.data);
    return Response.json(
      {slots},
      {
        headers: {
          'Cache-Control': 'public, max-age=60',
        },
      },
    );
  } catch (err) {
    return Response.json(
      {error: err instanceof Error ? err.message : 'Server error'},
      {status: 500},
    );
  }
}
