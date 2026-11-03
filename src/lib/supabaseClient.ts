import { createClient } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = 'admin' | 'cocinero' | 'mesero' | 'empleado';
export type HRQueryStatus = 'open' | 'answered' | 'closed';
export type PayslipStatus = 'pagada' | 'pendiente';

export type Profile = {
  id: string;
  role: AppRole;
  full_name: string | null;
  created_at: string;
};

export type WellnessResource = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
};

export type HRQuery = {
  id: string;
  user_id: string;
  subject: string;
  status: HRQueryStatus;
  created_at: string;
};

export type HRMessage = {
  id: string;
  query_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

export type MenuItemRow = {
  id: string;
  name: string;
  description: string | null;
  recipe: Json | null;
  allergens: string[];
};

export type MenuForRoleRow = {
  id: string;
  name: string;
  description: string | null;
  allergens: string[];
  recipe: Json | null;
};

export type Payslip = {
  id: string;
  user_id: string;
  period: string;
  gross_cop: number;
  net_cop: number;
  status: PayslipStatus;
  file_path: string | null;
  created_at: string;
};

export type Certificate = {
  id: string;
  user_id: string;
  title: string;
  issued_at: string;
  expires_at: string | null;
  file_path: string | null;
  created_at: string;
};

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, { id: string; role?: AppRole; full_name?: string | null; created_at?: string }>;
      wellness_resources: Table<WellnessResource, { id?: string; title: string; content: string; category?: string; created_at?: string }>;
      hr_queries: Table<HRQuery, { id?: string; user_id?: string; subject: string; status?: HRQueryStatus; created_at?: string }>;
      hr_messages: Table<HRMessage, { id?: string; query_id: string; sender_id?: string; message: string; created_at?: string }>;
      menu_items: Table<MenuItemRow, { id?: string; name: string; description?: string | null; recipe?: Json | null; allergens?: string[] }>;
      payslips: Table<Payslip, { id?: string; user_id: string; period: string; gross_cop: number; net_cop: number; status?: PayslipStatus; file_path?: string | null; created_at?: string }>;
      certificates: Table<Certificate, { id?: string; user_id: string; title: string; issued_at: string; expires_at?: string | null; file_path?: string | null; created_at?: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      get_menu_for_role: { Args: Record<string, never>; Returns: MenuForRoleRow[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});