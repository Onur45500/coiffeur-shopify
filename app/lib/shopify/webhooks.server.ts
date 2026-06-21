import {createHmac, timingSafeEqual} from 'crypto';

export function verifyShopifyWebhook(
  body: string,
  hmacHeader: string | null,
  secret: string,
): boolean {
  if (!hmacHeader) return false;

  const digest = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

export function extractBookingIdFromOrder(payload: ShopifyOrderPayload): string | null {
  const noteMatch = payload.note?.match(/booking_id:([a-f0-9-]+)/i);
  if (noteMatch) return noteMatch[1];

  const tagMatch = payload.tags?.match(/booking_id:([a-f0-9-]+)/i);
  if (tagMatch) return tagMatch[1];

  const attr = payload.note_attributes?.find(
    (a) => a.name === 'booking_id' || a.name === '_booking_id',
  );
  if (attr?.value) return attr.value;

  const lineAttr = payload.line_items?.[0]?.properties?.find(
    (p) => p.name === 'booking_id' || p.name === '_booking_id',
  );
  if (lineAttr?.value) return lineAttr.value;

  return null;
}

export type ShopifyOrderPayload = {
  id: number;
  note?: string | null;
  tags?: string | null;
  financial_status?: string;
  note_attributes?: Array<{name: string; value: string}>;
  line_items?: Array<{
    properties?: Array<{name: string; value: string}>;
  }>;
};
