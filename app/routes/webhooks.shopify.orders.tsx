import type {Route} from './+types/webhooks.shopify.orders';
import {
  extractBookingIdFromOrder,
  verifyShopifyWebhook,
  type ShopifyOrderPayload,
} from '~/lib/shopify/webhooks.server';
import {notifyBookingConfirmed} from '~/lib/notifications.server';

export async function action({request, context}: Route.ActionArgs) {
  const secret = context.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    return new Response('Webhook secret not configured', {status: 500});
  }

  const body = await request.text();
  const hmac = request.headers.get('X-Shopify-Hmac-Sha256');

  if (!verifyShopifyWebhook(body, hmac, secret)) {
    return new Response('Invalid signature', {status: 401});
  }

  const topic = request.headers.get('X-Shopify-Topic');
  const payload = JSON.parse(body) as ShopifyOrderPayload;

  if (topic === 'orders/paid' || payload.financial_status === 'paid') {
    const bookingId = extractBookingIdFromOrder(payload);
    if (bookingId) {
      const {error} = await context.supabase.rpc('confirm_booking', {
        p_booking_id: bookingId,
        p_shopify_order_id: String(payload.id),
      });

      if (!error) {
        await context.supabase
          .from('bookings')
          .update({shopify_order_id: String(payload.id)})
          .eq('id', bookingId);

        await notifyBookingConfirmed(context.env, context.supabase, bookingId);
      }
    }
  }

  return new Response('OK', {status: 200});
}

export async function loader() {
  return new Response('Method not allowed', {status: 405});
}
