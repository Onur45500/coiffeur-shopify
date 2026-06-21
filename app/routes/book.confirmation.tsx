import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/book.confirmation';
import {getBookingById} from '~/lib/booking/actions.server';
import {formatBookingDate, formatSlotTime} from '~/lib/booking/actions.server';
import {bookingLabels} from '~/lib/i18n';

export const meta: Route.MetaFunction = () => {
  return [{title: `${bookingLabels.bookingConfirmed} | Coiffeur`}];
};

export async function loader({request, context}: Route.LoaderArgs) {
  const bookingId = new URL(request.url).searchParams.get('bookingId');
  if (!bookingId) {
    throw new Response('Réservation introuvable', {status: 404});
  }

  const booking = await getBookingById(context.supabase, bookingId);
  if (!booking) {
    throw new Response('Réservation introuvable', {status: 404});
  }

  const [{data: service}, {data: staff}, {data: settings}] = await Promise.all([
    context.supabase.from('services').select('*').eq('id', booking.service_id).single(),
    context.supabase.from('staff').select('*').eq('id', booking.staff_id).single(),
    context.supabase.from('salon_settings').select('*').limit(1).single(),
  ]);

  return {booking, service, staff, timezone: settings?.timezone ?? 'Europe/Paris'};
}

export default function BookingConfirmationPage() {
  const {booking, service, staff, timezone} = useLoaderData<typeof loader>();

  return (
    <div className="booking-confirmation">
      <h1>
        {booking.status === 'confirmed'
          ? bookingLabels.bookingConfirmed
          : bookingLabels.bookingPending}
      </h1>
      {service && staff && (
        <div className="booking-summary-card">
          <p>
            <strong>{service.name}</strong> avec {staff.name}
          </p>
          <p>
            {formatBookingDate(booking.start_time, timezone)} à{' '}
            {formatSlotTime(booking.start_time, timezone)}
          </p>
        </div>
      )}
      <p>Référence : {booking.id}</p>
      <Link to="/account/bookings" className="button">
        {bookingLabels.myBookings}
      </Link>
    </div>
  );
}
