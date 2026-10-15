import type { NextRequest } from "next/server";
import { pdfLista } from "@/lib/pdf/listas";

// PDF of the list with the filters in the query string (any user of the office).
export function GET(request: NextRequest) {
  return pdfLista(request, "inmuebles");
}
