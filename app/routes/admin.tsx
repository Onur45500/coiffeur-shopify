import {data, Form, Link, Outlet, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/admin';
import {requireAdmin, clearAdminSessionHeaders} from '~/lib/admin-session.server';
import {bookingLabels} from '~/lib/i18n';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Administration'}, {name: 'robots', content: 'noindex, nofollow'}];
};

export async function loader({request, context}: Route.LoaderArgs) {
  const session = await requireAdmin(request, context.env);
  return {adminEmail: session.user.email};
}

export async function action({request, context}: Route.ActionArgs) {
  if (request.method === 'POST') {
    const formData = await request.formData();
    if (formData.get('intent') === 'logout') {
      return redirect('/admin/login', {
        headers: clearAdminSessionHeaders(),
      });
    }
  }
  return data({ok: true});
}

export default function AdminLayout() {
  const {adminEmail} = useLoaderData<typeof loader>();

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2>{bookingLabels.admin}</h2>
        <p className="admin-user">{adminEmail}</p>
        <nav>
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/calendar">Calendrier</Link>
          <Link to="/admin/bookings">Réservations</Link>
          <Link to="/admin/staff">Coiffeurs</Link>
          <Link to="/admin/services">Prestations</Link>
          <Link to="/admin/settings">Paramètres</Link>
        </nav>
        <Form method="post">
          <input type="hidden" name="intent" value="logout" />
          <button type="submit">{bookingLabels.logout}</button>
        </Form>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
