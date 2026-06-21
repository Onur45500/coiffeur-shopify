import {data, Form, useActionData, useLoaderData} from 'react-router';
import type {Route} from './+types/admin.services';
import {syncServicesFromShopify} from '~/lib/shopify/admin.server';
import type {Service} from '~/lib/database.types';

export async function loader({context}: Route.LoaderArgs) {
  const {data: services} = await context.supabase
    .from('services')
    .select('*')
    .order('name');
  return {services: services ?? []};
}

export async function action({context}: Route.ActionArgs) {
  try {
    const result = await syncServicesFromShopify(context.env, context.supabase);
    return data(result);
  } catch (err) {
    return data(
      {
        synced: 0,
        errors: [err instanceof Error ? err.message : 'Sync failed'],
      },
      {status: 500},
    );
  }
}

export default function AdminServicesPage() {
  const {services} = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div>
      <h1>Prestations</h1>
      <p>
        Synchronisez les produits Shopify tagués <code>services</code> avec
        metafields <code>booking.duration_minutes</code>.
      </p>
      <Form method="post">
        <button type="submit" className="button primary">
          Synchroniser depuis Shopify
        </button>
      </Form>
      {actionData && (
        <p>
          {actionData.synced} service(s) synchronisé(s)
          {actionData.errors?.length > 0 &&
            ` — Erreurs: ${actionData.errors.join(', ')}`}
        </p>
      )}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Durée</th>
            <th>Prix</th>
            <th>Shopify</th>
            <th>Actif</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service: Service) => (
            <tr key={service.id}>
              <td>{service.name}</td>
              <td>{service.duration_minutes} min</td>
              <td>{Number(service.price).toFixed(2)} €</td>
              <td>{service.shopify_product_id ? 'Lié' : '—'}</td>
              <td>{service.is_active ? 'Oui' : 'Non'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
