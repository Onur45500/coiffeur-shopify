-- Coiffeur Booking — mono-salon schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Salon settings (single row)
CREATE TABLE salon_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL DEFAULT 'Salon Coiffeur',
  timezone text NOT NULL DEFAULT 'Europe/Paris',
  logo_url text,
  primary_color text DEFAULT '#1a1a1a',
  buffer_before_minutes integer NOT NULL DEFAULT 0,
  buffer_after_minutes integer NOT NULL DEFAULT 15,
  min_notice_hours integer NOT NULL DEFAULT 2,
  max_booking_days_ahead integer NOT NULL DEFAULT 60,
  deposit_percent integer NOT NULL DEFAULT 30,
  slot_interval_minutes integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Staff
CREATE TABLE staff (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text UNIQUE,
  photo_url text,
  bio text,
  working_hours jsonb NOT NULL DEFAULT '{
    "monday": {"start": "09:00", "end": "19:00", "break": "12:00-13:00"},
    "tuesday": {"start": "09:00", "end": "19:00", "break": "12:00-13:00"},
    "wednesday": {"start": "09:00", "end": "19:00", "break": "12:00-13:00"},
    "thursday": {"start": "09:00", "end": "19:00", "break": "12:00-13:00"},
    "friday": {"start": "09:00", "end": "19:00", "break": "12:00-13:00"},
    "saturday": {"start": "09:00", "end": "17:00"},
    "sunday": null
  }'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Staff time off
CREATE TABLE staff_time_off (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_time_off_valid_range CHECK (end_time > start_time)
);

-- Services (synced with Shopify)
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopify_product_id text,
  shopify_variant_id text,
  handle text UNIQUE,
  name text NOT NULL,
  duration_minutes integer NOT NULL,
  price decimal(10, 2) NOT NULL,
  description text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Customers mapping
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopify_customer_id text UNIQUE,
  supabase_user_id uuid,
  email text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bookings
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid NOT NULL REFERENCES staff(id),
  service_id uuid NOT NULL REFERENCES services(id),
  customer_id uuid REFERENCES customers(id),
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  shopify_order_id text,
  shopify_draft_order_id text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  notes text,
  cancellation_reason text,
  sms_sent_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_valid_range CHECK (end_time > start_time)
);

-- Prevent overlapping bookings per staff (pending + confirmed)
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status IN ('pending', 'confirmed'));

CREATE INDEX idx_bookings_staff_time ON bookings (staff_id, start_time);
CREATE INDEX idx_bookings_customer_email ON bookings (customer_email);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_services_handle ON services (handle);
CREATE INDEX idx_staff_time_off_staff ON staff_time_off (staff_id, start_time, end_time);

-- Admin users (Supabase Auth linkage)
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_user_id uuid NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER salon_settings_updated_at BEFORE UPDATE ON salon_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Helper: day name from date in timezone
CREATE OR REPLACE FUNCTION day_key_for_date(p_date date, p_tz text)
RETURNS text AS $$
DECLARE
  dow integer;
BEGIN
  dow := EXTRACT(ISODOW FROM (p_date::timestamp AT TIME ZONE p_tz));
  RETURN CASE dow
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
    WHEN 7 THEN 'sunday'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if a time range overlaps with existing bookings or time off
CREATE OR REPLACE FUNCTION is_slot_available(
  p_staff_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS boolean AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.staff_id = p_staff_id
      AND b.status IN ('pending', 'confirmed')
      AND tstzrange(b.start_time, b.end_time, '[)') && tstzrange(p_start, p_end, '[)')
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM staff_time_off t
    WHERE t.staff_id = p_staff_id
      AND tstzrange(t.start_time, t.end_time, '[)') && tstzrange(p_start, p_end, '[)')
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get available slots
CREATE OR REPLACE FUNCTION get_available_slots(
  p_service_id uuid,
  p_date_from date,
  p_date_to date,
  p_staff_id uuid DEFAULT NULL
)
RETURNS TABLE (
  staff_id uuid,
  staff_name text,
  start_time timestamptz,
  end_time timestamptz
) AS $$
DECLARE
  v_settings salon_settings%ROWTYPE;
  v_service services%ROWTYPE;
  v_staff staff%ROWTYPE;
  v_date date;
  v_day_key text;
  v_day_hours jsonb;
  v_start_time time;
  v_end_time time;
  v_break text;
  v_break_start time;
  v_break_end time;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_slot_end_with_buffer timestamptz;
  v_min_start timestamptz;
  v_max_date date;
  v_interval interval;
BEGIN
  SELECT * INTO v_settings FROM salon_settings LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Salon settings not configured';
  END IF;

  SELECT * INTO v_service FROM services WHERE id = p_service_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  v_min_start := now() + (v_settings.min_notice_hours || ' hours')::interval;
  v_max_date := (now() AT TIME ZONE v_settings.timezone)::date + v_settings.max_booking_days_ahead;
  v_interval := (v_settings.slot_interval_minutes || ' minutes')::interval;

  IF p_date_to > v_max_date THEN
    p_date_to := v_max_date;
  END IF;

  FOR v_staff IN
    SELECT s.* FROM staff s
    WHERE s.is_active = true
      AND (p_staff_id IS NULL OR s.id = p_staff_id)
  LOOP
    v_date := p_date_from;
    WHILE v_date <= p_date_to LOOP
      v_day_key := day_key_for_date(v_date, v_settings.timezone);
      v_day_hours := v_staff.working_hours -> v_day_key;

      IF v_day_hours IS NOT NULL AND v_day_hours != 'null'::jsonb THEN
        v_start_time := (v_day_hours ->> 'start')::time;
        v_end_time := (v_day_hours ->> 'end')::time;
        v_break := v_day_hours ->> 'break';

        IF v_break IS NOT NULL AND v_break != '' THEN
          v_break_start := split_part(v_break, '-', 1)::time;
          v_break_end := split_part(v_break, '-', 2)::time;
        END IF;

        v_slot_start := (v_date::text || ' ' || v_start_time::text)::timestamp AT TIME ZONE v_settings.timezone;

        WHILE v_slot_start < (v_date::text || ' ' || v_end_time::text)::timestamp AT TIME ZONE v_settings.timezone LOOP
          v_slot_end := v_slot_start + (v_service.duration_minutes || ' minutes')::interval;
          v_slot_end_with_buffer := v_slot_end + (v_settings.buffer_after_minutes || ' minutes')::interval;

          -- Must fit within working hours including buffer
          IF v_slot_end_with_buffer <= (v_date::text || ' ' || v_end_time::text)::timestamp AT TIME ZONE v_settings.timezone
             AND v_slot_start >= v_min_start
             AND is_slot_available(v_staff.id, v_slot_start - (v_settings.buffer_before_minutes || ' minutes')::interval, v_slot_end_with_buffer)
          THEN
            -- Skip break overlap
            IF v_break IS NULL OR v_break = '' OR NOT (
              tstzrange(v_slot_start, v_slot_end, '[)') &&
              tstzrange(
                (v_date::text || ' ' || v_break_start::text)::timestamp AT TIME ZONE v_settings.timezone,
                (v_date::text || ' ' || v_break_end::text)::timestamp AT TIME ZONE v_settings.timezone,
                '[)'
              )
            ) THEN
              staff_id := v_staff.id;
              staff_name := v_staff.name;
              start_time := v_slot_start;
              end_time := v_slot_end;
              RETURN NEXT;
            END IF;
          END IF;

          v_slot_start := v_slot_start + v_interval;
        END LOOP;
      END IF;

      v_date := v_date + 1;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Atomic booking creation
CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_staff_id uuid,
  p_service_id uuid,
  p_start_time timestamptz,
  p_customer_email text,
  p_customer_name text,
  p_customer_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_shopify_customer_id text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_service services%ROWTYPE;
  v_settings salon_settings%ROWTYPE;
  v_end_time timestamptz;
  v_booking_id uuid;
  v_customer_id uuid;
  v_slot_end_with_buffer timestamptz;
BEGIN
  SELECT * INTO v_service FROM services WHERE id = p_service_id AND is_active = true FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  SELECT * INTO v_settings FROM salon_settings LIMIT 1;
  v_end_time := p_start_time + (v_service.duration_minutes || ' minutes')::interval;
  v_slot_end_with_buffer := v_end_time + (v_settings.buffer_after_minutes || ' minutes')::interval;

  -- Lock staff row to serialize bookings
  PERFORM 1 FROM staff WHERE id = p_staff_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff not found';
  END IF;

  IF NOT is_slot_available(
    p_staff_id,
    p_start_time - (v_settings.buffer_before_minutes || ' minutes')::interval,
    v_slot_end_with_buffer
  ) THEN
    RAISE EXCEPTION 'Slot no longer available';
  END IF;

  -- Upsert customer
  INSERT INTO customers (email, phone, shopify_customer_id, first_name)
  VALUES (
    p_customer_email,
    p_customer_phone,
    p_shopify_customer_id,
    split_part(p_customer_name, ' ', 1)
  )
  ON CONFLICT (shopify_customer_id) WHERE shopify_customer_id IS NOT NULL
  DO UPDATE SET
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, customers.phone),
    updated_at = now()
  RETURNING id INTO v_customer_id;

  IF v_customer_id IS NULL THEN
    SELECT id INTO v_customer_id FROM customers WHERE email = p_customer_email LIMIT 1;
    IF v_customer_id IS NULL THEN
      INSERT INTO customers (email, phone, first_name)
      VALUES (p_customer_email, p_customer_phone, split_part(p_customer_name, ' ', 1))
      RETURNING id INTO v_customer_id;
    END IF;
  END IF;

  INSERT INTO bookings (
    staff_id, service_id, customer_id,
    customer_email, customer_name, customer_phone,
    start_time, end_time, status, notes
  ) VALUES (
    p_staff_id, p_service_id, v_customer_id,
    p_customer_email, p_customer_name, p_customer_phone,
    p_start_time, v_end_time, 'pending', p_notes
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancel booking
CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE bookings
  SET status = 'cancelled',
      cancellation_reason = p_reason,
      updated_at = now()
  WHERE id = p_booking_id
    AND status IN ('pending', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or cannot be cancelled';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Confirm booking (called by webhook)
CREATE OR REPLACE FUNCTION confirm_booking(
  p_booking_id uuid,
  p_shopify_order_id text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE bookings
  SET status = 'confirmed',
      shopify_order_id = COALESCE(p_shopify_order_id, shopify_order_id),
      updated_at = now()
  WHERE id = p_booking_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or not pending';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE salon_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY salon_settings_public_read ON salon_settings FOR SELECT USING (true);
CREATE POLICY staff_public_read ON staff FOR SELECT USING (is_active = true);
CREATE POLICY services_public_read ON services FOR SELECT USING (is_active = true);

-- Admin full access (authenticated Supabase users in admin_users)
CREATE POLICY admin_salon_settings ON salon_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE supabase_user_id = auth.uid()));
CREATE POLICY admin_staff ON staff FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE supabase_user_id = auth.uid()));
CREATE POLICY admin_staff_time_off ON staff_time_off FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE supabase_user_id = auth.uid()));
CREATE POLICY admin_services ON services FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE supabase_user_id = auth.uid()));
CREATE POLICY admin_customers ON customers FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE supabase_user_id = auth.uid()));
CREATE POLICY admin_bookings ON bookings FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE supabase_user_id = auth.uid()));
CREATE POLICY admin_users_read ON admin_users FOR SELECT
  USING (supabase_user_id = auth.uid());

-- Grant execute on RPCs to anon and authenticated
GRANT EXECUTE ON FUNCTION get_available_slots TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_booking_atomic TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_booking TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_booking TO service_role;
GRANT EXECUTE ON FUNCTION is_slot_available TO anon, authenticated;
