import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded bg-primary text-lg font-black text-primary-foreground">
          T
        </span>
        <span className="text-2xl font-black tracking-tight">tecnocasa</span>
      </div>
      <LoginForm />
    </div>
  );
}
