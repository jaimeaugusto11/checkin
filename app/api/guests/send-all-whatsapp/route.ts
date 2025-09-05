import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
//import { sendWhatsAppWithQr } from "@/lib/whatsapp.twilio";

export async function POST() {
  try {
    const appBase = process.env.APP_BASE_URL || "http://localhost:3000";
    const snap = await adminDb.collection("guests").get();
    const guests = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    let sent = 0, skipped = 0, failed = 0;
    for (const g of guests) {
      try {
        const phone = g.whatsapp || g.phone || null;
        if (!phone || !g.token) { skipped++; continue; }
        await sendWhatsAppWithQr({
          name: g.fullName,
          phone,
          token: g.token,
          appBase,
        });
        sent++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ ok: true, sent, skipped, failed });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Erro no envio em massa do WhatsApp." }, { status: 500 });
  }
}
