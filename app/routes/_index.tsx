import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {MockShopNotice} from '~/components/MockShopNotice';
import {ServiceCard} from '~/components/booking/ServiceCard';
import {getActiveServices} from '~/lib/booking/actions.server';
import type {Service} from '~/lib/database.types';
import {bookingLabels} from '~/lib/i18n';
import {homeJsonLd} from '~/lib/seo';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Coiffeur Paris — Salon & Boutique'},
    {
      name: 'description',
      content:
        'Salon de coiffure premium à Paris. Réservez en ligne et achetez vos produits capillaires.',
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const [collectionsResult, services] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY).catch(() => null),
    getActiveServices(context.supabase).catch(() => []),
  ]);

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    featuredCollection: collectionsResult?.collections?.nodes?.[0] ?? null,
    featuredServices: services.slice(0, 3),
  };
}

function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  return {recommendedProducts};
}

const TESTIMONIALS = [
  {
    name: 'Marie L.',
    text: 'Un salon magnifique et une équipe à l’écoute. Ma coloration est parfaite !',
  },
  {
    name: 'Thomas R.',
    text: 'Réservation en ligne ultra simple. Je recommande Lucas pour les coupes homme.',
  },
  {
    name: 'Sophie D.',
    text: 'Produits de qualité et conseils personnalisés. Mon brushing tient toute la semaine.',
  },
];

export default function Homepage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="home">
      {data.isShopLinked ? null : <MockShopNotice />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(homeJsonLd())}}
      />

      <section className="home-hero">
        <div className="home-hero-content">
          <h1>{bookingLabels.heroTitle}</h1>
          <p>{bookingLabels.heroSubtitle}</p>
          <div className="home-hero-cta">
            <Link to="/book" className="button primary">
              {bookingLabels.bookAppointment}
            </Link>
            <Link to="/collections/all" className="button secondary">
              {bookingLabels.shopProducts}
            </Link>
          </div>
        </div>
      </section>

      {data.featuredServices.length > 0 && (
        <section className="home-section">
          <h2>{bookingLabels.featuredServices}</h2>
          <div className="services-grid">
            {data.featuredServices.map((service: Service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
          <Link to="/services" className="link">
            {bookingLabels.viewAllServices}
          </Link>
        </section>
      )}

      <FeaturedCollection collection={data.featuredCollection} />

      <RecommendedProducts products={data.recommendedProducts} />

      <section className="home-section testimonials">
        <h2>{bookingLabels.testimonials}</h2>
        <div className="testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <blockquote key={t.name}>
              <p>&ldquo;{t.text}&rdquo;</p>
              <footer>— {t.name}</footer>
            </blockquote>
          ))}
        </div>
      </section>
    </div>
  );
}

function FeaturedCollection({
  collection,
}: {
  collection: FeaturedCollectionFragment | null;
}) {
  if (!collection) return null;
  const image = collection?.image;
  return (
    <Link
      className="featured-collection"
      to={`/collections/${collection.handle}`}
    >
      {image && (
        <div className="featured-collection-image">
          <Image
            data={image}
            sizes="100vw"
            alt={image.altText || collection.title}
          />
        </div>
      )}
      <h2>{collection.title}</h2>
    </Link>
  );
}

function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <section className="home-section recommended-products">
      <h2>Produits best-sellers</h2>
      <Suspense fallback={<div>Chargement...</div>}>
        <Await resolve={products}>
          {(response) => (
            <div className="recommended-products-grid">
              {response
                ? response.products.nodes.map((product) => (
                    <ProductItem key={product.id} product={product} />
                  ))
                : null}
            </div>
          )}
        </Await>
      </Suspense>
    </section>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;
