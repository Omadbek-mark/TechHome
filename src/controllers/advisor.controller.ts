import { Request, Response } from 'express';
import AdvisorService from '../models/Advisor.service';
import { loadAiConfig } from '../libs/ai/config';
import { HttpError, requestMember, sendError } from '../libs/security/http';
function service(req: Request): AdvisorService {
  try { return req.app.locals.advisor ?? new AdvisorService(loadAiConfig()); }
  catch { throw new HttpError(503, 'AI_UNAVAILABLE', 'The advisor is unavailable. Please use the catalog.'); }
}
export const advisorStatus = (req: Request, res: Response) => {
  try { res.set('Cache-Control','no-store').json(service(req).status()); }
  catch (error) { sendError(res, error); }
};
export const askAdvisor = async (req: Request, res: Response) => {
  try {
    const member = requestMember(req);
    res.set('Cache-Control','no-store').json(await service(req).ask(req.body, { memberId: member ? String(member._id) : undefined,
      ip: req.ip ?? req.socket.remoteAddress ?? '', hashSecret: req.app.locals.security.sessionSecret }));
  } catch (error) {
    if (error instanceof HttpError && error.code === 'AI_LIMIT_REACHED') {
      const reset = new Date(); reset.setUTCHours(24,0,0,0);
      res.set('Retry-After', String(Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 1000))));
    }
    sendError(res, error);
  }
};
