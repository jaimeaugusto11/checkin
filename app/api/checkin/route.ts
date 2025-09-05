'use client'
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyToken } from "@/lib/sign";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Token em falta." }, { status: 400 });

    // Find guest by token fast (indexed)
    const snap = await adminDb.collection("guests").where("token", "==", token).limit(1).get();
    if (snap.empty) return NextResponse.json({ error: "QR inválido ou convidado não encontrado." }, { status: 404 });
    const doc = snap.docs[0];
    const g = doc.data() as any;
    // Verify signature against stored email
    const ok = verifyToken(token, g.email).ok;
    if (!ok) return NextResponse.json({ error: "Assinatura inválida." }, { status: 403 });

    if (g.status === "checked_in") {
      return NextResponse.json({ ok: true, already: true, id: doc.id, guest: g });
    }

    const now = Date.now();
    await doc.ref.update({ status: "checked_in", checkInAt: now, updatedAt: now });
    return NextResponse.json({ ok: true, id: doc.id, checkInAt: now });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Falha no check-in." }, { status: 500 });
  }
}
