import { createClient } from '@supabase/supabase-js'

// מפתח publishable ציבורי. ההגנה על הנתונים היא RLS לפי therapist_id = auth.uid().
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ktqmwpbzcnzkhjskqisy.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tipulart-auth' },
})

export const ARTWORK_BUCKET = 'tipul-artworks'
