"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toast } from "@/components/ui/toast";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

type Evaluation = {
  id: number;
  name: string;
  options: string[];
  active?: boolean | null;
};

type Paginated<T> = { data: T[] };

const TOKEN_KEY = "clinica.tenant.token";

export default function EvaluationsPage() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [options, setOptions] = useState("");
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
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
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    Promise.all([
      apiGet<{ role?: string | null; permissions?: string[] | null }>(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      apiGet<Paginated<Evaluation>>(`${baseUrl}/patient-evaluations`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([me, res]) => {
        const permissions = me.permissions ?? [];
        const isAdmin = me.role === "admin";
        setCanManage(isAdmin || permissions.includes("*") || permissions.includes("patients:manage"));
        setEvaluations(res.data ?? []);
      })
      .catch((error) =>
        setToast({ message: error instanceof Error ? error.message : "Erro.", variant: "error" })
      );
  }, [baseUrl, router]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setOptions("");
    setActive(true);
  }

  async function handleSubmit() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    if (!name.trim() || !options.trim()) {
      setToast({ message: "Nome e opcoes sao obrigatorios.", variant: "error" });
      return;
    }

    const payload = {
      name: name.trim(),
      options: options
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      active,
    };

    try {
      setIsSaving(true);
      if (editingId) {
        await apiPatch(`${baseUrl}/patient-evaluations/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await apiPost(`${baseUrl}/patient-evaluations`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const res = await apiGet<Paginated<Evaluation>>(`${baseUrl}/patient-evaluations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvaluations(res.data ?? []);
      resetForm();
      setToast({
        message: editingId ? "Avaliacao atualizada." : "Avaliacao cadastrada.",
        variant: "success",
      });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Erro ao salvar.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(item: Evaluation) {
    setEditingId(item.id);
    setName(item.name);
    setOptions(item.options?.join(", ") ?? "");
    setActive(item.active ?? true);
  }

  async function handleDelete(id: number) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    try {
      setIsDeletingId(id);
      await apiDelete(`${baseUrl}/patient-evaluations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await apiGet<Paginated<Evaluation>>(`${baseUrl}/patient-evaluations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvaluations(res.data ?? []);
      const stillExists = (res.data ?? []).some((item) => item.id === id);
      setToast({
        message: stillExists ? "Nao foi possivel excluir. Tente novamente." : "Avaliacao excluida.",
        variant: stillExists ? "error" : "success",
      });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Erro ao excluir.",
        variant: "error",
      });
    } finally {
      setIsDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Badge className="w-fit bg-zinc-900 text-zinc-50">Avaliacoes</Badge>
            <h1 className="text-3xl font-semibold text-zinc-900">Avaliacoes fisicas</h1>
            <p className="text-sm text-zinc-500">Cadastre os itens e opcoes que serao usados nos pacientes.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/empresa">Voltar ao dashboard</Link>
          </Button>
        </header>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>{editingId ? "Editar avaliacao" : "Nova avaliacao"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {!canManage ? (
              <p className="text-sm text-zinc-500 md:col-span-2">
                Seu perfil nao possui permissao para gerenciar avaliacoes.
              </p>
            ) : null}
            <div className="space-y-2">
              <Label>Nome da avaliacao</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Opcoes (separe por virgula)</Label>
              <Input value={options} onChange={(e) => setOptions(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Ativo
            </label>
            <div className="flex items-center gap-3 md:col-span-2">
              <Button onClick={handleSubmit} disabled={!canManage || isSaving}>
                {isSaving ? "Salvando..." : editingId ? "Salvar" : "Cadastrar"}
              </Button>
              <Button variant="outline" onClick={resetForm} disabled={!canManage}>
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Lista de avaliacoes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Opcoes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.options?.join(", ") ?? "-"}</TableCell>
                    <TableCell>{item.active ? "Ativo" : "Inativo"}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" onClick={() => handleEdit(item)} disabled={!canManage}>
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteId(item.id)}
                        disabled={!canManage || isDeletingId === item.id}
                      >
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
      <ConfirmDialog
        open={deleteId !== null}
        title="Deseja deletar esta avaliacao?"
        description="Essa acao remove a avaliacao da lista e nao pode ser desfeita."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId === null) return;
          const current = deleteId;
          setDeleteId(null);
          handleDelete(current);
        }}
      />
      <Toast
        open={!!toast}
        message={toast?.message ?? ""}
        variant={toast?.variant ?? "success"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
