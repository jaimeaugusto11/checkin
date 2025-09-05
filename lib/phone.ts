export function toE164(whatsapp?: string | null, defaultCountryCode = "+244") {
  if (!whatsapp) return null;
  const digits = whatsapp.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith(defaultCountryCode.replace("+", ""))) return `+${digits}`;
  return `${defaultCountryCode}${digits}`;
}
