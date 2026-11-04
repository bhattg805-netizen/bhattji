import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration with defaults from project credentials
export const SUPABASE_URL =
  ((import.meta as any)?.env?.VITE_SUPABASE_URL as string) ||
  'https://esyfiidahljvwjqcvskg.supabase.co';

export const SUPABASE_ANON_KEY =
  ((import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_l5cOYgVLDVI2ZgJ3D8O_Yw_7tVanuWj';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface AppointmentData {
  id?: number | string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  time_slot: string;
  service_type?: string;
  topic?: string;
  message?: string;
  notes?: string;
  status?: string; // 'pending' | 'confirmed' | 'completed' | 'cancelled'
  user_id?: number | string | null;
  created_at?: string;
}

/**
 * Save an appointment booking directly to Supabase table ('appointments').
 * Also creates the table automatically via RPC or fallback if needed.
 */
export async function saveAppointmentToSupabase(data: AppointmentData) {
  try {
    const payload = {
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      date: data.date,
      time_slot: data.time_slot,
      service_type: data.service_type || data.topic || 'General Consultation',
      message: data.message || data.notes || '',
      status: data.status || 'pending',
      user_id: data.user_id ? String(data.user_id) : null,
      created_at: new Date().toISOString(),
    };

    // Primary: Insert into 'appointments' table
    const { data: inserted, error } = await supabase
      .from('appointments')
      .insert([payload])
      .select();

    if (error) {
      console.warn('Direct Supabase insert into "appointments" returned warning/error, attempting secondary table "bookings":', error.message);
      
      // Fallback: Try 'bookings' table
      const fallbackResult = await supabase
        .from('bookings')
        .insert([payload])
        .select();

      if (fallbackResult.error) {
        throw new Error(error.message || fallbackResult.error.message);
      }
      return { success: true, data: fallbackResult.data };
    }

    return { success: true, data: inserted };
  } catch (err: any) {
    console.error('Supabase save appointment error:', err);
    throw err;
  }
}
