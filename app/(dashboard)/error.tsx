"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { RotateCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

// Prisma reports an unreachable database with this code/message; we show a
// friendlier explanation for it, and a generic one for anything else.
function esErrorDeConexion(error: Error) {
  return /08006|Failed to connect to database|Can't reach database/i.test(error.message);
}

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const conexion = esErrorDeConexion(error);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <span className="grid size-12 place-items-center rounded-[30%] bg-card text-muted-foreground shadow-soft ring-1 ring-foreground/6">
        <WifiOff className="size-5" />
      </span>
      <div className="flex max-w-[46ch] flex-col gap-2">
        <h1 className="font-display text-4xl leading-tight">
          {conexion ? "No hay conexión con la base de datos" : "Algo no ha ido bien"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {conexion
            ? "Suele ser un corte momentáneo. Espera unos segundos y vuelve a intentarlo; no se ha perdido ningún dato."
            : "No se pudo cargar esta pantalla. Vuelve a intentarlo y, si se repite, avisa al administrador."}
        </p>
        {error.digest && (
          <p className="font-mono text-[0.7rem] text-muted-foreground/70">Código: {error.digest}</p>
        )}
      </div>
      <Button size="lg" onClick={() => retry()}>
        <RotateCw /> Reintentar
      </Button>
    </div>
  );
}
