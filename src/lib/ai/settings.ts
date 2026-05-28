import { db } from "@/lib/db";
import type { AiProvider, OrgAiSettings, ResolvedAiConfig } from "@/lib/ai/types";
import { AI_PROVIDERS, DEFAULT_MODELS } from "@/lib/ai/types";

type OrgSettingsJson = {
  ai?: OrgAiSettings;
};

const ENV_KEYS: Record<AiProvider, string> = Object.fromEntries(
  AI_PROVIDERS.map((p) => [p.id, p.envKey]),
) as Record<AiProvider, string>;

function envApiKey(provider: AiProvider): string | undefined {
  const key = ENV_KEYS[provider];
  return process.env[key]?.trim() || undefined;
}

function detectProviderFromEnv(): AiProvider | undefined {
  for (const provider of AI_PROVIDERS) {
    if (envApiKey(provider.id)) return provider.id;
  }
  return undefined;
}

export function parseOrgSettings(raw: unknown): OrgSettingsJson {
  if (!raw || typeof raw !== "object") return {};
  return raw as OrgSettingsJson;
}

export function maskApiKey(apiKey?: string): string {
  if (!apiKey) return "Not configured";
  if (apiKey.length <= 8) return "••••••••";
  return `${apiKey.slice(0, 3)}••••${apiKey.slice(-4)}`;
}

export async function getOrgAiSettings(
  organizationId: string,
): Promise<OrgAiSettings | null> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  if (!org) return null;
  return parseOrgSettings(org.settings).ai ?? null;
}

export async function resolveAiConfig(
  organizationId: string,
): Promise<ResolvedAiConfig | null> {
  const orgAi = await getOrgAiSettings(organizationId);

  if (orgAi?.apiKey) {
    return {
      provider: orgAi.provider,
      model: orgAi.model || DEFAULT_MODELS[orgAi.provider],
      apiKey: orgAi.apiKey,
      source: "organization",
    };
  }

  const provider =
    (orgAi?.provider as AiProvider | undefined) ??
    (process.env.AI_DEFAULT_PROVIDER as AiProvider | undefined) ??
    detectProviderFromEnv();

  if (!provider) return null;

  const apiKey = envApiKey(provider);
  if (!apiKey) return null;

  return {
    provider,
    model:
      orgAi?.model ||
      process.env.AI_DEFAULT_MODEL ||
      DEFAULT_MODELS[provider],
    apiKey,
    source: "environment",
  };
}

export function getPublicAiSettings(orgAi: OrgAiSettings | null) {
  const provider = orgAi?.provider ?? "openai";
  return {
    provider,
    model: orgAi?.model ?? DEFAULT_MODELS[provider],
    hasApiKey: Boolean(orgAi?.apiKey),
    apiKeyMask: maskApiKey(orgAi?.apiKey),
  };
}

export function getEnvKeyList(): string[] {
  return AI_PROVIDERS.map((p) => p.envKey);
}
