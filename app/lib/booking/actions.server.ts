import {format} from 'date-fns';
import {formatInTimeZone} from 'date-fns-tz';
import {fr} from 'date-fns/locale';
import type {SupabaseServerClient} from '~/lib/supabase.server';
import type {AvailableSlot, Booking, Service, Staff} from '~/lib/database.types';
import type {CreateBookingData} from '~/lib/booking/schema';

export async function getActiveServices(
  supabase: SupabaseServerClient,
): Promise<Service[]> {
  const {data, error} = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getServiceByHandle(
  supabase: SupabaseServerClient,
  handle: string,
): Promise<Service | null> {
  const {data, error} = await supabase
    .from('services')
    .select('*')
    .eq('handle', handle)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getActiveStaff(
  supabase: SupabaseServerClient,
): Promise<Staff[]> {
  const {data, error} = await supabase
    .from('staff')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAvailableSlots(
  supabase: SupabaseServerClient,
  params: {
    serviceId: string;
    from: string;
    to: string;
    staffId?: string;
  },
): Promise<AvailableSlot[]> {
  const {data, error} = await supabase.rpc('get_available_slots', {
    p_service_id: params.serviceId,
    p_date_from: params.from,
    p_date_to: params.to,
    p_staff_id: params.staffId ?? null,
  });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPendingBooking(
  supabase: SupabaseServerClient,
  data: CreateBookingData & {shopifyCustomerId?: string},
): Promise<string> {
  const {data: bookingId, error} = await supabase.rpc(
    'create_booking_atomic',
    {
      p_staff_id: data.staffId,
      p_service_id: data.serviceId,
      p_start_time: data.startTime,
      p_customer_email: data.email,
      p_customer_name: `${data.firstName} ${data.lastName}`.trim(),
      p_customer_phone: data.phone,
      p_notes: data.notes ?? null,
      p_shopify_customer_id: data.shopifyCustomerId ?? null,
    },
  );

  if (error) throw new Error(error.message);
  return bookingId;
}

export async function getBookingById(
  supabase: SupabaseServerClient,
  bookingId: string,
): Promise<Booking | null> {
  const {data, error} = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getBookingsByEmail(
  supabase: SupabaseServerClient,
  email: string,
): Promise<Booking[]> {
  const {data, error} = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_email', email)
    .order('start_time', {ascending: false});

  if (error) throw new Error(error.message);
  return data ?? [];
}

export function groupSlotsByDate(
  slots: AvailableSlot[],
  timezone: string,
): Record<string, AvailableSlot[]> {
  return slots.reduce<Record<string, AvailableSlot[]>>((acc, slot) => {
    const dateKey = formatInTimeZone(
      new Date(slot.start_time),
      timezone,
      'yyyy-MM-dd',
    );
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {});
}

export function formatSlotTime(iso: string, timezone: string) {
  return formatInTimeZone(new Date(iso), timezone, 'HH:mm');
}

export function formatBookingDate(iso: string, timezone: string) {
  return formatInTimeZone(new Date(iso), timezone, 'EEEE d MMMM yyyy', {
    locale: fr,
  });
}

export function toDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}
