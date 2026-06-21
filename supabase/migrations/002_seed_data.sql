-- Seed data for mono-salon MVP
INSERT INTO salon_settings (name, timezone, primary_color, deposit_percent)
VALUES ('Coiffeur Paris', 'Europe/Paris', '#1a1a1a', 30);

INSERT INTO staff (name, email, bio, photo_url) VALUES
  ('Sophie Martin', 'sophie@coiffeur.local', 'Spécialiste coupes et colorations', null),
  ('Lucas Dubois', 'lucas@coiffeur.local', 'Expert barbier et coupes homme', null),
  ('Emma Laurent', 'emma@coiffeur.local', 'Soins capillaires et brushing', null);

INSERT INTO services (handle, name, duration_minutes, price, description) VALUES
  ('coupe-femme', 'Coupe Femme', 45, 55.00, 'Coupe personnalisée avec shampoing et brushing'),
  ('coupe-homme', 'Coupe Homme', 30, 35.00, 'Coupe classique ou tendance avec finitions'),
  ('coloration', 'Coloration', 120, 95.00, 'Coloration complète avec soin protecteur'),
  ('balayage', 'Balayage', 150, 120.00, 'Balayage naturel mains expertes'),
  ('brushing', 'Brushing', 30, 25.00, 'Brushing professionnel'),
  ('soin-capillaire', 'Soin Capillaire', 45, 40.00, 'Soin profond adapté à votre type de cheveux'),
  ('barbe', 'Taille de Barbe', 20, 20.00, 'Taille et entretien de barbe'),
  ('mariage', 'Coiffure Mariage', 90, 150.00, 'Coiffure événementielle sur mesure');
