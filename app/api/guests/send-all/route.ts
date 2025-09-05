// app/api/guests/send-all-whatsapp/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import QRCode from "qrcode";
import { uploadQrAndGetUrl } from "@/lib/uploadthing";
import { sendWhatsappImage, toE164 } from "@/lib/wasender";

export async function POST() {
  try {
    const snap = await adminDb.collection("guests").get();
    const guests = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    const appBase = process.env.APP_BASE_URL || "http://localhost:3000";
    let sent = 0, skipped = 0, failed = 0;
    let lastError: any = null;

    for (const g of guests) {
      try {
        const to = toE164(g.whatsapp || g.phone);
        if (!to || !g.token) { skipped++; continue; }

        const png = await QRCode.toBuffer(g.token, { type: "png" });
        const imageUrl = await uploadQrAndGetUrl(png, `qr-${g.id}.png`);
        const caption = `Olá ${g.fullName}! Este é o teu QR para check-in.\n${appBase}/checkin?token=${encodeURIComponent(g.token)}`;

        await sendWhatsappImage({ to, imageUrl, text: caption });
        sent++;
      } catch (err: any) {
        failed++;
        lastError = err?._raw || { message: err?.message || String(err) };
      }
    }

    return NextResponse.json({ ok: true, sent, skipped, failed, lastError });
  } catch (e: any) {
    console.error("[whatsapp all] error:", e);
    return NextResponse.json({ error: e.message || "Erro no envio em massa do WhatsApp." }, { status: 500 });
  }
}
