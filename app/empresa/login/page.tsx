"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost, TENANT_API_BASE } from "@/lib/api";

const TOKEN_KEY = "clinica.tenant.token";

export default function EmpresaLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const baseUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      const { protocol, hostname } = window.location;
      const isCentralHost = hostname.startsWith("central.");

      if (isCentralHost) {
        return "";
      }

      return `${protocol}//${hostname}/api`;
    }

    const normalized = TENANT_API_BASE?.replace(/\/+$/, "");
    return normalized ?? "";
  }, []);

  async function handleLogin() {
    if (!baseUrl) {
      setStatus("Acesse pelo domínio do tenant (ex: empresa1.clinica.local).");
      return;
    }

    if (!email || !password) {
      setStatus("Informe email e senha.");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await apiPost<{ token: string }>(`${baseUrl}/auth/login`, {
        email,
        password,
        device_name: "tenant-panel",
      });

      window.localStorage.setItem(TOKEN_KEY, response.token);
      setStatus("Login realizado.");
      router.push("/empresa");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-16 text-zinc-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <Badge className="w-fit bg-zinc-100 text-zinc-900 hover:bg-zinc-100">
            Area do paciente
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Acesse sua conta para acompanhar consultas.
          </h1>
          <p className="max-w-2xl text-sm text-zinc-300 md:text-base">
            Consulte seus agendamentos, historico e mensagens da equipe da clinica.
          </p>
        </header>

        <Card className="border-zinc-800 bg-zinc-900/70 text-zinc-50">
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription className="text-zinc-400">
              Use seus dados cadastrados para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-email">Email</Label>
              <Input
                id="tenant-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-password">Senha</Label>
              <Input
                id="tenant-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button
              className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar na clinica"}
            </Button>
            {status ? <p className="text-sm text-zinc-300">{status}</p> : null}
            <p className="text-xs text-zinc-400">
              Nao possui acesso? Fale com a recepcao para criar sua conta.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
