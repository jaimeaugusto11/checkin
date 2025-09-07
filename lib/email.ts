// lib/email.ts
import QRCode from "qrcode";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendInviteEmail(email: string, name: string, token: string) {
  if (!resend) return;

  const eventName = process.env.EVENT_NAME || "IMERSÃO JURIDICA";
  const appBase = process.env.APP_BASE_URL || "http://localhost:3000";
  const qrBuffer = await QRCode.toBuffer(token, { type: "png" });

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif; max-width:600px; margin:auto;">
    <h2 style="margin:0 0 8px">Convite: ${eventName}</h2>
    <p style="margin:0 0 12px">Olá <b>${name}</b>,</p>
    <p style="margin:0 0 16px">O seu QR de check-in está em anexo e também incorporado abaixo:</p>
    <p style="text-align:center; margin:16px 0">
      <img src="cid:qrcode" alt="QR Code" style="max-width:200px; width:100%; height:auto" />
    </p>
    <p style="margin:16px 0">Ou aceda diretamente:
      <a href="${appBase}/checkin?token=${encodeURIComponent(token)}">
        ${appBase}/checkin?token=${encodeURIComponent(token)}
      </a>
    </p>
    <hr />
    <small>Se não reconhece este convite, ignore este e-mail.</small>
  </div>`;

  await resend.emails.send({
  from: process.env.EMAIL_FROM || "Convites <no-reply@example.com>",
  to: [email],
  subject: `Convite - ${eventName}`,
  html,
  replyTo: process.env.EMAIL_REPLY_TO || undefined, // ✅ corrigido
  attachments: [
    {
      filename: "qrcode.png",
      content: qrBuffer, // ✅ usa Buffer direto (sem precisar encoding)
      cid: "qrcode",
    } as any,
  ],
});
}
