// -----------------------------------------------------------------------------
// Supabase Client
//
// The one Supabase connection the whole app shares. Every database query,
// storage upload, edge function call and auth action goes through this object.
//
// The URL and publishable key come from .env (VITE_SUPABASE_URL and
// VITE_SUPABASE_PUBLISHABLE_KEY). The key is public by design: what each user
// may read or write is enforced by the database's row-level security policies.
// -----------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
