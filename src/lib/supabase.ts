import { createClient } from '@supabase/supabase-js'

// Las claves "anon" son públicas por diseño (Supabase Row Level Security protege los datos).
// Se incluyen aquí como fallback para que el build de Vercel funcione sin configuración extra.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  'https://xheuzxcdzwfhwebwdeps.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoZXV6eGNkendmaHdlYndkZXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTA4NzgsImV4cCI6MjA5MTc2Njg3OH0.FwsqE9Lo8wkmxOgpynbeqrHIvdMH8-A0TuopcauU7U4'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey)
