import {Link} from 'react-router';
import type {Service} from '~/lib/database.types';
import {bookingLabels, formatDuration, formatPrice} from '~/lib/i18n';

export function ServiceCard({service}: {service: Service}) {
  const handle = service.handle ?? service.id;

  return (
    <article className="service-card">
      {service.image_url ? (
        <img src={service.image_url} alt={service.name} className="service-card-image" />
      ) : (
        <div className="service-card-placeholder" aria-hidden="true" />
      )}
      <div className="service-card-body">
        <h3>{service.name}</h3>
        {service.description && <p>{service.description}</p>}
        <div className="service-card-meta">
          <span>{formatDuration(service.duration_minutes)}</span>
          <span>{formatPrice(Number(service.price))}</span>
        </div>
        <Link to={`/services/${handle}`} className="button primary">
          {bookingLabels.bookNow}
        </Link>
      </div>
    </article>
  );
}
