export interface AiConfig {
  enabled: boolean; apiKey: string; model: string; timeoutMs: number; maxOutputTokens: number;
  guestDaily: number; memberDaily: number; providerDaily: number;
}
export function loadAiConfig(env = process.env): AiConfig {
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(env[key] ?? fallback);
    if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Invalid ${key} configuration.`);
    return value;
  };
  const model = env.GEMINI_MODEL?.trim() ?? '';
  if (model && !/^gemini-[a-z0-9.-]{1,80}$/.test(model)) throw new Error('Invalid GEMINI_MODEL configuration.');
  if (env.AI_ENABLED && !['true','false'].includes(env.AI_ENABLED)) throw new Error('Invalid AI_ENABLED configuration.');
  return { enabled: env.AI_ENABLED === 'true', apiKey: env.GEMINI_API_KEY?.trim() ?? '', model,
    timeoutMs: integer('AI_TIMEOUT_MS', 30000, 100, 30000), maxOutputTokens: integer('AI_MAX_OUTPUT_TOKENS', 768, 256, 1536),
    guestDaily: integer('AI_GUEST_DAILY_LIMIT', 10, 1, 100), memberDaily: integer('AI_MEMBER_DAILY_LIMIT', 30, 1, 1000), providerDaily: integer('AI_PROVIDER_DAILY_LIMIT', 100, 1, 10000) };
}
