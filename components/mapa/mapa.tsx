"use client";

import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type { PropsMapa, PuntoMapa, ZonaMapa } from "@/components/mapa/mapa-leaflet";

/** Leaflet needs `window`: loaded in the browser only, with a placeholder meanwhile. */
export const Mapa = dynamic(() => import("@/components/mapa/mapa-leaflet"), {
  ssr: false,
  loading: () => <Skeleton className={cn("h-80 w-full rounded-xl")} />,
});
