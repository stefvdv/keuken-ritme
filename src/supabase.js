// Verbinding met Supabase. Blijft 'null' tot je de sleutels in .env.local zet,
// zodat de app zonder Supabase gewoon draait (met voorbeelddata in het geheugen).
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
