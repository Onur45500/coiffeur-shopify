import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/services.$handle';
import {
  getServiceByHandle,
} from '~/lib/booking/actions.server';
import {bookingLabels, formatDuration, formatPrice} from '~/lib/i18n';
import {serviceDetailJsonLd} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) => {
  if (!data?.service) return [{title: 'Service introuvable'}];
  return [
    {title: `${data.service.name} | Coiffeur`},
    {name: 'description', content: data.service.description ?? data.service.name},
  ];
};

export async function loader({params, context}: Route.LoaderArgs) {
  const service = await getServiceByHandle(context.supabase, params.handle);
  if (!service) {
    throw new Response('Service introuvable', {status: 404});
  }
  return {service};
}

export default function ServiceDetailPage() {
  const {service} = useLoaderData<typeof loader>();

  return (
    <div className="service-detail">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceDetailJsonLd(service)),
        }}
      />
      <div className="service-detail-layout">
        {service.image_url ? (
          <img src={service.image_url} alt={service.name} className="service-detail-image" />
        ) : (
          <div className="service-card-placeholder large" />
        )}
        <div>
          <h1>{service.name}</h1>
          <p className="service-detail-meta">
            {formatDuration(service.duration_minutes)} —{' '}
            {formatPrice(Number(service.price))}
          </p>
          {service.description && <p>{service.description}</p>}
          <Link
            to={`/book?step=staff&serviceId=${service.id}`}
            className="button primary"
          >
            {bookingLabels.bookNow}
          </Link>
        </div>
      </div>
    </div>
  );
}
