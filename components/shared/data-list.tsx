import { cn } from "@/lib/utils";

export function DataList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-6 sm:grid-cols-2", className)}>{children}</dl>
  );
}

export function DataItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <dt className="eyebrow">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}
