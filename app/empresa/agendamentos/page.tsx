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

type Patient = { id: number; name: string };
type Professional = { id: number; name: string };
type Service = { id: number; name: string; price_cents?: number; duration_minutes?: number; capacity?: number };
type Availability = {
  id: number;
  professional_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
};

type Appointment = {
  id: number;
  starts_at: string;
  ends_at?: string | null;
  status: string;
  patient?: Patient;
  professional?: Professional;
  service?: Service;
};

type Paginated<T> = { data: T[] };
type AppointmentResponse = {
  appointment: Appointment;
  warning?: string | null;
  suggestions?: { starts_at: string; ends_at: string }[];
};

const TOKEN_KEY = "clinica.tenant.token";

function formatTime(value?: string | null) {
  if (!value) return "-";
  const isoMatch = value.match(/T(\d{2}:\d{2})/);
  if (isoMatch?.[1]) return isoMatch[1];
  const parts = value.split(" ");
  if (parts[1]) return parts[1].slice(0, 5);
  return value;
}

function formatHourLocal(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const normalized = value.replace("T", " ");
  return normalized.slice(0, 16);
}

function parseLocalDateTime(value: string) {
  if (!value) return new Date(NaN);
  if (/[zZ]$/.test(value) || /[+-]\d{2}:\d{2}$/.test(value)) return new Date(value);
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(`${normalized}T00:00`);
  }
  return new Date(normalized);
}

function dateKey(date: Date) {
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function AgendamentosPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [patientId, setPatientId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [startsDate, setStartsDate] = useState("");
  const [startsHour, setStartsHour] = useState("09:00");
  const [statusNote, setStatusNote] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [suggestions, setSuggestions] = useState<{ starts_at: string; ends_at: string }[]>([]);
  const [planType, setPlanType] = useState<"single" | "weekly" | "biweekly" | "monthly">("single");
  const [totalSessions, setTotalSessions] = useState("8");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [paymentMode, setPaymentMode] = useState<"now" | "due">("now");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [rescheduleTimes, setRescheduleTimes] = useState<Record<number, string>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [canManage, setCanManage] = useState(false);

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
    const today = new Date().toISOString().slice(0, 10);

    Promise.all([
      apiGet<{ role?: string | null; permissions?: string[] | null }>(`${baseUrl}/auth/me`, {
        headers,
      }),
      apiGet<Paginated<Patient>>(`${baseUrl}/patients`, { headers }),
      apiGet<Paginated<Professional>>(`${baseUrl}/professionals`, { headers }),
      apiGet<Paginated<Service>>(`${baseUrl}/services`, { headers }),
      apiGet<Availability[]>(`${baseUrl}/professional-availabilities`, { headers }),
      apiGet<Appointment[]>(`${baseUrl}/appointments?date=${today}&view=day`, { headers }),
    ])
      .then(([me, patientsRes, professionalsRes, servicesRes, availabilityRes, appointmentsRes]) => {
        const permissions = me.permissions ?? [];
        const isAdmin = me.role === "admin";
        setCanManage(isAdmin || permissions.includes("*") || permissions.includes("appointments:manage"));
        setPatients(patientsRes.data ?? []);
        setProfessionals(professionalsRes.data ?? []);
        setServices(servicesRes.data ?? []);
        setAvailabilities(availabilityRes ?? []);
        setAppointments(appointmentsRes ?? []);
      })
      .catch((error) =>
        setToast({ message: error instanceof Error ? error.message : "Erro.", variant: "error" })
      );
  }, [baseUrl, router]);

  async function refreshAppointments(date = startsDate || new Date().toISOString().slice(0, 10)) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const res = await apiGet<Appointment[]>(`${baseUrl}/appointments?date=${date}&view=day`, {
      headers,
    });
    setAppointments(res ?? []);
  }

  useEffect(() => {
    if (!startsDate) return;
    refreshAppointments(startsDate);
  }, [startsDate]);

  function toggleDay(value: number) {
    setDaysOfWeek((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value].sort()
    );
  }

  async function handleCreate() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    setWarning(null);
    setSuggestions([]);

    const primaryServiceId = selectedServiceIds[0] ?? (serviceId ? Number(serviceId) : null);
    const serviceIds = selectedServiceIds.length > 0 ? selectedServiceIds : primaryServiceId ? [primaryServiceId] : [];

    if (!patientId || !professionalId || serviceIds.length === 0 || !startsDate) {
      setToast({ message: "Preencha paciente, profissional, servico e horario.", variant: "error" });
      return;
    }
    if (availableHours.length > 0 && !availableHours.includes(startsHour)) {
      setToast({ message: "Horario indisponivel para este dia.", variant: "error" });
      return;
    }
    if (planType === "single" && paymentMode === "due" && !paymentDueDate) {
      setToast({ message: "Informe a data de pagamento.", variant: "error" });
      return;
    }

    try {
      if (planType === "single") {
        const response = await apiPost<AppointmentResponse>(
          `${baseUrl}/appointments`,
          {
            patient_id: Number(patientId),
            professional_id: Number(professionalId),
            service_id: primaryServiceId,
            service_ids: serviceIds,
            starts_at: `${startsDate}T${startsHour}`,
            payment_mode: paymentMode,
            payment_due_date: paymentMode === "due" ? paymentDueDate : null,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response?.warning === "capacity_full") {
          setWarning("Capacidade da turma cheia. Vamos encaixar mesmo assim, mas veja os horarios sugeridos.");
          setSuggestions(response?.suggestions ?? []);
        }
      } else {
        if ((planType === "weekly" || planType === "biweekly") && daysOfWeek.length === 0) {
          setToast({ message: "Selecione pelo menos um dia da semana.", variant: "error" });
          return;
        }

        const payload = {
          patient_id: Number(patientId),
          professional_id: Number(professionalId),
          service_id: primaryServiceId,
          service_ids: serviceIds,
          starts_at: `${startsDate}T${startsHour}`,
          total_sessions: Number(totalSessions),
          frequency: planType === "monthly" ? "monthly" : planType === "biweekly" ? "biweekly" : "weekly",
          days_of_week: planType === "monthly" ? [] : daysOfWeek,
          day_of_month: planType === "monthly" ? Number(dayOfMonth) : null,
        };

        await apiPost(`${baseUrl}/appointment-series`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setToast({ message: "Agendamento cadastrado.", variant: "success" });
      setSelectedServiceIds([]);
      setServiceId("");
      setPaymentMode("now");
      setPaymentDueDate("");
      await refreshAppointments();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Erro ao criar.", variant: "error" });
    }
  }

  async function handleUpdateStatus(id: number, nextStatus: string) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    try {
      await apiPatch(
        `${baseUrl}/appointments/${id}/status`,
        { status: nextStatus, status_note: statusNote || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToast(null);
      await refreshAppointments();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Erro ao atualizar.", variant: "error" });
    }
  }

  async function handleReschedule(id: number) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    const newTime = rescheduleTimes[id];
    if (!newTime) {
      setToast({ message: "Informe a nova data e hora para remarcar.", variant: "error" });
      return;
    }

    try {
      const response = await apiPatch<AppointmentResponse>(
        `${baseUrl}/appointments/${id}/reschedule`,
        { starts_at: newTime, status_note: statusNote || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response?.warning === "capacity_full") {
        setWarning("Capacidade da turma cheia. Remarcamos, mas veja os horarios sugeridos.");
        setSuggestions(response?.suggestions ?? []);
      } else {
        setWarning(null);
        setSuggestions([]);
      }

      setToast({ message: "Agendamento remarcado.", variant: "success" });
      await refreshAppointments();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Erro ao remarcar.", variant: "error" });
    }
  }

  async function handleDelete(id: number) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    try {
      await apiDelete(`${baseUrl}/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToast({ message: "Agendamento excluido.", variant: "success" });
      await refreshAppointments();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Erro ao excluir.", variant: "error" });
    }
  }

  const weekDays = [
    { value: 0, label: "Dom" },
    { value: 1, label: "Seg" },
    { value: 2, label: "Ter" },
    { value: 3, label: "Qua" },
    { value: 4, label: "Qui" },
    { value: 5, label: "Sex" },
    { value: 6, label: "Sab" },
  ];

  const selectedServices = services.filter((service) =>
    selectedServiceIds.includes(Number(service.id))
  );
  const totalAmount = selectedServices.reduce(
    (sum, service) => sum + (service.price_cents ?? 0),
    0
  );

  const selectedServiceIdsSafe =
    selectedServiceIds.length > 0 ? selectedServiceIds : serviceId ? [Number(serviceId)] : [];
  const primaryService = services.find((service) => service.id === selectedServiceIdsSafe[0]);
  const slotMinutes = primaryService?.duration_minutes ?? 60;
  const capacity = primaryService?.capacity ?? 1;

  const availableHours = useMemo(() => {
    if (!professionalId || !startsDate) return [];
    const weekday = new Date(`${startsDate}T00:00:00`).getDay();
    const dayAvailabilities = availabilities.filter(
      (item) => item.professional_id === Number(professionalId) && item.weekday === weekday
    );

    const dayAppointments = appointments.filter((item) => {
      const localDate = dateKey(parseLocalDateTime(item.starts_at));
      return (
        localDate === startsDate &&
        String(item.professional?.id ?? "") === String(professionalId)
      );
    });

    const result: string[] = [];
    dayAvailabilities.forEach((item) => {
      const start = new Date(`${startsDate}T${item.start_time}`);
      const end = new Date(`${startsDate}T${item.end_time}`);
      for (let cursor = new Date(start); cursor.getTime() + slotMinutes * 60000 <= end.getTime(); ) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + slotMinutes * 60000);
        const overlapping = dayAppointments.filter((appt) => {
          const apptStart = parseLocalDateTime(appt.starts_at);
          const apptEnd = appt.ends_at
            ? parseLocalDateTime(appt.ends_at)
            : new Date(apptStart.getTime() + slotMinutes * 60000);
          return apptStart < slotEnd && apptEnd > slotStart;
        });
        const hasDifferentService = overlapping.some(
          (appt) => appt.service?.id && appt.service.id !== primaryService?.id
        );
        if (!hasDifferentService && overlapping.length < capacity) {
          result.push(formatHourLocal(slotStart));
        }
        cursor = new Date(cursor.getTime() + slotMinutes * 60000);
      }
    });

    return Array.from(new Set(result));
  }, [appointments, availabilities, capacity, professionalId, slotMinutes, startsDate]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Badge className="w-fit bg-zinc-900 text-zinc-50">Agendamentos</Badge>
            <h1 className="text-3xl font-semibold text-zinc-900">Cadastro de agendamentos</h1>
            <p className="text-sm text-zinc-500">Crie e atualize agendamentos rapidamente.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/empresa/agenda">Ver agenda</Link>
          </Button>
        </header>

        {canManage ? (
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle>Novo agendamento</CardTitle>
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
                <Label>Profissional</Label>
                <SearchSelect
                  value={professionalId}
                  onChange={setProfessionalId}
                  options={professionals.map((professional) => ({ value: professional.id, label: professional.name }))}
                  searchPlaceholder="Buscar profissional..."
                />
              </div>
              <div className="space-y-2">
                <Label>Servico</Label>
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
                      setSelectedServiceIds((prev) =>
                        prev.includes(id) ? prev : [...prev, id]
                      );
                      if (selectedServiceIds.length === 0) {
                        setServiceId(String(id));
                      }
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
                    <span className="inline-flex items-center rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-white">
                      Total R$ {(totalAmount / 100).toFixed(2)}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Tipo de agenda</Label>
                <SearchSelect
                  value={planType}
                  onChange={(value) => setPlanType(value as typeof planType)}
                  options={[
                    { value: "single", label: "Agendamento unico" },
                    { value: "weekly", label: "Semanal" },
                    { value: "biweekly", label: "Quinzenal" },
                    { value: "monthly", label: "Mensal" },
                  ]}
                  searchable={false}
                />
              </div>
              <div className="space-y-2">
                <Label>Dia</Label>
                <Input type="date" value={startsDate} onChange={(e) => setStartsDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <SearchSelect
                  value={startsHour}
                  onChange={setStartsHour}
                  options={availableHours.map((hour) => ({
                    value: hour,
                    label: hour,
                  }))}
                  searchable={false}
                />
                {(!professionalId || !startsDate) ? (
                  <p className="text-xs text-zinc-500">
                    Selecione profissional e dia para ver horarios.
                  </p>
                ) : availableHours.length === 0 ? (
                  <p className="text-xs text-zinc-500">Sem horarios disponiveis para este dia.</p>
                ) : null}
              </div>
              {planType === "single" ? (
                <>
                  <div className="space-y-2">
                    <Label>Pagamento</Label>
                    <SearchSelect
                      value={paymentMode}
                      onChange={(value) => setPaymentMode(value as typeof paymentMode)}
                      options={[
                        { value: "now", label: "Agora" },
                        { value: "due", label: "Em data" },
                      ]}
                      searchable={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data do pagamento</Label>
                    <Input
                      type="date"
                      value={paymentDueDate}
                      onChange={(e) => setPaymentDueDate(e.target.value)}
                      disabled={paymentMode !== "due"}
                    />
                  </div>
                </>
              ) : (
                <div className="text-xs text-zinc-500 md:col-span-2">
                  Pagamentos automaticos sao criados apenas para agendamentos unicos.
                </div>
              )}
              {planType !== "single" ? (
                <>
                  <div className="space-y-2">
                    <Label>Total de sessoes</Label>
                    <Input
                      type="number"
                      min={1}
                      value={totalSessions}
                      onChange={(e) => setTotalSessions(e.target.value)}
                    />
                  </div>
                  {planType === "monthly" ? (
                    <div className="space-y-2">
                      <Label>Dia do mes</Label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Dias da semana</Label>
                      <div className="flex flex-wrap gap-3">
                        {weekDays.map((day) => (
                          <label key={day.value} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={daysOfWeek.includes(day.value)}
                              onChange={() => toggleDay(day.value)}
                            />
                            {day.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
              <div className="space-y-2 md:col-span-2">
                <Label>Observacao de status</Label>
                <Input value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
              </div>
              <div className="flex items-center gap-3 md:col-span-2">
                <Button onClick={handleCreate}>Cadastrar</Button>
                <Button variant="outline" onClick={() => refreshAppointments()}>
                  Atualizar lista
                </Button>
              </div>
              {warning ? <p className="text-sm text-amber-600">{warning}</p> : null}
              {suggestions.length > 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 md:col-span-2">
                  <p className="font-medium">Sugestoes de horario:</p>
                  <ul className="mt-2 grid gap-1">
                    {suggestions.map((item, index) => (
                      <li key={`${item.starts_at}-${index}`}>{formatDateTime(item.starts_at)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-zinc-200">
            <CardHeader>
              <CardTitle>Novo agendamento</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-500">
              Seu perfil nao possui permissao para criar agendamentos.
            </CardContent>
          </Card>
        )}

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Agenda do dia</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horario</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Servico</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarcar</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatTime(item.starts_at)}</TableCell>
                    <TableCell>{item.patient?.name ?? "-"}</TableCell>
                    <TableCell>{item.professional?.name ?? "-"}</TableCell>
                    <TableCell>{item.service?.name ?? "-"}</TableCell>
                    <TableCell className="capitalize">
                      {canManage ? (
                        <SearchSelect
                          value={item.status}
                          onChange={(value) => handleUpdateStatus(item.id, value)}
                          options={[
                            { value: "scheduled", label: "agendado" },
                            { value: "confirmed", label: "confirmado" },
                            { value: "rescheduled", label: "remarcado" },
                            { value: "arrived", label: "chegou" },
                            { value: "completed", label: "concluido" },
                            { value: "no_show", label: "faltou" },
                            { value: "cancelled", label: "cancelado" },
                          ]}
                          searchable={false}
                        />
                      ) : (
                        item.status
                      )}
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="datetime-local"
                            className="h-9"
                            value={rescheduleTimes[item.id] ?? ""}
                            onChange={(e) =>
                              setRescheduleTimes((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                          />
                          <Button variant="outline" onClick={() => handleReschedule(item.id)}>
                            Remarcar
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <Button variant="outline" onClick={() => setDeleteId(item.id)}>
                          Excluir
                        </Button>
                      ) : null}
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
        title="Deseja deletar este agendamento?"
        description="Essa acao remove o agendamento e nao pode ser desfeita."
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
