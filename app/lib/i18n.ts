export const bookingLabels = {
  title: 'Réserver un rendez-vous',
  selectService: 'Choisir une prestation',
  selectStaff: 'Choisir un coiffeur',
  anyStaff: 'Sans préférence',
  selectDate: 'Choisir une date',
  selectTime: 'Choisir un horaire',
  customerInfo: 'Vos informations',
  summary: 'Récapitulatif',
  confirm: 'Confirmer et payer',
  firstName: 'Prénom',
  lastName: 'Nom',
  email: 'Email',
  phone: 'Téléphone',
  notes: 'Notes (optionnel)',
  duration: 'Durée',
  price: 'Prix',
  deposit: 'Acompte',
  total: 'Total',
  minutes: 'min',
  noSlots: 'Aucun créneau disponible pour cette date.',
  slotUnavailable: 'Ce créneau n’est plus disponible. Veuillez en choisir un autre.',
  bookingConfirmed: 'Réservation confirmée',
  bookingPending: 'Réservation en attente de paiement',
  back: 'Retour',
  next: 'Suivant',
  bookNow: 'Réserver',
  services: 'Nos prestations',
  viewAllServices: 'Voir toutes les prestations',
  heroTitle: 'Votre salon de coiffure à Paris',
  heroSubtitle:
    'Prenez rendez-vous en ligne et découvrez nos produits capillaires premium.',
  bookAppointment: 'Prendre rendez-vous',
  shopProducts: 'Boutique produits',
  featuredServices: 'Prestations phares',
  testimonials: 'Ce que disent nos clients',
  myBookings: 'Mes rendez-vous',
  upcoming: 'À venir',
  past: 'Passés',
  cancel: 'Annuler',
  admin: 'Administration',
  login: 'Connexion',
  logout: 'Déconnexion',
} as const;

export function formatPrice(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}
