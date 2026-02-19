import Link from "next/link";
import { headers } from "next/headers";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import EmpresaLandingPage from "@/app/empresa/landing/page";

export default async function Home() {
  const host = (await headers()).get("host") ?? "";
  const hostName = host.split(":")[0];
  const isCentralHost =
    hostName === "localhost" ||
    hostName === "127.0.0.1" ||
    hostName.startsWith("central.");

  if (!isCentralHost) {
    return <EmpresaLandingPage />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#e2e8f0_50%,_#f1f5f9)] px-6 py-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16">
        <header className="relative overflow-hidden rounded-3xl border border-zinc-200/60 bg-white/85 p-10 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.7)]">
          <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-6">
            <Badge className="w-fit bg-zinc-900 text-zinc-50 hover:bg-zinc-800">
              Clinica Suite
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 md:text-6xl">
              Transforme a operacao de clinicas em uma plataforma escalavel.
            </h1>
            <p className="max-w-2xl text-base text-zinc-600 md:text-lg">
              Centralize empresas, dominios, agenda e cadastros em um unico painel.
              Feito para quem precisa crescer sem perder o controle.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/central">Quero conhecer a central</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/empresa">Ver painel da clinica</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
              <span className="rounded-full border border-zinc-200 px-3 py-1">
                Multi-tenant seguro
              </span>
              <span className="rounded-full border border-zinc-200 px-3 py-1">
                Onboarding rapido
              </span>
              <span className="rounded-full border border-zinc-200 px-3 py-1">
                Relatorios prontos
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <Card className="border-zinc-200/70 bg-white/80 shadow-sm">
            <CardHeader>
              <CardTitle>Controle central</CardTitle>
              <CardDescription>
                Cadastre empresas, dominios e niveis de acesso em minutos.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-zinc-200/70 bg-white/80 shadow-sm">
            <CardHeader>
              <CardTitle>Fluxo clinico</CardTitle>
              <CardDescription>
                Agenda, profissionais e servicos conectados ao dia a dia da equipe.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-zinc-200/70 bg-white/80 shadow-sm">
            <CardHeader>
              <CardTitle>Decisao rapida</CardTitle>
              <CardDescription>
                Historico e indicadores para melhorar a operacao da clinica.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-zinc-200/70 bg-white/90 p-8">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Para equipes em escala
              </p>
              <h2 className="text-3xl font-semibold text-zinc-900">
                Um painel unico para crescer com previsibilidade.
              </h2>
              <p className="text-sm text-zinc-600">
                Crie novas empresas com dominio próprio, acompanhe status de
                ativacao e centralize o suporte das unidades.
              </p>
            </div>
            <Button asChild className="w-fit">
              <Link href="/central">Agendar demonstracao</Link>
            </Button>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-zinc-200/70 bg-zinc-900 p-8 text-zinc-50">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
                Resultado imediato
              </p>
              <h2 className="text-3xl font-semibold">Mais clareza na operacao.</h2>
              <p className="text-sm text-zinc-300">
                Dashboards e cadastros essenciais em uma experiencia simples e
                fluida para a equipe clinica.
              </p>
            </div>
            <Button asChild variant="secondary" className="w-fit">
              <Link href="/empresa">Explorar painel</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <Card className="border-zinc-200/70 bg-white/80 shadow-sm">
            <CardHeader>
              <CardTitle>Onboarding guiado</CardTitle>
              <CardDescription>
                Fluxo simples para cadastrar novas empresas e ativar dominios.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-zinc-200/70 bg-white/80 shadow-sm">
            <CardHeader>
              <CardTitle>Seguranca</CardTitle>
              <CardDescription>
                Acesso master protegido e dados isolados por tenant.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-zinc-200/70 bg-white/80 shadow-sm">
            <CardHeader>
              <CardTitle>Suporte rapido</CardTitle>
              <CardDescription>
                Acompanhe cada empresa e resolva demandas em um so lugar.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </div>
    </div>
  );
}
