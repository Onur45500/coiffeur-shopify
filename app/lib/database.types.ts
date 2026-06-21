export type Json =
  | string
  | number
  | boolean
  | null
  | {[key: string]: Json | undefined}
  | Json[];

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type WorkingHoursDay = {
  start: string;
  end: string;
  break?: string;
} | null;

export type WorkingHours = {
  monday?: WorkingHoursDay;
  tuesday?: WorkingHoursDay;
  wednesday?: WorkingHoursDay;
  thursday?: WorkingHoursDay;
  friday?: WorkingHoursDay;
  saturday?: WorkingHoursDay;
  sunday?: WorkingHoursDay;
};

type SalonSettingsRow = {
  id: string;
  name: string;
  timezone: string;
  logo_url: string | null;
  primary_color: string | null;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  min_notice_hours: number;
  max_booking_days_ahead: number;
  deposit_percent: number;
  slot_interval_minutes: number;
  created_at: string;
  updated_at: string;
};

type StaffRow = {
  id: string;
  name: string;
  email: string | null;
  photo_url: string | null;
  bio: string | null;
  working_hours: WorkingHours;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ServiceRow = {
  id: string;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  handle: string | null;
  name: string;
  duration_minutes: number;
  price: number;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CustomerRow = {
  id: string;
  shopify_customer_id: string | null;
  supabase_user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  preferences: Json;
  created_at: string;
  updated_at: string;
};

type BookingRow = {
  id: string;
  staff_id: string;
  service_id: string;
  customer_id: string | null;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  shopify_order_id: string | null;
  shopify_draft_order_id: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  notes: string | null;
  cancellation_reason: string | null;
  sms_sent_at: string | null;
  email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

type StaffTimeOffRow = {
  id: string;
  staff_id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
};

type AdminUserRow = {
  id: string;
  supabase_user_id: string;
  email: string;
  name: string | null;
  created_at: string;
};

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      salon_settings: TableDef<SalonSettingsRow>;
      staff: TableDef<StaffRow>;
      staff_time_off: TableDef<StaffTimeOffRow>;
      services: TableDef<ServiceRow>;
      customers: TableDef<CustomerRow>;
      bookings: TableDef<BookingRow>;
      admin_users: TableDef<AdminUserRow>;
    };
    Views: Record<string, never>;
    Functions: {
      get_available_slots: {
        Args: {
          p_service_id: string;
          p_date_from: string;
          p_date_to: string;
          p_staff_id?: string | null;
        };
        Returns: Array<{
          staff_id: string;
          staff_name: string;
          start_time: string;
          end_time: string;
        }>;
      };
      create_booking_atomic: {
        Args: {
          p_staff_id: string;
          p_service_id: string;
          p_start_time: string;
          p_customer_email: string;
          p_customer_name: string;
          p_customer_phone?: string | null;
          p_notes?: string | null;
          p_shopify_customer_id?: string | null;
        };
        Returns: string;
      };
      cancel_booking: {
        Args: {
          p_booking_id: string;
          p_reason?: string | null;
        };
        Returns: undefined;
      };
      confirm_booking: {
        Args: {
          p_booking_id: string;
          p_shopify_order_id?: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      booking_status: BookingStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type SalonSettings = SalonSettingsRow;
export type Staff = StaffRow;
export type Service = ServiceRow;
export type Booking = BookingRow;
export type Customer = CustomerRow;
export type AvailableSlot =
  Database['public']['Functions']['get_available_slots']['Returns'][number];
