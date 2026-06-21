import {Form, Link} from 'react-router';
import type {Service} from '~/lib/database.types';
import {bookingLabels, formatDuration, formatPrice} from '~/lib/i18n';

export function BookingServicePicker({
  services,
  selectedId,
}: {
  services: Service[];
  selectedId?: string;
}) {
  return (
    <div className="booking-step">
      <h2>{bookingLabels.selectService}</h2>
      <div className="booking-grid">
        {services.map((service) => (
          <Form key={service.id} method="get" action="/book">
            <input type="hidden" name="step" value="staff" />
            <input type="hidden" name="serviceId" value={service.id} />
            <button
              type="submit"
              className={`booking-option ${selectedId === service.id ? 'selected' : ''}`}
            >
              <strong>{service.name}</strong>
              <span>
                {formatDuration(service.duration_minutes)} —{' '}
                {formatPrice(Number(service.price))}
              </span>
            </button>
          </Form>
        ))}
      </div>
      <Link to="/services" className="link">
        {bookingLabels.viewAllServices}
      </Link>
    </div>
  );
}
