import type { ResolvedAiConfig } from "@/lib/ai/types";

export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiError";
  }
}

export async function completeChat(
  config: ResolvedAiConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  switch (config.provider) {
    case "openai":
    case "deepseek":
      return callOpenAiCompatible(config, systemPrompt, userPrompt, { json: true });
    case "anthropic":
      return callAnthropic(config, systemPrompt, userPrompt, { json: true });
    case "gemini":
      return callGemini(config, systemPrompt, userPrompt, { json: true });
    default:
      throw new AiError(`Unsupported provider: ${config.provider}`);
  }
}

export async function completeChatText(
  config: ResolvedAiConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  switch (config.provider) {
    case "openai":
    case "deepseek":
      return callOpenAiCompatible(config, systemPrompt, userPrompt, { json: false });
    case "anthropic":
      return callAnthropic(config, systemPrompt, userPrompt, { json: false });
    case "gemini":
      return callGemini(config, systemPrompt, userPrompt, { json: false });
    default:
      throw new AiError(`Unsupported provider: ${config.provider}`);
  }
}

function openAiBaseUrl(provider: ResolvedAiConfig["provider"]): string {
  if (provider === "deepseek") return "https://api.deepseek.com";
  return "https://api.openai.com";
}

async function callOpenAiCompatible(
  config: ResolvedAiConfig,
  systemPrompt: string,
  userPrompt: string,
  opts: { json: boolean },
): Promise<string> {
  const body: Record<string, unknown> = {
    model: config.model,
    temperature: opts.json ? 0.4 : 0.5,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  if (opts.json) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${openAiBaseUrl(config.provider)}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AiError(`${config.provider} error (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new AiError(`${config.provider} returned an empty response`);
  return content;
}

async function callAnthropic(
  config: ResolvedAiConfig,
  systemPrompt: string,
  userPrompt: string,
  opts: { json: boolean },
): Promise<string> {
  const system = opts.json
    ? `${systemPrompt}\n\nRespond with valid JSON only.`
    : systemPrompt;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: opts.json ? 2048 : 1024,
      temperature: opts.json ? 0.4 : 0.5,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AiError(`Anthropic error (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };

  const text = data.content?.find((c) => c.type === "text")?.text?.trim();
  if (!text) throw new AiError("Anthropic returned an empty response");

  if (!opts.json) return text;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch?.[0] ?? text;
}

async function callGemini(
  config: ResolvedAiConfig,
  systemPrompt: string,
  userPrompt: string,
  opts: { json: boolean },
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  const generationConfig: Record<string, unknown> = {
    temperature: opts.json ? 0.4 : 0.5,
  };
  if (opts.json) {
    generationConfig.responseMimeType = "application/json";
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AiError(`Gemini error (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new AiError("Gemini returned an empty response");
  return text;
}
