export type AiProvider = "openai" | "anthropic" | "gemini" | "deepseek";

export type AiModelOption = {
  value: string;
  label: string;
  tier?: "fast" | "balanced" | "quality" | "legacy" | "preview";
};

export type AiProviderMeta = {
  id: AiProvider;
  label: string;
  envKey: string;
  apiKeyHint: string;
  docsUrl: string;
};

export type OrgAiSettings = {
  provider: AiProvider;
  model: string;
  apiKey?: string;
};

export type ResolvedAiConfig = {
  provider: AiProvider;
  model: string;
  apiKey: string;
  source: "organization" | "environment";
};

export type GeneratedProspectProfile = {
  personaType: string;
  decisionStyle: string;
  urgencyScore: number;
  trustScore: number;
  budgetSensitivity: number;
  communicationPref: string;
  dealReadiness: string;
  confidenceScore: number;
  conversionProb: number;
  nextAction: string;
  summary?: string;
};

/** Curated model lists — update here when providers ship new models. */
export const AI_PROVIDERS: AiProviderMeta[] = [
  {
    id: "openai",
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    apiKeyHint: "sk-...",
    docsUrl: "https://platform.openai.com/docs/models",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    apiKeyHint: "sk-ant-...",
    docsUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    apiKeyHint: "AIza...",
    docsUrl: "https://ai.google.dev/gemini-api/docs/models",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    envKey: "DEEPSEEK_API_KEY",
    apiKeyHint: "sk-...",
    docsUrl: "https://api-docs.deepseek.com/",
  },
];

export const OPENAI_MODELS: AiModelOption[] = [
  { value: "gpt-4.1-nano", label: "GPT-4.1 Nano (fastest, lowest cost)", tier: "fast" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini (fast, lower cost)", tier: "fast" },
  { value: "gpt-4.1", label: "GPT-4.1 (higher quality)", tier: "quality" },
  { value: "gpt-4o-mini", label: "GPT-4o mini (legacy, popular)", tier: "legacy" },
  { value: "gpt-4o", label: "GPT-4o (legacy)", tier: "legacy" },
  { value: "o4-mini", label: "o4-mini (reasoning)", tier: "balanced" },
];

export const ANTHROPIC_MODELS: AiModelOption[] = [
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (fast)", tier: "fast" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (balanced)", tier: "balanced" },
  { value: "claude-opus-4-7", label: "Claude Opus 4.7 (highest quality)", tier: "quality" },
  { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku (legacy)", tier: "legacy" },
  { value: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet (legacy)", tier: "legacy" },
];

export const GEMINI_MODELS: AiModelOption[] = [
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash (GA, recommended)", tier: "fast" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (legacy fast)", tier: "legacy" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (legacy quality)", tier: "legacy" },
  { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", tier: "preview" },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", tier: "preview" },
];

export const DEEPSEEK_MODELS: AiModelOption[] = [
  { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash (fast, recommended)", tier: "fast" },
  { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro (reasoning & coding)", tier: "quality" },
  { value: "deepseek-chat", label: "deepseek-chat (legacy → V4 Flash, retires Jul 2026)", tier: "legacy" },
  { value: "deepseek-reasoner", label: "deepseek-reasoner (legacy thinking, retires Jul 2026)", tier: "legacy" },
];

export const MODELS_BY_PROVIDER: Record<AiProvider, AiModelOption[]> = {
  openai: OPENAI_MODELS,
  anthropic: ANTHROPIC_MODELS,
  gemini: GEMINI_MODELS,
  deepseek: DEEPSEEK_MODELS,
};

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-6",
  gemini: "gemini-3.5-flash",
  deepseek: "deepseek-v4-flash",
};

export const CUSTOM_MODEL_VALUE = "__custom__";

export function getProviderMeta(provider: AiProvider): AiProviderMeta {
  return AI_PROVIDERS.find((p) => p.id === provider) ?? AI_PROVIDERS[0];
}

export function getModelsForProvider(provider: AiProvider): AiModelOption[] {
  return MODELS_BY_PROVIDER[provider];
}

export function isKnownModel(provider: AiProvider, model: string): boolean {
  return getModelsForProvider(provider).some((m) => m.value === model);
}

export function resolveModelSelection(
  provider: AiProvider,
  modelSelect: string,
  customModel?: string,
): string {
  if (modelSelect === CUSTOM_MODEL_VALUE) {
    const trimmed = customModel?.trim();
    if (!trimmed) throw new Error("Enter a custom model ID");
    return trimmed;
  }
  return modelSelect || DEFAULT_MODELS[provider];
}
