import { HttpError } from '../security/http';
export interface AdvisorInput { language: 'uz' | 'ru' | 'en'; messages: string[]; }
export const guidanceKinds = ['ANSWER', 'CLARIFY', 'SAFETY', 'REFUSE'] as const;
export interface Guidance { kind: typeof guidanceKinds[number]; answer: string; }
export const invalidResponse = () => new HttpError(503, 'AI_RESPONSE_INVALID', 'The assistant response could not be used.');
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function advisorInput(value: unknown): AdvisorInput {
  if (!object(value) || Object.keys(value).some(key => !['language','messages'].includes(key)) ||
      !['uz','ru','en'].includes(value.language as string) || !Array.isArray(value.messages) || value.messages.length < 1 || value.messages.length > 4) {
    throw new HttpError(400, 'AI_INVALID_INPUT', 'Please check your question.');
  }
  const messages = value.messages.map(message => {
    if (typeof message !== 'string') throw new HttpError(400, 'AI_INVALID_INPUT', 'Please check your question.');
    const text = message.normalize('NFKC').trim();
    if (text.length < 2 || text.length > 600 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\p{Cf}]/u.test(text)) throw new HttpError(400, 'AI_INVALID_INPUT', 'Please use 2–600 characters per question.');
    return text;
  });
  if (messages.join('').length > 1600) throw new HttpError(400, 'AI_INVALID_INPUT', 'Please start a new conversation.');
  // Do not forward recognizable contact/card/credential data to a provider.
  if (messages.some(message => /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\+\d[\d ()-]{6,}\d|(?:\d[ -]?){13,19}|AIza[A-Za-z0-9_-]{20,}|mongodb(?:\+srv)?:\/\/|\b(?:password|parol|пароль)\s*[:=]/i.test(message))) {
    throw new HttpError(400, 'AI_PRIVATE_INPUT', 'Remove personal or secret information before asking.');
  }
  return { language: value.language as AdvisorInput['language'], messages };
}
export function instructionRequest(input: AdvisorInput): boolean {
  return input.messages.some(text => /ignore\s+(?:all\s+)?(?:previous|system|instructions)|system\s+prompt|reveal.{0,30}(?:secret|key|token)|oldingi.{0,30}ko.rsatma|tizim.{0,20}prompt|maxfiy.{0,20}kalit|игнорируй.{0,30}инструкц|системн.{0,20}промпт/i.test(text));
}

export const guidanceSchema = {
  type: 'object', additionalProperties: false,
  properties: { kind: { type: 'string', enum: guidanceKinds }, answer: { type: 'string', minLength: 2, maxLength: 3000 } },
  required: ['kind', 'answer'],
};
export function parseGuidance(value: unknown): Guidance {
  if (!object(value) || Object.keys(value).length !== 2 || !guidanceKinds.includes(value.kind as Guidance['kind']) ||
      typeof value.answer !== 'string' || value.answer.trim().length < 2 || value.answer.length > 3000 ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\p{Cf}]|<\/?[a-z][^>]*>|https?:\/\/|mongodb(?:\+srv)?:\/\//iu.test(value.answer)) throw invalidResponse();
  return { kind: value.kind as Guidance['kind'], answer: value.answer.trim() };
}
// Recognizable urgent hazards are handled locally so provider delay/failure cannot
// turn them into ordinary DIY advice. This is not an exhaustive hazard detector.
export function urgentHazard(input: AdvisorInput): 'gas' | 'electrical' | null {
  const text = input.messages[input.messages.length - 1];
  if (/(?:gas|gaz|газ).{0,24}(?:leak|smell|hid|siz|утеч|запах)|(?:smell|запах).{0,15}(?:gas|газ)/iu.test(text)) return 'gas';
  if (/sparks?|sparking|electric(?:al)? shock|burning smell|smoke|uchqun|tok ur|kuygan hid|tutun|искр|бь[её]т током|запах гари|дым/iu.test(text)) return 'electrical';
  return null;
}
