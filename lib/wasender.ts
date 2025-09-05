// lib/wasender.ts

/** Normaliza para E.164, ex.: +2449XXXXXXX */
export function toE164(raw?: string | null) {
  if (!raw) return null;
  const d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  const cc = process.env.DEFAULT_COUNTRY_CODE || "244";
  if (d.startsWith(cc)) return `+${d}`;
  return `+${cc}${d}`;
}

async function safeParse(res: Response) {
  const text = await res.text();
  try {
    return { ok: true, data: text ? JSON.parse(text) : {} };
  } catch {
    return { ok: false, data: text }; // não-JSON (HTML, texto puro, etc.)
  }
}

async function sendWith(body: any) {
  const base = (process.env.WASENDER_BASE_URL || "https://wasenderapi.com").replace(/\/+$/, "");
  const apiKey = process.env.WASENDER_API_KEY;
  if (!apiKey) throw new Error("WASENDER_API_KEY em falta");

  // Tenta Authorization: Bearer
  let r = await fetch(`${base}/api/send-message`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let parsed = await safeParse(r);
  if (r.ok && ((parsed.ok && (parsed.data as any)?.success !== false) || (!parsed.ok && r.ok))) {
    return parsed.ok ? parsed.data : { raw: parsed.data };
  }

  // Tenta x-api-key (alguns providers variam)
  r = await fetch(`${base}/api/send-message`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  parsed = await safeParse(r);
  if (r.ok && ((parsed.ok && (parsed.data as any)?.success !== false) || (!parsed.ok && r.ok))) {
    return parsed.ok ? parsed.data : { raw: parsed.data };
  }

  const message =
    (parsed.ok ? (parsed.data as any)?.error?.message || (parsed.data as any)?.message : String(parsed.data)) ||
    `Falha no envio WhatsApp (HTTP ${r.status})`;

  const err: any = new Error(message);
  err._raw = { status: r.status, body: parsed.ok ? parsed.data : { text: parsed.data } };
  throw err;
}

/** Envia imagem por WhatsApp com caption (tenta payload A e B) */
export async function sendWhatsappImage({
  to,
  imageUrl,
  text,
}: { to: string; imageUrl: string; text?: string }) {
  try {
    // A) Alguns backends aceitam { to, imageUrl, text }
    return await sendWith({ to, imageUrl, text });
  } catch {
    // B) Outros exigem { to, type:"image", url, caption }
    return await sendWith({ to, type: "image", url: imageUrl, caption: text });
  }
}
