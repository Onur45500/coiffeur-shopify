import {Form, Link} from 'react-router';
import {bookingLabels} from '~/lib/i18n';

export function BookingCustomerForm({
  serviceId,
  staffId,
  startTime,
  error,
}: {
  serviceId: string;
  staffId: string;
  startTime: string;
  error?: string;
}) {
  return (
    <div className="booking-step">
      <h2>{bookingLabels.customerInfo}</h2>
      {error && <p className="booking-error">{error}</p>}
      <Form method="post" className="booking-form">
        <input type="hidden" name="intent" value="customer" />
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="staffId" value={staffId} />
        <input type="hidden" name="startTime" value={startTime} />
        <label>
          {bookingLabels.firstName}
          <input name="firstName" type="text" required autoComplete="given-name" />
        </label>
        <label>
          {bookingLabels.lastName}
          <input name="lastName" type="text" required autoComplete="family-name" />
        </label>
        <label>
          {bookingLabels.email}
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          {bookingLabels.phone}
          <input name="phone" type="tel" required autoComplete="tel" />
        </label>
        <label>
          {bookingLabels.notes}
          <textarea name="notes" rows={3} />
        </label>
        <label className="checkbox-label">
          <input name="smsConsent" type="checkbox" />
          J&apos;accepte de recevoir un SMS de confirmation
        </label>
        <button type="submit" className="button primary">
          {bookingLabels.next}
        </button>
      </Form>
      <Link
        to={`/book?step=slot&serviceId=${serviceId}&staffId=${staffId}&startTime=${encodeURIComponent(startTime)}`}
        className="link"
      >
        {bookingLabels.back}
      </Link>
    </div>
  );
}
