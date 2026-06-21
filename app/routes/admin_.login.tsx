import {data, Form, redirect, useActionData} from 'react-router';
import type {Route} from './+types/admin_.login';
import {createSupabaseAnonClient} from '~/lib/supabase.server';
import {
  setAdminSessionHeaders,
  getAdminSession,
} from '~/lib/admin-session.server';
import {adminLoginSchema} from '~/lib/booking/schema';
import {bookingLabels} from '~/lib/i18n';

export const meta: Route.MetaFunction = () => {
  return [
    {title: `${bookingLabels.login} Admin`},
    {name: 'robots', content: 'noindex, nofollow'},
  ];
};

export async function loader({request, context}: Route.LoaderArgs) {
  const session = await getAdminSession(request, context.env);
  if (session) {
    throw redirect('/admin');
  }
  return null;
}

export async function action({request, context}: Route.ActionArgs) {
  const formData = await request.formData();
  const parsed = adminLoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return data({error: 'Identifiants invalides'}, {status: 400});
  }

  const supabase = createSupabaseAnonClient(context.env);
  const {data: authData, error} = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !authData.session) {
    return data({error: 'Email ou mot de passe incorrect'}, {status: 401});
  }

  const {data: adminUser} = await context.supabase
    .from('admin_users')
    .select('id')
    .eq('supabase_user_id', authData.user.id)
    .maybeSingle();

  if (!adminUser) {
    return data({error: 'Accès non autorisé'}, {status: 403});
  }

  const headers = setAdminSessionHeaders(
    authData.session.access_token,
    authData.session.refresh_token,
  );

  throw redirect('/admin', {headers});
}

export default function AdminLoginPage() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="admin-login">
      <h1>{bookingLabels.admin}</h1>
      <Form method="post" className="booking-form">
        <label>
          Email
          <input name="email" type="email" required autoComplete="username" />
        </label>
        <label>
          Mot de passe
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        {actionData?.error && <p className="booking-error">{actionData.error}</p>}
        <button type="submit" className="button primary">
          {bookingLabels.login}
        </button>
      </Form>
    </div>
  );
}
