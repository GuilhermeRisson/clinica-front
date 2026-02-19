"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";

const TOKEN_KEY = "clinica.tenant.token";

const navItems: Array<{
  label: string;
  href: string;
  permission?: string | string[];
}> = [
  { label: "Dashboard", href: "/empresa" },
  { label: "Pacientes", href: "/empresa/pacientes", permission: "patients:manage" },
  { label: "Avaliacoes", href: "/empresa/avaliacoes", permission: "patients:manage" },
  { label: "Profissionais", href: "/empresa/profissionais", permission: "professionals:manage" },
  { label: "Servicos", href: "/empresa/servicos" },
  { label: "Agenda", href: "/empresa/agenda", permission: ["agenda:view_own", "agenda:view_all"] },
  { label: "Agendamentos", href: "/empresa/agendamentos", permission: "appointments:manage" },
  { label: "Financeiro", href: "/empresa/financeiro", permission: "payments:manage" },
  { label: "Configuracoes", href: "/empresa/configuracoes", permission: "settings:manage" },
  { label: "Usuarios", href: "/empresa/usuarios", permission: "users:manage" },
];

const publicItems = [{ label: "Login", href: "/empresa/login" }];

export default function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ role?: string | null; permissions?: string[] | null } | null>(
    null
  );

  const baseUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      const { protocol, hostname } = window.location;
      return `${protocol}//${hostname}/api`;
    }
    return "";
  }, []);

  useEffect(() => {
    const updateLoginState = () => {
      const token = window.localStorage.getItem(TOKEN_KEY);
      setIsLoggedIn(!!token);
    };

    updateLoginState();
    window.addEventListener("storage", updateLoginState);

    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      return () => window.removeEventListener("storage", updateLoginState);
    }

    apiGet<{ role?: string | null; permissions?: string[] | null }>(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => setUser(data))
      .catch(() => setUser(null));

    return () => window.removeEventListener("storage", updateLoginState);
  }, [baseUrl]);

  useEffect(() => {
    if (!isLoggedIn) {
      setUser(null);
      return;
    }

    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      return;
    }

    apiGet<{ role?: string | null; permissions?: string[] | null }>(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, [baseUrl, isLoggedIn]);

  function hasPermission(permission?: string | string[]) {
    if (!permission) return true;
    if (user?.role === "admin") return true;
    const permissions = user?.permissions ?? [];
    if (permissions.includes("*")) return true;
    if (Array.isArray(permission)) {
      return permission.some((item) => permissions.includes(item));
    }
    return permissions.includes(permission);
  }

  async function handleLogout() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const { protocol, hostname } = window.location;
    const baseUrl = `${protocol}//${hostname}/api`;

    if (token) {
      try {
        await apiPost(`${baseUrl}/auth/logout`, undefined, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } finally {
        window.localStorage.removeItem(TOKEN_KEY);
        setIsLoggedIn(false);
      }
    }

    router.push("/empresa/login");
  }

  if (pathname?.startsWith("/empresa/login")) {
    return <div className="min-h-screen bg-zinc-50 text-zinc-900">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-zinc-800 bg-zinc-950/90 px-6 py-8">
          <div className="mb-10 space-y-3">
            <Badge className="w-fit bg-zinc-100 text-zinc-900 hover:bg-zinc-100">
              Clinica Suite
            </Badge>
            <p className="text-sm text-zinc-400">Painel da clinica</p>
          </div>

          <nav className="space-y-2">
            {isLoggedIn
              ? navItems
                  .filter((item) => !item.permission || hasPermission(item.permission))
                  .map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                          active
                            ? "bg-zinc-900 text-zinc-100"
                            : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })
              : null}
            {!isLoggedIn
              ? publicItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                        active
                          ? "bg-zinc-900 text-zinc-100"
                          : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })
              : null}
          </nav>
        </aside>

        <main className="flex-1 bg-zinc-50 text-zinc-900">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 bg-white px-8 py-6">
            <div>
              <h1 className="text-xl font-semibold">Clinica Essencia</h1>
              <p className="text-sm text-zinc-500">Operacao diaria e cadastros</p>
            </div>
            <div className="flex items-center gap-3">
              {hasPermission("appointments:manage") ? (
                <Button variant="outline" asChild>
                  <Link href="/empresa/agendamentos">Novo agendamento</Link>
                </Button>
              ) : null}
              <Button variant="outline" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </header>

          <div className="px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
