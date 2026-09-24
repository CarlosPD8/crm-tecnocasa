"use client";

import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { TableRow } from "@/components/ui/table";

/**
 * A table row that opens `href` when clicked anywhere on it. The row's main
 * <a> stays a real link (keyboard, Ctrl/⌘-click, middle-click); other links
 * and buttons inside the row keep their own behaviour.
 *
 * This replaces a CSS "stretched link" (an ::after over a `position: relative`
 * <tr>): some mobile browsers ignore relative positioning on table rows, so
 * every row's overlay covered the whole table and any tap opened the last row.
 */
export function FilaEnlace({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent<HTMLTableRowElement>) {
    if (e.defaultPrevented || e.button !== 0) return;
    // Clicks on links, buttons or form controls do their own thing.
    if ((e.target as HTMLElement).closest("a, button, input, select, textarea, label")) return;
    // Selecting text (e.g. to copy a phone number) is not a click.
    if (window.getSelection()?.toString()) return;
    if (e.metaKey || e.ctrlKey) {
      window.open(href, "_blank", "noopener");
      return;
    }
    router.push(href);
  }

  return (
    <TableRow
      onClick={handleClick}
      onMouseEnter={() => router.prefetch(href)}
      className={cn("cursor-pointer has-[[data-row-link]:focus-visible]:bg-accent/60", className)}
    >
      {children}
    </TableRow>
  );
}
