import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Resend } from "resend";
import { generateQrPngDataUrl } from "@/lib/qrcode";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!resend) return NextResponse.json({ error: "Resend não configurado" }, { status: 500 });
    const doc = await adminDb.collection("guests").doc(params.id).get();
    if (!doc.exists) return NextResponse.json({ error: "Convidado não encontrado" }, { status: 404 });
    const g = doc.data() as any;
    const qr = await generateQrPngDataUrl(g.token);
    const appBase = process.env.APP_BASE_URL || "http://localhost:3000";
    const html = `
    <div style="font-family:Arial,Helvetica,sans-serif">
      <h2>Convite: ${process.env.EVENT_NAME || "Palestra"}</h2>
      <p>Olá ${g.fullName},</p>
      <p>Segue novamente o seu QR de check-in.</p>
      <p><img src="${qr}" /></p>
      <p>Ou aceda: <a href="${appBase}/checkin?token=${encodeURIComponent(g.token)}">${appBase}/checkin?token=${encodeURIComponent(g.token)}</a></p>
    </div>`;
    await resend.emails.send({
  from: process.env.EMAIL_FROM || "Convites <no-reply@example.com>",
  to: [g.email],
  subject: `Reenvio do convite - ${process.env.EVENT_NAME || "Palestra"}`,
  html,
  replyTo: process.env.EMAIL_REPLY_TO || undefined, // ✅ camelCase
});

    await adminDb.collection("guests").doc(params.id).update({ inviteSentAt: Date.now(), updatedAt: Date.now() });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Erro a reenviar." }, { status: 500 });
  }
}
