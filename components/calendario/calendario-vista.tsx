"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// The calendar measures the DOM and depends on the viewer's time zone, so it
// renders only in the browser.
const Calendario = dynamic(() => import("@/components/calendario/calendario"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-72" />
      </div>
      <Skeleton className="h-6 w-96 max-w-full" />
      <Skeleton className="h-[36rem] w-full rounded-2xl" />
    </div>
  ),
});

export function CalendarioVista() {
  return <Calendario />;
}
