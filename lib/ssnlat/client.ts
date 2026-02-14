import { createClient } from "@supabase/supabase-js";

export const ssnlat = createClient(
  process.env.SSNLAT_SUPABASE_URL!,
  process.env.SSNLAT_SUPABASE_ANON_KEY!
);
