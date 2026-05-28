/**
 * Builds a WhatsApp deep link for QR codes (Ocard-style onboarding).
 * Scanning opens WhatsApp with a pre-filled message; sending it hits POST /api/webhooks/whatsapp.
 */
export function buildWhatsAppOnboardingQrUrl(input: {
  /** E.164 digits only, e.g. "6591234567" for wa.me/6591234567 */
  businessPhone: string;
  /** Prefilled message the user sends to trigger onboarding, e.g. "Hi, I'd like to register" */
  prefilledMessage: string;
}): string {
  const phone = input.businessPhone.replace(/\D/g, "");
  const text = encodeURIComponent(input.prefilledMessage.trim());
  return `https://wa.me/${phone}?text=${text}`;
}
