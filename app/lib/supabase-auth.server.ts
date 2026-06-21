import type {User} from '@supabase/supabase-js';

export async function signInWithPassword(
  env: Env,
  email: string,
  password: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: User;
}> {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: env.PUBLIC_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({email, password}),
  });

  if (!response.ok) {
    throw new Error('Invalid login credentials');
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    user: User;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: data.user,
  };
}

export async function getUserFromAccessToken(
  env: Env,
  accessToken: string,
): Promise<User | null> {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;

  return (await response.json()) as User;
}
