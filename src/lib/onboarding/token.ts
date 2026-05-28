import { createHmac, timingSafeEqual } from "node:crypto";
import { getOnboardingSecret } from "@/lib/onboarding/config";

export type OnboardingTokenPayload = {
  prospectId: string;
  organizationId: string;
  iat: number;
  exp: number;
};

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

export class OnboardingTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnboardingTokenError";
  }
}

export function signOnboardingToken(input: {
  prospectId: string;
  organizationId: string;
}): string {
  const secret = getOnboardingSecret();
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload: OnboardingTokenPayload = {
    prospectId: input.prospectId,
    organizationId: input.organizationId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifyOnboardingToken(token: string): OnboardingTokenPayload {
  if (!token?.trim()) {
    throw new OnboardingTokenError("Missing registration token");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new OnboardingTokenError("Invalid registration token format");
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const secret = getOnboardingSecret();
  const data = `${headerB64}.${payloadB64}`;
  const expected = createHmac("sha256", secret).update(data).digest("base64url");

  const sigA = Buffer.from(expected);
  const sigB = Buffer.from(signatureB64);
  if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) {
    throw new OnboardingTokenError("Invalid registration token signature");
  }

  let payload: OnboardingTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as OnboardingTokenPayload;
  } catch {
    throw new OnboardingTokenError("Invalid registration token payload");
  }

  if (!payload.prospectId || !payload.organizationId) {
    throw new OnboardingTokenError("Registration token is missing required fields");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new OnboardingTokenError("Registration link has expired. Scan the QR code again.");
  }

  return payload;
}

export function buildRegistrationUrl(token: string): string {
  const base = process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}/register?t=${encodeURIComponent(token)}`;
}
