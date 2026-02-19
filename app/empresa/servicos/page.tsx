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

type Service = {
  id: number;
  name: string;
  session_type?: string | null;
  duration_minutes: number;
  capacity?: number | null;
  price_cents?: number | null;
  description?: string | null;
  active?: boolean | null;
};

type Paginated<T> = { data: T[] };

const TOKEN_KEY = "clinica.tenant.token";

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [capacity, setCapacity] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
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
      apiGet<Paginated<Service>>(`${baseUrl}/services`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([me, res]) => {
        const permissions = me.permissions ?? [];
        const isAdmin = me.role === "admin";
        setCanManage(isAdmin || permissions.includes("*") || permissions.includes("services:manage"));
        setServices(res.data ?? []);
      })
      .catch((error) =>
        setToast({ message: error instanceof Error ? error.message : "Erro.", variant: "error" })
      );
  }, [baseUrl, router]);


  function resetForm() {
    setEditingId(null);
    setName("");
    setSessionType("");
    setDurationMinutes("60");
    setCapacity("");
    setPrice("");
    setDescription("");
    setActive(true);
  }

  async function handleSubmit() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    if (!name || !durationMinutes) {
      setToast({ message: "Nome e duracao sao obrigatorios.", variant: "error" });
      return;
    }

    const parsedPrice = price ? Number(price.replace(",", ".")) : null;
    const payload = {
      name,
      session_type: sessionType || null,
      duration_minutes: Number(durationMinutes),
      capacity: capacity ? Number(capacity) : null,
      price_cents: parsedPrice !== null && !Number.isNaN(parsedPrice) ? Math.round(parsedPrice * 100) : null,
      description: description || null,
      active,
    };

    try {
      if (editingId) {
        await apiPatch(`${baseUrl}/services/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await apiPost(`${baseUrl}/services`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const res = await apiGet<Paginated<Service>>(`${baseUrl}/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices(res.data ?? []);
      resetForm();
      setToast({
        message: editingId ? "Servico atualizado." : "Servico cadastrado.",
        variant: "success",
      });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Erro ao salvar.",
        variant: "error",
      });
    }
  }

  function handleEdit(service: Service) {
    setEditingId(service.id);
    setName(service.name);
    setSessionType(service.session_type ?? "");
    setDurationMinutes(String(service.duration_minutes ?? 60));
    setCapacity(service.capacity ? String(service.capacity) : "");
    setPrice(service.price_cents ? (service.price_cents / 100).toFixed(2).replace(".", ",") : "");
    setDescription(service.description ?? "");
    setActive(service.active ?? true);
  }

  async function handleDelete(id: number) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    try {
      await apiDelete(`${baseUrl}/services/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Erro ao excluir.",
        variant: "error",
      });
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Badge className="w-fit bg-zinc-900 text-zinc-50">Servicos</Badge>
            <h1 className="text-3xl font-semibold text-zinc-900">Cadastro de servicos</h1>
            <p className="text-sm text-zinc-500">Gerencie duracao, preco e descricao.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/empresa">Voltar ao dashboard</Link>
          </Button>
        </header>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>{editingId ? "Editar servico" : "Novo servico"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {!canManage ? (
              <p className="text-sm text-zinc-500 md:col-span-2">
                Seu perfil nao possui permissao para gerenciar servicos.
              </p>
            ) : null}
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de sessao</Label>
              <Input value={sessionType} onChange={(e) => setSessionType(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duracao (min)</Label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Capacidade maxima (turma)</Label>
              <Input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço (R$)</Label>
              <Input
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descricao</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Ativo
            </label>
            <div className="flex items-center gap-3 md:col-span-2">
              <Button onClick={handleSubmit} disabled={!canManage}>
                {editingId ? "Salvar" : "Cadastrar"}
              </Button>
              <Button variant="outline" onClick={resetForm} disabled={!canManage}>
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Lista de servicos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Duracao</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Preco</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>{service.name}</TableCell>
                    <TableCell>{service.duration_minutes} min</TableCell>
                    <TableCell>{service.capacity ?? "-"}</TableCell>
                    <TableCell>
                      {service.price_cents ? `R$ ${(service.price_cents / 100).toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell>{service.active ? "Ativo" : "Inativo"}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" onClick={() => handleEdit(service)} disabled={!canManage}>
                        Editar
                      </Button>
                      <Button variant="outline" onClick={() => setDeleteId(service.id)} disabled={!canManage}>
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
        title="Deseja deletar este servico?"
        description="Essa acao remove o servico e nao pode ser desfeita."
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
