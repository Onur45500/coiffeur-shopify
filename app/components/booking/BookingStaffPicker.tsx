import {Form, Link} from 'react-router';
import type {Staff} from '~/lib/database.types';
import {bookingLabels} from '~/lib/i18n';

export function BookingStaffPicker({
  staff,
  serviceId,
  selectedId,
}: {
  staff: Staff[];
  serviceId: string;
  selectedId?: string;
}) {
  return (
    <div className="booking-step">
      <h2>{bookingLabels.selectStaff}</h2>
      <div className="booking-grid">
        <Form method="get" action="/book">
          <input type="hidden" name="step" value="slot" />
          <input type="hidden" name="serviceId" value={serviceId} />
          <button
            type="submit"
            className={`booking-option ${!selectedId ? 'selected' : ''}`}
          >
            <strong>{bookingLabels.anyStaff}</strong>
          </button>
        </Form>
        {staff.map((member) => (
          <Form key={member.id} method="get" action="/book">
            <input type="hidden" name="step" value="slot" />
            <input type="hidden" name="serviceId" value={serviceId} />
            <input type="hidden" name="staffId" value={member.id} />
            <button
              type="submit"
              className={`booking-option ${selectedId === member.id ? 'selected' : ''}`}
            >
              {member.photo_url && (
                <img src={member.photo_url} alt="" className="staff-avatar" />
              )}
              <strong>{member.name}</strong>
              {member.bio && <span>{member.bio}</span>}
            </button>
          </Form>
        ))}
      </div>
      <Link to={`/book?step=service`} className="link">
        {bookingLabels.back}
      </Link>
    </div>
  );
}
