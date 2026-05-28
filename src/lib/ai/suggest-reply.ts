import { completeChatText } from "@/lib/ai/client";
import { REPLY_SYSTEM_PROMPT, buildSuggestReplyPrompt } from "@/lib/ai/prompts";
import { resolveAiConfig } from "@/lib/ai/settings";

export async function suggestReplyWithAi(
  organizationId: string,
  input: Parameters<typeof buildSuggestReplyPrompt>[0],
): Promise<string> {
  const config = await resolveAiConfig(organizationId);
  if (!config) {
    throw new Error(
      "AI is not configured. Add an API key in Org Admin → AI Settings or set OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY on the server.",
    );
  }

  return completeChatText(config, REPLY_SYSTEM_PROMPT, buildSuggestReplyPrompt(input));
}
