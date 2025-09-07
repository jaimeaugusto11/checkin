import crypto from "crypto";

export function signToken(guestId: string, email: string) {
  const secret = process.env.CHECKIN_SECRET || "dev-secret";
  const payload = `${guestId}.${email.toLowerCase()}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${guestId}.${sig}`;
}

export function verifyToken(token: string, email: string) {
  const [guestId, sig] = token.split(".");
  if (!guestId || !sig) return { ok: false, guestId: null };

  const expected = signToken(guestId, email).split(".")[1];

  const sigBuf = new Uint8Array(Buffer.from(sig, "hex"));
  const expectedBuf = new Uint8Array(Buffer.from(expected, "hex"));

  return {
    ok: sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf),
    guestId,
  };
}
