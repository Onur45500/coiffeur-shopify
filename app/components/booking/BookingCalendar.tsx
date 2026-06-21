import {useMemo, useState} from 'react';
import {Form, Link} from 'react-router';
import {DayPicker} from 'react-day-picker';
import 'react-day-picker/style.css';
import type {AvailableSlot} from '~/lib/database.types';
import {formatSlotTime, groupSlotsByDate} from '~/lib/booking/actions.server';
import {bookingLabels} from '~/lib/i18n';

export function BookingCalendar({
  slots,
  serviceId,
  staffId,
  timezone,
  selectedStartTime,
}: {
  slots: AvailableSlot[];
  serviceId: string;
  staffId?: string;
  timezone: string;
  selectedStartTime?: string;
}) {
  const slotsByDate = useMemo(
    () => groupSlotsByDate(slots, timezone),
    [slots, timezone],
  );

  const availableDates = useMemo(
    () => Object.keys(slotsByDate).map((d) => new Date(d + 'T12:00:00')),
    [slotsByDate],
  );

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (selectedStartTime) {
      return new Date(selectedStartTime);
    }
    return availableDates[0];
  });

  const dateKey = selectedDate
    ? selectedDate.toISOString().slice(0, 10)
    : undefined;
  const daySlots = dateKey ? (slotsByDate[dateKey] ?? []) : [];

  return (
    <div className="booking-step">
      <h2>{bookingLabels.selectDate}</h2>
      <div className="booking-calendar-layout">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={(date) =>
            !availableDates.some(
              (d) => d.toISOString().slice(0, 10) === date.toISOString().slice(0, 10),
            )
          }
          className="booking-day-picker"
        />
        <div className="booking-time-slots">
          <h3>{bookingLabels.selectTime}</h3>
          {daySlots.length === 0 ? (
            <p>{bookingLabels.noSlots}</p>
          ) : (
            <div className="slot-grid">
              {daySlots.map((slot) => (
                <Form key={slot.start_time} method="get" action="/book">
                  <input type="hidden" name="step" value="customer" />
                  <input type="hidden" name="serviceId" value={serviceId} />
                  {staffId && (
                    <input type="hidden" name="staffId" value={staffId} />
                  )}
                  {!staffId && (
                    <input type="hidden" name="staffId" value={slot.staff_id} />
                  )}
                  <input
                    type="hidden"
                    name="startTime"
                    value={slot.start_time}
                  />
                  <button
                    type="submit"
                    className={`slot-button ${
                      selectedStartTime === slot.start_time ? 'selected' : ''
                    }`}
                  >
                    {formatSlotTime(slot.start_time, timezone)}
                    {!staffId && (
                      <small>{slot.staff_name}</small>
                    )}
                  </button>
                </Form>
              ))}
            </div>
          )}
        </div>
      </div>
      <Link
        to={`/book?step=staff&serviceId=${serviceId}${staffId ? `&staffId=${staffId}` : ''}`}
        className="link"
      >
        {bookingLabels.back}
      </Link>
    </div>
  );
}
