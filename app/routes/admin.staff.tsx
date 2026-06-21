import {data, Form, useActionData, useLoaderData} from 'react-router';
import type {Route} from './+types/admin.staff';
import {staffFormSchema} from '~/lib/booking/schema';
import type {Staff} from '~/lib/database.types';

export async function loader({context}: Route.LoaderArgs) {
  const {data: staff} = await context.supabase
    .from('staff')
    .select('*')
    .order('name');
  return {staff: staff ?? []};
}

export async function action({request, context}: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get('intent'));

  if (intent === 'toggle') {
    const id = String(formData.get('id'));
    const isActive = formData.get('isActive') === 'true';
    await context.supabase.from('staff').update({is_active: !isActive}).eq('id', id);
    return data({ok: true});
  }

  if (intent === 'create') {
    const parsed = staffFormSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
      bio: formData.get('bio'),
    });
    if (!parsed.success) {
      return data({error: 'Données invalides'}, {status: 400});
    }
    await context.supabase.from('staff').insert({
      name: parsed.data.name,
      email: parsed.data.email || null,
      bio: parsed.data.bio || null,
    });
  }

  return data({ok: true});
}

export default function AdminStaffPage() {
  const {staff} = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Coiffeurs</h1>
      <Form method="post" className="booking-form admin-form-inline">
        <input type="hidden" name="intent" value="create" />
        <input name="name" placeholder="Nom" required />
        <input name="email" type="email" placeholder="Email" />
        <input name="bio" placeholder="Bio" />
        <button type="submit">Ajouter</button>
      </Form>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Actif</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member: Staff) => (
            <tr key={member.id}>
              <td>{member.name}</td>
              <td>{member.email}</td>
              <td>{member.is_active ? 'Oui' : 'Non'}</td>
              <td>
                <Form method="post">
                  <input type="hidden" name="intent" value="toggle" />
                  <input type="hidden" name="id" value={member.id} />
                  <input
                    type="hidden"
                    name="isActive"
                    value={String(member.is_active)}
                  />
                  <button type="submit">
                    {member.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                </Form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
