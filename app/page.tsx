"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TH, TD } from "@/components/ui/table";
import {
  Download,
  Mail,
  QrCode,
  Upload,
  RefreshCw,
  Send,
  Trash2,
  MessageCircle,
  Loader2,
  Search,
  FileSpreadsheet,
  Plus,
} from "lucide-react";
import type { Guest } from "@/types/guests";
import Image from "next/image";

/* ===================== Tipos & Utils ===================== */

type ImportRow = {
  fullName: string;
  email: string;
  whatsapp?: string;
  category?: string;
};


type JsonGuests = { guests?: Guest[] };
type JsonError = { error?: string; details?: unknown };
type JsonBulk = { error?: string };
type JsonSendAllWa = { sent?: number; skipped?: number; failed?: number; error?: string };

function normalizeHeader(h: string): keyof ImportRow | string {
  const s = h.trim().toLowerCase();
  if (s.includes("nome")) return "fullName";
  if (s.includes("e-mail") || s.includes("email")) return "email";
  if (s.includes("whatsapp")) return "whatsapp";
  if (s.includes("categoria")) return "category";
  return s;
}

function clsx(...c: Array<string | false | undefined | null>): string {
  return c.filter(Boolean).join(" ");
}

/* ===================== Página ===================== */

export default function Page() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [busyAction, setBusyAction] = useState<null | string>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLLabelElement>(null);

  /* -------- Fetch inicial -------- */
  async function fetchGuests(): Promise<void> {
    setLoading(true);
    try {
      const r = await fetch("/api/guests");
      const j = (await r.json().catch(() => ({}))) as JsonGuests;
      setGuests(Array.isArray(j.guests) ? j.guests : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void fetchGuests();
  }, []);

  /* -------- Debounce pesquisa -------- */
  useEffect(() => {
    const t = setTimeout(() => setFilter(query), 220);
    return () => clearTimeout(t);
  }, [query]);

  /* -------- XLSX: parse helpers -------- */
  function parseWorkbook(data: ArrayBuffer): ImportRow[] {
    const wb = XLSX.read(new Uint8Array(data), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return [];

    const sheet = XLSX.utils.sheet_to_json<unknown[]>(ws as XLSX.WorkSheet, { header: 1 });
    const [head, ...rows] = sheet as [unknown[], ...unknown[][]] | [];
    if (!head || !Array.isArray(head)) return [];

    const map = (head as unknown[]).map((h) => normalizeHeader(String(h ?? "")));
    const parsed: ImportRow[] = (rows as unknown[][])
      .filter((r) => Array.isArray(r) && r.length > 0)
      .map((r) => {
        const obj: Record<string, string> = {};
        map.forEach((k, i) => {
          const key = String(k);
          const cell = r[i];
          obj[key] = typeof cell === "string" ? cell.trim() : String(cell ?? "").trim();
        });
        const row: ImportRow = {
          fullName: obj.fullName || "",
          email: obj.email || "",
          whatsapp: obj.whatsapp || "",
          category: obj.category || "",
        };
        return row;
      })
      .filter((r) => Boolean(r.fullName) && Boolean(r.email));
    return parsed;
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(parseWorkbook(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(f);
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(parseWorkbook(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(f);
  }, []);

  // Conectando eventos nativos com tipos seguros (sem any)
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    const handleDrop = (ev: Event) => {
      // converte Event -> React.DragEvent signature-like
      onDrop(ev as unknown as React.DragEvent<HTMLElement>);
    };
    el.addEventListener("dragover", prevent);
    el.addEventListener("dragenter", prevent);
    el.addEventListener("drop", handleDrop);
    return () => {
      el.removeEventListener("dragover", prevent);
      el.removeEventListener("dragenter", prevent);
      el.removeEventListener("drop", handleDrop);
    };
  }, [onDrop]);

  /* -------- Ações -------- */
  async function importAll(sendEmails: boolean): Promise<void> {
    if (!preview.length) {
      alert("Nenhum dado para importar.");
      return;
    }
    setBusyAction(sendEmails ? "import_send" : "import");
    try {
      const r = await fetch("/api/guests/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview, sendEmails }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as JsonBulk;
        alert(j.error || "Falha na importação");
      } else {
        setPreview([]);
        await fetchGuests();
        if (sendEmails) alert("Convites enviados com sucesso!");
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function sendAll(): Promise<void> {
    if (!confirm("Enviar QR por E-mail para todos os convidados?")) return;
    setBusyAction("email_all");
    try {
      const r = await fetch("/api/guests/send-all", { method: "POST" });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as JsonError;
        alert(j.error || "Falha ao enviar para todos");
      } else {
        alert("Convites enviados!");
        await fetchGuests();
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function sendOne(id: string): Promise<void> {
    setBusyAction(`email_${id}`);
    try {
      const r = await fetch(`/api/guests/${id}/invite`, { method: "POST" });
      if (!r.ok) alert("Falha ao enviar");
      await fetchGuests();
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteGuest(id: string): Promise<void> {
    if (!confirm("Tens a certeza que queres apagar este convidado? Esta ação é irreversível.")) return;
    setBusyAction(`delete_${id}`);
    try {
      const r = await fetch(`/api/guests/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as JsonError;
        alert(j?.error || "Falha ao apagar convidado.");
      } else {
        await fetchGuests();
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function sendWhatsAppOne(id: string): Promise<void> {
    setBusyAction(`wa_${id}`);
    try {
      const r = await fetch(`/api/guests/${id}/whatsapp`, { method: "POST" });
      const ct = r.headers.get("content-type") || "";
      const raw = await r.text();
      let data: JsonError | { raw: string } = {};
      try {
        data = ct.includes("application/json") && raw ? (JSON.parse(raw) as JsonError) : { raw };
      } catch {
        data = { raw };
      }
      if (!r.ok) {
  let message = "Falha ao enviar WhatsApp.";

  if ("error" in data && data.error) {
    message = data.error;
  }

  if ("details" in data && data.details) {
    message += `\nDetalhes: ${JSON.stringify(data.details)}`;
  }

  alert(message);
  return;
}

      alert("WhatsApp enviado!");
      await fetchGuests();
    } finally {
      setBusyAction(null);
    }
  }

  async function sendWhatsAppAll(): Promise<void> {
    if (!confirm("Enviar WhatsApp com QR para todos os convidados com WhatsApp definido?")) return;
    setBusyAction("wa_all");
    try {
      const r = await fetch(`/api/guests/send-all-whatsapp`, { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as JsonSendAllWa | JsonError;
      if (!r.ok) {
        const je = j as JsonError;
        alert(je?.error || "Falha ao enviar WhatsApp em massa.");
      } else {
        const ok = j as JsonSendAllWa;
        const sent = ok.sent ?? 0;
        const skipped = ok.skipped ?? 0;
        const failed = ok.failed ?? 0;
        alert(`WhatsApp → enviados: ${sent}, ignorados: ${skipped}, falhados: ${failed}`);
      }
    } finally {
      setBusyAction(null);
    }
  }

  /* -------- Filtro -------- */
  const filtered = useMemo<Guest[]>(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) => {
      const w = (g.whatsapp || "").toLowerCase();
      const c = (g.category || "").toLowerCase();
      return (
        g.fullName.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        w.includes(q) ||
        c.includes(q)
      );
    });
  }, [filter, guests]);

  /* -------- Export -------- */
  function exportCsv(): void {
    const headers = ["Nome", "Email", "WhatsApp", "Categoria", "Estado", "CheckInAt"];
    const rows = guests.map((g) => [
      g.fullName,
      g.email,
      g.whatsapp || "",
      g.category || "",
      g.status,
      g.checkInAt ? new Date(g.checkInAt).toISOString() : "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "convidados.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ===================== UI ===================== */

  return (
    <div className="min-h-dvh bg-white">
      {/* Topbar minimalista */}
      <div className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-white">
              <Image src={"/logo.jpeg"} alt="logo" width={20} height={20} className="h-10 w-10" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold leading-tight">Gestor Diodigital</h1>
              <p className="text-xs text-slate-500">Importar • Convidar • Check-in</p>
            </div>

            {/* Ações principais (ícones-only) */}
            <div className="ml-auto hidden items-center gap-2 md:flex">
              <Button
                variant="ghost"
                size="md"
                title="Atualizar"
                disabled={loading || busyAction !== null}
                onClick={() => void fetchGuests()}
                className="rounded-lg"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="md"
                title="Exportar CSV"
                onClick={exportCsv}
                className="rounded-lg"
              >
                <Download className="h-4 w-4" />
              </Button>

              <a href="/scan" title="Abrir Scanner">
                <Button variant="default" size="md" className="rounded-lg">
                  <QrCode className="h-4 w-4" />
                </Button>
              </a>

              <Button
                variant="default"
                size="lg"
                title="Enviar e-mail a todos"
                onClick={() => void sendAll()}
                disabled={busyAction !== null}
                className="rounded-lg"
              >
                {busyAction === "email_all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>

              <Button
                variant="default"
                size="lg"
                title="WhatsApp a todos"
                onClick={() => void sendWhatsAppAll()}
                disabled={busyAction !== null}
                className="rounded-lg"
              >
                {busyAction === "wa_all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Importar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" /> Importar XLSX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Estrutura: <b>Nome completo</b>, <b>WhatsApp</b>, <b>E-mail</b>, <b>Categoria</b> (1ª folha).
              </p>

              <label
                ref={dropRef}
                className={clsx(
                  "group relative block cursor-pointer rounded-xl border border-dashed p-5 transition",
                  "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-900 text-white">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">Arrasta o .xlsx aqui</div>
                    <div className="text-xs text-slate-500">ou toca para selecionar</div>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx" className="sr-only" onChange={onFile} />
              </label>

              {preview.length > 0 ? (
                <>
                  <div className="text-sm text-slate-700">
                    Pré-visualização <span className="text-slate-500">({preview.length} linhas)</span>
                  </div>
                  <div className="rounded-lg border">
                    <Table>
                      <THead>
                        <tr>
                          <TH>Nome</TH>
                          <TH>Email</TH>
                          <TH className="hidden md:table-cell">WhatsApp</TH>
                          <TH className="hidden lg:table-cell">Categoria</TH>
                        </tr>
                      </THead>
                      <TBody>
                        {preview.slice(0, 10).map((r, i) => (
                          <tr key={i} className="align-top">
                            <TD className="whitespace-pre-wrap break-words">{r.fullName}</TD>
                            <TD className="whitespace-pre-wrap break-words">{r.email}</TD>
                            <TD className="hidden whitespace-pre-wrap break-words md:table-cell">
                              {r.whatsapp || "-"}
                            </TD>
                            <TD className="hidden whitespace-pre-wrap break-words lg:table-cell">
                              {r.category || "-"}
                            </TD>
                          </tr>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button disabled={busyAction !== null} onClick={() => void importAll(false)} className="flex-1">
                      {busyAction === "import" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Importar (sem enviar)
                    </Button>
                    <Button disabled={busyAction !== null} onClick={() => void importAll(true)} className="flex-1">
                      {busyAction === "import_send" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Importar & enviar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Sem pré-visualização. Importa um ficheiro para começar.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Convidados</CardTitle>
                <div className="relative w-full sm:w-96">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Procurar por nome, email, WhatsApp, categoria…"
                    className="w-full rounded-lg pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Empty */}
              {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-10 text-center">
                  <div className="mb-3 text-4xl">🗂️</div>
                  <div className="text-base font-medium">Nada encontrado</div>
                  <div className="mt-1 text-sm text-slate-600">Ajusta a pesquisa ou importa um XLSX.</div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={() => void fetchGuests()}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()}>
                      <Plus className="mr-2 h-4 w-4" /> Importar XLSX
                    </Button>
                  </div>
                </div>
              )}

              {/* Desktop: tabela */}
              {filtered.length > 0 && (
                <div className="hidden sm:block">
                  <div className="rounded-xl border">
                    <Table>
                      <THead>
                        <tr>
                          <TH className="w-[24%]">Nome</TH>
                          <TH className="w-[26%]">Email</TH>
                          <TH className="hidden w-[18%] md:table-cell">WhatsApp</TH>
                          <TH className="hidden w-[14%] lg:table-cell">Categoria</TH>
                          <TH className="w-[10%]">Estado</TH>
                          <TH className="w-[8%] text-right">Ações</TH>
                        </tr>
                      </THead>
                      <TBody>
                        {filtered.map((g) => {
                          const emailBusy = busyAction === `email_${g.id}`;
                          const waBusy = busyAction === `wa_${g.id}`;
                          const delBusy = busyAction === `delete_${g.id}`;
                          return (
                            <tr key={g.id} className="align-top">
                              <TD className="whitespace-pre-wrap break-words">{g.fullName}</TD>
                              <TD className="whitespace-pre-wrap break-words">{g.email}</TD>
                              <TD className="hidden whitespace-pre-wrap break-words md:table-cell">
                                {g.whatsapp || "-"}
                              </TD>
                              <TD className="hidden whitespace-pre-wrap break-words lg:table-cell">
                                {g.category || "-"}
                              </TD>
                              <TD>
                                {g.status === "checked_in" ? (
                                  <Badge className="bg-green-100 text-green-700">Presente</Badge>
                                ) : g.status === "invited" ? (
                                  <Badge>Convidado</Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>
                                )}
                              </TD>
                              <TD>
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="md"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-md"
                                    title="Abrir QR / link de check-in"
                                    onClick={() => {
                                      const url = `/checkin?token=${encodeURIComponent(g.token)}`;
                                      if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
                                    }}
                                  >
                                    <QrCode className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="md"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-md"
                                    title="Enviar e-mail"
                                    disabled={emailBusy || busyAction !== null}
                                    onClick={() => void sendOne(g.id)}
                                  >
                                    {emailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                  </Button>
                                  <Button
                                    size="lg"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-md"
                                    title="Enviar WhatsApp"
                                    disabled={waBusy || busyAction !== null}
                                    onClick={() => void sendWhatsAppOne(g.id)}
                                  >
                                    {waBusy ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MessageCircle className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="lg"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-md text-red-600 hover:text-red-700"
                                    title={g.status === "checked_in" ? "Não é possível apagar presença registada" : "Apagar convidado"}
                                    disabled={delBusy || g.status === "checked_in" || busyAction !== null}
                                    onClick={() => void deleteGuest(g.id)}
                                  >
                                    {delBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </TD>
                            </tr>
                          );
                        })}
                      </TBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Mobile: cartões compactos */}
              <div className="sm:hidden space-y-3">
                {filtered.map((g) => {
                  const emailBusy = busyAction === `email_${g.id}`;
                  const waBusy = busyAction === `wa_${g.id}`;
                  return (
                    <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{g.fullName}</div>
                          <div className="truncate text-xs text-slate-600">{g.email}</div>
                          {(g.whatsapp || g.category) && (
                            <div className="mt-1 space-x-2 text-[11px] text-slate-600">
                              {g.whatsapp && <span>📱 {g.whatsapp}</span>}
                              {g.category && <span>🏷 {g.category}</span>}
                            </div>
                          )}
                          <div className="mt-2">
                            {g.status === "checked_in" ? (
                              <Badge className="bg-green-100 text-green-700">Presente</Badge>
                            ) : g.status === "invited" ? (
                              <Badge>Convidado</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            size="lg"
                            variant="ghost"
                            className="h-9 w-9 rounded-lg"
                            title="QR / link"
                            onClick={() => {
                              const url = `/checkin?token=${encodeURIComponent(g.token)}`;
                              if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            size="lg"
                            variant="ghost"
                            className="h-9 w-9 rounded-lg"
                            title="E-mail"
                            disabled={emailBusy || busyAction !== null}
                            onClick={() => void sendOne(g.id)}
                          >
                            {emailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="lg"
                            variant="ghost"
                            className="h-9 w-9 rounded-lg"
                            title="WhatsApp"
                            disabled={waBusy || busyAction !== null}
                            onClick={() => void sendWhatsAppOne(g.id)}
                          >
                            {waBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action bar fixa (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Button
            variant="ghost"
            size="md"
            className="h-10 w-10 rounded-lg"
            title="Atualizar"
            onClick={() => void fetchGuests()}
            disabled={loading || busyAction !== null}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
          </Button>
          <a href="/scan" title="Scanner">
            <Button variant="default" size="md" className="h-10 w-10 rounded-lg">
              <QrCode className="h-5 w-5" />
            </Button>
          </a>
          <Button
            variant="default"
            size="md"
            className="h-10 w-10 rounded-lg"
            title="WhatsApp a todos"
            onClick={() => void sendWhatsAppAll()}
            disabled={busyAction !== null}
          >
            {busyAction === "wa_all" ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
