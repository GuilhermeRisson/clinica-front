"use client";

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

type Patient = { id: number; name: string };
type Service = { id: number; name: string; price_cents?: number };
type Payment = {
  id: number;
  patient_id: number;
  appointment_id?: number | null;
  amount_cents: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  paid_at?: string | null;
  method?: string | null;
  notes?: string | null;
  patient?: Patient;
};

type Paginated<T> = { data: T[] };
type NotificationSetting = {
  notify_email?: boolean;
  notify_whatsapp?: boolean;
  reminder_days?: number;
  reminder_time?: string | null;
};

const TOKEN_KEY = "clinica.tenant.token";

export default function FinanceiroPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<NotificationSetting>({});
  const [patientId, setPatientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Payment["status"]>("pending");
  const [amountCents, setAmountCents] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

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

    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      apiGet<Paginated<Patient>>(`${baseUrl}/patients`, { headers }),
      apiGet<Paginated<Service>>(`${baseUrl}/services`, { headers }),
      apiGet<Payment[]>(`${baseUrl}/payments`, { headers }),
      apiGet<NotificationSetting>(`${baseUrl}/notification-settings`, { headers }),
    ])
      .then(([patientsRes, servicesRes, paymentsRes, settingsRes]) => {
        setPatients(patientsRes.data ?? []);
        setServices(servicesRes.data ?? []);
        setPayments(paymentsRes ?? []);
        setSettings(settingsRes ?? {});
      })
      .catch((error) =>
        setToast({ message: error instanceof Error ? error.message : "Erro ao carregar.", variant: "error" })
      );
  }, [baseUrl, router]);

  useEffect(() => {
    const selected = services.filter((service) => selectedServiceIds.includes(Number(service.id)));
    const total = selected.reduce((sum, service) => sum + (service.price_cents ?? 0), 0);
    setAmountCents(total);
  }, [selectedServiceIds, services]);

  async function refreshPayments() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const res = await apiGet<Payment[]>(`${baseUrl}/payments`, { headers });
    setPayments(res ?? []);
  }

  async function handleCreate() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    if (!patientId || !dueDate || amountCents <= 0) {
      setToast({ message: "Preencha paciente, vencimento e valor.", variant: "error" });
      return;
    }

    try {
      await apiPost(
        `${baseUrl}/payments`,
        {
          patient_id: Number(patientId),
          amount_cents: amountCents,
          due_date: dueDate,
          status,
          method: method || null,
          notes: notes || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setToast({ message: "Pagamento registrado.", variant: "success" });
      setSelectedServiceIds([]);
      setServiceId("");
      setDueDate("");
      setMethod("");
      setNotes("");
      setStatus("pending");
      await refreshPayments();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Erro ao registrar.", variant: "error" });
    }
  }

  async function handleMarkPaid(id: number) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    try {
      await apiPatch(
        `${baseUrl}/payments/${id}`,
        { status: "paid" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToast({ message: "Pagamento marcado como pago.", variant: "success" });
      await refreshPayments();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Erro ao atualizar.", variant: "error" });
    }
  }

  async function handleDelete(id: number) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    try {
      await apiDelete(`${baseUrl}/payments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToast({ message: "Pagamento excluido.", variant: "success" });
      await refreshPayments();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Erro ao excluir.", variant: "error" });
    }
  }

  const selectedServices = services.filter((service) =>
    selectedServiceIds.includes(Number(service.id))
  );

  const today = new Date().toISOString().slice(0, 10);
  const reminderDays = settings.reminder_days ?? 0;
  const dueSoonLimit = new Date();
  dueSoonLimit.setDate(dueSoonLimit.getDate() + reminderDays);
  const dueSoon = payments.filter(
    (payment) =>
      payment.status === "pending" &&
      payment.due_date >= today &&
      payment.due_date <= dueSoonLimit.toISOString().slice(0, 10)
  );
  const overdue = payments.filter(
    (payment) => payment.status === "pending" && payment.due_date < today
  );

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-2">
          <Badge className="w-fit bg-zinc-900 text-zinc-50">Financeiro</Badge>
          <h1 className="text-3xl font-semibold text-zinc-900">Pagamentos</h1>
          <p className="text-sm text-zinc-500">Registre cobrancas e acompanhe vencimentos.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle>Vencidos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600">{overdue.length} pendente(s)</CardContent>
          </Card>
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle>Vencem em breve</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600">
              {dueSoon.length} dentro de {reminderDays} dia(s)
            </CardContent>
          </Card>
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle>Total pendente</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600">
              R$ {(payments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount_cents, 0) / 100).toFixed(2)}
            </CardContent>
          </Card>
        </div>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Novo pagamento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Paciente</Label>
              <SearchSelect
                value={patientId}
                onChange={setPatientId}
                options={patients.map((patient) => ({ value: patient.id, label: patient.name }))}
                searchPlaceholder="Buscar paciente..."
              />
            </div>
            <div className="space-y-2">
              <Label>Servicos cobrados</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchSelect
                    value={serviceId}
                    onChange={setServiceId}
                    options={services.map((service) => ({ value: service.id, label: service.name }))}
                    searchPlaceholder="Buscar servico..."
                  />
                </div>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    if (!serviceId) return;
                    const id = Number(serviceId);
                    setSelectedServiceIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
                  }}
                >
                  Adicionar
                </Button>
              </div>
              {selectedServices.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {selectedServices.map((service) => (
                    <span
                      key={service.id}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1"
                    >
                      {service.name}
                      <button
                        type="button"
                        className="text-zinc-500 hover:text-zinc-900"
                        onClick={() =>
                          setSelectedServiceIds((prev) => prev.filter((id) => id !== service.id))
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                value={(amountCents / 100).toFixed(2)}
                onChange={(e) => setAmountCents(Math.round(Number(e.target.value) * 100))}
              />
            </div>
            <div className="space-y-2">
              <Label>Metodo</Label>
              <SearchSelect
                value={method}
                onChange={setMethod}
                options={[
                  { value: "pix", label: "Pix" },
                  { value: "card", label: "Cartao" },
                  { value: "cash", label: "Dinheiro" },
                  { value: "transfer", label: "Transferencia" },
                  { value: "other", label: "Outro" },
                ]}
                searchable={false}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <SearchSelect
                value={status}
                onChange={(value) => setStatus(value as Payment["status"])}
                options={[
                  { value: "pending", label: "pendente" },
                  { value: "paid", label: "pago" },
                  { value: "overdue", label: "vencido" },
                  { value: "cancelled", label: "cancelado" },
                ]}
                searchable={false}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observacao</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <Button onClick={handleCreate}>Registrar pagamento</Button>
              <Button variant="outline" onClick={refreshPayments}>
                Atualizar lista
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Pagamentos cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.patient?.name ?? "-"}</TableCell>
                    <TableCell>{new Date(payment.due_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>R$ {(payment.amount_cents / 100).toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{payment.status}</TableCell>
                    <TableCell>{payment.method ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {payment.status !== "paid" ? (
                          <Button variant="outline" onClick={() => handleMarkPaid(payment.id)}>
                            Marcar pago
                          </Button>
                        ) : null}
                        <Button variant="outline" onClick={() => setDeleteId(payment.id)}>
                          Excluir
                        </Button>
                      </div>
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
        title="Deseja deletar este pagamento?"
        description="Essa acao remove o pagamento e nao pode ser desfeita."
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
