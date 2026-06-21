import {useLoaderData} from 'react-router';
import type {Route} from './+types/admin.calendar';
import {AdminCalendar} from '~/components/admin/AdminCalendar';

export async function loader({context}: Route.LoaderArgs) {
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const end = new Date();
  end.setDate(end.getDate() + 30);

  const [{data: bookings}, {data: settings}, {data: staff}] = await Promise.all([
    context.supabase
      .from('bookings')
      .select('*, services(name), staff(name)')
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .neq('status', 'cancelled')
      .order('start_time'),
    context.supabase.from('salon_settings').select('*').limit(1).single(),
    context.supabase.from('staff').select('*').eq('is_active', true),
  ]);

  return {
    bookings: bookings ?? [],
    timezone: settings?.timezone ?? 'Europe/Paris',
    staff: staff ?? [],
    supabaseUrl: context.env.SUPABASE_URL,
    supabaseAnonKey: context.env.PUBLIC_SUPABASE_ANON_KEY,
  };
}

export default function AdminCalendarPage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>Calendrier</h1>
      <AdminCalendar {...data} />
    </div>
  );
}
