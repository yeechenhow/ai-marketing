"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  parseOrganizationSettings,
  type OrgOnboardingSettings,
} from "@/lib/onboarding/org-settings";
import { canAccessOrgPortal } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireOrgAdmin() {
  const session = await auth();
  if (!session?.user.organizationId) throw new Error("Unauthorized");
  if (!canAccessOrgPortal(session.user)) throw new Error("Forbidden");
  return session;
}

const onboardingSettingsSchema = z.object({
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  facebookAppId: z.string().optional(),
  facebookAppSecret: z.string().optional(),
  whatsappVerifyToken: z.string().optional(),
  whatsappAppSecret: z.string().optional(),
  whatsappAccessToken: z.string().optional(),
  whatsappPhoneNumberId: z.string().optional(),
});

function trimOptional(value: FormDataEntryValue | null): string | undefined {
  const text = (value as string | null)?.trim();
  return text || undefined;
}

export async function updateOrgOnboardingSettings(formData: FormData) {
  const session = await requireOrgAdmin();
  const orgId = session.user.organizationId!;

  const parsed = onboardingSettingsSchema.parse({
    googleClientId: trimOptional(formData.get("googleClientId")),
    googleClientSecret: trimOptional(formData.get("googleClientSecret")),
    facebookAppId: trimOptional(formData.get("facebookAppId")),
    facebookAppSecret: trimOptional(formData.get("facebookAppSecret")),
    whatsappVerifyToken: trimOptional(formData.get("whatsappVerifyToken")),
    whatsappAppSecret: trimOptional(formData.get("whatsappAppSecret")),
    whatsappAccessToken: trimOptional(formData.get("whatsappAccessToken")),
    whatsappPhoneNumberId: trimOptional(formData.get("whatsappPhoneNumberId")),
  });

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error("Organization not found");

  const current = parseOrganizationSettings(org.settings);
  const prev = current.onboarding ?? {};

  const nextOnboarding: OrgOnboardingSettings = {
    oauth: {
      googleClientId: parsed.googleClientId ?? prev.oauth?.googleClientId,
      googleClientSecret:
        parsed.googleClientSecret ?? prev.oauth?.googleClientSecret,
      facebookAppId: parsed.facebookAppId ?? prev.oauth?.facebookAppId,
      facebookAppSecret:
        parsed.facebookAppSecret ?? prev.oauth?.facebookAppSecret,
    },
    whatsapp: {
      verifyToken: parsed.whatsappVerifyToken ?? prev.whatsapp?.verifyToken,
      appSecret: parsed.whatsappAppSecret ?? prev.whatsapp?.appSecret,
      accessToken: parsed.whatsappAccessToken ?? prev.whatsapp?.accessToken,
      phoneNumberId: parsed.whatsappPhoneNumberId ?? prev.whatsapp?.phoneNumberId,
    },
  };

  await db.organization.update({
    where: { id: orgId },
    data: {
      settings: {
        ...current,
        onboarding: nextOnboarding,
      } as Prisma.InputJsonValue,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "onboarding.settings.updated",
      entityType: "Organization",
      entityId: orgId,
      details: {
        googleConfigured: Boolean(
          nextOnboarding.oauth?.googleClientId && nextOnboarding.oauth?.googleClientSecret,
        ),
        facebookConfigured: Boolean(
          nextOnboarding.oauth?.facebookAppId && nextOnboarding.oauth?.facebookAppSecret,
        ),
        whatsappConfigured: Boolean(nextOnboarding.whatsapp?.accessToken),
      },
    },
  });

  revalidatePath("/org/onboarding-settings");
  revalidatePath("/org/settings");
  revalidatePath("/org/campaigns");
}

export async function clearGoogleOnboardingSecret() {
  return clearOrgOnboardingSecrets("google");
}

export async function clearFacebookOnboardingSecret() {
  return clearOrgOnboardingSecrets("facebook");
}

export async function clearWhatsappOnboardingSecrets() {
  return clearOrgOnboardingSecrets("whatsapp");
}

async function clearOrgOnboardingSecrets(field: "google" | "facebook" | "whatsapp") {
  const session = await requireOrgAdmin();
  const orgId = session.user.organizationId!;

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error("Organization not found");

  const current = parseOrganizationSettings(org.settings);
  const prev = current.onboarding ?? {};

  let nextOnboarding: OrgOnboardingSettings = { ...prev };

  if (field === "google" && prev.oauth) {
    const { googleClientSecret: _removed, ...rest } = prev.oauth;
    nextOnboarding = { ...prev, oauth: { ...rest, googleClientSecret: undefined } };
  }

  if (field === "facebook" && prev.oauth) {
    const { facebookAppSecret: _removed, ...rest } = prev.oauth;
    nextOnboarding = { ...prev, oauth: { ...rest, facebookAppSecret: undefined } };
  }

  if (field === "whatsapp" && prev.whatsapp) {
    nextOnboarding = {
      ...prev,
      whatsapp: {
        ...prev.whatsapp,
        accessToken: undefined,
        appSecret: undefined,
      },
    };
  }

  await db.organization.update({
    where: { id: orgId },
    data: {
      settings: {
        ...current,
        onboarding: nextOnboarding,
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/org/onboarding-settings");
  revalidatePath("/org/settings");
}
