import { CookieOptions } from "express";

export interface SecurityConfig {
  production: boolean;
  origins: string[];
  sessionSecret: string;
  trustProxyHops: number;
  uploadsRoot: string;
}

export function loadSecurityConfig(env = process.env): SecurityConfig {
  const production = env.NODE_ENV === "production";
  const sessionSecret = env.SESSION_SECRET ?? "";
  if (sessionSecret.length < 32 || (env.SECRET_TOKEN?.length ?? 0) < 32) {
    throw new Error("SESSION_SECRET and SECRET_TOKEN must each contain at least 32 characters.");
  }
  const input = env.WEB_ORIGINS ?? (production ? "" : "http://localhost:3000,http://127.0.0.1:3000");
  const apiOrigin = env.API_ORIGIN ?? (production ? "" : "http://localhost:3002");
  if (!input || !apiOrigin) throw new Error("WEB_ORIGINS and API_ORIGIN are required in production.");
  const origins = [...new Set([...input.split(","), apiOrigin, ...(!production ? ["http://127.0.0.1:3002"] : [])].map((value) => {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash || (production && url.protocol !== 'https:')) {
      throw new Error("Allowed origins must be plain origins; production requires HTTPS.");
    }
    return url.origin;
  }))];
  const trustProxyHops = Number(env.TRUST_PROXY_HOPS ?? (production ? 1 : 0));
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 2) {
    throw new Error("TRUST_PROXY_HOPS must be 0, 1 or 2.");
  }
  return { production, origins, sessionSecret, trustProxyHops, uploadsRoot: env.UPLOADS_ROOT ?? "./uploads" };
}

export function authCookie(config: SecurityConfig): CookieOptions {
  return { httpOnly: true, secure: config.production, sameSite: "lax", path: "/", maxAge: 24 * 3600 * 1000 };
}
