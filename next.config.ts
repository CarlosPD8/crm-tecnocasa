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
  experimental: {
    // Uploads go through Server Actions (default limit 1 MB). Photos are
    // compressed in the browser; documents can be up to 4 MB
    // (MAX_BYTES_ARCHIVO), just under Vercel's 4.5 MB request limit.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
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
