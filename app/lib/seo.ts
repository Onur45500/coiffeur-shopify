import type {Service} from '~/lib/database.types';

export function serviceListJsonLd(services: Service[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: 'Coiffeur Paris',
    url: 'https://coiffeur.local/services',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Prestations',
      itemListElement: services.map((service) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: service.name,
          description: service.description,
        },
        price: Number(service.price),
        priceCurrency: 'EUR',
      })),
    },
  };
}

export function serviceDetailJsonLd(service: Service) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    provider: {
      '@type': 'HairSalon',
      name: 'Coiffeur Paris',
    },
    offers: {
      '@type': 'Offer',
      price: Number(service.price),
      priceCurrency: 'EUR',
    },
  };
}

export function homeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: 'Coiffeur Paris',
    description: 'Salon de coiffure premium à Paris',
    url: 'https://coiffeur.local',
    priceRange: '€€',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Paris',
      addressCountry: 'FR',
    },
  };
}
