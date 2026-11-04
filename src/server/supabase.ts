import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://esyfiidahljvwjqcvskg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'sb_publishable_l5cOYgVLDVI2ZgJ3D8O_Yw_7tVanuWj';

let supabaseServerClient: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (!supabaseServerClient) {
    supabaseServerClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseServerClient;
}

export interface AppointmentRecord {
  id?: number | string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  time_slot: string;
  service_type?: string;
  message?: string;
  status?: string;
  user_id?: string | null;
  created_at?: string;
}

export async function syncPaymentToSupabase(payment: {
  userId: number;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  status: string;
  createdAt?: Date;
}) {
  const client = getSupabaseServer();
  try {
    const { data, error } = await client
      .from('payments')
      .upsert([
        {
          user_id: payment.userId,
          amount: payment.amount,
          payment_method: payment.paymentMethod,
          transaction_id: payment.transactionId,
          status: payment.status,
          created_at: (payment.createdAt || new Date()).toISOString(),
        },
      ], { onConflict: 'transaction_id' })
      .select();

    if (error) {
      console.warn('Supabase payments sync warning:', error.message);
    }
    return data;
  } catch (err: any) {
    console.warn('Supabase payments sync error:', err.message);
  }
}

export async function syncUserBalanceToSupabase(userId: number, newBalance: number) {
  const client = getSupabaseServer();
  try {
    const { error } = await client
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (error) {
      console.warn('Supabase user balance sync warning:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase user balance sync error:', err.message);
  }
}

