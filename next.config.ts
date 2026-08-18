import type { NextConfig } from "next";

function getSupabaseHostname() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return undefined;
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  } catch {
    return undefined;
  }
}

const supabaseHostname = getSupabaseHostname();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/inmuebles-fotos/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
