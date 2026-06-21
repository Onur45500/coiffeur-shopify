import {useEffect} from 'react';
import {useRevalidator} from 'react-router';
import {formatInTimeZone} from 'date-fns-tz';

type BookingRow = {
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  status: string;
  services?: {name: string} | null;
  staff?: {name: string} | null;
};

export function AdminCalendar({
  bookings,
  timezone,
}: {
  bookings: BookingRow[];
  timezone: string;
  staff: Array<{id: string; name: string}>;
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const revalidator = useRevalidator();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        revalidator.revalidate();
      }
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [revalidator]);

  return (
    <div className="admin-calendar-grid">
      {bookings.map((booking) => (
        <article key={booking.id} className={`calendar-event status-${booking.status}`}>
          <time>
            {formatInTimeZone(new Date(booking.start_time), timezone, 'dd/MM HH:mm')}
          </time>
          <strong>{booking.customer_name}</strong>
          <span>{booking.services?.name}</span>
          <span>{booking.staff?.name}</span>
          <small>{booking.status}</small>
        </article>
      ))}
    </div>
  );
}
