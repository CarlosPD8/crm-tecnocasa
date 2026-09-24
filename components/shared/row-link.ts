// Whole-row links for tables: the row itself is a <FilaEnlace> (click anywhere
// opens it) and its main <a> stays a real link for keyboard, Ctrl/⌘-click and
// middle-click. See components/shared/fila-enlace.tsx.

/** On the row's main <a> (also add `data-row-link`): the row shows its focus instead. */
export const ENLACE_FILA = "focus-visible:outline-none";
