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

function readToken(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  return token && token.length > 0 ? token : null;
}

function toClient(id: string, g: GuestDoc) {
  return {
    id,
    fullName: g.fullName,
    email: g.email,
    status: g.status,
    checkInAt: g.checkInAt ?? null,
  };
}

async function performCheckinByToken(token: string) {
  const snap = await adminDb
    .collection("guests")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (snap.empty) {
    return { notFound: true as const };
  }

  const doc = snap.docs[0];
  const data = doc.data() as GuestDoc;

  const now = Date.now();

  if (data.status === "checked_in") {
    // já estava dentro
    return {
      id: doc.id,
      guest: toClient(doc.id, data),
      already: true as const,
    };
  }

  // ainda não estava presente → marcar agora
  await doc.ref.update({
    status: "checked_in",
    checkInAt: now,
    updatedAt: now,
  });

  return {
    id: doc.id,
    guest: toClient(doc.id, {
      ...data,
      status: "checked_in",
      checkInAt: now,
      updatedAt: now,
    }),
    updated: true as const,
  };
}

async function handle(req: NextRequest) {
  try {
    const token = readToken(req);
    if (!token) return jsonErr("Token ausente.", 400);

    const res = await performCheckinByToken(token);
    if ("notFound" in res) {
      return jsonErr("QR inválido ou token não encontrado.", 404);
    }

    if ("already" in res) {
      return jsonOK({
        ok: true,
        message: "O convidado já está dentro.",
        guest: res.guest,
      });
    }

    return jsonOK({
      ok: true,
      message: "Presença confirmada!",
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
