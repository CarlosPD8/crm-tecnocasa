// Whole-row links for tables, without JS click handlers: the row's main link
// stretches over the row with a pseudo-element, so Ctrl/⌘-click, middle-click
// and keyboard navigation keep working like any normal link.

/** On the <tr>: positioning context + pointer + highlight while the link has keyboard focus. */
export const FILA_CLICABLE =
  "relative cursor-pointer has-[[data-row-link]:focus-visible]:bg-accent/60";

/** On the row's main <a> (also add `data-row-link`). */
export const ENLACE_FILA =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none";

/** On any other link inside the row, so it stays clickable above the stretched one. */
export const ENLACE_INTERIOR = "relative z-10";
