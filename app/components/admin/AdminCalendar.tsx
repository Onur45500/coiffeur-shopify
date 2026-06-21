import {useEffect, useState} from 'react';
import {formatInTimeZone} from 'date-fns-tz';
import {createSupabaseBrowserClient} from '~/lib/supabase.client';

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
  bookings: initialBookings,
  timezone,
  supabaseUrl,
  supabaseAnonKey,
}: {
  bookings: BookingRow[];
  timezone: string;
  staff: Array<{id: string; name: string}>;
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const [bookings, setBookings] = useState(initialBookings);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);
    const channel = supabase
      .channel('admin-bookings')
      .on(
        'postgres_changes',
        {event: '*', schema: 'public', table: 'bookings'},
        () => {
          window.location.reload();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabaseUrl, supabaseAnonKey]);

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
