import { AiConfig } from '../libs/ai/config';
import { AdvisorInput, advisorInput, instructionRequest, urgentHazard, parseGuidance } from '../libs/ai/requirements';
import { HttpError } from '../libs/security/http';
import GeminiService, { GuidanceProvider } from './Gemini.service';
import AiQuotaService, { AiSubject, AiAllowance } from './AiQuota.service';
export type AdvisorReplyCode = 'AI_ANSWERED' | 'AI_CLARIFY' | 'AI_SAFETY' | 'AI_SCOPE_ONLY';
export interface AdvisorResult { replyCode: AdvisorReplyCode; answer: string; products: never[]; allowance?: AiAllowance; }
const local = {
  uz: {
    scope: 'Men maishiy texnikadan foydalanish, parvarish va xarid oldidan tushuntirish bo‘yicha yordam beraman. Shu mavzuda savol bering. Buyurtma yoki to‘lov bajarmayman.',
    gas: 'Texnikadan foydalanishni to‘xtating. Olov yoqmang va elektr kalitlari yoki jihozlarini yoqmang/o‘chirmang. Xavfsiz joyga chiqing; u yerdan mahalliy gaz yoki favqulodda xizmatga murojaat qiling. Sizib chiqishni o‘zingiz ta’mirlamang.',
    electrical: 'Texnikadan foydalanishni to‘xtating va undan uzoqlashing. Faqat xavfsiz bo‘lsa, elektr ta’minotini uzing; shikastlangan yoki ho‘l jihozga tegmang. Tutun yoki yong‘in xavfi bo‘lsa, xavfsiz joydan mahalliy favqulodda xizmatga murojaat qiling. Qayta yoqishdan oldin malakali ustaga tekshirtiring; korpusini ochib ta’mirlamang.',
  },
  ru: {
    scope: 'Я помогаю с использованием и уходом за бытовой техникой, а также объясняю, на что обратить внимание перед покупкой. Задайте вопрос об этом. Заказы и платежи я не выполняю.',
    gas: 'Прекратите пользоваться техникой. Не зажигайте огонь и не включайте и не выключайте электроприборы или выключатели. Выйдите в безопасное место и оттуда свяжитесь с местной газовой или экстренной службой. Не пытайтесь устранить утечку самостоятельно.',
    electrical: 'Прекратите пользоваться прибором и отойдите от него. Отключайте питание только если это безопасно; не касайтесь повреждённого или мокрого прибора. При дыме или угрозе пожара обратитесь в местную экстренную службу из безопасного места. До повторного включения нужен осмотр специалиста; не открывайте корпус для ремонта.',
  },
  en: {
    scope: 'I can help with home-appliance use, care and what to consider before buying. Please ask about those topics. I cannot place orders or make payments.',
    gas: 'Stop using the appliance. Do not use flames or operate electrical switches or appliances. Leave for a safe place and contact your local gas or emergency service from there. Do not attempt to repair the leak yourself.',
    electrical: 'Stop using the appliance and keep away. Disconnect power only if it is safe; do not touch damaged or wet equipment. If there is smoke or a fire risk, contact your local emergency service from a safe place. Have a qualified technician inspect it before using it again; do not open the housing to repair it.',
  },
};
export default class AdvisorService {
  constructor(private config: AiConfig, private provider: GuidanceProvider = new GeminiService(config), private quota = new AiQuotaService()) {}
  public status() { return { available: this.config.enabled && !!this.config.apiKey && !!this.config.model, guestDaily: this.config.guestDaily, memberDaily: this.config.memberDaily }; }
  public async ask(raw: unknown, subject: AiSubject): Promise<AdvisorResult> {
    const input: AdvisorInput = advisorInput(raw);
    if (!this.status().available) throw new HttpError(503, 'AI_UNAVAILABLE', 'The assistant is not configured.');
    let closed = false, timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + this.config.timeoutMs + 6000;
    const check = () => { if (closed || Date.now() >= deadline) throw new HttpError(504, 'AI_TIMEOUT', 'The assistant timed out.'); };
    const work = async (): Promise<AdvisorResult> => {
      const refusal = instructionRequest(input), hazard = urgentHazard(input);
      const allowance = await this.quota.reserve(subject, this.config, new Date(), !refusal && !hazard); check();
      if (hazard) return { replyCode: 'AI_SAFETY', answer: local[input.language][hazard], products: [], allowance };
      if (refusal) return { replyCode: 'AI_SCOPE_ONLY', answer: local[input.language].scope, products: [], allowance };
      const guidance = parseGuidance(await this.provider.reply(input, Math.max(1, Math.min(this.config.timeoutMs, deadline - Date.now())))); check();
      const code = { ANSWER: 'AI_ANSWERED', CLARIFY: 'AI_CLARIFY', SAFETY: 'AI_SAFETY', REFUSE: 'AI_SCOPE_ONLY' } as const;
      return { replyCode: code[guidance.kind], answer: guidance.answer, products: [], allowance };
    };
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { closed = true; reject(new HttpError(504, 'AI_TIMEOUT', 'The assistant timed out.')); }, this.config.timeoutMs + 6000); });
    try { return await Promise.race([work(), timeout]); }
    catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(503, 'AI_UNAVAILABLE', 'The assistant is temporarily unavailable.'); }
    finally { closed = true; if (timer) clearTimeout(timer); }
  }
}
