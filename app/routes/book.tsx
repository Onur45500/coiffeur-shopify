import {
  data,
  redirect,
  useLoaderData,
  useActionData,
} from 'react-router';
import type {Route} from './+types/book';
import {BookingServicePicker} from '~/components/booking/BookingServicePicker';
import {BookingStaffPicker} from '~/components/booking/BookingStaffPicker';
import {BookingCalendar} from '~/components/booking/BookingCalendar';
import {BookingCustomerForm} from '~/components/booking/BookingCustomerForm';
import {BookingSummary} from '~/components/booking/BookingSummary';
import {
  createPendingBooking,
  getActiveServices,
  getActiveStaff,
  getAvailableSlots,
  getBookingById,
} from '~/lib/booking/actions.server';
import {customerFormSchema} from '~/lib/booking/schema';
import type {Service, Staff} from '~/lib/database.types';
import {bookingLabels} from '~/lib/i18n';
import {
  addBookingToCart,
  calculateDeposit,
  createDraftOrderForBooking,
} from '~/lib/shopify/admin.server';
import {addDays, format} from 'date-fns';

const BOOKING_SESSION_KEY = 'bookingDraft';

type BookingDraft = {
  serviceId: string;
  staffId: string;
  startTime: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes?: string;
};

export const meta: Route.MetaFunction = () => {
  return [{title: `${bookingLabels.title} | Coiffeur`}];
};

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const step = url.searchParams.get('step') ?? 'service';
  const serviceId = url.searchParams.get('serviceId') ?? undefined;
  const staffId = url.searchParams.get('staffId') ?? undefined;
  const startTime = url.searchParams.get('startTime') ?? undefined;
  const bookingId = url.searchParams.get('bookingId') ?? undefined;

  const [services, staffList, settingsResult] = await Promise.all([
    getActiveServices(context.supabase),
    getActiveStaff(context.supabase),
    context.supabase.from('salon_settings').select('*').limit(1).single(),
  ]);

  const timezone = settingsResult.data?.timezone ?? 'Europe/Paris';
  const depositPercent = settingsResult.data?.deposit_percent ?? 30;

  let slots: Awaited<ReturnType<typeof getAvailableSlots>> = [];
  if (step === 'slot' && serviceId) {
    const from = format(new Date(), 'yyyy-MM-dd');
    const to = format(addDays(new Date(), 14), 'yyyy-MM-dd');
    slots = await getAvailableSlots(context.supabase, {
      serviceId,
      from,
      to,
      staffId,
    });
  }

  const draft = context.session.get(BOOKING_SESSION_KEY) as
    | BookingDraft
    | undefined;

  let confirmedBooking = null;
  if (bookingId) {
    confirmedBooking = await getBookingById(context.supabase, bookingId);
  }

  const effectiveStaffId =
    staffId ?? (step === 'summary' ? draft?.staffId : undefined);
  const effectiveServiceId =
    serviceId ?? (step === 'summary' ? draft?.serviceId : undefined);
  const effectiveStartTime =
    startTime ?? (step === 'summary' ? draft?.startTime : undefined);

  const service = effectiveServiceId
    ? services.find((s: Service) => s.id === effectiveServiceId)
    : undefined;

  const staffMember = effectiveStaffId
    ? staffList.find((s: Staff) => s.id === effectiveStaffId)
    : undefined;

  return {
    step,
    services,
    staffList,
    serviceId,
    staffId,
    startTime,
    slots,
    timezone,
    depositPercent,
    draft,
    service,
    staffMember,
    confirmedBooking,
    settings: settingsResult.data,
  };
}

export async function action({request, context}: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? '');

  if (intent === 'customer') {
    const parsed = customerFormSchema.safeParse({
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      notes: formData.get('notes') ?? undefined,
      smsConsent: formData.get('smsConsent'),
    });

    if (!parsed.success) {
      return data(
        {error: parsed.error.flatten().fieldErrors},
        {status: 400},
      );
    }

    const draft: BookingDraft = {
      serviceId: String(formData.get('serviceId')),
      staffId: String(formData.get('staffId')),
      startTime: String(formData.get('startTime')),
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      notes: parsed.data.notes,
    };

    context.session.set(BOOKING_SESSION_KEY, draft);
    return redirect('/book?step=summary');
  }

  if (intent === 'confirm') {
    const draft = context.session.get(BOOKING_SESSION_KEY) as
      | BookingDraft
      | undefined;

    if (!draft) {
      return redirect('/book?step=service');
    }

    try {
      const bookingId = await createPendingBooking(context.supabase, {
        staffId: draft.staffId,
        serviceId: draft.serviceId,
        startTime: draft.startTime,
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        phone: draft.phone,
        notes: draft.notes,
      });

      const {data: service} = await context.supabase
        .from('services')
        .select('*')
        .eq('id', draft.serviceId)
        .single();

      const {data: settings} = await context.supabase
        .from('salon_settings')
        .select('*')
        .limit(1)
        .single();

      const depositPercent = settings?.deposit_percent ?? 30;

      // Try draft order if Shopify Admin configured and variant exists
      if (
        context.env.SHOPIFY_ADMIN_API_TOKEN &&
        service?.shopify_variant_id
      ) {
        const deposit = calculateDeposit(
          Number(service.price),
          depositPercent,
        );
        const {draftOrderId, invoiceUrl} = await createDraftOrderForBooking(
          context.env,
          {
            bookingId,
            variantId: service.shopify_variant_id,
            customerEmail: draft.email,
            customerName: `${draft.firstName} ${draft.lastName}`,
            amount: deposit,
            note: `booking_id:${bookingId}`,
          },
        );

        await context.supabase
          .from('bookings')
          .update({shopify_draft_order_id: draftOrderId})
          .eq('id', bookingId);

        context.session.unset(BOOKING_SESSION_KEY);
        return redirect(invoiceUrl);
      }

      // Fallback: add to cart
      if (service?.shopify_variant_id) {
        await addBookingToCart(context.cart, {
          variantId: service.shopify_variant_id,
          bookingId,
          startTime: draft.startTime,
          serviceName: service.name,
        });
        context.session.unset(BOOKING_SESSION_KEY);
        return redirect('/cart');
      }

      context.session.unset(BOOKING_SESSION_KEY);
      return redirect(`/book/confirmation?bookingId=${bookingId}`);
    } catch (err) {
      return data(
        {
          error:
            err instanceof Error
              ? err.message
              : bookingLabels.slotUnavailable,
        },
        {status: 400},
      );
    }
  }

  return data({error: 'Action inconnue'}, {status: 400});
}

export default function BookPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const {
    step,
    services,
    staffList,
    serviceId,
    staffId,
    startTime,
    slots,
    timezone,
    depositPercent,
    draft,
    service,
    staffMember,
    confirmedBooking,
  } = loaderData;

  if (confirmedBooking) {
    return (
      <div className="booking-page">
        <h1>{bookingLabels.bookingConfirmed}</h1>
        <p>Réservation #{confirmedBooking.id}</p>
        <p>Statut : {confirmedBooking.status}</p>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <h1>{bookingLabels.title}</h1>
      <div className="booking-steps">
        {['service', 'staff', 'slot', 'customer', 'summary'].map((s, i) => (
          <span
            key={s}
            className={`booking-step-indicator ${step === s ? 'active' : ''}`}
          >
            {i + 1}
          </span>
        ))}
      </div>

      {step === 'service' && (
        <BookingServicePicker services={services} selectedId={serviceId} />
      )}

      {step === 'staff' && serviceId && (
        <BookingStaffPicker
          staff={staffList}
          serviceId={serviceId}
          selectedId={staffId}
        />
      )}

      {step === 'slot' && serviceId && (
        <BookingCalendar
          slots={slots}
          serviceId={serviceId}
          staffId={staffId}
          timezone={timezone}
          selectedStartTime={startTime}
        />
      )}

      {step === 'customer' && serviceId && staffId && startTime && (
        <BookingCustomerForm
          serviceId={serviceId}
          staffId={staffId}
          startTime={startTime}
          error={
            typeof actionData?.error === 'string'
              ? actionData.error
              : undefined
          }
        />
      )}

      {step === 'summary' && draft && service && staffMember && (
        <BookingSummary
          service={service}
          staff={staffMember}
          startTime={draft.startTime}
          endTime={
            new Date(
              new Date(draft.startTime).getTime() +
                service.duration_minutes * 60_000,
            ).toISOString()
          }
          timezone={timezone}
          customerName={`${draft.firstName} ${draft.lastName}`}
          customerEmail={draft.email}
          customerPhone={draft.phone}
          depositAmount={calculateDeposit(
            Number(service.price),
            depositPercent,
          )}
          totalPrice={Number(service.price)}
        />
      )}
    </div>
  );
}
