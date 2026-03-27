/** Anthropic client wrapper — falls back to mock when no API key */

import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (client) return client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  client = new Anthropic({ apiKey: key });
  return client;
}

export function isLive(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function callClaude(opts: {
  model: "opus" | "sonnet" | "haiku";
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const modelMap = {
    opus: "claude-opus-4-6",
    sonnet: "claude-sonnet-4-6",
    haiku: "claude-haiku-4-5-20251001",
  } as const;

  const ai = getClient();
  if (!ai) {
    throw new Error("ANTHROPIC_API_KEY not set — pipeline running in mock mode");
  }

  const response = await ai.messages.create({
    model: modelMap[opts.model],
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}

export async function callClaudeJSON<T>(opts: {
  model: "opus" | "sonnet" | "haiku";
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<T> {
  const text = await callClaude(opts);
  // Extract JSON from response (may be wrapped in markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = jsonMatch[1]?.trim() ?? text.trim();
  return JSON.parse(jsonStr);
}
