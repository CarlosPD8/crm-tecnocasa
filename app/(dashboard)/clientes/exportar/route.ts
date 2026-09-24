import type { NextRequest } from "next/server";
import { exportar } from "@/lib/exportar/listas";

// Excel of the list with the filters in the query string (director only).
export function GET(request: NextRequest) {
  return exportar(request, "clientes");
}
