import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/account.bookings';
import {getBookingsByEmail} from '~/lib/booking/actions.server';
import {formatBookingDate, formatSlotTime} from '~/lib/booking/actions.server';
import {bookingLabels} from '~/lib/i18n';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';

export const meta: Route.MetaFunction = () => {
  return [{title: `${bookingLabels.myBookings} | Coiffeur`}];
};

export async function loader({context}: Route.LoaderArgs) {
  const {data} = await context.customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {language: context.customerAccount.i18n.language},
  });

  const email = data?.customer?.emailAddress?.emailAddress;
  if (!email) {
    throw new Response('Non connecté', {status: 401});
  }

  const bookings = await getBookingsByEmail(context.supabase, email);
  const {data: settings} = await context.supabase
    .from('salon_settings')
    .select('timezone')
    .limit(1)
    .single();

  const timezone = settings?.timezone ?? 'Europe/Paris';
  const now = new Date();

  return {
    upcoming: bookings.filter(
      (b) => new Date(b.start_time) >= now && b.status !== 'cancelled',
    ),
    past: bookings.filter(
      (b) => new Date(b.start_time) < now || b.status === 'cancelled',
    ),
    timezone,
  };
}

export default function AccountBookingsPage() {
  const {upcoming, past, timezone} = useLoaderData<typeof loader>();

  return (
    <div className="account-bookings">
      <h2>{bookingLabels.myBookings}</h2>
      <Link to="/book" className="button primary">
        {bookingLabels.bookAppointment}
      </Link>

      <h3>{bookingLabels.upcoming}</h3>
      {upcoming.length === 0 ? (
        <p>Aucun rendez-vous à venir.</p>
      ) : (
        <ul className="bookings-list">
          {upcoming.map((booking) => (
            <li key={booking.id}>
              <strong>{formatBookingDate(booking.start_time, timezone)}</strong>
              <span>
                {formatSlotTime(booking.start_time, timezone)} — {booking.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3>{bookingLabels.past}</h3>
      {past.length === 0 ? (
        <p>Aucun historique.</p>
      ) : (
        <ul className="bookings-list">
          {past.map((booking) => (
            <li key={booking.id}>
              <strong>{formatBookingDate(booking.start_time, timezone)}</strong>
              <span>
                {formatSlotTime(booking.start_time, timezone)} — {booking.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
