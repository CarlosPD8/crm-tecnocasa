import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // 303, not the default 307: 307 makes the browser repeat the POST against
  // /login, which only accepts GET and answers 405 in production.
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
