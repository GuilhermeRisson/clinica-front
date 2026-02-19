"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet, apiPost } from "@/lib/api";

type Patient = { id: number; name: string };
type Professional = { id: number; name: string };
type Service = { id: number; name: string };
type Appointment = {
  id: number;
  starts_at: string;
  status: string;
  patient?: Patient;
  professional?: Professional;
  service?: Service;
};

type Paginated<T> = { data: T[] };

const TOKEN_KEY = "clinica.tenant.token";

export default function EmpresaPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [status, setStatus] = useState<string | null>(null);

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
      apiGet<Paginated<Patient>>(`${baseUrl}/patients`, { headers }),
      apiGet<Paginated<Professional>>(`${baseUrl}/professionals`, { headers }),
      apiGet<Paginated<Service>>(`${baseUrl}/services`, { headers }),
      apiGet<Appointment[]>(`${baseUrl}/appointments?date=${today}&view=day`, {
        headers,
      }),
    ])
      .then(([patientsRes, professionalsRes, servicesRes, appointmentsRes]) => {
        setPatients(patientsRes.data ?? []);
        setProfessionals(professionalsRes.data ?? []);
        setServices(servicesRes.data ?? []);
        setAppointments(appointmentsRes ?? []);
      })
      .catch((error) => {
        setStatus(error instanceof Error ? error.message : "Falha ao carregar dados.");
      });
  }, [baseUrl, router]);

  const kpis = [
    { label: "Agendamentos hoje", value: `${appointments.length}`, change: "dia atual" },
    { label: "Pacientes ativos", value: `${patients.length}`, change: "cadastros" },
    { label: "Profissionais", value: `${professionals.length}`, change: "ativos" },
    { label: "Servicos", value: `${services.length}`, change: "catalogo" },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_50%,_#f1f5f9)] px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="space-y-2">
          <Badge className="w-fit bg-zinc-900 text-zinc-50 hover:bg-zinc-800">Dashboard</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Visao geral da clinica
          </h1>
          <p className="text-sm text-zinc-500">
            Indicadores essenciais e agenda do dia.
          </p>
        </header>

        {status ? <p className="text-sm text-red-600">{status}</p> : null}

        <section className="grid gap-4 md:grid-cols-4">
          {kpis.map((item) => (
            <Card key={item.label} className="border-zinc-200/70 bg-white/80 shadow-sm">
              <CardHeader className="space-y-1">
                <CardDescription className="text-xs text-zinc-500">{item.label}</CardDescription>
                <CardTitle className="text-2xl text-zinc-900">{item.value}</CardTitle>
                <p className="text-xs text-zinc-500">{item.change}</p>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="border-zinc-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Agenda de hoje</CardTitle>
              <CardDescription>Resumo das consultas confirmadas.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Horario</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Servico</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-zinc-500">
                        Nenhum atendimento agendado hoje.
                      </TableCell>
                    </TableRow>
                  ) : (
                    appointments.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {new Date(item.starts_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>{item.patient?.name ?? "-"}</TableCell>
                        <TableCell>{item.service?.name ?? "-"}</TableCell>
                        <TableCell className="capitalize">{item.status}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-zinc-200/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Resumo rapido</CardTitle>
              <CardDescription>Contexto da operacao hoje.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-600">
              <p>Agendamentos confirmados e fila organizada.</p>
              <p>Equipe com disponibilidade para encaixes.</p>
              <p>Servicos ativos prontos para atendimento.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
