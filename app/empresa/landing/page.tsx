import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmpresaLandingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#e2e8f0_50%,_#f1f5f9)] px-6 py-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14">
        <header className="relative overflow-hidden rounded-3xl border border-zinc-200/60 bg-white/90 p-10 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.7)]">
          <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-6">
            <Badge className="w-fit bg-zinc-900 text-zinc-50 hover:bg-zinc-800">
              Clinica Essencia
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 md:text-6xl">
              Cuidado completo para voce se mover sem dor.
            </h1>
            <p className="max-w-2xl text-base text-zinc-600 md:text-lg">
              Fisioterapia, pilates e reabilitacao com equipe especializada. Agende sua
              avaliacao e transforme sua rotina com um plano personalizado.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400" asChild>
                <Link href="/empresa/login">Agendar agora</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/empresa/login">Area do paciente</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
              <span className="rounded-full border border-zinc-200 px-3 py-1">
                Atendimento humanizado
              </span>
              <span className="rounded-full border border-zinc-200 px-3 py-1">
                Profissionais certificados
              </span>
              <span className="rounded-full border border-zinc-200 px-3 py-1">
                Horarios flexiveis
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <Card className="border-zinc-200/70 bg-white/80 shadow-sm">
            <CardHeader>
              <CardTitle>Avaliacao inicial</CardTitle>
              <CardDescription>
                Diagnostico preciso para definir seu plano de tratamento.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-zinc-200/70 bg-white/80 shadow-sm">
            <CardHeader>
              <CardTitle>Pilates terapeutico</CardTitle>
              <CardDescription>
                Fortalecimento e mobilidade com acompanhamento especializado.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-zinc-200/70 bg-white/80 shadow-sm">
            <CardHeader>
              <CardTitle>Reabilitacao</CardTitle>
              <CardDescription>
                Protocolos modernos para acelerar sua recuperacao.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-zinc-200/70 bg-white/90 p-8">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Nossa equipe
              </p>
              <h2 className="text-3xl font-semibold text-zinc-900">
                Especialistas em movimento e dor cronica.
              </h2>
              <p className="text-sm text-zinc-600">
                Profissionais com experiencia em ortopedia, neurologia e
                acompanhamento de atletas.
              </p>
            </div>
            <Button className="w-fit" asChild>
              <Link href="/empresa/login">Falar com a clinica</Link>
            </Button>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-zinc-200/70 bg-zinc-900 p-8 text-zinc-50">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
                Estrutura completa
              </p>
              <h2 className="text-3xl font-semibold">Ambiente moderno e acolhedor.</h2>
              <p className="text-sm text-zinc-300">
                Salas equipadas, estudio de pilates e atendimento com hora marcada.
              </p>
            </div>
            <Button variant="secondary" className="w-fit" asChild>
              <Link href="/empresa/login">Ver disponibilidade</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
