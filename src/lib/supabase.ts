import { createClient } from '@supabase/supabase-js'

// Las claves "anon" son públicas por diseño (Supabase Row Level Security protege los datos).
// Se incluyen aquí como fallback para que el build de Vercel funcione sin configuración extra.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  'https://ylzscervxtwjpnjahri.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsenNjZXJ2eHR3aWpwbmphaHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODE5MjksImV4cCI6MjA5MTc1NzkyOX0.UggNHpPuqUOHwfdOyuf7-IN9sbzCaRmq7Dh21NT4PKs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey)
