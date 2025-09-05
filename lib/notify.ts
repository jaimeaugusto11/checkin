import QRCode from "qrcode";
import { uploadQrAndGetUrl } from "@/lib/uploadthing";
import { sendInviteEmail } from "@/lib/email"; // já tens este util
import { sendWhatsappImage, toE164 } from "@/lib/wasender";


export async function sendQrByEmailAndWhatsapp({
  name, email, whatsapp, token, appBase
}: {
  name: string; email: string; whatsapp?: string | null; token: string; appBase: string;
}) {
  // 1) Gera PNG do QR (Buffer)
  const png = await QRCode.toBuffer(token, { type: "png" });
  // 2) Sobe para UploadThing e pega URL público
  const publicUrl = await uploadQrAndGetUrl(png, `qr-${encodeURIComponent(name || "guest")}.png`);
  // 3) E-mail (usa o anexo + <img src="cid:qrcode"> que já fizeste)
  await sendInviteEmail(email, name, token); // mantém anexo (redundância boa)
  // 4) WhatsApp (se existir)
  const to = toE164(whatsapp);
  if (to) {
    const link = `${appBase.replace(/\/$/, "")}/checkin?token=${encodeURIComponent(token)}`;
    const caption = `Olá ${name}! Este é o teu QR para check-in.\nLink: ${link}`;
    await sendWhatsappImage({ to, imageUrl: publicUrl, text: caption });
  }
  return { publicUrl };
}
