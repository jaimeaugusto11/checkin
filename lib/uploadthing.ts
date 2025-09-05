// lib/uploadthing.ts
import { UTApi } from "uploadthing/server";

/** Envia um Buffer (PNG) para a UploadThing e devolve URL pública */
export async function uploadQrAndGetUrl(png: Buffer, filename = "qrcode.png") {
  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) {
    throw new Error("UPLOADTHING_TOKEN em falta");
  }

  try {
    // Instancia o UTApi apenas agora (evita crash a nível de import)
    const utapi = new UTApi({ token });

    // Node 18+ (Next) expõe File/Blob via undici
    const file = new File([png], filename, { type: "image/png" });

    const res = await utapi.uploadFiles(file);
    const item: any = Array.isArray(res) ? res[0] : res;

    if (item?.error) {
      console.error("[uploadthing] provider error:", item.error);
      throw new Error(String(item.error));
    }

    const url = item?.data?.url;
    if (!url) throw new Error("UploadThing não retornou URL pública");

    return url as string;
  } catch (err: any) {
    console.error("[uploadthing] exception:", err);
    throw new Error("Falha no upload para UploadThing: " + (err?.message || String(err)));
  }
}
