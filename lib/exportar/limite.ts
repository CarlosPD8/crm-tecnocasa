// Vercel caps a function response at 4.5 MB; 10 000 rows stays well below it.
export const LIMITE_EXPORTACION = 10_000;

// A PDF is for reading and printing: past 3 000 rows (a whole zone's street sheet,
// some 150 pages) it's a list to filter.
export const LIMITE_PDF = 3_000;
