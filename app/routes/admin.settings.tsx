import {data, Form, useActionData, useLoaderData} from 'react-router';
import type {Route} from './+types/admin.settings';
import {salonSettingsSchema} from '~/lib/booking/schema';

export async function loader({context}: Route.LoaderArgs) {
  const {data: settings} = await context.supabase
    .from('salon_settings')
    .select('*')
    .limit(1)
    .single();
  return {settings};
}

export async function action({request, context}: Route.ActionArgs) {
  const formData = await request.formData();
  const parsed = salonSettingsSchema.safeParse({
    name: formData.get('name'),
    timezone: formData.get('timezone'),
    bufferBeforeMinutes: formData.get('bufferBeforeMinutes'),
    bufferAfterMinutes: formData.get('bufferAfterMinutes'),
    minNoticeHours: formData.get('minNoticeHours'),
    maxBookingDaysAhead: formData.get('maxBookingDaysAhead'),
    depositPercent: formData.get('depositPercent'),
    slotIntervalMinutes: formData.get('slotIntervalMinutes'),
  });

  if (!parsed.success) {
    return data({error: 'Paramètres invalides'}, {status: 400});
  }

  const {data: existing} = await context.supabase
    .from('salon_settings')
    .select('id')
    .limit(1)
    .single();

  const row = {
    name: parsed.data.name,
    timezone: parsed.data.timezone,
    buffer_before_minutes: parsed.data.bufferBeforeMinutes,
    buffer_after_minutes: parsed.data.bufferAfterMinutes,
    min_notice_hours: parsed.data.minNoticeHours,
    max_booking_days_ahead: parsed.data.maxBookingDaysAhead,
    deposit_percent: parsed.data.depositPercent,
    slot_interval_minutes: parsed.data.slotIntervalMinutes,
  };

  if (existing?.id) {
    await context.supabase.from('salon_settings').update(row).eq('id', existing.id);
  } else {
    await context.supabase.from('salon_settings').insert(row);
  }

  return data({ok: true});
}

export default function AdminSettingsPage() {
  const {settings} = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  if (!settings) {
    return <p>Aucun paramètre salon configuré.</p>;
  }

  return (
    <div>
      <h1>Paramètres salon</h1>
      {actionData && 'ok' in actionData && actionData.ok && (
        <p className="success">Paramètres enregistrés.</p>
      )}
      <Form method="post" className="booking-form">
        <label>
          Nom du salon
          <input name="name" defaultValue={settings.name} required />
        </label>
        <label>
          Fuseau horaire
          <input name="timezone" defaultValue={settings.timezone} required />
        </label>
        <label>
          Buffer avant (min)
          <input
            name="bufferBeforeMinutes"
            type="number"
            defaultValue={settings.buffer_before_minutes}
          />
        </label>
        <label>
          Buffer après (min)
          <input
            name="bufferAfterMinutes"
            type="number"
            defaultValue={settings.buffer_after_minutes}
          />
        </label>
        <label>
          Délai minimum (heures)
          <input
            name="minNoticeHours"
            type="number"
            defaultValue={settings.min_notice_hours}
          />
        </label>
        <label>
          Horizon réservation (jours)
          <input
            name="maxBookingDaysAhead"
            type="number"
            defaultValue={settings.max_booking_days_ahead}
          />
        </label>
        <label>
          Acompte (%)
          <input
            name="depositPercent"
            type="number"
            defaultValue={settings.deposit_percent}
          />
        </label>
        <label>
          Intervalle créneaux (min)
          <input
            name="slotIntervalMinutes"
            type="number"
            defaultValue={settings.slot_interval_minutes}
          />
        </label>
        <button type="submit" className="button primary">
          Enregistrer
        </button>
      </Form>
    </div>
  );
}
