"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // Swap every color at once; per-element color transitions would ripple out of sync.
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
