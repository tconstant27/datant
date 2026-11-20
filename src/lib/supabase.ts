import { createClient } from '@supabase/supabase-js'

// L'URL et la clé « publishable » sont faites pour être visibles dans le navigateur :
// la sécurité repose sur les règles d'accès (RLS) de la base, pas sur ces valeurs.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://dyuiznxmwdolbgpgpoxy.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_SlK6qKSO27L-Nnb2RBsNsA_c5eEMSTZ'

export const supabase = createClient(url, key, {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true },
})
