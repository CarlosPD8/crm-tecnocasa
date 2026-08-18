"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ArchivoUpload({
  onUpload,
  label = "Subir",
}: {
  onUpload: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

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
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex items-center gap-2">
      <Input name="file" type="file" required className="max-w-xs" />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Subiendo..." : label}
      </Button>
    </form>
  );
}
