"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { CheckCircle2, XCircle, RefreshCw, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** Tipos esperados da API de check-in */
type CheckinSuccess = {
  ok: true;
  guest?: {
    id?: string;
    fullName?: string;
    email?: string;
    category?: string | null; // <-- ADICIONADO
    status?: string;
    checkInAt?: number;
  };
  message?: string;
};

type CheckinError = {
  ok?: false;
  error?: string;
  details?: unknown;
};

function extractToken(raw: string): string | null {
  // Aceita: token puro OU URL com ?token=...
  try {
    // Se for URL válida, tenta ler ?token
    const u = new URL(raw);
    const t = u.searchParams.get("token");
    if (t) return t;
  } catch {
    /* não é URL, segue abaixo */
  }
  // Se não era URL, considera o próprio conteúdo o token
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function QrCodeReader() {
  const [result, setResult] = useState<string>("");
  const [status, setStatus] = useState<
    "idle" | "success" | "error" | "loading"
  >("idle");
  const [msg, setMsg] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("");
  const [guestCategory, setGuestCategory] = useState<string>("");
  const [when, setWhen] = useState<string>("");

  // Evita processar várias vezes o mesmo token em loop
  const lastTokenRef = useRef<string | null>(null);
  const lockedRef = useRef<boolean>(false);

  const reset = useCallback(() => {
    setResult("");
    setStatus("idle");
    setMsg("");
    setGuestName("");
    setGuestCategory(""); // <-- ADICIONADO
    setWhen("");
    lastTokenRef.current = null;
    lockedRef.current = false;
  }, []);

  // Chama a tua API de check-in. Tenta POST e faz fallback para GET se necessário.
  const checkIn = useCallback(async (token: string) => {
    setStatus("loading");
    setMsg("");
    setGuestName("");
    setWhen("");

    // helper para interpretar resposta
    const parseResponse = async (r: Response) => {
      const ct = r.headers.get("content-type") || "";
      const raw = await r.text();
      let data: CheckinSuccess | CheckinError | { raw: string } = { raw };
      try {
        if (ct.includes("application/json") && raw) {
          data = JSON.parse(raw) as CheckinSuccess | CheckinError;
        }
      } catch {
        data = { raw };
      }
      return { r, data, raw };
    };

    // tenta POST
    try {
      let res = await fetch(`/api/checkin?token=${encodeURIComponent(token)}`, {
        method: "POST",
      });
      let { r, data } = await parseResponse(res);

      // se o método não é permitido/rota não existe, tenta GET
      if (r.status === 405 || r.status === 404) {
        res = await fetch(`/api/checkin?token=${encodeURIComponent(token)}`, {
          method: "GET",
        });
        ({ r, data } = await parseResponse(res));
      }

      if (!r.ok) {
        // Erros conhecidos
        const em =
          (data as CheckinError)?.error ||
          (typeof (data as any)?.message === "string"
            ? (data as any).message
            : null) ||
          "Não foi possível registar a presença.";
        setStatus("error");
        setMsg(em);
        return;
      }

      // Sucesso
      const ok = data as CheckinSuccess;
      const name = ok?.guest?.fullName || "";
      const t = ok?.guest?.checkInAt
        ? new Date(ok.guest.checkInAt).toLocaleString()
        : new Date().toLocaleString();
      const cat = ok?.guest?.category || "";

      setGuestName(name);
      setWhen(t);
      setGuestCategory(cat);
      setStatus("success");
      setMsg(ok?.message || "Presença confirmada!");

      // Feedback tátil se disponível
      try {
        if (navigator?.vibrate) navigator.vibrate(80);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setStatus("error");
      setMsg("Erro de rede. Verifica a ligação e tenta novamente.");
    }
  }, []);

  const onScan = useCallback(
    (detected: IDetectedBarcode[]) => {
      if (!detected || detected.length === 0) return;
      if (lockedRef.current) return; // já processando

      const raw = detected[0]?.rawValue ?? "";
      const token = extractToken(raw);
      setResult(raw || "");

      if (!token) {
        setStatus("error");
        setMsg("QR inválido. Tenta novamente.");
        return;
      }

      if (
        lastTokenRef.current === token &&
        (status === "loading" || status === "success")
      ) {
        return; // evita reprocessar o mesmo imediatamente
      }

      lastTokenRef.current = token;
      lockedRef.current = true;
      void checkIn(token).finally(() => {
        // desbloqueia após 1.2s para evitar leituras repetidas
        setTimeout(() => {
          lockedRef.current = false;
        }, 1200);
      });
    },
    [checkIn, status]
  );

  const header = useMemo(() => {
    switch (status) {
      case "success":
        return (
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span>Presença confirmada</span>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span>Não foi possível confirmar</span>
          </div>
        );
      case "loading":
        return (
          <div className="flex items-center gap-2 text-slate-600">
            <QrCode className="h-5 w-5 animate-pulse" />
            <span>A processar…</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-slate-700">
            <QrCode className="h-5 w-5" />
            <span>Aponte a câmara para o QR</span>
          </div>
        );
    }
  }, [status]);

  return (
    <div className="min-h-dvh bg-white">
      {/* Topbar simples */}
      <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold leading-tight sm:text-lg">
                  Scanner de Check-in
                </h1>
                <p className="text-xs text-slate-500">
                  Aponte para o QR do convite
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="lg"
              title="Reiniciar leitura"
              onClick={reset}
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Scanner (mantém proporção e responsividade) */}
          <Card className="order-2 sm:order-1">
            <CardHeader>
              <CardTitle className="text-base">{header}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mx-auto w-full max-w-sm">
                <div className="aspect-square overflow-hidden rounded-2xl border">
                  <Scanner
                    onScan={onScan}
                    // @ts-expect-error: onError não está tipado mas é suportado pela lib
                    onError={(error) => {
                      console.error("Erro no scanner:", error);
                      setStatus("error");
                      setMsg("Não foi possível aceder à câmara.");
                    }}
                    allowMultiple={false}
                    components={{
                      audio: true,
                      finder: true,
                    }}
                    constraints={{
                      facingMode: "environment", // usa sempre a traseira quando possível
                    }}
                    // O componente aceita style inline; usamos largura 100% para ser fluido
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              </div>

              {/* Resultado bruto (debug simples) */}
              <div className="mt-3">
                <p className="text-xs text-slate-500 break-all">
                  <span className="font-medium">Lido:</span>{" "}
                  {result ? result : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mensagem ao convidado */}
          <Card className="order-1 sm:order-2">
            <CardHeader>
              <CardTitle className="text-base">Estado do convidado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {status === "success" && (
                <div className="space-y-2">
                  <div className="text-lg font-semibold">
                    Olá{guestName ? `, ${guestName}` : ""}! 🎉
                  </div>
                  <div className="text-slate-700">
                    <span className="font-medium">Presença confirmada.</span>{" "}
                    Bem-vindo(a)!
                  </div>
                  {guestCategory && (
                    <div className="text-sm">
                      <span className="text-slate-500">Categoria: </span>
                      <span className="font-medium">{guestCategory}</span>
                    </div>
                  )}
                  <div className="text-sm text-slate-500">
                    Registado em: {when}
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    Presente
                  </Badge>
                </div>
              )}

              {status === "loading" && (
                <div className="text-slate-700">A validar o teu QR…</div>
              )}

              {status === "error" && (
                <div className="space-y-2">
                  <div className="text-red-600">
                    {msg || "O QR não é válido."}
                  </div>
                  <Badge className="bg-red-100 text-red-700">Falhou</Badge>
                </div>
              )}

              {status === "idle" && (
                <div className="text-slate-600">
                  Assim que lermos o teu QR, confirmamos a tua presença aqui.
                </div>
              )}

              {(status === "success" || status === "error") && (
                <div className="pt-2">
                  <Button className="w-full sm:w-auto" onClick={reset}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Ler outro QR
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
