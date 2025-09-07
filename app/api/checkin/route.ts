// app/api/checkin/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

type GuestDoc = {
  fullName: string;
  email: string;
  whatsapp?: string | null;
  category?: string | null;
  status?: "invited" | "pending" | "checked_in";
  token?: string;
  checkInAt?: number | null;
  createdAt?: number;
  updatedAt?: number;
};

function jsonOK(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function jsonErr(error: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error, details: details ?? null }, { status });
}

/** Lê e valida o token do URL (?token=...) */
function readToken(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  return token && token.length > 0 ? token : null;
}

/** Devolve apenas o que o cliente precisa (sem dados sensíveis) */
function toClient(id: string, g: GuestDoc) {
  return {
    id,
    fullName: g.fullName,
    email: g.email,
    status: g.status,
    checkInAt: g.checkInAt ?? null,
  };
}

/** Marca check-in de maneira idempotente */
async function performCheckinByToken(token: string) {
  // Procura por token exacto (como tu salvaste no doc)
  const snap = await adminDb
    .collection("guests")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (snap.empty) {
    // Nenhum convidado com esse token
    return { notFound: true as const };
  }

  const doc = snap.docs[0];
  const data = doc.data() as GuestDoc;

  const now = Date.now();
  let updated = false;

  // Se já estava presente, não sobrescreve a hora
  if (data.status !== "checked_in") {
    await doc.ref.update({
      status: "checked_in",
      checkInAt: now,
      updatedAt: now,
    });
    updated = true;
  }

  const refreshed = updated
    ? ({
        ...(data as any),
        status: "checked_in",
        checkInAt: now,
        updatedAt: now,
      } as GuestDoc)
    : data;

  return {
    id: doc.id,
    guest: toClient(doc.id, refreshed),
    updated,
  };
}

/** Handler partilhado para GET/POST */
async function handle(req: NextRequest) {
  try {
    const token = readToken(req);
    if (!token) return jsonErr("Token ausente.", 400);

    const res = await performCheckinByToken(token);
    if ("notFound" in res) {
      return jsonErr("QR inválido ou token não encontrado.", 404);
    }

    const message = res.updated
      ? "Presença confirmada!"
      : "Convidado já estava marcado como presente.";

    return jsonOK({
      ok: true,
      message,
      guest: res.guest,
    });
  } catch (e: any) {
    console.error("[checkin] erro:", e);
    return jsonErr("Falha ao processar check-in.", 500, { message: e?.message || String(e) });
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
