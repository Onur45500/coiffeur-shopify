import {format} from 'date-fns';
import {formatInTimeZone} from 'date-fns-tz';
import {fr} from 'date-fns/locale';
import type {AvailableSlot} from '~/lib/database.types';

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
