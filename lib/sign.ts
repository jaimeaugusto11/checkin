import crypto from "crypto";

export function signToken(guestId: string, email: string) {
  const secret = process.env.CHECKIN_SECRET || "dev-secret";
  const payload = `${guestId}.${email.toLowerCase()}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${guestId}.${sig}`; // compact token
}

export function verifyToken(token: string, email: string) {
  const [guestId, sig] = token.split(".");
  if (!guestId || !sig) return { ok: false, guestId: null };
  const expected = signToken(guestId, email).split(".")[1];
  return { ok: crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)), guestId };
}
