import type { NextRequest } from "next/server";
import { pdfHojaBloque } from "@/lib/pdf/listas";

// Street sheet of one block, flat by flat (any user of the office).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return pdfHojaBloque(id);
}
