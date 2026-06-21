import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/services._index';
import {ServiceCard} from '~/components/booking/ServiceCard';
import {getActiveServices} from '~/lib/booking/actions.server';
import {bookingLabels} from '~/lib/i18n';
import {serviceListJsonLd} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `${bookingLabels.services} | Coiffeur`},
    {
      name: 'description',
      content:
        'Découvrez nos prestations de coiffure : coupes, colorations, soins et plus.',
    },
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  const services = await getActiveServices(context.supabase);
  return {services};
}

export default function ServicesPage() {
  const {services} = useLoaderData<typeof loader>();

  return (
    <div className="services-page">
      <header className="page-header">
        <h1>{bookingLabels.services}</h1>
        <p>Choisissez votre prestation et réservez en ligne.</p>
        <Link to="/book" className="button primary">
          {bookingLabels.bookAppointment}
        </Link>
      </header>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceListJsonLd(services)),
        }}
      />
      <div className="services-grid">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}