import {describe, expect, it} from 'vitest';
import {availabilityQuerySchema, customerFormSchema} from '~/lib/booking/schema';
import {groupSlotsByDate} from '~/lib/booking/actions.server';
import {calculateDeposit} from '~/lib/shopify/admin.server';
import {extractBookingIdFromOrder} from '~/lib/shopify/webhooks.server';

describe('availabilityQuerySchema', () => {
  it('validates correct query params', () => {
    const result = availabilityQuerySchema.safeParse({
      serviceId: '550e8400-e29b-41d4-a716-446655440000',
      from: '2026-06-01',
      to: '2026-06-14',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format', () => {
    const result = availabilityQuerySchema.safeParse({
      serviceId: '550e8400-e29b-41d4-a716-446655440000',
      from: '01-06-2026',
      to: '2026-06-14',
    });
    expect(result.success).toBe(false);
  });
});

describe('customerFormSchema', () => {
  it('validates customer form', () => {
    const result = customerFormSchema.safeParse({
      firstName: 'Marie',
      lastName: 'Dupont',
      email: 'marie@example.com',
      phone: '0612345678',
      smsConsent: 'on',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.smsConsent).toBe(true);
    }
  });
});

describe('groupSlotsByDate', () => {
  it('groups slots by date in timezone', () => {
    const grouped = groupSlotsByDate(
      [
        {
          staff_id: '1',
          staff_name: 'Sophie',
          start_time: '2026-06-15T07:00:00.000Z',
          end_time: '2026-06-15T07:45:00.000Z',
        },
      ],
      'Europe/Paris',
    );
    expect(Object.keys(grouped).length).toBe(1);
  });
});

describe('calculateDeposit', () => {
  it('calculates 30% deposit', () => {
    expect(calculateDeposit(100, 30)).toBe(30);
  });
});

describe('extractBookingIdFromOrder', () => {
  it('extracts booking id from note', () => {
    const id = extractBookingIdFromOrder({
      id: 1,
      note: 'booking_id:550e8400-e29b-41d4-a716-446655440000',
    });
    expect(id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('extracts booking id from line item property', () => {
    const id = extractBookingIdFromOrder({
      id: 1,
      line_items: [
        {properties: [{name: '_booking_id', value: 'abc-123'}]},
      ],
    });
    expect(id).toBe('abc-123');
  });
});
