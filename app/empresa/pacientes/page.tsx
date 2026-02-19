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

type Patient = {
  id: number;
  name: string;
  birth_date?: string | null;
  phone?: string | null;
  profession?: string | null;
  chief_complaint?: string | null;
  diagnosis?: string | null;
  medical_history?: string | null;
  physical_evaluation_selected?: { evaluation_id: number; selected: string[] }[] | null;
  first_visit_date?: string | null;
  first_visit_appointment_id?: number | null;
  billing_type?: "insurance" | "private" | null;
  insurance_name?: string | null;
  notes?: string | null;
  active?: boolean | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }
  return value;
}

type Paginated<T> = { data: T[] };
type Appointment = { id: number; starts_at: string };
type Evaluation = { id: number; name: string; options: string[]; active?: boolean | null };

const TOKEN_KEY = "clinica.tenant.token";

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [profession, setProfession] = useState("");
  const [professionOptions, setProfessionOptions] = useState<string[]>([]);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [firstVisitDate, setFirstVisitDate] = useState("");
  const [billingType, setBillingType] = useState<"insurance" | "private" | "">("");
  const [insuranceName, setInsuranceName] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null
  );
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [evaluationSelected, setEvaluationSelected] = useState<
    { evaluation_id: number; selected: string[] }[]
  >([]);
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
      apiGet<{ role?: string | null; permissions?: string[] | null }>(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      apiGet<Paginated<Patient>>(`${baseUrl}/patients`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      apiGet<string[]>(`${baseUrl}/patients/professions`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      apiGet<Paginated<Evaluation>>(`${baseUrl}/patient-evaluations`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([me, res, professions, evals]) => {
        const permissions = me.permissions ?? [];
        const isAdmin = me.role === "admin";
        setCanManage(isAdmin || permissions.includes("*") || permissions.includes("patients:manage"));
        setPatients(res.data ?? []);
        setProfessionOptions(professions ?? []);
        setEvaluations((evals.data ?? []).filter((item) => item.active !== false));
      })
      .catch((error) =>
        setToast({ message: error instanceof Error ? error.message : "Erro.", variant: "error" })
      );
  }, [baseUrl, router]);


  function resetForm() {
    setEditingId(null);
    setName("");
    setBirthDate("");
    setPhone("");
    setProfession("");
    setChiefComplaint("");
    setDiagnosis("");
    setMedicalHistory("");
    setFirstVisitDate("");
    setBillingType("");
    setInsuranceName("");
    setNotes("");
    setActive(true);
    setEvaluationSelected([]);
  }

  function calculateAge(dateString: string) {
    if (!dateString) return "";
    const birth = new Date(dateString);
    if (Number.isNaN(birth.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return `${age} anos`;
  }

  function toggleEvaluationOption(evaluationId: number, option: string) {
    setEvaluationSelected((prev) => {
      const existing = prev.find((item) => item.evaluation_id === evaluationId);
      if (!existing) {
        return [...prev, { evaluation_id: evaluationId, selected: [option] }];
      }
      const selected = existing.selected.includes(option)
        ? existing.selected.filter((value) => value !== option)
        : [...existing.selected, option];
      return prev.map((item) =>
        item.evaluation_id === evaluationId ? { ...item, selected } : item
      );
    });
  }

  async function useFirstAppointmentDate(patientId: number) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    const list = await apiGet<Appointment[]>(
      `${baseUrl}/appointments?patient_id=${patientId}&view=month`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!list || list.length === 0) {
      setToast({ message: "Paciente sem agendamentos.", variant: "error" });
      return;
    }

    const earliest = list
      .slice()
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
    setFirstVisitDate(earliest.starts_at.slice(0, 10));
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
      birth_date: birthDate || null,
      phone: phone || null,
      profession: profession || null,
      chief_complaint: chiefComplaint || null,
      diagnosis: diagnosis || null,
      medical_history: medicalHistory || null,
      physical_evaluation_selected: evaluationSelected.length ? evaluationSelected : null,
      first_visit_date: firstVisitDate || null,
      billing_type: billingType || null,
      insurance_name: insuranceName || null,
      notes: notes || null,
      active,
    };

    try {
      if (editingId) {
        await apiPatch(`${baseUrl}/patients/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await apiPost(`${baseUrl}/patients`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const res = await apiGet<Paginated<Patient>>(`${baseUrl}/patients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatients(res.data ?? []);
      const professions = await apiGet<string[]>(`${baseUrl}/patients/professions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfessionOptions(professions ?? []);
      const evals = await apiGet<Paginated<Evaluation>>(`${baseUrl}/patient-evaluations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvaluations((evals.data ?? []).filter((item) => item.active !== false));
      resetForm();
      setToast({
        message: editingId ? "Paciente atualizado." : "Paciente cadastrado.",
        variant: "success",
      });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Erro ao salvar.",
        variant: "error",
      });
    }
  }

  async function handleEdit(patient: Patient) {
    setEditingId(patient.id);
    setName(patient.name);
    setBirthDate(patient.birth_date ?? "");
    setPhone(patient.phone ?? "");
    setProfession(patient.profession ?? "");
    setChiefComplaint(patient.chief_complaint ?? "");
    setDiagnosis(patient.diagnosis ?? "");
    setMedicalHistory(patient.medical_history ?? "");
    setFirstVisitDate(patient.first_visit_date ?? "");
    setBillingType(patient.billing_type ?? "");
    setInsuranceName(patient.insurance_name ?? "");
    setNotes(patient.notes ?? "");
    setActive(patient.active ?? true);
    setEvaluationSelected(patient.physical_evaluation_selected ?? []);
  }

  async function handleDelete(id: number) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    try {
      await apiDelete(`${baseUrl}/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatients((prev) => prev.filter((item) => item.id !== id));
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
            <Badge className="w-fit bg-zinc-900 text-zinc-50">Pacientes</Badge>
            <h1 className="text-3xl font-semibold text-zinc-900">Cadastro de pacientes</h1>
            <p className="text-sm text-zinc-500">Cadastre, edite e acompanhe seus pacientes.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/empresa">Voltar ao dashboard</Link>
          </Button>
        </header>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>{editingId ? "Editar paciente" : "Novo paciente"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {!canManage ? (
              <p className="text-sm text-zinc-500 md:col-span-2">
                Seu perfil nao possui permissao para gerenciar pacientes.
              </p>
            ) : null}
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de nascimento</Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              {birthDate ? (
                <p className="text-xs text-zinc-500">Idade: {calculateAge(birthDate)}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Profissao</Label>
              <input
                list="profession-options"
                className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
              />
              <datalist id="profession-options">
                {professionOptions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Tipo de cobranca</Label>
              <SearchSelect
                value={billingType}
                onChange={(value) => setBillingType(value as "insurance" | "private" | "")}
                options={[
                  { value: "private", label: "Particular" },
                  { value: "insurance", label: "Convenio" },
                ]}
                searchable={false}
              />
            </div>
            <div className="space-y-2">
              <Label>Convenio</Label>
              <Input value={insuranceName} onChange={(e) => setInsuranceName(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Queixa principal</Label>
              <Input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Diagnostico</Label>
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Historico patologico pregresso</Label>
              <Input value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Avaliacao fisica (cadastro em Avaliacoes)</Label>
              {evaluations.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhuma avaliacao cadastrada.</p>
              ) : (
                <div className="mt-2 grid gap-4">
                  {evaluations.map((item) => {
                    const selected =
                      evaluationSelected.find((value) => value.evaluation_id === item.id)?.selected ?? [];
                    return (
                      <div key={item.id} className="rounded-md border border-zinc-200 p-3">
                        <p className="text-sm font-medium">{item.name}</p>
                        <div className="mt-2 flex flex-wrap gap-3">
                          {item.options.map((option) => (
                            <label key={option} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={selected.includes(option)}
                                onChange={() => toggleEvaluationOption(item.id, option)}
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Data do primeiro atendimento</Label>
              <Input type="date" value={firstVisitDate} onChange={(e) => setFirstVisitDate(e.target.value)} />
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => useFirstAppointmentDate(editingId)}
                >
                  Usar primeiro agendamento
                </Button>
              ) : null}
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
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Lista de pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Nascimento</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Profissao</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>{patient.name}</TableCell>
                    <TableCell>{formatDate(patient.birth_date)}</TableCell>
                    <TableCell>
                      {patient.birth_date ? calculateAge(patient.birth_date) : "-"}
                    </TableCell>
                    <TableCell>{patient.phone ?? "-"}</TableCell>
                    <TableCell>{patient.profession ?? "-"}</TableCell>
                    <TableCell>{patient.billing_type ?? "-"}</TableCell>
                    <TableCell>{patient.active ? "Ativo" : "Inativo"}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" onClick={() => handleEdit(patient)} disabled={!canManage}>
                        Editar
                      </Button>
                      <Button variant="outline" onClick={() => setDeleteId(patient.id)} disabled={!canManage}>
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
        title="Deseja deletar este paciente?"
        description="Essa acao remove o paciente e nao pode ser desfeita."
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
