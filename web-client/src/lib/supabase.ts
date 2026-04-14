import { createClient } from '@supabase/supabase-js'

const fallbackUrl = 'https://epcgbfogzqumjybibwiz.supabase.co'
const fallbackAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwY2diZm9nenF1bWp5Ymlid2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MjYxMzQsImV4cCI6MjA5MTIwMjEzNH0.V5QLc-rMb6jsYQHx9IuTvCEszXhZPAMD1mQgh294B7c'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackAnonKey

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

if (import.meta.env.DEV) {
  console.info('[supabase] connected project:', supabaseUrl)
}
