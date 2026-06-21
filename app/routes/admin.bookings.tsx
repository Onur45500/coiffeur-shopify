import {data, Form, useLoaderData} from 'react-router';
import type {Route} from './+types/admin.bookings';
import {formatInTimeZone} from 'date-fns-tz';
import type {Booking} from '~/lib/database.types';

type BookingWithRelations = Booking & {
  services?: {name: string} | null;
  staff?: {name: string} | null;
};

export async function loader({context}: Route.LoaderArgs) {
  const [{data: bookings}, {data: settings}] = await Promise.all([
    context.supabase
      .from('bookings')
      .select('*, services(name), staff(name)')
      .order('start_time', {ascending: false})
      .limit(100),
    context.supabase.from('salon_settings').select('*').limit(1).single(),
  ]);

  return {bookings: bookings ?? [], timezone: settings?.timezone ?? 'Europe/Paris'};
}

export async function action({request, context}: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get('intent'));

  if (intent === 'cancel') {
    const bookingId = String(formData.get('bookingId'));
    const reason = String(formData.get('reason') ?? 'Annulé par admin');
    const {error} = await context.supabase.rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_reason: reason,
    });
    if (error) {
      return data({error: error.message}, {status: 400});
    }
  }

  return data({ok: true});
}

export default function AdminBookingsPage() {
  const {bookings, timezone} = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Réservations</h1>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Client</th>
            <th>Prestation</th>
            <th>Coiffeur</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking: BookingWithRelations) => (
            <tr key={booking.id}>
              <td>
                {formatInTimeZone(
                  new Date(booking.start_time),
                  timezone,
                  'dd/MM/yyyy HH:mm',
                )}
              </td>
              <td>
                {booking.customer_name}
                <br />
                <small>{booking.customer_email}</small>
              </td>
              <td>{booking.services?.name}</td>
              <td>{booking.staff?.name}</td>
              <td>{booking.status}</td>
              <td>
                {booking.status !== 'cancelled' && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="cancel" />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button type="submit">Annuler</button>
                  </Form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
