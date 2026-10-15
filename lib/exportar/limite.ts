// Vercel caps a function response at 4.5 MB; 10 000 rows stays well below it.
export const LIMITE_EXPORTACION = 10_000;

// A PDF is for reading and printing: past 2 000 rows (some 70 pages) it's a list to filter.
export const LIMITE_PDF = 2_000;
