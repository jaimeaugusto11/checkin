import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { signToken } from "@/lib/sign";
import { sendInviteEmail } from "@/lib/email";

type Row = {
  fullName: string;
  email: string;
  whatsapp?: string | null;
  category?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const { rows, sendEmails } = await req.json() as { rows: Row[]; sendEmails?: boolean };
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Sem dados para importar." }, { status: 400 });
    }

    const now = Date.now();
    const batch = adminDb.bulkWriter();

    for (const r of rows) {
      if (!r?.fullName || !r?.email) continue;
      const email = r.email.toLowerCase();

      // verifica duplicado por email
      const dup = await adminDb.collection("guests").where("email", "==", email).limit(1).get();
      if (!dup.empty) {
        // actualiza (opcional)
        const doc = dup.docs[0];
        batch.update(doc.ref, {
          fullName: r.fullName,
          whatsapp: r.whatsapp || null,
          category: r.category || null,
          updatedAt: now,
        });
        if (sendEmails) {
          const g = doc.data() as any;
          await sendInviteEmail(email, r.fullName, g.token);
          batch.update(doc.ref, { inviteSentAt: Date.now(), status: "invited" });
        }
        continue;
      }

      // cria novo com token
      const docRef = adminDb.collection("guests").doc();
      const token = signToken(docRef.id, email);
      batch.set(docRef, {
        fullName: r.fullName,
        email,
        whatsapp: r.whatsapp || null,
        category: r.category || null,
        status: "invited",
        createdAt: now,
        updatedAt: now,
        checkInAt: null,
        inviteSentAt: sendEmails ? now : null,
        token,
      });

      if (sendEmails) {
        await sendInviteEmail(email, r.fullName, token);
      }
    }

    await batch.close();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Erro na importação." }, { status: 500 });
  }
}
