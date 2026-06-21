# Coiffeur — E-commerce + Réservation

Site Hydrogen (React Router 7) pour salon de coiffure avec boutique Shopify et tunnel de réservation custom via Supabase.

## Fonctionnalités

- **Boutique** : produits, panier, checkout Shopify
- **Prestations** : `/services` — catalogue des services
- **Réservation** : `/book` — tunnel multi-étapes (service → coiffeur → créneau → formulaire → paiement)
- **Compte client** : `/account/bookings` — historique des RDV
- **Admin** : `/admin` — dashboard, calendrier, réservations, staff, sync Shopify, paramètres
- **Notifications** : SMS Twilio + email Resend (après paiement confirmé)

## Démarrage rapide

### 1. Variables d'environnement

Copiez `.env.example` vers `.env` et renseignez les valeurs.

### 2. Supabase

```bash
# Appliquer les migrations (via Supabase CLI ou SQL Editor)
supabase db push
# ou exécuter les fichiers dans supabase/migrations/
```

Créez un utilisateur admin :

```sql
INSERT INTO admin_users (supabase_user_id, email, name)
VALUES ('<uuid-supabase-auth>', 'admin@salon.fr', 'Admin');
```

### 3. Shopify Services

Voir [guides/shopify-services-setup.md](guides/shopify-services-setup.md).

### 4. Développement

```bash
npm install
npm run dev
```

### 5. Tests

```bash
npm run test
```

## Architecture

| Couche | Technologie |
|--------|-------------|
| Frontend | Hydrogen + React Router 7 |
| E-commerce | Shopify Storefront API |
| Réservations | Supabase Postgres + RPC |
| Paiement | Shopify Checkout / Draft Orders |
| Admin auth | Supabase Auth |
| Client auth | Shopify Customer Account |

## Routes principales

| Route | Description |
|-------|-------------|
| `/` | Accueil (hero, services, produits, témoignages) |
| `/services` | Liste des prestations |
| `/book` | Tunnel de réservation |
| `/api/availability` | API créneaux disponibles |
| `/webhooks/shopify/orders` | Webhook confirmation paiement |
| `/admin` | Back-office salon |
