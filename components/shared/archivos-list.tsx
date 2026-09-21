import { ArrowUpRight } from "lucide-react";
import { EliminarArchivoButton } from "@/components/shared/eliminar-archivo-button";
import { ItemList, ItemRow } from "@/components/shared/item-list";

export type ArchivoConUrl = {
  id: string;
  nombreOriginal: string;
  tamanioBytes: number;
  url: string;
};

function formatTamanio(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extension(nombre: string) {
  const punto = nombre.lastIndexOf(".");
  return punto > 0 ? nombre.slice(punto + 1, punto + 5).toUpperCase() : "DOC";
}

export function ArchivosList({ archivos }: { archivos: ArchivoConUrl[] }) {
  if (archivos.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Todavía no hay archivos adjuntos.
      </p>
    );
  }

  return (
    <ItemList>
      {archivos.map((archivo) => (
        <ItemRow key={archivo.id} className="py-2.5">
          <span
            aria-hidden
            className="grid h-10 w-8 shrink-0 place-items-center rounded-md bg-secondary font-mono text-[0.6rem] font-semibold text-secondary-foreground ring-1 ring-border"
          >
            {extension(archivo.nombreOriginal)}
          </span>
          <a
            href={archivo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-medium group-hover/item:text-primary">
                <span className="truncate">{archivo.nombreOriginal}</span>
                <ArrowUpRight className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/item:opacity-100" />
              </span>
              <span className="tabular block text-xs text-muted-foreground">
                {formatTamanio(archivo.tamanioBytes)}
              </span>
            </span>
          </a>
          <EliminarArchivoButton archivoId={archivo.id} />
        </ItemRow>
      ))}
    </ItemList>
  );
}
