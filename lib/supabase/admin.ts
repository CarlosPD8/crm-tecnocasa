import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses Storage policies and can manage Auth users.
 * Server only, and only after the caller has checked the user may do it
 * (office membership, director role). Never expose the key to the browser.
 */
export function crearClienteAdmin() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clave) throw new Error("Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
