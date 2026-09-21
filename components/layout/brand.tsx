import { cn } from "@/lib/utils";

export function Brand({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "grid place-items-center rounded-[30%] bg-primary font-display text-primary-foreground",
          size === "lg" ? "size-10 text-2xl" : "size-7 text-lg"
        )}
      >
        t
      </span>
      <span
        className={cn(
          "font-semibold tracking-[-0.03em] text-foreground",
          size === "lg" ? "text-2xl" : "text-[0.95rem]"
        )}
      >
        tecnocasa
        <span className="ml-1.5 font-normal text-muted-foreground">crm</span>
      </span>
    </span>
  );
}
