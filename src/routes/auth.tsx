import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import logo from "@/assets/magic-moments-logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { createInitialAdmin, getSetupState } from "@/lib/admin.functions";
import { usernameToEmail } from "@/lib/permissions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Magic Moments" },
      { name: "description", content: "Acesso restrito à equipe da Magic Moments." },
      { property: "og:title", content: "Entrar — Magic Moments" },
      { property: "og:description", content: "Acesso restrito à equipe da Magic Moments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const setupFn = useServerFn(getSetupState);
  const createAdmin = useServerFn(createInitialAdmin);

  const setup = useQuery({ queryKey: ["setup-state"], queryFn: () => setupFn({}) });

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const signIn = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      });
      if (error) throw new Error("Login ou senha inválidos.");
    },
    onSuccess: () => navigate({ to: "/dashboard", replace: true }),
    onError: (error: Error) => toast.error(error.message),
  });

  const setupAdmin = useMutation({
    mutationFn: async () => {
      await createAdmin({ data: { name, username, password } });
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username),
        password,
      });
      if (error) throw new Error("Administrador criado. Faça login para continuar.");
    },
    onSuccess: () => {
      toast.success("Administrador criado com sucesso.");
      navigate({ to: "/dashboard", replace: true });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const needsSetup = setup.data?.needsSetup === true;
  const pending = signIn.isPending || setupAdmin.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logo} alt="Magic Moments" width={72} height={72} className="size-16 object-contain" />
          <h1 className="mt-4 font-display text-3xl text-foreground">Magic Moments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Painel interno da equipe</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">
              {needsSetup ? "Criar administrador" : "Entrar"}
            </CardTitle>
            <CardDescription>
              {needsSetup
                ? "Nenhum usuário cadastrado ainda. Crie o primeiro acesso de administrador."
                : "Use seu login e senha fornecidos pela administração."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (needsSetup) setupAdmin.mutate();
                else signIn.mutate();
              }}
            >
              {needsSetup && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Login</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending || setup.isLoading}>
                {pending ? "Aguarde..." : needsSetup ? "Criar e entrar" : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
