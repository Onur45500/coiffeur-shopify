function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export async function verifyShopifyWebhook(
  body: string,
  hmacHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!hmacHeader) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body),
  );
  const digest = bytesToBase64(new Uint8Array(signature));

  return timingSafeEqualStrings(digest, hmacHeader);
}

export function extractBookingIdFromOrder(
  payload: ShopifyOrderPayload,
): string | null {
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
