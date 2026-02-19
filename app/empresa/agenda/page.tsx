"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Toast } from "@/components/ui/toast";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

type Patient = { id: number; name: string };
type Professional = { id: number; name: string };
type Service = {
  id: number;
  name: string;
  duration_minutes?: number;
  price_cents?: number;
  capacity?: number;
};
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

export default function AgendaPage() {
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [warning, setWarning] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [suggestions, setSuggestions] = useState<{ starts_at: string; ends_at: string }[]>([]);
  const [planType, setPlanType] = useState<"single" | "weekly" | "biweekly" | "monthly">("single");
  const [totalSessions, setTotalSessions] = useState("8");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [slotModalStart, setSlotModalStart] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState("");
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
    Promise.all([
      apiGet<{ role?: string | null; permissions?: string[] | null }>(`${baseUrl}/auth/me`, {
        headers,
      }),
      apiGet<Paginated<Patient>>(`${baseUrl}/patients`, { headers }),
      apiGet<Paginated<Professional>>(`${baseUrl}/professionals`, { headers }),
      apiGet<Paginated<Service>>(`${baseUrl}/services`, { headers }),
      apiGet<Availability[]>(`${baseUrl}/professional-availabilities`, { headers }),
      apiGet<Appointment[]>(`${baseUrl}/appointments?date=${selectedDate}&view=day`, { headers }),
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
  }, [baseUrl, router, selectedDate]);

  async function refreshAppointments(date = selectedDate) {
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

  function toggleDay(value: number) {
    setDaysOfWeek((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value].sort()
    );
  }

  async function handleCreate(overrideStart?: string) {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    setWarning(null);
    setSuggestions([]);

    const startValue = overrideStart ?? slotModalStart ?? "";
    const primaryServiceId = selectedServiceIds[0] ?? (serviceId ? Number(serviceId) : null);
    const serviceIds = selectedServiceIds.length > 0 ? selectedServiceIds : primaryServiceId ? [primaryServiceId] : [];

    if (!patientId || !professionalId || serviceIds.length === 0 || !startValue) {
      setToast({ message: "Preencha paciente, profissional, servico e horario.", variant: "error" });
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
            starts_at: startValue,
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
          starts_at: startValue,
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
      await refreshAppointments();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Erro ao criar.", variant: "error" });
    }
  }

  function openSlotModal(startValue: string) {
    setSlotModalStart(startValue);
    setSlotModalOpen(true);
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
        { status: nextStatus, status_note: null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAppointments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
      );
      setToast({ message: "Status atualizado.", variant: "success" });
      await refreshAppointments();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Erro ao atualizar.", variant: "error" });
    }
  }

  async function handleRescheduleConfirm() {
    if (!rescheduleId || !rescheduleValue) {
      setToast({ message: "Informe a nova data e hora.", variant: "error" });
      return;
    }

    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    try {
      await apiPatch(
        `${baseUrl}/appointments/${rescheduleId}/reschedule`,
        { starts_at: rescheduleValue, status_note: null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToast({ message: "Agendamento remarcado.", variant: "success" });
      setRescheduleOpen(false);
      setRescheduleId(null);
      setRescheduleValue("");
      await refreshAppointments();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Erro ao remarcar.", variant: "error" });
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

  const slots = useMemo(() => {
    if (!professionalId || !selectedDate) {
      return [];
    }

    const weekday = new Date(`${selectedDate}T00:00:00`).getDay();
    const dayAvailabilities = availabilities.filter(
      (item) => item.professional_id === Number(professionalId) && item.weekday === weekday
    );

    const service = services.find((item) => String(item.id) === String(serviceId));
    const slotMinutes = service?.duration_minutes ?? 60;
    const capacity = service?.capacity ?? 1;

    const dayAppointments = appointments.filter((item) => {
      const localDate = dateKey(parseLocalDateTime(item.starts_at));
      return (
        localDate === selectedDate &&
        String(item.professional?.id ?? "") === String(professionalId)
      );
    });

    const result: Array<{
      time: string;
      start: Date;
      end: Date;
      appointment?: Appointment;
      available: boolean;
    }> = [];

    dayAvailabilities.forEach((item) => {
      const start = new Date(`${selectedDate}T${item.start_time}`);
      const end = new Date(`${selectedDate}T${item.end_time}`);
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
        const appointment = overlapping[0];
        const overlapCount = overlapping.length;
        const hasDifferentService = service
          ? overlapping.some((appt) => appt.service?.id && appt.service.id !== service.id)
          : false;
        result.push({
          time: slotStart.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          start: slotStart,
          end: slotEnd,
          appointment,
          available: overlapCount < capacity && !hasDifferentService,
        });
        cursor = new Date(cursor.getTime() + slotMinutes * 60000);
      }
    });

    return result;
  }, [appointments, availabilities, professionalId, selectedDate, serviceId, services]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "arrived":
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "no_show":
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "confirmed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "rescheduled":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-zinc-50 text-zinc-600 border-zinc-200";
    }
  };

  const dayAppointments = useMemo(() => {
    return appointments
      .filter((item) => dateKey(parseLocalDateTime(item.starts_at)) === selectedDate)
      .sort((a, b) => parseLocalDateTime(a.starts_at).getTime() - parseLocalDateTime(b.starts_at).getTime());
  }, [appointments, selectedDate]);

  const availableSlots = useMemo(() => slots.filter((slot) => slot.available), [slots]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const leadingEmpty = firstDay.getDay();
    const days: Array<{ date: Date; label: number; isCurrentMonth: boolean }> = [];
    for (let i = 0; i < leadingEmpty; i += 1) {
      days.push({ date: new Date(year, month, i - leadingEmpty + 1), label: 0, isCurrentMonth: false });
    }
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push({ date: new Date(year, month, day), label: day, isCurrentMonth: true });
    }
    return days;
  }, [currentMonth]);

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [currentMonth]);

  const selectedServices = services.filter((service) =>
    selectedServiceIds.includes(Number(service.id))
  );
  const totalAmount = selectedServices.reduce(
    (sum, service) => sum + (service.price_cents ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Badge className="w-fit bg-zinc-900 text-zinc-50">Agenda</Badge>
            <h1 className="text-3xl font-semibold text-zinc-900">Agenda da clinica</h1>
            <p className="text-sm text-zinc-500">Selecione um dia no calendario para ver os horarios.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/empresa/agendamentos">Cadastro de agendamentos</Link>
          </Button>
        </header>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
          </CardHeader>
          <CardContent className="calendar-wrap">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-900">{monthLabel}</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
                    );
                  }}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const today = new Date();
                    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                    const todayStr = today.toISOString().slice(0, 10);
                    setSelectedDate(todayStr);
                    refreshAppointments(todayStr);
                  }}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
                    );
                  }}
                >
                  Proximo
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-xs text-zinc-500">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((label) => (
                <div key={label} className="text-center font-medium uppercase tracking-wide">
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const dateStr = day.date.toISOString().slice(0, 10);
                const isSelected = dateStr === selectedDate;
                const selectedCount = isSelected ? dayAppointments.length : 0;
                return (
                  <button
                    key={`${dateStr}-${index}`}
                    type="button"
                    disabled={!day.isCurrentMonth}
                    onClick={() => {
                      if (!day.isCurrentMonth) return;
                      setSelectedDate(dateStr);
                      refreshAppointments(dateStr);
                    }}
                    className={`min-h-[72px] rounded-xl border text-left text-sm transition ${
                      day.isCurrentMonth
                        ? "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                        : "border-transparent bg-transparent text-transparent"
                    } ${isSelected ? "ring-2 ring-zinc-900/60" : ""}`}
                  >
                    <div className="px-3 py-2 text-sm font-semibold">{day.label || ""}</div>
                    {isSelected ? (
                      <div className="px-3 pb-2 text-[11px] text-zinc-500">
                        {selectedCount} agendamento(s)
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Agenda do dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-medium text-zinc-900">Horarios do dia {selectedDate}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Profissional</Label>
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
                <div className="space-y-2">
                  <Label>Dia</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      refreshAppointments(e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Paciente (para marcar rapido)</Label>
                  <SearchSelect
                    value={patientId}
                    onChange={setPatientId}
                    options={patients.map((patient) => ({ value: patient.id, label: patient.name }))}
                    searchPlaceholder="Buscar paciente..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Servico (para marcar rapido)</Label>
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
                      <span className="inline-flex items-center rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-white">
                        Total R$ {(totalAmount / 100).toFixed(2)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {availableSlots.map((slot, index) => (
                  <div
                    key={`${slot.time}-${index}`}
                    className={`rounded-md border px-3 py-2 text-xs ${
                      "border-emerald-200 bg-emerald-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{slot.time}</span>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!canManage) {
                            setToast({
                              message: "Seu perfil nao possui permissao para criar agendamentos.",
                              variant: "error",
                            });
                            return;
                          }
                          if (!patientId || !serviceId || !professionalId) {
                            setToast({
                              message: "Selecione paciente, profissional e servico antes de marcar.",
                              variant: "error",
                            });
                            return;
                          }
                          const localValue = `${selectedDate}T${slot.time}`;
                          setPlanType("single");
                          openSlotModal(localValue);
                        }}
                      >
                        Marcar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                  <p className="text-sm font-semibold text-zinc-900">Agendados no dia</p>
                  {dayAppointments.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">Nenhum agendamento para este dia.</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-xs text-zinc-700">
                      {dayAppointments.map((item) => (
                        <li
                          key={item.id}
                          className={`rounded-md border p-3 ${statusBadge(item.status)}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {formatTime(item.starts_at)}
                            </span>
                            <span className="capitalize text-[11px] font-medium">{item.status}</span>
                          </div>
                          <div className="mt-1 text-[11px] text-zinc-500">
                            {item.patient?.name ?? "-"} - {item.service?.name ?? "-"}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              disabled={!canManage}
                              onClick={() => handleUpdateStatus(item.id, "arrived")}
                            >
                              Compareceu
                            </Button>
                            <Button
                              variant="outline"
                              disabled={!canManage}
                              onClick={() => handleUpdateStatus(item.id, "no_show")}
                            >
                              Faltou
                            </Button>
                            <Button
                              variant="outline"
                              disabled={!canManage}
                              onClick={() => {
                                setRescheduleId(item.id);
                                setRescheduleValue(item.starts_at.slice(0, 16));
                                setRescheduleOpen(true);
                              }}
                            >
                              Remarcar
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                  <p className="text-sm font-semibold text-zinc-900">Horarios livres</p>
                  {!professionalId ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Selecione um profissional para ver horarios.
                    </p>
                  ) : availableSlots.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">Nenhum horario livre encontrado.</p>
                  ) : (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {availableSlots.map((slot) => (
                        <li
                          key={`free-${slot.time}`}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700"
                        >
                          {slot.time}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            {warning ? <p className="text-sm text-amber-600">{warning}</p> : null}
            {suggestions.length > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
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
      </div>
      <Toast
        open={!!toast}
        message={toast?.message ?? ""}
        variant={toast?.variant ?? "success"}
        onClose={() => setToast(null)}
      />
      {slotModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-zinc-950/60" onClick={() => setSlotModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Novo agendamento</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {slotModalStart ? new Date(slotModalStart).toLocaleString("pt-BR") : ""}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Paciente</Label>
                <SearchSelect
                  value={patientId}
                  onChange={setPatientId}
                  options={patients.map((patient) => ({ value: patient.id, label: patient.name }))}
                  searchPlaceholder="Buscar paciente..."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
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
                    <span className="inline-flex items-center rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-white">
                      Total R$ {(totalAmount / 100).toFixed(2)}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Recorrencia</Label>
                <SearchSelect
                  value={planType}
                  onChange={(value) => setPlanType(value as typeof planType)}
                  options={[
                    { value: "single", label: "Sem recorrencia" },
                    { value: "weekly", label: "Semanal" },
                    { value: "biweekly", label: "Quinzenal" },
                    { value: "monthly", label: "Mensal" },
                  ]}
                  searchable={false}
                />
              </div>
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
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setSlotModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!slotModalStart) return;
                  await handleCreate(slotModalStart);
                  setSlotModalOpen(false);
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {rescheduleOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-zinc-950/60" onClick={() => setRescheduleOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Remarcar agendamento</h3>
            <p className="mt-1 text-xs text-zinc-500">Selecione a nova data e horario.</p>
            <div className="mt-4 space-y-2">
              <Label>Nova data</Label>
              <Input
                type="datetime-local"
                value={rescheduleValue}
                onChange={(e) => setRescheduleValue(e.target.value)}
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRescheduleConfirm}>Confirmar</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
