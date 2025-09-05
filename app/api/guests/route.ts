import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { z } from "zod";
import { signToken } from "@/lib/sign";
import { sendInviteEmail } from "@/lib/email";

const GuestSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  whatsapp: z.string().optional(), // <- novo
  category: z.string().optional(), // <- novo
  phone: z.string().optional(),
  org: z.string().optional(),
  role: z.string().optional(),
});

export async function GET() {
  const snap = await adminDb.collection("guests").orderBy("createdAt", "desc").get();
  const guests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ guests });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = GuestSchema.parse(body);

    // Verifica duplicado (email)
    const dup = await adminDb
      .collection("guests")
      .where("email", "==", data.email.toLowerCase())
      .limit(1)
      .get();

    if (!dup.empty) {
      return NextResponse.json(
        { error: "Já existe um convidado com este e-mail." },
        { status: 409 }
      );
    }

    const now = Date.now();
    const docRef = adminDb.collection("guests").doc();
    const token = signToken(docRef.id, data.email);

    const guest = {
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      whatsapp: data.whatsapp || null,
      category: data.category || null,
      phone: data.phone || null,
      org: data.org || null,
      role: data.role || null,
      status: "invited",
      createdAt: now,
      updatedAt: now,
      checkInAt: null,
      inviteSentAt: now,
      token,
    };

    await docRef.set(guest);
    await sendInviteEmail(guest.email, guest.fullName, token);

    return NextResponse.json({ id: docRef.id, ...guest });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message || "Erro ao criar convidado." },
      { status: 400 }
    );
  }
}
