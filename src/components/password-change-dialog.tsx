import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { changeOwnPassword } from "@/lib/account-password.functions";
import { passwordChangeSchema } from "@/lib/account-password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function PasswordChangeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const changePassword = useServerFn(changeOwnPassword);
  const [values, setValues] = useState({ currentPassword: "", password: "", confirmation: "" });
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const checked = passwordChangeSchema.safeParse(values);
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? "Confira os campos.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await changePassword({ data: checked.data });
      toast.success("Sua senha foi alterada.");
      setValues({ currentPassword: "", password: "", confirmation: "" });
      setVisible({});
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar a senha.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (!next) {
          setValues({ currentPassword: "", password: "", confirmation: "" });
          setError("");
          setVisible({});
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>Alteração da senha da sua própria conta.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {(
            [
              { key: "currentPassword", label: "Senha atual", autoComplete: "current-password" },
              { key: "password", label: "Nova senha", autoComplete: "new-password" },
              { key: "confirmation", label: "Confirmar nova senha", autoComplete: "new-password" },
            ] as const
          ).map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`account-${field.key}`}>{field.label}</Label>
              <div className="relative">
                <Input
                  id={`account-${field.key}`}
                  type={visible[field.key] ? "text" : "password"}
                  autoComplete={field.autoComplete}
                  value={values[field.key]}
                  disabled={busy}
                  className="pr-12"
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  aria-label={`${visible[field.key] ? "Ocultar" : "Mostrar"} ${field.label.toLowerCase()}`}
                  title={`${visible[field.key] ? "Ocultar" : "Mostrar"} ${field.label.toLowerCase()}`}
                  onClick={() =>
                    setVisible((current) => ({ ...current, [field.key]: !current[field.key] }))
                  }
                >
                  {visible[field.key] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Nova senha com pelo menos 6 caracteres.</p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              {busy ? "Alterando…" : "Salvar nova senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
