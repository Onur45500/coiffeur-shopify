import {useLoaderData} from 'react-router';
import type {Route} from './+types/admin._index';
import {formatInTimeZone} from 'date-fns-tz';
import type {Booking} from '~/lib/database.types';

type BookingWithRelations = Booking & {
  services?: {name: string} | null;
  staff?: {name: string} | null;
};

export async function loader({context}: Route.LoaderArgs) {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const [{data: bookings}, {data: settings}, {count: staffCount}] =
    await Promise.all([
      context.supabase
        .from('bookings')
        .select('*, services(name), staff(name)')
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .neq('status', 'cancelled')
        .order('start_time'),
      context.supabase.from('salon_settings').select('*').limit(1).single(),
      context.supabase
        .from('staff')
        .select('*', {count: 'exact', head: true})
        .eq('is_active', true),
    ]);

  const timezone = settings?.timezone ?? 'Europe/Paris';
  const confirmed = bookings?.filter((b: BookingWithRelations) => b.status === 'confirmed').length ?? 0;
  const pending = bookings?.filter((b: BookingWithRelations) => b.status === 'pending').length ?? 0;

  return {
    bookings: bookings ?? [],
    timezone,
    stats: {
      todayCount: bookings?.length ?? 0,
      confirmed,
      pending,
      staffCount: staffCount ?? 0,
    },
  };
}

export default function AdminDashboard() {
  const {bookings, timezone, stats} = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="admin-stats">
        <div className="admin-stat-card">
          <strong>{stats.todayCount}</strong>
          <span>RDV aujourd&apos;hui</span>
        </div>
        <div className="admin-stat-card">
          <strong>{stats.confirmed}</strong>
          <span>Confirmés</span>
        </div>
        <div className="admin-stat-card">
          <strong>{stats.pending}</strong>
          <span>En attente</span>
        </div>
        <div className="admin-stat-card">
          <strong>{stats.staffCount}</strong>
          <span>Coiffeurs actifs</span>
        </div>
      </div>
      <h2>Rendez-vous du jour</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Heure</th>
            <th>Client</th>
            <th>Prestation</th>
            <th>Coiffeur</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking: BookingWithRelations) => (
            <tr key={booking.id}>
              <td>
                {formatInTimeZone(
                  new Date(booking.start_time),
                  timezone,
                  'HH:mm',
                )}
              </td>
              <td>{booking.customer_name}</td>
              <td>{booking.services?.name}</td>
              <td>{booking.staff?.name}</td>
              <td>{booking.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
