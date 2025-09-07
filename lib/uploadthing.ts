// lib/uploadthing.ts
import { UTApi } from "uploadthing/server";

/** Envia um Buffer (PNG) para a UploadThing e devolve URL pública */
export async function uploadQrAndGetUrl(png: Buffer, filename = "qrcode.png") {
  if (!process.env.UPLOADTHING_SECRET && !process.env.UPLOADTHING_TOKEN) {
    throw new Error("UPLOADTHING_SECRET/UPLOADTHING_TOKEN em falta");
  }

  try {
    // Instancia sem passar token (a lib usa process.env)
    const utapi = new UTApi();

    // Converter Buffer -> Uint8Array (aceito por File)
    const file = new File([new Uint8Array(png)], filename, { type: "image/png" });

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
