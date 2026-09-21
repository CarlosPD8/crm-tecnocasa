import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-11 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-2xl lg:col-span-7" />
        <Skeleton className="h-80 rounded-2xl lg:col-span-5" />
      </div>
    </div>
  );
}
