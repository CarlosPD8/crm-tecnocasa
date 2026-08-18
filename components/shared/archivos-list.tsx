import { FileText } from "lucide-react";
import { EliminarArchivoButton } from "@/components/shared/eliminar-archivo-button";

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

export function ArchivosList({ archivos }: { archivos: ArchivoConUrl[] }) {
  if (archivos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay archivos adjuntos.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {archivos.map((archivo) => (
        <li
          key={archivo.id}
          className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"
        >
          <a
            href={archivo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center gap-2 hover:underline"
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{archivo.nombreOriginal}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              ({formatTamanio(archivo.tamanioBytes)})
            </span>
          </a>
          <EliminarArchivoButton archivoId={archivo.id} />
        </li>
      ))}
    </ul>
  );
}
