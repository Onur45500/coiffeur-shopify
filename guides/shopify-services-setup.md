# Configuration Shopify — Services de réservation

## 1. Créer les produits services

1. Dans Shopify Admin, créez des produits pour chaque prestation (Coupe Femme, Coloration, etc.)
2. Taggez chaque produit avec `services`
3. Désactivez l'expédition (produit numérique / service)
4. Ajoutez les metafields produit (namespace `booking`) :
   - `duration_minutes` (entier) — ex. `45`
   - `requires_staff` (booléen) — `true`

## 2. Collection

Créez une collection **Services** et ajoutez-y les produits tagués `services`.

## 3. Synchronisation Supabase

1. Configurez `SHOPIFY_ADMIN_API_TOKEN` dans vos variables d'environnement Oxygen
2. Connectez-vous à `/admin/login`
3. Allez dans **Prestations** → **Synchroniser depuis Shopify**

Les services Shopify seront upsertés dans la table `services` Supabase avec les IDs produit/variant.

## 4. Webhook commandes

Enregistrez un webhook Shopify :

- **URL** : `https://votre-domaine.com/webhooks/shopify/orders`
- **Topic** : `orders/paid`
- **Format** : JSON

Configurez `SHOPIFY_WEBHOOK_SECRET` pour la vérification HMAC.

## 5. Admin Supabase

Créez un utilisateur dans Supabase Auth, puis insérez-le dans `admin_users` :

```sql
INSERT INTO admin_users (supabase_user_id, email, name)
VALUES ('<uuid-auth-user>', 'admin@salon.fr', 'Admin');
```
