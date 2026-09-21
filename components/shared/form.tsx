import * as React from "react";
import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/** Two-column block: title + description on the left, fields on the right. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-x-10 gap-y-5 border-t border-border/70 py-8 first:border-t-0 first:pt-2 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-[-0.01em]">{title}</h2>
        {description && (
          <p className="max-w-[34ch] text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor} className="flex items-baseline gap-1.5">
        {label}
        {optional && <span className="text-xs font-normal text-muted-foreground">Opcional</span>}
      </Label>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
          <CircleAlert className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function AffixInput({
  suffix,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { suffix: string }) {
  return (
    <div className="relative">
      <Input className={cn("tabular pr-10", className)} {...props} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
        {suffix}
      </span>
    </div>
  );
}

/** Segmented choice built on native radios, so arrow-key navigation works for free. */
export function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  className,
  "aria-label": ariaLabel,
}: {
  name: string;
  value: T | undefined;
  onChange: (value: T) => void;
  options: Record<T, string>;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "flex w-full flex-wrap gap-1 rounded-lg border border-input bg-surface/70 p-1",
        className
      )}
    >
      {(Object.entries(options) as [T, string][]).map(([optionValue, label]) => (
        <label
          key={optionValue}
          className="relative flex-1 cursor-pointer rounded-md px-3 py-1.5 text-center text-sm font-medium whitespace-nowrap text-muted-foreground transition-[background-color,color,box-shadow] duration-200 hover:text-foreground has-checked:bg-card has-checked:text-foreground has-checked:shadow-soft has-checked:ring-1 has-checked:ring-foreground/6 has-focus-visible:ring-3 has-focus-visible:ring-ring/40"
        >
          <input
            type="radio"
            name={name}
            value={optionValue}
            checked={value === optionValue}
            onChange={() => onChange(optionValue)}
            className="sr-only"
          />
          {label}
        </label>
      ))}
    </div>
  );
}

/** Form surface without overflow clipping, so the sticky action bar works. */
export function FormShell({
  className,
  ...props
}: React.ComponentProps<"form">) {
  return (
    <form
      className={cn(
        "rise rounded-2xl bg-card px-5 pt-4 shadow-soft ring-1 ring-foreground/6 [animation-delay:60ms] sm:px-8",
        className
      )}
      {...props}
    />
  );
}

export function FormActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 flex items-center justify-end gap-2 rounded-b-2xl border-t border-border/70 bg-card/85 px-5 py-4 backdrop-blur-md sm:-mx-8 sm:px-8">
      {children}
    </div>
  );
}
