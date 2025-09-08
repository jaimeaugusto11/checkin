// app/api/guests/send-all-whatsapp/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

type OneRespOK = { ok: true; imageUrl?: string };
type OneRespErr = { ok: false; error: string; details?: any };

type ItemResult = {
  id: string;
  ok: boolean;
  status: number;
  reason?: string;
};

const jOK = (data: any, status = 200) =>
  NextResponse.json({ ok: true, ...data }, { status });
const jErr = (error: string, status = 500, details?: any) =>
  NextResponse.json({ ok: false, error, details: details ?? null }, { status });

function getSelfOrigin(req: NextRequest): string {
  const proto =
    req.headers.get("x-forwarded-proto") ||
    req.headers.get("x-forwarded-protocol") ||
    "http";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

async function callOne(origin: string, id: string, opts?: { dryRun?: boolean }) {
  const url = new URL(`${origin}/api/guests/${encodeURIComponent(id)}/whatsapp`);
  if (opts?.dryRun) url.searchParams.set("dryRun", "1");

  // Retentativa leve para 429/5xx
  for (let attempt = 1; attempt <= 2; attempt++) {
    const r = await fetch(url.toString(), { method: "POST", cache: "no-store" });
    const ct = r.headers.get("content-type") || "";
    const raw = await r.text();
    let data: OneRespOK | OneRespErr | { raw: string } = { raw };
    try {
      if (ct.includes("application/json") && raw) data = JSON.parse(raw) as any;
    } catch {
      data = { raw };
    }

    if (r.ok) return { ok: true, status: r.status, data };

    const reason =
      (data as any)?.error ||
      (typeof (data as any)?.details?.providerMsg === "string" && (data as any).details.providerMsg) ||
      (typeof (data as any)?.message === "string" && (data as any).message) ||
      "Falha ao enviar";

    const status = r.status;
    // re-tenta apenas para 429/5xx
    if (attempt === 1 && (status === 429 || status >= 500)) {
      await new Promise((res) => setTimeout(res, 600));
      continue;
    }
    return { ok: false, status, reason, data };
  }
  return { ok: false, status: 0, reason: "Erro desconhecido" };
}

export async function POST(req: NextRequest) {
  try {
    const origin = getSelfOrigin(req);
    const debug = req.nextUrl.searchParams.get("debug") === "1";
    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1"; // modo sem enviar ao provedor

    const snap = await adminDb.collection("guests").get();
    const guests = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    // Só quem tem whatsapp/phone e token
    const candidates = guests.filter((g) => (g?.whatsapp || g?.phone) && g?.token);

    // Envio sequencial (evita rate limit). Se quiseres, muda para 2–3.
    const results: ItemResult[] = [];
    for (const g of candidates) {
      const r = await callOne(origin, g.id, { dryRun });
      if (r.ok) {
        results.push({ id: g.id, ok: true, status: r.status });
      } else {
        results.push({
          id: g.id,
          ok: false,
          status: r.status,
          reason: r.reason,
        });
      }
    }

    const sent = results.filter((x) => x.ok).length;
    const failed = results.filter((x) => !x.ok).length;
    const skipped = guests.length - candidates.length;

    if (debug) {
      return jOK({ sent, failed, skipped, total: guests.length, dryRun, results });
    }

    const lastFailed = [...results].reverse().find((x) => !x.ok);
    return jOK({
      sent,
      failed,
      skipped,
      total: guests.length,
      dryRun,
      lastError: lastFailed ? { id: lastFailed.id, status: lastFailed.status, reason: lastFailed.reason } : null,
    });
  } catch (e: any) {
    console.error("[send-all-whatsapp] error:", e);
    return jErr(e?.message || "Erro no envio em massa do WhatsApp.", 500);
  }
}
