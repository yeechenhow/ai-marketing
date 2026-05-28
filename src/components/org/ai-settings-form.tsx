"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateOrgAiSettings, clearOrgAiApiKey } from "@/lib/actions/ai-settings";
import {
  AI_PROVIDERS,
  CUSTOM_MODEL_VALUE,
  DEFAULT_MODELS,
  getModelsForProvider,
  getProviderMeta,
  isKnownModel,
  type AiProvider,
} from "@/lib/ai/types";

export function OrgAiSettingsForm({
  provider: initialProvider,
  model: initialModel,
  hasApiKey,
  apiKeyMask,
}: {
  provider: AiProvider;
  model: string;
  hasApiKey: boolean;
  apiKeyMask: string;
}) {
  const [provider, setProvider] = useState<AiProvider>(initialProvider);
  const models = useMemo(() => getModelsForProvider(provider), [provider]);
  const providerMeta = useMemo(() => getProviderMeta(provider), [provider]);

  const initialIsCustom = !isKnownModel(initialProvider, initialModel);
  const [modelSelect, setModelSelect] = useState(
    initialIsCustom && initialProvider === provider
      ? CUSTOM_MODEL_VALUE
      : isKnownModel(provider, initialModel)
        ? initialModel
        : DEFAULT_MODELS[provider],
  );
  const [customModel, setCustomModel] = useState(
    initialIsCustom && initialProvider === provider ? initialModel : "",
  );

  function handleProviderChange(next: AiProvider) {
    setProvider(next);
    setModelSelect(DEFAULT_MODELS[next]);
    setCustomModel("");
  }

  const envKeys = AI_PROVIDERS.map((p) => p.envKey).join(", ");

  return (
    <div className="max-w-lg space-y-6">
      <form action={updateOrgAiSettings} className="space-y-4">
        <div>
          <label htmlFor="provider" className="mb-1 block text-sm font-medium text-slate-700">
            LLM provider
          </label>
          <select
            id="provider"
            name="provider"
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as AiProvider)}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            <a
              href={providerMeta.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:underline"
            >
              View {providerMeta.label} model docs
            </a>
          </p>
        </div>

        <div>
          <label htmlFor="model" className="mb-1 block text-sm font-medium text-slate-700">
            Model
          </label>
          <select
            id="model"
            name="modelSelect"
            value={modelSelect}
            onChange={(e) => setModelSelect(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
            <option value={CUSTOM_MODEL_VALUE}>Custom model ID…</option>
          </select>
          {modelSelect === CUSTOM_MODEL_VALUE && (
            <Input
              id="customModel"
              name="customModel"
              className="mt-2"
              placeholder="e.g. gpt-4.1-mini or gemini-3.5-flash"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              autoComplete="off"
            />
          )}
          <p className="mt-1 text-xs text-slate-500">
            Pick a curated model or choose Custom to enter any model ID from the provider docs.
          </p>
        </div>

        <div>
          <label htmlFor="apiKey" className="mb-1 block text-sm font-medium text-slate-700">
            API key
          </label>
          <Input
            id="apiKey"
            name="apiKey"
            type="password"
            placeholder={
              hasApiKey
                ? "Leave blank to keep current key"
                : `${providerMeta.apiKeyHint} (optional if set in server .env)`
            }
            autoComplete="off"
          />
          {hasApiKey && (
            <p className="mt-1 text-xs text-slate-500">Current key: {apiKeyMask}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Stored per organization. If empty, the server falls back to{" "}
            <code className="rounded bg-slate-100 px-1">{envKeys}</code> in{" "}
            <code className="rounded bg-slate-100 px-1">.env</code>.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Save AI settings</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/org/settings">Cancel</Link>
          </Button>
        </div>
      </form>

      {hasApiKey && (
        <form action={clearOrgAiApiKey}>
          <Button type="submit" variant="outline" size="sm">
            Remove org API key (use server .env fallback)
          </Button>
        </form>
      )}
    </div>
  );
}
