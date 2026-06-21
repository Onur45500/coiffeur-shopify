import type {Service} from '~/lib/database.types';
import type {Database} from '~/lib/database.types';
import type {SupabaseServerClient} from '~/lib/supabase.server';
import {calculateDeposit} from '~/lib/shopify/pricing';

const ADMIN_API_VERSION = '2025-01';

type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  description: string;
  featuredImage?: {url: string} | null;
  variants: {
    nodes: Array<{
      id: string;
      price: string;
    }>;
  };
  metafields: {
    nodes: Array<{
      namespace: string;
      key: string;
      value: string;
    }>;
  };
};

type ShopifyProductsResponse = {
  data?: {
    products: {
      nodes: ShopifyProduct[];
      pageInfo: {hasNextPage: boolean; endCursor: string | null};
    };
  };
  errors?: Array<{message: string}>;
};

export async function shopifyAdminFetch<T>(
  env: Env,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const domain = env.PUBLIC_STORE_DOMAIN;
  const token = env.SHOPIFY_ADMIN_API_TOKEN;

  if (!domain || !token) {
    throw new Error('Shopify Admin API not configured');
  }

  const response = await fetch(
    `https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query, variables}),
    },
  );

  if (!response.ok) {
    throw new Error(`Shopify Admin API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

const SERVICES_PRODUCTS_QUERY = `#graphql
  query ServicesProducts($cursor: String) {
    products(first: 50, after: $cursor, query: "tag:services") {
      nodes {
        id
        title
        handle
        description
        featuredImage {
          url
        }
        variants(first: 1) {
          nodes {
            id
            price
          }
        }
        metafields(first: 10, namespace: "booking") {
          nodes {
            namespace
            key
            value
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function getMetafieldValue(
  product: ShopifyProduct,
  key: string,
): string | undefined {
  return product.metafields.nodes.find((m) => m.key === key)?.value;
}

export async function syncServicesFromShopify(
  env: Env,
  supabase: SupabaseServerClient,
): Promise<{synced: number; errors: string[]}> {
  const errors: string[] = [];
  let synced = 0;
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const result: ShopifyProductsResponse = await shopifyAdminFetch(
      env,
      SERVICES_PRODUCTS_QUERY,
      {cursor},
    );

    if (result.errors?.length) {
      errors.push(...result.errors.map((e) => e.message));
      break;
    }

    const products = result.data?.products;
    if (!products) break;

    for (const product of products.nodes) {
      const variant = product.variants.nodes[0];
      const durationMinutes = Number(
        getMetafieldValue(product, 'duration_minutes') ?? 30,
      );
      const price = Number(variant?.price ?? 0);

      const serviceRow: Database['public']['Tables']['services']['Insert'] = {
        shopify_product_id: product.id,
        shopify_variant_id: variant?.id ?? null,
        handle: product.handle,
        name: product.title,
        duration_minutes: durationMinutes,
        price,
        description: product.description || null,
        image_url: product.featuredImage?.url ?? null,
        is_active: true,
      };

      const {error} = await supabase.from('services').upsert(serviceRow, {
        onConflict: 'handle',
      });

      if (error) {
        errors.push(`${product.handle}: ${error.message}`);
      } else {
        synced += 1;
      }
    }

    hasNextPage = products.pageInfo.hasNextPage;
    cursor = products.pageInfo.endCursor;
  }

  return {synced, errors};
}

const DRAFT_ORDER_CREATE = `#graphql
  mutation DraftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        invoiceUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type DraftOrderResponse = {
  data?: {
    draftOrderCreate: {
      draftOrder: {id: string; invoiceUrl: string} | null;
      userErrors: Array<{field: string[]; message: string}>;
    };
  };
};

export async function createDraftOrderForBooking(
  env: Env,
  params: {
    bookingId: string;
    variantId: string;
    customerEmail: string;
    customerName: string;
    amount: number;
    note: string;
  },
): Promise<{draftOrderId: string; invoiceUrl: string}> {
  const result = await shopifyAdminFetch<DraftOrderResponse>(
    env,
    DRAFT_ORDER_CREATE,
    {
      input: {
        email: params.customerEmail,
        note: params.note,
        tags: ['booking', `booking_id:${params.bookingId}`],
        lineItems: [
          {
            variantId: params.variantId,
            quantity: 1,
            customAttributes: [
              {key: 'booking_id', value: params.bookingId},
              {key: 'customer_name', value: params.customerName},
            ],
          },
        ],
        appliedDiscount: undefined,
        customAttributes: [
          {key: 'booking_id', value: params.bookingId},
        ],
      },
    },
  );

  const payload = result.data?.draftOrderCreate;
  if (!payload?.draftOrder) {
    const message =
      payload?.userErrors?.map((e) => e.message).join(', ') ||
      'Draft order creation failed';
    throw new Error(message);
  }

  return {
    draftOrderId: payload.draftOrder.id,
    invoiceUrl: payload.draftOrder.invoiceUrl,
  };
}

export async function addBookingToCart(
  cart: {
    addLines: (
      lines: Array<{
        merchandiseId: string;
        quantity: number;
        attributes?: Array<{key: string; value: string}>;
      }>,
    ) => Promise<unknown>;
  },
  params: {
    variantId: string;
    bookingId: string;
    startTime: string;
    serviceName: string;
  },
) {
  return cart.addLines([
    {
      merchandiseId: params.variantId,
      quantity: 1,
      attributes: [
        {key: '_booking_id', value: params.bookingId},
        {key: '_slot_start', value: params.startTime},
        {key: '_service_name', value: params.serviceName},
        {key: '_booking_type', value: 'service'},
      ],
    },
  ]);
}

export {calculateDeposit};

export type {Service};
