"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseOrgSettings } from "@/lib/ai/settings";
import { DEFAULT_MODELS, resolveModelSelection } from "@/lib/ai/types";
import type { AiProvider } from "@/lib/ai/types";
import { canAccessOrgPortal } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireOrgAdmin() {
  const session = await auth();
  if (!session?.user.organizationId) throw new Error("Unauthorized");
  if (!canAccessOrgPortal(session.user)) throw new Error("Forbidden");
  return session;
}

const aiSettingsSchema = z.object({
  provider: z.enum(["openai", "anthropic", "gemini", "deepseek"]),
  modelSelect: z.string().min(1),
  customModel: z.string().optional(),
  apiKey: z.string().optional(),
});

export async function updateOrgAiSettings(formData: FormData) {
  const session = await requireOrgAdmin();
  const orgId = session.user.organizationId!;

  const provider = formData.get("provider") as AiProvider;
  const parsed = aiSettingsSchema.parse({
    provider,
    modelSelect: formData.get("modelSelect"),
    customModel: (formData.get("customModel") as string)?.trim() || undefined,
    apiKey: (formData.get("apiKey") as string)?.trim() || undefined,
  });

  const model = resolveModelSelection(
    parsed.provider,
    parsed.modelSelect,
    parsed.customModel,
  );

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error("Organization not found");

  const current = parseOrgSettings(org.settings);
  const nextApiKey =
    parsed.apiKey && parsed.apiKey.length > 0
      ? parsed.apiKey
      : current.ai?.apiKey;

  await db.organization.update({
    where: { id: orgId },
    data: {
      settings: {
        ...current,
        ai: {
          provider: parsed.provider as AiProvider,
          model: model || DEFAULT_MODELS[parsed.provider as AiProvider],
          ...(nextApiKey ? { apiKey: nextApiKey } : {}),
        },
      },
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "ai.settings.updated",
      entityType: "Organization",
      entityId: orgId,
      details: {
        provider: parsed.provider,
        model,
        apiKeyUpdated: Boolean(parsed.apiKey),
      },
    },
  });

  revalidatePath("/org/ai-settings");
  revalidatePath("/org/settings");
}

export async function clearOrgAiApiKey() {
  const session = await requireOrgAdmin();
  const orgId = session.user.organizationId!;

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error("Organization not found");

  const current = parseOrgSettings(org.settings);
  if (!current.ai) return;

  const { apiKey: _removed, ...aiWithoutKey } = current.ai;

  await db.organization.update({
    where: { id: orgId },
    data: {
      settings: {
        ...current,
        ai: aiWithoutKey,
      },
    },
  });

  revalidatePath("/org/ai-settings");
  revalidatePath("/org/settings");
}
