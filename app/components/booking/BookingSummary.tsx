import {Form, Link} from 'react-router';
import type {Service, Staff} from '~/lib/database.types';
import {formatBookingDate, formatSlotTime} from '~/lib/booking/format';
import {bookingLabels, formatDuration, formatPrice} from '~/lib/i18n';

export function BookingSummary({
  service,
  staff,
  startTime,
  endTime,
  timezone,
  customerName,
  customerEmail,
  customerPhone,
  depositAmount,
  totalPrice,
}: {
  service: Service;
  staff: Staff;
  startTime: string;
  endTime: string;
  timezone: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  depositAmount: number;
  totalPrice: number;
}) {
  return (
    <div className="booking-step">
      <h2>{bookingLabels.summary}</h2>
      <div className="booking-summary-card">
        <dl>
          <div>
            <dt>Prestation</dt>
            <dd>{service.name}</dd>
          </div>
          <div>
            <dt>Coiffeur</dt>
            <dd>{staff.name}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{formatBookingDate(startTime, timezone)}</dd>
          </div>
          <div>
            <dt>Heure</dt>
            <dd>
              {formatSlotTime(startTime, timezone)} —{' '}
              {formatSlotTime(endTime, timezone)}
            </dd>
          </div>
          <div>
            <dt>Durée</dt>
            <dd>{formatDuration(service.duration_minutes)}</dd>
          </div>
          <div>
            <dt>Client</dt>
            <dd>
              {customerName}
              <br />
              {customerEmail}
              <br />
              {customerPhone}
            </dd>
          </div>
          <div>
            <dt>{bookingLabels.total}</dt>
            <dd>{formatPrice(totalPrice)}</dd>
          </div>
          <div>
            <dt>{bookingLabels.deposit}</dt>
            <dd>{formatPrice(depositAmount)}</dd>
          </div>
        </dl>
      </div>
      <Form method="post">
        <input type="hidden" name="intent" value="confirm" />
        <button type="submit" className="button primary">
          {bookingLabels.confirm}
        </button>
      </Form>
      <Link to="/book?step=customer" className="link">
        {bookingLabels.back}
      </Link>
    </div>
  );
}
