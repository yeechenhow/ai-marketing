import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { OAuthProfile } from "@/lib/onboarding/oauth";
import { verifyOnboardingToken } from "@/lib/onboarding/token";

export async function linkSocialIdentityToProspect(
  onboardingToken: string,
  profile: OAuthProfile,
  consented: boolean,
) {
  const tokenPayload = verifyOnboardingToken(onboardingToken);

  const prospect = await db.prospect.findFirst({
    where: {
      id: tokenPayload.prospectId,
      organizationId: tokenPayload.organizationId,
    },
  });

  if (!prospect) {
    throw new Error("Prospect not found for this registration link");
  }

  if (!consented) {
    throw new Error("Social profile analysis consent is required");
  }

  const email = profile.email?.trim().toLowerCase();
  if (email) {
    const emailConflict = await db.prospect.findFirst({
      where: {
        organizationId: tokenPayload.organizationId,
        email,
        NOT: { id: prospect.id },
      },
    });
    if (emailConflict) {
      throw new Error("This email is already linked to another contact in this organization");
    }
  }

  const updatedProspect = await db.prospect.update({
    where: { id: prospect.id },
    data: {
      email: email ?? prospect.email,
      firstName: profile.firstName ?? prospect.firstName,
      lastName: profile.lastName ?? prospect.lastName,
      location:
        typeof profile.rawPayload.location === "object" &&
        profile.rawPayload.location &&
        "name" in (profile.rawPayload.location as object)
          ? String((profile.rawPayload.location as { name?: string }).name)
          : prospect.location,
      socialLinks: {
        ...(typeof prospect.socialLinks === "object" && prospect.socialLinks
          ? (prospect.socialLinks as Record<string, unknown>)
          : {}),
        [profile.platform.toLowerCase()]: {
          uid: profile.platformUid,
          picture: profile.picture,
        },
      } as Prisma.InputJsonValue,
      registrationCompletedAt: new Date(),
      lastTouchAt: new Date(),
    },
  });

  await db.socialIdentity.upsert({
    where: {
      prospectId_platformName: {
        prospectId: prospect.id,
        platformName: profile.platform,
      },
    },
    create: {
      prospectId: prospect.id,
      platformName: profile.platform,
      platformUid: profile.platformUid,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
      tokenExpiresAt: profile.expiresAt,
      rawPayload: profile.rawPayload as Prisma.InputJsonValue,
    },
    update: {
      platformUid: profile.platformUid,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
      tokenExpiresAt: profile.expiresAt,
      rawPayload: profile.rawPayload as Prisma.InputJsonValue,
    },
  });

  const existingSocialProfile = await db.socialProfile.findFirst({
    where: { prospectId: prospect.id, platform: profile.platform.toLowerCase() },
  });

  if (existingSocialProfile) {
    await db.socialProfile.update({
      where: { id: existingSocialProfile.id },
      data: {
        handle: profile.platformUid,
        profileUrl: profile.picture,
        signals: {
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          bio:
            typeof profile.rawPayload.about === "string" ? profile.rawPayload.about : undefined,
          location:
            typeof profile.rawPayload.location === "object"
              ? profile.rawPayload.location
              : undefined,
        },
      },
    });
  } else {
    await db.socialProfile.create({
      data: {
        prospectId: prospect.id,
        platform: profile.platform.toLowerCase(),
        handle: profile.platformUid,
        profileUrl: profile.picture,
        signals: {
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          bio:
            typeof profile.rawPayload.about === "string" ? profile.rawPayload.about : undefined,
          location:
            typeof profile.rawPayload.location === "object"
              ? profile.rawPayload.location
              : undefined,
        },
      },
    });
  }

  await db.consentRecord.create({
    data: {
      prospectId: prospect.id,
      type: "DATA_ENRICHMENT",
      granted: true,
      channel: "WHATSAPP",
      metadata: {
        platform: profile.platform,
        consentedAt: new Date().toISOString(),
        purpose: "Customer 360 social profile analysis",
      },
    },
  });

  await db.enrichmentRecord.create({
    data: {
      prospectId: prospect.id,
      source: profile.platform.toLowerCase(),
      data: profile.rawPayload as Prisma.InputJsonValue,
    },
  });

  await db.activity.create({
    data: {
      prospectId: prospect.id,
      type: "SYSTEM",
      title: "Social registration completed",
      body: `Linked ${profile.platform} account${profile.email ? ` (${profile.email})` : ""}`,
      metadata: {
        platform: profile.platform,
        platformUid: profile.platformUid,
      },
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: tokenPayload.organizationId,
      action: "onboarding.social.linked",
      entityType: "Prospect",
      entityId: prospect.id,
      details: {
        platform: profile.platform,
        platformUid: profile.platformUid,
        email: profile.email,
      },
    },
  });

  try {
    const { generateProfileForProspectId } = await import(
      "@/lib/onboarding/generate-profile-for-prospect"
    );
    await generateProfileForProspectId(prospect.id, tokenPayload.organizationId);
  } catch (error) {
    console.error("[onboarding] auto profile generation failed:", error);
  }

  return updatedProspect;
}
