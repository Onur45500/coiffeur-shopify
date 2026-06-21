import {createSupabaseAnonClient} from '~/lib/supabase.server';

const ADMIN_SESSION_KEY = 'admin_access_token';
const ADMIN_REFRESH_KEY = 'admin_refresh_token';

export async function getAdminSession(request: Request, env: Env) {
  const cookie = request.headers.get('Cookie') ?? '';
  const accessToken = parseCookie(cookie, ADMIN_SESSION_KEY);
  if (!accessToken) return null;

  const supabase = createSupabaseAnonClient(env);
  const {data, error} = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;

  return {user: data.user, accessToken};
}

export function setAdminSessionHeaders(
  accessToken: string,
  refreshToken: string,
): Headers {
  const headers = new Headers();
  const maxAge = 60 * 60 * 24 * 7;
  headers.append(
    'Set-Cookie',
    `${ADMIN_SESSION_KEY}=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  );
  headers.append(
    'Set-Cookie',
    `${ADMIN_REFRESH_KEY}=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  );
  return headers;
}

export function clearAdminSessionHeaders(): Headers {
  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    `${ADMIN_SESSION_KEY}=; Path=/; HttpOnly; Max-Age=0`,
  );
  headers.append(
    'Set-Cookie',
    `${ADMIN_REFRESH_KEY}=; Path=/; HttpOnly; Max-Age=0`,
  );
  return headers;
}

export async function requireAdmin(request: Request, env: Env) {
  const session = await getAdminSession(request, env);
  if (!session) {
    throw new Response(null, {
      status: 302,
      headers: {Location: '/admin/login'},
    });
  }
  return session;
}

function parseCookie(cookie: string, name: string): string | null {
  const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
