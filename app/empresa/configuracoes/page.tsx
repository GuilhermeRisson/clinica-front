"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast } from "@/components/ui/toast";
import { apiGet, apiPut } from "@/lib/api";

type NotificationSetting = {
  notify_email?: boolean;
  notify_whatsapp?: boolean;
  reminder_days?: number;
  reminder_time?: string | null;
};

const TOKEN_KEY = "clinica.tenant.token";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSetting>({
    notify_email: false,
    notify_whatsapp: false,
    reminder_days: 0,
    reminder_time: "",
  });
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

    apiGet<NotificationSetting>(`${baseUrl}/notification-settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) =>
        setSettings({
          notify_email: data?.notify_email ?? false,
          notify_whatsapp: data?.notify_whatsapp ?? false,
          reminder_days: data?.reminder_days ?? 0,
          reminder_time: data?.reminder_time ?? "",
        })
      )
      .catch((error) =>
        setToast({ message: error instanceof Error ? error.message : "Erro ao carregar.", variant: "error" })
      );
  }, [baseUrl, router]);

  async function handleSave() {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push("/empresa/login");
      return;
    }

    try {
      await apiPut(
        `${baseUrl}/notification-settings`,
        {
          notify_email: !!settings.notify_email,
          notify_whatsapp: !!settings.notify_whatsapp,
          reminder_days: Number(settings.reminder_days ?? 0),
          reminder_time: settings.reminder_time || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToast({ message: "Configuracoes salvas.", variant: "success" });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Erro ao salvar.", variant: "error" });
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-2">
          <Badge className="w-fit bg-zinc-900 text-zinc-50">Configuracoes</Badge>
          <h1 className="text-3xl font-semibold text-zinc-900">Notificacoes de pagamento</h1>
          <p className="text-sm text-zinc-500">
            Escolha como os lembretes de pagamento serao enviados aos pacientes.
          </p>
        </header>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Preferencias</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={!!settings.notify_email}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, notify_email: e.target.checked }))
                }
              />
              Enviar lembrete por e-mail
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={!!settings.notify_whatsapp}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, notify_whatsapp: e.target.checked }))
                }
              />
              Enviar lembrete por WhatsApp
            </label>
            <div className="space-y-2">
              <Label>Dias antes do vencimento</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={settings.reminder_days ?? 0}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, reminder_days: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Horario de envio</Label>
              <Input
                type="time"
                value={settings.reminder_time ?? ""}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, reminder_time: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <Button onClick={handleSave}>Salvar configuracoes</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Toast
        open={!!toast}
        message={toast?.message ?? ""}
        variant={toast?.variant ?? "success"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
