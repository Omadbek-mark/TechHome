import { randomBytes, timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import { SecurityConfig } from "./config";
import { HttpError } from "./http";

declare module "express-session" {
  interface SessionData { csrfToken?: string; memberId?: string; memberVersion?: number; }
}

export function csrfToken(req: Request): string {
  return req.session.csrfToken ?? (req.session.csrfToken = randomBytes(32).toString("hex"));
}

export function csrfProtection(config: SecurityConfig) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    let origin = req.get("origin");
    if (!origin && req.get("referer")) {
      try { origin = new URL(req.get("referer")!).origin; } catch { /* invalid origin */ }
    }
    const sent = req.get("x-csrf-token") ?? req.body?._csrf;
    const expected = req.session.csrfToken;
    if (!origin || !config.origins.includes(origin) || typeof sent !== "string" ||
        !/^[a-f0-9]{64}$/.test(sent) || !expected ||
        !timingSafeEqual(Buffer.from(sent, "hex"), Buffer.from(expected, "hex"))) {
      return next(new HttpError(403, "CSRF_INVALID", "Please refresh the page and try again."));
    }
    next();
  };
}

export async function regenerateSession(req: Request): Promise<void> {
  await new Promise<void>((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
}
