import { LoginForm } from "@/components/auth/login-form";
import { Typewriter } from "@/components/auth/typewriter";
import { Brand } from "@/components/layout/brand";
import { ThemeMenu } from "@/components/layout/theme-menu";

const FRASES = ["en su sitio.", "al día.", "a una llamada.", "bajo control."];

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel uses the fixed brand colors so it looks the same in light and dark. */}
      <aside className="relative hidden overflow-hidden bg-[#064e3b] text-[#f8e7c9] lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Ambient light, drifting slowly — decorative, stops with reduced motion. */}
        <div
          aria-hidden
          className="ambient-drift absolute -inset-[20%] bg-[radial-gradient(ellipse_at_25%_85%,oklch(0.55_0.09_168/0.55),transparent_45%),radial-gradient(ellipse_at_85%_10%,oklch(0.88_0.06_80/0.16),transparent_40%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-size-[56px_56px] mask-[radial-gradient(ellipse_at_30%_60%,black,transparent_75%)]"
        />

        <span className="enter relative flex items-center gap-2.5 text-lg font-semibold tracking-[-0.03em]">
          <span className="grid size-8 place-items-center rounded-[30%] bg-[#f8e7c9] font-display text-xl text-[#064e3b]">
            p
          </span>
          picaco
        </span>

        <blockquote className="relative">
          <p className="max-w-[12em] font-display text-5xl leading-[1.05] xl:text-6xl">
            <span className="sr-only">Cada cliente, cada llave, en su sitio.</span>
            <span aria-hidden className="enter block [animation-delay:90ms]">
              Cada cliente,
            </span>
            <span aria-hidden className="enter block [animation-delay:170ms]">
              cada llave,
            </span>
            {/* Reserve the line so typing/deleting never shifts the layout. */}
            <em className="enter block min-h-[1.05em] [animation-delay:250ms]">
              <Typewriter phrases={FRASES} />
            </em>
          </p>
        </blockquote>

        <p className="enter relative text-sm opacity-75 [animation-delay:330ms]">
          Seguimiento de clientes, cartera de inmuebles y operaciones de la oficina.
        </p>
      </aside>

      <main className="relative flex flex-col items-center justify-center gap-10 px-6 py-12">
        <ThemeMenu className="enter absolute top-5 right-5 [animation-delay:400ms]" />
        <Brand size="lg" className="enter lg:hidden" />
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-2">
            <p className="enter eyebrow [animation-delay:120ms]">Acceso de agentes</p>
            <h1 className="enter font-display text-4xl leading-tight [animation-delay:180ms]">
              Hola de nuevo
            </h1>
            <p className="enter text-sm text-muted-foreground [animation-delay:240ms]">
              Entra con el email y la contraseña de tu cuenta de la oficina.
            </p>
          </div>
          <div className="enter [animation-delay:300ms]">
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
