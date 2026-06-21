import type {Booking, Service, Staff} from '~/lib/database.types';
import type {SupabaseServerClient} from '~/lib/supabase.server';
import {formatInTimeZone} from 'date-fns-tz';

export async function sendBookingSms(
  env: Env,
  supabase: SupabaseServerClient,
  booking: Booking,
  service: Service,
  staff: Staff,
  timezone: string,
): Promise<{sent: boolean; error?: string}> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
    return {sent: false, error: 'Twilio not configured'};
  }

  if (!booking.customer_phone) {
    return {sent: false, error: 'No phone number'};
  }

  const {data: current} = await supabase
    .from('bookings')
    .select('sms_sent_at')
    .eq('id', booking.id)
    .single();

  if (current?.sms_sent_at) {
    return {sent: false, error: 'SMS already sent'};
  }

  const dateStr = formatInTimeZone(
    new Date(booking.start_time),
    timezone,
    'dd/MM/yyyy à HH:mm',
  );

  const message = `Bonjour ${booking.customer_name}, votre RDV "${service.name}" avec ${staff.name} est confirmé le ${dateStr}. À bientôt !`;

  try {
    const credentials = btoa(
      `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
    );
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: env.TWILIO_PHONE_NUMBER,
          To: booking.customer_phone,
          Body: message,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      return {sent: false, error: `Twilio error: ${errorBody}`};
    }

    await supabase
      .from('bookings')
      .update({sms_sent_at: new Date().toISOString()})
      .eq('id', booking.id)
      .is('sms_sent_at', null);

    return {sent: true};
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : 'SMS send failed',
    };
  }
}

export async function sendBookingEmail(
  env: Env,
  supabase: SupabaseServerClient,
  booking: Booking,
  service: Service,
  staff: Staff,
  timezone: string,
  salonName: string,
): Promise<{sent: boolean; error?: string}> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return {sent: false, error: 'Resend not configured'};
  }

  const {data: current} = await supabase
    .from('bookings')
    .select('email_sent_at')
    .eq('id', booking.id)
    .single();

  if (current?.email_sent_at) {
    return {sent: false, error: 'Email already sent'};
  }

  const dateStr = formatInTimeZone(
    new Date(booking.start_time),
    timezone,
    'EEEE d MMMM yyyy à HH:mm',
  );

  const icsContent = generateIcs(booking, service, staff, salonName);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: booking.customer_email,
        subject: `Confirmation RDV — ${service.name}`,
        html: `
          <h1>Réservation confirmée</h1>
          <p>Bonjour ${booking.customer_name},</p>
          <p>Votre rendez-vous est confirmé :</p>
          <ul>
            <li><strong>Prestation :</strong> ${service.name}</li>
            <li><strong>Coiffeur :</strong> ${staff.name}</li>
            <li><strong>Date :</strong> ${dateStr}</li>
          </ul>
          <p>À bientôt chez ${salonName} !</p>
        `,
        attachments: [
          {
            filename: 'rendez-vous.ics',
            content: toBase64(icsContent),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {sent: false, error: `Resend error: ${errorBody}`};
    }

    await supabase
      .from('bookings')
      .update({email_sent_at: new Date().toISOString()})
      .eq('id', booking.id)
      .is('email_sent_at', null);

    return {sent: true};
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : 'Email send failed',
    };
  }
}

function generateIcs(
  booking: Booking,
  service: Service,
  staff: Staff,
  salonName: string,
): string {
  const start = formatIcsDate(new Date(booking.start_time));
  const end = formatIcsDate(new Date(booking.end_time));
  const now = formatIcsDate(new Date());

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Coiffeur//Booking//FR',
    'BEGIN:VEVENT',
    `UID:${booking.id}@coiffeur`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${service.name} — ${salonName}`,
    `DESCRIPTION:Avec ${staff.name}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function toBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export async function notifyBookingConfirmed(
  env: Env,
  supabase: SupabaseServerClient,
  bookingId: string,
) {
  const {data: booking} = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (!booking) return;

  const [{data: service}, {data: staff}, {data: settings}] = await Promise.all([
    supabase.from('services').select('*').eq('id', booking.service_id).single(),
    supabase.from('staff').select('*').eq('id', booking.staff_id).single(),
    supabase.from('salon_settings').select('*').limit(1).single(),
  ]);

  if (!service || !staff || !settings) return;

  await Promise.all([
    sendBookingSms(env, supabase, booking, service, staff, settings.timezone),
    sendBookingEmail(
      env,
      supabase,
      booking,
      service,
      staff,
      settings.timezone,
      settings.name,
    ),
  ]);
}
