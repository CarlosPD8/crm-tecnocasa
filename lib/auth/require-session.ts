import { createClient } from "@/lib/supabase/server";

// getClaims() verifies the JWT locally against the project's ES256 public key
// (cached), instead of a round trip to Supabase Auth on every server action.
export async function requireSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    throw new Error("No autorizado");
  }

  return data.claims;
}
