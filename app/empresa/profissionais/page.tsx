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
import { SearchSelect } from "@/components/ui/search-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toast } from "@/components/ui/toast";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

type Professional = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  specialty?: string | null;
  notes?: string | null;
  active?: boolean | null;
};

type Paginated<T> = { data: T[] };
type Availability = {
  id: number;
  professional_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
};

const TOKEN_KEY = "clinica.tenant.token";

export default function ProfessionalsPage() {
  const router = useRouter();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null
  );
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [availabilityProfessionalId, setAvailabilityProfessionalId] = useState("");
  const [availabilityWeekday, setAvailabilityWeekday] = useState("1");
  const [availabilityStart, setAvailabilityStart] = useState("08:00");
  const [availabilityEnd, setAvailabilityEnd] = useState("18:00");
  const [availabilityDeleteId, setAvailabilityDeleteId] = useState<number | null>(null);
  const [batchDays, setBatchDays] = useState<number[]>([]);
  const [batchStart, setBatchStart] = useState("08:00");
  const [batchEnd, setBatchEnd] = useState("18:00");

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
      apiGet<Paginated<Professional>>(`${baseUrl}/professionals`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      apiGet<Availability[]>(`${baseUrl}/professional-availabilities`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([me, res, avail]) => {
        const permissions = me.permissions ?? [];
        const isAdmin = me.role === "admin";
        setCanManage(isAdmin || permissions.includes("*") || permissions.includes("professionals:manage"));
        setProfessionals(res.data ?? []);
        setAvailabilities(avail ?? []);
      })
      .catch((error) =>
        setToast({ message: error instanceof Error ? error.message : "Erro.", variant: "error" })
      );
  }, [baseUrl, router]);


  function resetForm() {
    setEditingId(null);
    setName("");
    setEmail("");
    setPhone("");
    setSpecialty("");
    setNotes("");
    setActive(true);
  }

  async function handleSubmit() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    if (!name) {
      setToast({ message: "Nome e obrigatorio.", variant: "error" });
      return;
    }

    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      specialty: specialty || null,
      notes: notes || null,
      active,
    };

    try {
      if (editingId) {
        await apiPatch(`${baseUrl}/professionals/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        const created = await apiPost<Professional>(`${baseUrl}/professionals`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (batchDays.length > 0 && created?.id) {
          await Promise.all(
            batchDays.map((weekday) =>
              apiPost(
                `${baseUrl}/professional-availabilities`,
                {
                  professional_id: created.id,
                  weekday,
                  start_time: batchStart,
                  end_time: batchEnd,
                },
                { headers: { Authorization: `Bearer ${token}` } }
              )
            )
          );
        }
      }

      const res = await apiGet<Paginated<Professional>>(`${baseUrl}/professionals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfessionals(res.data ?? []);
      resetForm();
      setBatchDays([]);
      setToast({
        message: editingId ? "Profissional atualizado." : "Profissional cadastrado.",
        variant: "success",
      });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Erro ao salvar.",
        variant: "error",
      });
    }
  }

  function handleEdit(professional: Professional) {
    setEditingId(professional.id);
    setName(professional.name);
    setEmail(professional.email ?? "");
    setPhone(professional.phone ?? "");
    setSpecialty(professional.specialty ?? "");
    setNotes(professional.notes ?? "");
    setActive(professional.active ?? true);
  }

  async function handleDelete(id: number) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    try {
      await apiDelete(`${baseUrl}/professionals/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfessionals((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Erro ao excluir.",
        variant: "error",
      });
    }
  }

  async function handleCreateAvailability() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    if (!availabilityProfessionalId || !availabilityStart || !availabilityEnd) {
      setToast({ message: "Informe profissional, inicio e fim.", variant: "error" });
      return;
    }

    try {
      await apiPost(
        `${baseUrl}/professional-availabilities`,
        {
          professional_id: Number(availabilityProfessionalId),
          weekday: Number(availabilityWeekday),
          start_time: availabilityStart,
          end_time: availabilityEnd,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const avail = await apiGet<Availability[]>(`${baseUrl}/professional-availabilities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailabilities(avail ?? []);
      setToast({ message: "Disponibilidade cadastrada.", variant: "success" });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Erro ao cadastrar disponibilidade.",
        variant: "error",
      });
    }
  }

  async function handleDeleteAvailability(id: number) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    try {
      await apiDelete(`${baseUrl}/professional-availabilities/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailabilities((prev) => prev.filter((item) => item.id !== id));
      setToast({ message: "Disponibilidade removida.", variant: "success" });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Erro ao excluir disponibilidade.",
        variant: "error",
      });
    }
  }

  const weekdayOptions = [
    { value: "0", label: "Domingo" },
    { value: "1", label: "Segunda" },
    { value: "2", label: "Terca" },
    { value: "3", label: "Quarta" },
    { value: "4", label: "Quinta" },
    { value: "5", label: "Sexta" },
    { value: "6", label: "Sabado" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Badge className="w-fit bg-zinc-900 text-zinc-50">Profissionais</Badge>
            <h1 className="text-3xl font-semibold text-zinc-900">Cadastro de profissionais</h1>
            <p className="text-sm text-zinc-500">Equipe clinica e disponibilidade.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/empresa">Voltar ao dashboard</Link>
          </Button>
        </header>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>{editingId ? "Editar profissional" : "Novo profissional"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {!canManage ? (
              <p className="text-sm text-zinc-500 md:col-span-2">
                Seu perfil nao possui permissao para gerenciar profissionais.
              </p>
            ) : null}
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Especialidade</Label>
              <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observacoes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
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
            {!editingId ? (
              <div className="md:col-span-2">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-medium text-zinc-900">Horario semanal do profissional</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Selecione os dias e o horario padrao. Isso cria tudo de uma vez.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Dias da semana</Label>
                      <div className="flex flex-wrap gap-3">
                        {weekdayOptions.map((day) => (
                          <label key={day.value} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={batchDays.includes(Number(day.value))}
                              onChange={() =>
                                setBatchDays((prev) =>
                                  prev.includes(Number(day.value))
                                    ? prev.filter((item) => item !== Number(day.value))
                                    : [...prev, Number(day.value)]
                                )
                              }
                            />
                            {day.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Inicio</Label>
                      <Input type="time" value={batchStart} onChange={(e) => setBatchStart(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fim</Label>
                      <Input type="time" value={batchEnd} onChange={(e) => setBatchEnd(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Lista de profissionais</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {professionals.map((professional) => (
                  <TableRow key={professional.id}>
                    <TableCell>{professional.name}</TableCell>
                    <TableCell>{professional.email ?? "-"}</TableCell>
                    <TableCell>{professional.specialty ?? "-"}</TableCell>
                    <TableCell>{professional.active ? "Ativo" : "Inativo"}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(professional)}
                        disabled={!canManage}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteId(professional.id)}
                        disabled={!canManage}
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

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Disponibilidades</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Profissional</Label>
              <SearchSelect
                value={availabilityProfessionalId}
                onChange={setAvailabilityProfessionalId}
                options={professionals.map((professional) => ({
                  value: professional.id,
                  label: professional.name,
                }))}
                searchPlaceholder="Buscar profissional..."
              />
            </div>
            <div className="space-y-2">
              <Label>Dia da semana</Label>
              <SearchSelect
                value={availabilityWeekday}
                onChange={setAvailabilityWeekday}
                options={weekdayOptions}
                searchable={false}
              />
            </div>
            <div className="space-y-2">
              <Label>Inicio</Label>
              <Input type="time" value={availabilityStart} onChange={(e) => setAvailabilityStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input type="time" value={availabilityEnd} onChange={(e) => setAvailabilityEnd(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <Button onClick={handleCreateAvailability} disabled={!canManage}>
                Cadastrar disponibilidade
              </Button>
            </div>
            <div className="md:col-span-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Dia</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availabilities.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {professionals.find((p) => p.id === item.professional_id)?.name ?? "-"}
                      </TableCell>
                      <TableCell>
                        {weekdayOptions.find((w) => w.value === String(item.weekday))?.label ?? "-"}
                      </TableCell>
                      <TableCell>{item.start_time}</TableCell>
                      <TableCell>{item.end_time}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          onClick={() => setAvailabilityDeleteId(item.id)}
                          disabled={!canManage}
                        >
                          Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={deleteId !== null}
        title="Deseja deletar este profissional?"
        description="Essa acao remove o profissional e nao pode ser desfeita."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId === null) return;
          const current = deleteId;
          setDeleteId(null);
          handleDelete(current);
        }}
      />
      <ConfirmDialog
        open={availabilityDeleteId !== null}
        title="Deseja deletar esta disponibilidade?"
        description="Essa acao remove a disponibilidade e nao pode ser desfeita."
        onCancel={() => setAvailabilityDeleteId(null)}
        onConfirm={() => {
          if (availabilityDeleteId === null) return;
          const current = availabilityDeleteId;
          setAvailabilityDeleteId(null);
          handleDeleteAvailability(current);
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
