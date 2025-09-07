// app/api/guests/[id]/whatsapp/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import QRCode from "qrcode";
import { uploadQrAndGetUrl } from "@/lib/uploadthing";
import { sendWhatsappImage, toE164 } from "@/lib/wasender";

function jsonError(message: string, status = 500, details?: any) {
  return NextResponse.json(
    { error: message, details: details ?? null },
    { status }
  );
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.WASENDER_API_KEY)
      return jsonError("WASENDER_API_KEY ausente", 500);
    if (!process.env.UPLOADTHING_TOKEN)
      return jsonError("UPLOADTHING_TOKEN ausente", 500);

    const snap = await adminDb.collection("guests").doc(params.id).get();
    if (!snap.exists) return jsonError("Convidado não encontrado", 404);

    const g = snap.data() as any;
    if (!g?.token) return jsonError("Convidado sem token", 400);

    const to = toE164(g.whatsapp || g.phone);
    if (!to)
      return jsonError("WhatsApp inválido/ausente (use formato +244...)", 400);

    const png = await QRCode.toBuffer(g.token, { type: "png" });
    const imageUrl = await uploadQrAndGetUrl(png, `qr-${params.id}.png`);

    const appBase = process.env.APP_BASE_URL || "http://localhost:3000";
    const caption = `Saudações Prezado(a) ${
      g.fullName
    }! Em nome da LB - Conexão, a Diodigital.Lda, 
vem por meio desta fornecer o teu Código QR para o check-in na Imersão Jurídica.
Sugerimos guarda-lo para uso no dia do evento que será 12 de Setembro.

Atenciosamente
  DIODIGITAL\n`;

    const providerResp = await sendWhatsappImage({
      to,
      imageUrl,
      text: caption,
    });

    await snap.ref.update({ updatedAt: Date.now() });
    return NextResponse.json(
      { ok: true, imageUrl, provider: providerResp },
      { status: 200 }
    );
  } catch (e: any) {
    const details = e?._raw || { message: e?.message || String(e) };
    console.error("[whatsapp one] error:", details);
    return jsonError(e?.message || "Erro ao enviar WhatsApp.", 502, details);
  }
}
