import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    await adminDb.collection("guests").doc(params.id).update({ ...body, updatedAt: Date.now() });
    const doc = await adminDb.collection("guests").doc(params.id).get();
    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao atualizar." }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await adminDb.collection("guests").doc(params.id).delete();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao apagar." }, { status: 400 });
  }
}
