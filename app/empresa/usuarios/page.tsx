"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { Toast } from "@/components/ui/toast";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

type User = {
  id: number;
  name: string;
  email: string;
  role?: string | null;
  permissions?: string[] | null;
  professional_id?: number | null;
};

type Professional = { id: number; name: string };
type Paginated<T> = { data: T[] };

const TOKEN_KEY = "clinica.tenant.token";

const permissionOptions = [
  "agenda:view_all",
  "agenda:view_own",
  "patients:manage",
  "appointments:manage",
  "professionals:manage",
  "services:manage",
  "users:manage",
];

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const baseUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      const { protocol, hostname } = window.location;
      return `${protocol}//${hostname}/api`;
    }
    return "";
  }, []);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    Promise.all([
      apiGet<Paginated<User>>(`${baseUrl}/users`, { headers: { Authorization: `Bearer ${token}` } }),
      apiGet<Paginated<Professional>>(`${baseUrl}/professionals`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([usersRes, professionalsRes]) => {
        setUsers(usersRes.data ?? []);
        setProfessionals(professionalsRes.data ?? []);
      })
      .catch((error) =>
        setToast({ message: error instanceof Error ? error.message : "Erro.", variant: "error" })
      );
  }, [baseUrl, router]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("staff");
    setPermissions([]);
    setProfessionalId("");
  }

  async function handleSubmit() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    if (!name || !email || (!editingId && !password)) {
      setToast({ message: "Nome, email e senha sao obrigatorios.", variant: "error" });
      return;
    }

    const payload = {
      name,
      email,
      password: password || undefined,
      role,
      permissions,
      professional_id: professionalId ? Number(professionalId) : null,
    };

    try {
      if (editingId) {
        await apiPatch(`${baseUrl}/users/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await apiPost(`${baseUrl}/users`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const res = await apiGet<Paginated<User>>(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data ?? []);
      resetForm();
      setToast({ message: editingId ? "Usuario atualizado." : "Usuario cadastrado.", variant: "success" });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Erro ao salvar.", variant: "error" });
    }
  }

  function handleEdit(user: User) {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setRole(user.role ?? "staff");
    setPermissions(user.permissions ?? []);
    setProfessionalId(user.professional_id ? String(user.professional_id) : "");
  }

  async function handleDelete(id: number) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    try {
      await apiDelete(`${baseUrl}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Erro ao excluir.", variant: "error" });
    }
  }

  function togglePermission(permission: string) {
    setPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Badge className="w-fit bg-zinc-900 text-zinc-50">Usuarios</Badge>
            <h1 className="text-3xl font-semibold text-zinc-900">Gestao de usuarios</h1>
            <p className="text-sm text-zinc-500">
              Defina permissoes e vincule profissionais.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/empresa">Voltar ao dashboard</Link>
          </Button>
        </header>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>{editingId ? "Editar usuario" : "Novo usuario"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Profissional vinculado</Label>
              <SearchSelect
                value={professionalId}
                onChange={setProfessionalId}
                options={professionals.map((professional) => ({
                  value: professional.id,
                  label: professional.name,
                }))}
                searchPlaceholder="Buscar profissional..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Permissoes</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {permissionOptions.map((permission) => (
                  <label key={permission} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={permissions.includes(permission)}
                      onChange={() => togglePermission(permission)}
                    />
                    {permission}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <Button onClick={handleSubmit}>{editingId ? "Salvar" : "Cadastrar"}</Button>
              <Button variant="outline" onClick={resetForm}>
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Lista de usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role ?? "-"}</TableCell>
                    <TableCell>{user.professional_id ?? "-"}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" onClick={() => handleEdit(user)}>
                        Editar
                      </Button>
                      <Button variant="outline" onClick={() => setDeleteId(user.id)}>
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Toast
        open={!!toast}
        message={toast?.message ?? ""}
        variant={toast?.variant ?? "success"}
        onClose={() => setToast(null)}
      />
      <ConfirmDialog
        open={deleteId !== null}
        title="Deseja deletar este usuario?"
        description="Essa acao remove o usuario e nao pode ser desfeita."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId === null) return;
          const current = deleteId;
          setDeleteId(null);
          handleDelete(current);
        }}
      />
    </div>
  );
}
