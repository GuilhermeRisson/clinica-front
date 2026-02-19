"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet, apiPost, CENTRAL_API_BASE } from "@/lib/api";

type TenantDomain = {
  domain: string;
};

type Tenant = {
  id: string;
  name?: string | null;
  domains?: TenantDomain[];
};

type Paginated<T> = {
  data: T[];
};

const TOKEN_KEY = "clinica.master.token";

function normalizeBase(value: string) {
  return value.replace(/\/+$/, "");
}

export default function CentralPage() {
  const [apiBase, setApiBase] = useState(CENTRAL_API_BASE);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("admin@clinica.local");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [companyDocument, setCompanyDocument] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCountry, setAddressCountry] = useState("BR");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [companies, setCompanies] = useState<Tenant[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const baseUrl = useMemo(() => normalizeBase(apiBase), [apiBase]);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY);

    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      void validateSession();
    }
  }, [token, baseUrl]);

  async function validateSession() {
    setLoading(true);
    setStatus(null);

    try {
      await apiGet(`${baseUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await loadCompanies();
    } catch (error) {
      window.localStorage.removeItem(TOKEN_KEY);
      setToken("");
      setCompanies([]);
      setStatus(
        error instanceof Error
          ? `${error.message} - faca login novamente.`
          : "Sessao expirada. Faca login novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    setLoading(true);
    setStatus(null);

    try {
      const response = await apiGet<Paginated<Tenant>>(`${baseUrl}/tenants`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCompanies(response.data ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao carregar empresas.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!email || !password) {
      setStatus("Informe email e senha do master.");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await apiPost<{ token: string }>(`${baseUrl}/auth/login`, {
        email,
        password,
        device_name: "central-panel",
      });

      window.localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setStatus("Conectado com sucesso.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha no login master.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCompany() {
    if (!token) {
      setStatus("Login master obrigatorio para cadastrar empresas.");
      return;
    }

    if (!companyDomain) {
      setStatus("Dominio e obrigatorio.");
      return;
    }

    if (!companyName || !companyDocument || !adminName || !adminEmail || !adminPassword) {
      setStatus("Preencha os campos obrigatorios da empresa e do admin.");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await apiPost(
        `${baseUrl}/tenants`,
        {
          name: companyName,
          document: companyDocument,
          phone: companyPhone || null,
          logo_url: companyLogoUrl || null,
          address: {
            line1: addressLine1 || null,
            line2: addressLine2 || null,
            city: addressCity || null,
            state: addressState || null,
            zip: addressZip || null,
            country: addressCountry || null,
          },
          admin_name: adminName,
          admin_email: adminEmail,
          admin_password: adminPassword,
          domain: companyDomain,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setCompanyName("");
      setCompanyDocument("");
      setCompanyPhone("");
      setCompanyLogoUrl("");
      setAddressLine1("");
      setAddressLine2("");
      setAddressCity("");
      setAddressState("");
      setAddressZip("");
      setAddressCountry("BR");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      setCompanyDomain("");
      setStatus("Empresa cadastrada.");
      await loadCompanies();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao cadastrar empresa.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClearToken() {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setCompanies([]);
    setStatus("Token removido.");
  }

  async function handleLogout() {
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setToken("");
      return;
    }

    try {
      await apiPost(`${baseUrl}/auth/logout`, undefined, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });
    } finally {
      window.localStorage.removeItem(TOKEN_KEY);
      setToken("");
      setCompanies([]);
      setStatus("Sessao encerrada.");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-14 text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/70 to-zinc-950 p-10">
          <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-4">
            <Badge className="w-fit bg-zinc-100 text-zinc-900 hover:bg-zinc-100">Central</Badge>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Cadastro de empresas em um fluxo simples.
            </h1>
            <p className="max-w-2xl text-sm text-zinc-300 md:text-base">
              Conecte o master para liberar o cadastro e gerenciar empresas na base
              central.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span className="rounded-full border border-zinc-700 px-3 py-1">
                Status: {token ? "Conectado" : "Login necessario"}
              </span>
              <span className="rounded-full border border-zinc-700 px-3 py-1">
                Empresas: {companies.length}
              </span>
              {token ? (
                <Button
                  variant="outline"
                  className="border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-800"
                  onClick={handleLogout}
                >
                  Sair
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        {!token ? (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="border-zinc-800 bg-zinc-900/70 text-zinc-50">
              <CardHeader>
                <CardTitle>Acesso master</CardTitle>
                <CardDescription className="text-zinc-400">
                  Obrigatorio para liberar o cadastro de empresas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="central-email">Email master</Label>
                  <Input
                    id="central-email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="central-password">Senha master</Label>
                  <Input
                    id="central-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleLogin}
                    disabled={loading}
                    className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                  >
                    {loading ? "Entrando..." : "Entrar como master"}
                  </Button>
                </div>
                {status ? <p className="text-sm text-zinc-300">{status}</p> : null}
                <p className="text-xs text-zinc-400">
                  A URL da API central vem do front via{" "}
                  <span className="font-medium">NEXT_PUBLIC_CENTRAL_API_BASE</span>.
                </p>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/70 text-zinc-50">
              <CardHeader>
                <CardTitle>Usuario master</CardTitle>
                <CardDescription className="text-zinc-400">
                  O master deve existir no banco central.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-zinc-300">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                  <p className="font-medium text-zinc-100">Criado via seed</p>
                  <p className="text-xs text-zinc-400">
                    Configure as variaveis MASTER_USER_EMAIL e MASTER_USER_PASSWORD e
                    rode o seeder no backend.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                  <p className="font-medium text-zinc-100">Seguranca</p>
                  <p className="text-xs text-zinc-400">
                    Sem login master, o cadastro de empresas fica bloqueado.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-zinc-800 bg-zinc-900/70 text-zinc-50">
                <CardHeader>
                  <CardTitle>Novo cadastro</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Cadastre a empresa completa, dominio e usuario admin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Nome da empresa</Label>
                    <Input
                      id="company-name"
                      placeholder="Clinica Exemplo"
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-document">Documento</Label>
                    <Input
                      id="company-document"
                      placeholder="12.345.678/0001-90"
                      value={companyDocument}
                      onChange={(event) => setCompanyDocument(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-phone">Telefone</Label>
                    <Input
                      id="company-phone"
                      placeholder="11999999999"
                      value={companyPhone}
                      onChange={(event) => setCompanyPhone(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-logo">Logo (URL)</Label>
                    <Input
                      id="company-logo"
                      placeholder="https://cdn.exemplo.com/logo.png"
                      value={companyLogoUrl}
                      onChange={(event) => setCompanyLogoUrl(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address-line1">Endereco</Label>
                    <Input
                      id="address-line1"
                      placeholder="Rua A, 123"
                      value={addressLine1}
                      onChange={(event) => setAddressLine1(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address-line2">Complemento</Label>
                    <Input
                      id="address-line2"
                      placeholder="Sala 10"
                      value={addressLine2}
                      onChange={(event) => setAddressLine2(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="address-city">Cidade</Label>
                      <Input
                        id="address-city"
                        placeholder="Sao Paulo"
                        value={addressCity}
                        onChange={(event) => setAddressCity(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address-state">Estado</Label>
                      <Input
                        id="address-state"
                        placeholder="SP"
                        value={addressState}
                        onChange={(event) => setAddressState(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="address-zip">CEP</Label>
                      <Input
                        id="address-zip"
                        placeholder="01000-000"
                        value={addressZip}
                        onChange={(event) => setAddressZip(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address-country">Pais</Label>
                      <Input
                        id="address-country"
                        placeholder="BR"
                        value={addressCountry}
                        onChange={(event) => setAddressCountry(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="admin-name">Admin nome</Label>
                      <Input
                        id="admin-name"
                        placeholder="Admin Exemplo"
                        value={adminName}
                        onChange={(event) => setAdminName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-email">Admin email</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        placeholder="admin@exemplo.com"
                        value={adminEmail}
                        onChange={(event) => setAdminEmail(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Admin senha</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="senha12345"
                      value={adminPassword}
                      onChange={(event) => setAdminPassword(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-domain">Dominio principal</Label>
                    <Input
                      id="company-domain"
                      placeholder="exemplo.clinica.local"
                      value={companyDomain}
                      onChange={(event) => setCompanyDomain(event.target.value)}
                    />
                    <p className="text-xs text-zinc-400">
                      Use o dominio que a equipe acessara para este tenant.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleCreateCompany}
                      disabled={loading}
                      className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                    >
                      Cadastrar empresa
                    </Button>
                    <Button
                      variant="outline"
                      className="border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-800"
                      onClick={() => {
                        setCompanyName("");
                        setCompanyDocument("");
                        setCompanyPhone("");
                        setCompanyLogoUrl("");
                        setAddressLine1("");
                        setAddressLine2("");
                        setAddressCity("");
                        setAddressState("");
                        setAddressZip("");
                        setAddressCountry("BR");
                        setAdminName("");
                        setAdminEmail("");
                        setAdminPassword("");
                        setCompanyDomain("");
                      }}
                      disabled={loading}
                    >
                      Limpar campos
                    </Button>
                  </div>
                  {status ? <p className="text-sm text-zinc-300">{status}</p> : null}
                </CardContent>
              </Card>

              <Card className="border-zinc-800 bg-zinc-900/70 text-zinc-50">
                <CardHeader>
                  <CardTitle>Checklist rapido</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Garanta que tudo esteja pronto antes de cadastrar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-zinc-300">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                    <p className="font-medium text-zinc-100">1. Conexao master</p>
                    <p className="text-xs text-zinc-400">
                      O token e salvo localmente e nao aparece na tela.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                    <p className="font-medium text-zinc-100">2. Dominio correto</p>
                    <p className="text-xs text-zinc-400">
                      Confira o dominio para evitar erro no acesso tenant.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
                    <p className="font-medium text-zinc-100">3. Revisao final</p>
                    <p className="text-xs text-zinc-400">
                      Atualize a lista para confirmar o cadastro.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              <Button
                variant="outline"
                className="w-fit border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-800"
                onClick={() => setShowAdvanced((prev) => !prev)}
              >
                {showAdvanced ? "Ocultar" : "Mostrar"} configuracoes avancadas
              </Button>

              {showAdvanced ? (
                <Card className="border-zinc-800 bg-zinc-900/70 text-zinc-50">
                  <CardHeader>
                    <CardTitle>Configuracao master</CardTitle>
                    <CardDescription className="text-zinc-400">
                      Use apenas se precisar trocar o token ou URL da API.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="central-api-advanced">URL da API</Label>
                      <Input
                        id="central-api-advanced"
                        value={apiBase}
                        onChange={(event) => setApiBase(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="central-email-advanced">Email master</Label>
                      <Input
                        id="central-email-advanced"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="central-password-advanced">Senha master</Label>
                      <Input
                        id="central-password-advanced"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-3">
                      <Button
                        onClick={handleLogin}
                        disabled={loading}
                        className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                      >
                        Atualizar token
                      </Button>
                      <Button
                        variant="outline"
                        className="border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-800"
                        onClick={handleClearToken}
                        disabled={loading || !token}
                      >
                        Remover token
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <Card className="border-zinc-800 bg-zinc-900/70 text-zinc-50">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Lista de empresas</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Empresas cadastradas na base central.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  className="border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-800"
                  onClick={loadCompanies}
                  disabled={loading}
                >
                  Atualizar lista
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-zinc-400">ID</TableHead>
                      <TableHead className="text-zinc-400">Empresa</TableHead>
                      <TableHead className="text-zinc-400">Dominio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-zinc-400">
                          Nenhuma empresa cadastrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      companies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium text-zinc-100">{company.id}</TableCell>
                          <TableCell>{company.name ?? "-"}</TableCell>
                          <TableCell>{company.domains?.[0]?.domain ?? "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
