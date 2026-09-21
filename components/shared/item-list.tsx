import { cn } from "@/lib/utils";

export function ItemList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "flex flex-col divide-y divide-border/60 overflow-hidden rounded-xl ring-1 ring-border/80",
        className
      )}
      {...props}
    />
  );
}

export function ItemRow({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      className={cn(
        "group/item flex items-center gap-3.5 px-4 py-3 text-sm transition-colors duration-150 hover:bg-surface/60",
        className
      )}
      {...props}
    />
  );
}

export function ListHeading({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-baseline gap-2 text-sm font-semibold tracking-[-0.01em]">
        {title}
        {count !== undefined && (
          <span className="tabular text-xs font-normal text-muted-foreground">{count}</span>
        )}
      </h3>
      {children}
    </div>
  );
}

export function Initials({ nombre, className }: { nombre: string; className?: string }) {
  const partes = nombre.trim().split(/\s+/);
  const texto = `${partes[0]?.[0] ?? ""}${partes[1]?.[0] ?? ""}`.toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-[30%] bg-secondary text-xs font-semibold text-secondary-foreground",
        className
      )}
    >
      {texto}
    </span>
  );
}
