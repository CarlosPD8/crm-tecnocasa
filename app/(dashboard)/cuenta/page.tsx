import { getContexto } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { DataItem, DataList } from "@/components/shared/data-list";
import { PasswordForm } from "@/components/cuenta/password-form";

const ROL_LABELS = { DIRECTOR: "Director", ASESOR: "Asesor" } as const;

export default async function CuentaPage() {
  const { usuario, oficina } = await getContexto();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Mi cuenta" title={usuario.nombre} description={`Oficina ${oficina.nombre}`} />

      <section className="rise rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/6 sm:p-8">
        <DataList>
          <DataItem label="Email">{usuario.email}</DataItem>
          <DataItem label="Rol">{ROL_LABELS[usuario.rol]}</DataItem>
          <DataItem label="Oficina">{oficina.nombre}</DataItem>
        </DataList>
      </section>

      <section className="rise flex flex-col gap-6 rounded-2xl bg-card p-5 shadow-soft ring-1 ring-foreground/6 [animation-delay:60ms] sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold tracking-[-0.01em]">Cambiar contraseña</h2>
          <p className="max-w-[46ch] text-sm text-muted-foreground">
            Para cambiarla necesitas la actual. Si la has olvidado, pide al director de tu oficina que te
            ponga una temporal.
          </p>
        </div>
        <div className="max-w-sm">
          <PasswordForm modo="cambio" />
        </div>
      </section>
    </div>
  );
}
