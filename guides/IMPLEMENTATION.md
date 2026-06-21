# Guide d'implémentation pas à pas

Ce document décrit comment mettre en place le projet **Coiffeur** (Hydrogen + Shopify + Supabase) de zéro jusqu'à la mise en production.

**Durée estimée :** 1 à 2 jours pour un environnement de dev fonctionnel, 3 à 5 jours avec paiement, notifications et déploiement.

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Phase 0 — Installation locale](#2-phase-0--installation-locale)
3. [Phase 1 — Shopify (e-commerce)](#3-phase-1--shopify-e-commerce)
4. [Phase 2 — Supabase (réservations)](#4-phase-2--supabase-réservations)
5. [Phase 3 — Brancher Hydrogen ↔ Supabase](#5-phase-3--brancher-hydrogen--supabase)
6. [Phase 4 — Catalogue services & staff](#6-phase-4--catalogue-services--staff)
7. [Phase 5 — Tunnel de réservation](#7-phase-5--tunnel-de-réservation)
8. [Phase 6 — Paiement Shopify](#8-phase-6--paiement-shopify)
9. [Phase 7 — Back-office admin](#9-phase-7--back-office-admin)
10. [Phase 8 — Notifications (SMS & email)](#10-phase-8--notifications-sms--email)
11. [Phase 9 — Déploiement Oxygen](#11-phase-9--déploiement-oxygen)
12. [Phase 10 — Vérifications finales](#12-phase-10--vérifications-finales)
13. [Dépannage](#13-dépannage)

---

## 1. Prérequis

### Comptes & outils

| Outil | Version | Usage |
|-------|---------|-------|
| [Node.js](https://nodejs.org/) | 22 ou 24 | Runtime local |
| [Shopify Partner](https://partners.shopify.com/) | — | Boutique de dev |
| [Supabase](https://supabase.com/) | — | Base de données & auth admin |
| Shopify CLI | inclus via npm | `npm run dev` |
| Git | — | Versionnement |

### Compétences utiles

- Bases SQL / Postgres
- Familiarité avec Shopify Admin
- Lecture de logs Hydrogen / Supabase

---

## 2. Phase 0 — Installation locale

### 2.1 Cloner et installer

```bash
git clone <votre-repo> coiffeur
cd coiffeur
npm install
```

### 2.2 Variables d'environnement

```bash
cp .env.example .env
```

Remplissez `.env` au fur et à mesure des phases. Ne commitez **jamais** ce fichier.

### 2.3 Lier la boutique Shopify

```bash
npx shopify hydrogen link
```

Cette commande configure automatiquement les variables Shopify (`PUBLIC_STORE_DOMAIN`, tokens Storefront, etc.).

### 2.4 Lancer le serveur de dev

```bash
npm run dev
```

Ouvrez `http://localhost:3000`. Vous devez voir la page d'accueil Hydrogen (boutique skeleton).

**Checkpoint :** la boutique s'affiche, le panier fonctionne sur `/collections/all`.

---

## 3. Phase 1 — Shopify (e-commerce)

### 3.1 Produits physiques (boutique)

Dans **Shopify Admin → Produits** :

1. Créez vos produits capillaires (shampoings, soins, etc.)
2. Ajoutez des images et des prix
3. Organisez-les dans une collection **Boutique** ou utilisez **Tous les produits**

### 3.2 Customer Account API (compte client)

Pour `/account` et `/account/bookings` :

1. Suivez la [doc Shopify Customer Account API pour Hydrogen](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/hydrogen)
2. Configurez un domaine public pour le dev local (étapes 1 et 2 du guide)
3. Vérifiez que `/account/login` redirige correctement

### 3.3 Produits services (prestations)

Voir le guide détaillé : [shopify-services-setup.md](./shopify-services-setup.md)

Résumé :

1. Créez un produit par prestation (Coupe Femme, Coloration, etc.)
2. Tag : `services`
3. Désactivez l'expédition
4. Metafields (namespace `booking`) :
   - `duration_minutes` → `45` (entier)
   - `requires_staff` → `true` (booléen)
5. Créez une collection **Services**

### 3.4 App custom & Admin API token

Pour la sync services et les draft orders :

1. **Shopify Admin → Paramètres → Applications et canaux de vente → Développer des applications**
2. Créez une app custom
3. Activez les scopes Admin API :
   - `read_products`
   - `write_draft_orders`
   - `read_orders`
4. Installez l'app sur votre boutique
5. Copiez le **Admin API access token** → `SHOPIFY_ADMIN_API_TOKEN` dans `.env`

**Checkpoint :** produits boutique visibles sur `/collections/all`, produits services tagués `services` dans Shopify Admin.

---

## 4. Phase 2 — Supabase (réservations)

### 4.1 Créer le projet

1. [supabase.com](https://supabase.com/) → **New project**
2. Choisissez la région **EU (Frankfurt ou Paris)** pour le RGPD
3. Notez :
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (secret, serveur uniquement)

### 4.2 Appliquer les migrations

**Option A — Supabase CLI (recommandé)**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <votre-project-ref>
supabase db push
```

**Option B — SQL Editor**

Exécutez dans l'ordre, via **SQL Editor** dans le dashboard Supabase :

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_seed_data.sql`
3. `supabase/migrations/003_customers_index.sql`

### 4.3 Vérifier les tables

Dans **Table Editor**, vous devez voir :

- `salon_settings` (1 ligne seed)
- `staff` (3 coiffeurs seed)
- `services` (8 prestations seed)
- `bookings`, `customers`, `admin_users`

### 4.4 Vérifier les RPC

Dans **SQL Editor** :

```sql
SELECT * FROM get_available_slots(
  (SELECT id FROM services LIMIT 1),
  CURRENT_DATE,
  CURRENT_DATE + 7
);
```

Vous devez obtenir des créneaux horaires.

**Checkpoint :** migrations appliquées, seed visible, RPC `get_available_slots` retourne des lignes.

---

## 5. Phase 3 — Brancher Hydrogen ↔ Supabase

### 5.1 Renseigner `.env`

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 5.2 Redémarrer le serveur

```bash
npm run dev
```

### 5.3 Tester les pages Supabase

| URL | Résultat attendu |
|-----|------------------|
| `/services` | Liste des 8 prestations seed |
| `/services/coupe-femme` | Détail + bouton Réserver |
| `/api/availability?serviceId=<uuid>&from=2026-06-01&to=2026-06-14` | JSON `{ slots: [...] }` |

Pour obtenir un `serviceId` :

```sql
SELECT id, handle FROM services;
```

**Checkpoint :** `/services` affiche les prestations depuis Supabase (pas d'erreur 500).

---

## 6. Phase 4 — Catalogue services & staff

### 6.1 Personnaliser le seed (optionnel)

Modifiez les données dans Supabase **Table Editor** ou via SQL :

- `salon_settings` : nom, fuseau `Europe/Paris`, % acompte
- `staff` : noms, horaires (`working_hours` JSON), photos
- `services` : durées, prix, descriptions

### 6.2 Synchroniser Shopify → Supabase

Une fois `SHOPIFY_ADMIN_API_TOKEN` configuré :

1. Créez d'abord un admin (voir Phase 7)
2. Allez sur `/admin/services`
3. Cliquez **Synchroniser depuis Shopify**

Les produits tagués `services` remplacent/complètent la table `services` avec les IDs Shopify (`shopify_product_id`, `shopify_variant_id`).

### 6.3 Horaires staff (JSON)

Exemple de `working_hours` pour un coiffeur :

```json
{
  "monday": {"start": "09:00", "end": "19:00", "break": "12:00-13:00"},
  "tuesday": {"start": "09:00", "end": "19:00", "break": "12:00-13:00"},
  "wednesday": {"start": "09:00", "end": "19:00", "break": "12:00-13:00"},
  "thursday": {"start": "09:00", "end": "19:00", "break": "12:00-13:00"},
  "friday": {"start": "09:00", "end": "19:00", "break": "12:00-13:00"},
  "saturday": {"start": "09:00", "end": "17:00"},
  "sunday": null
}
```

**Checkpoint :** services visibles sur `/services`, sync Shopify OK si configuré.

---

## 7. Phase 5 — Tunnel de réservation

### 7.1 Parcours utilisateur

Allez sur `/book` et suivez les étapes :

```
Service → Coiffeur (ou "Sans préférence") → Date/Heure → Formulaire → Récapitulatif
```

### 7.2 Tester une réservation (sans paiement)

Si Shopify Admin n'est pas encore configuré, le tunnel crée quand même un booking `pending` dans Supabase et redirige vers `/book/confirmation`.

Vérifiez en base :

```sql
SELECT id, customer_name, status, start_time FROM bookings ORDER BY created_at DESC LIMIT 5;
```

### 7.3 Tester l'anti-double-booking

1. Réservez un créneau
2. Tentez de réserver le même créneau avec un autre nom
3. Vous devez obtenir l'erreur **"Slot no longer available"**

**Checkpoint :** booking `pending` créé en base, créneau bloqué ensuite.

---

## 8. Phase 6 — Paiement Shopify

### 8.1 Flux paiement

```
Récapitulatif → create_booking_atomic() → Draft Order Shopify → Checkout → Webhook orders/paid → booking confirmed
```

**Fallback** (sans Admin API) : le service est ajouté au panier Hydrogen avec attribut `_booking_id`.

### 8.2 Configurer le webhook

Dans **Shopify Admin → Paramètres → Notifications → Webhooks** (ou via app custom) :

| Champ | Valeur |
|-------|--------|
| Event | `Order payment` / `orders/paid` |
| URL | `https://votre-domaine.com/webhooks/shopify/orders` |
| Format | JSON |

Copiez le **secret du webhook** → `SHOPIFY_WEBHOOK_SECRET` dans `.env`.

### 8.3 Tester en local (webhook)

Les webhooks Shopify nécessitent une URL publique. Options :

- Déployer sur Oxygen (preview) et tester là
- Utiliser [ngrok](https://ngrok.com/) ou `shopify app dev` pour tunneliser

### 8.4 Vérifier la confirmation

Après paiement test :

```sql
SELECT id, status, shopify_order_id FROM bookings WHERE id = '<booking_id>';
-- status doit être 'confirmed'
```

**Checkpoint :** paiement test → webhook reçu → booking `confirmed`.

---

## 9. Phase 7 — Back-office admin

### 9.1 Créer un utilisateur Supabase Auth

1. **Supabase Dashboard → Authentication → Users → Add user**
2. Email : `admin@salon.fr`
3. Mot de passe : (choisissez un mot de passe fort)
4. Copiez l'**UUID** de l'utilisateur

### 9.2 Lier l'utilisateur à `admin_users`

```sql
INSERT INTO admin_users (supabase_user_id, email, name)
VALUES ('<uuid-supabase-auth>', 'admin@salon.fr', 'Admin');
```

### 9.3 Se connecter

1. Allez sur `/admin/login`
2. Connectez-vous avec email/mot de passe
3. Vous accédez au dashboard `/admin`

### 9.4 Pages admin disponibles

| Route | Fonction |
|-------|----------|
| `/admin` | Dashboard — RDV du jour, stats |
| `/admin/calendar` | Calendrier (Realtime Supabase) |
| `/admin/bookings` | Liste & annulation RDV |
| `/admin/staff` | Gestion coiffeurs |
| `/admin/services` | Sync Shopify |
| `/admin/settings` | Buffers, acompte, délais |

**Checkpoint :** login admin OK, dashboard affiche les RDV du jour.

---

## 10. Phase 8 — Notifications (SMS & email)

### 10.1 Twilio (SMS)

1. Créez un compte [Twilio](https://www.twilio.com/)
2. Achetez un numéro SMS
3. Renseignez dans `.env` :

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+33...
```

### 10.2 Resend (email)

1. Créez un compte [Resend](https://resend.com/)
2. Vérifiez votre domaine d'envoi
3. Renseignez :

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Salon <noreply@votre-domaine.fr>
```

### 10.3 Déclenchement

Les notifications partent automatiquement quand :

- Le webhook `orders/paid` confirme le booking
- `notifyBookingConfirmed()` est appelé

**Idempotence :** un SMS/email ne part qu'une fois (`sms_sent_at`, `email_sent_at`).

**Checkpoint :** après paiement test, SMS et/ou email reçus (si configurés).

---

## 11. Phase 9 — Déploiement Oxygen

### 11.1 Build local

```bash
npm run build
npm run preview
```

### 11.2 Déployer sur Oxygen

```bash
npx shopify hydrogen deploy
```

### 11.3 Secrets en production

Configurez **toutes** les variables `.env` dans le dashboard Oxygen / Shopify :

- `SESSION_SECRET`
- Variables Shopify (auto si lié)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_SUPABASE_ANON_KEY`
- `SHOPIFY_ADMIN_API_TOKEN`, `SHOPIFY_WEBHOOK_SECRET`
- Twilio / Resend (optionnel)

### 11.4 Mettre à jour le webhook Shopify

Remplacez l'URL locale par l'URL de production :

```
https://votre-boutique.com/webhooks/shopify/orders
```

**Checkpoint :** site accessible en HTTPS, tunnel booking fonctionnel en prod.

---

## 12. Phase 10 — Vérifications finales

### Checklist fonctionnelle

- [ ] Accueil : hero, services phares, produits, témoignages
- [ ] `/services` : liste et détail des prestations
- [ ] `/book` : tunnel complet jusqu'au paiement
- [ ] Double réservation impossible sur le même créneau
- [ ] Webhook confirme le booking après paiement
- [ ] `/account/bookings` : historique RDV (client connecté)
- [ ] `/admin` : gestion staff, calendrier, paramètres
- [ ] SMS/email de confirmation (si configurés)
- [ ] `robots.txt` bloque `/admin`

### Tests automatisés

```bash
npm run test
```

7 tests unitaires (schémas Zod, calcul acompte, extraction booking ID webhook).

### SEO

- JSON-LD `HairSalon` sur l'accueil
- JSON-LD `Service` sur les pages prestations
- Meta `noindex` sur `/admin`

---

## 13. Dépannage

### `SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set`

→ Vérifiez `.env` et redémarrez `npm run dev`.

### `/services` page vide ou erreur 500

→ Migrations non appliquées ou seed manquant. Réexécutez `002_seed_data.sql`.

### Aucun créneau disponible

→ Vérifiez :
- `staff.is_active = true`
- `working_hours` JSON correct pour le jour courant
- `min_notice_hours` dans `salon_settings` (pas de RDV dans les 2 prochaines heures)
- `max_booking_days_ahead` pas dépassé

### `Slot no longer available`

→ Normal si quelqu'un a réservé entre-temps. Choisissez un autre créneau.

### Admin login : "Accès non autorisé"

→ L'utilisateur existe dans Supabase Auth mais pas dans `admin_users`. Exécutez l'`INSERT` SQL.

### Sync Shopify échoue

→ Vérifiez `SHOPIFY_ADMIN_API_TOKEN` et que les produits ont le tag `services`.

### Webhook non reçu

→ URL publique HTTPS requise. Vérifiez `SHOPIFY_WEBHOOK_SECRET` et les logs Oxygen.

### `npm run typecheck` échoue (rolldown binding)

→ Problème d'environnement Node. Essayez :

```bash
rm -rf node_modules package-lock.json
npm install
```

Ou utilisez Node 22.12+ / 24.

---

## Ordre recommandé (résumé)

```
1. npm install + shopify hydrogen link
2. Supabase : migrations + seed
3. .env : Supabase + Shopify
4. Tester /services
5. Tester /book (sans paiement)
6. Admin : créer user + login
7. Shopify : produits services + Admin API token
8. Sync /admin/services
9. Webhook orders/paid
10. Tester paiement complet
11. Notifications Twilio/Resend
12. Deploy Oxygen
```

---

## Ressources

- [README principal](../README.md)
- [Configuration Shopify Services](./shopify-services-setup.md)
- [Hydrogen docs](https://shopify.dev/docs/storefronts/headless/hydrogen)
- [Supabase docs](https://supabase.com/docs)
- Migrations SQL : [`supabase/migrations/`](../supabase/migrations/)
