"use client";

import { useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { UploadCloud, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function ArchivoUpload({
  onUpload,
  label = "Subir",
  accept,
  hint = "PDF, imágenes u otros documentos",
}: {
  onUpload: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  label?: string;
  accept?: string;
  hint?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  function limpiar() {
    formRef.current?.reset();
    setArchivo(null);
  }

  function handleSubmit(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      toast.error("Selecciona un archivo.");
      return;
    }

    startTransition(async () => {
      const result = await onUpload(formData);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo subir el archivo.");
        return;
      }
      toast.success("Archivo subido.");
      limpiar();
    });
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files[0];
    if (!file || !inputRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    inputRef.current.files = dt.files;
    setArchivo(file);
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      <input
        ref={inputRef}
        id={inputId}
        name="file"
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
      />
      {archivo ? (
        <div className="flex items-center gap-3 rounded-xl bg-surface/70 p-3 ring-1 ring-border/80 transition-[opacity,transform] duration-200 ease-out-soft starting:scale-[0.98] starting:opacity-0">
          <span className="grid size-9 shrink-0 place-items-center rounded-[30%] bg-card text-muted-foreground ring-1 ring-border">
            <UploadCloud className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{archivo.name}</span>
            <span className="block text-xs text-muted-foreground">Listo para subir</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Descartar archivo"
            disabled={isPending}
            onClick={limpiar}
          >
            <X />
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Subiendo…" : label}
          </Button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-input bg-surface/40 px-4 py-5 transition-colors duration-200 hover:border-primary/50 hover:bg-accent/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
            arrastrando && "border-primary bg-accent/60"
          )}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-[30%] bg-card text-primary shadow-soft ring-1 ring-foreground/6">
            <UploadCloud className="size-5" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              Arrastra un archivo o <span className="text-primary underline underline-offset-4">elígelo</span>
            </span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </span>
        </label>
      )}
    </form>
  );
}
