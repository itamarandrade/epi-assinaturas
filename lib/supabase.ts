// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

<<<<<<< HEAD
export function createSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
=======
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey)
>>>>>>> e5a8b5a (epis ajustado e pagina de ocorrencias v1)

