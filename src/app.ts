import type AdvisorService from "./models/Advisor.service";
import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import router from "./router";
import routerAdmin from "./router-admin";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import { rateLimit } from "express-rate-limit";
import { loadSecurityConfig, SecurityConfig } from "./libs/security/config";
import { csrfProtection, csrfToken } from "./libs/security/csrf";
import { HttpError, sendError } from "./libs/security/http";

interface AppOptions {
  config?: SecurityConfig;
  store: session.Store;
  advisor?: AdvisorService;
  isReady?: () => Promise<boolean>;
}

export default function createApp(options: AppOptions) {
  const config = options.config ?? loadSecurityConfig();
  const { store, isReady } = options;
  const app = express();
  app.locals.security = config;
  // Explicit dependency injection for isolated provider tests; default uses the real Gemini adapter.
  app.locals.advisor = options.advisor;
  app.disable('x-powered-by');
  if (config.trustProxyHops) app.set('trust proxy', config.trustProxyHops);
  // Container probes use internal HTTP and never need a session.
  app.get('/health', (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ status: 'ok' });
  });
  app.get('/ready', async (_req, res) => {
    let ready = false;
    try { ready = await isReady?.() ?? false; } catch { /* Dependency is unavailable. */ }
    res.set('Cache-Control', 'no-store').status(ready ? 200 : 503)
      .json({ status: ready ? 'ready' : 'unavailable' });
  });
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    if (config.production && !req.secure) return next(new HttpError(400, 'HTTPS_REQUIRED', 'HTTPS is required.'));
    next();
  });
  app.use(cors({ credentials: true, origin: (origin, done) => {
    if (!origin || config.origins.includes(origin)) return done(null, true);
    done(new HttpError(403, 'ORIGIN_DENIED', 'Origin is not allowed.'));
  }, allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Idempotency-Key'] }));
  app.use(express.static(path.join(__dirname, "public")));
  app.use('/uploads', (req, res, next) => {
    // Also block previously uploaded active content (SVG/HTML), not just new files.
    if (!/^\/(members|products)\/[^/]+\.(png|jpe?g)$/i.test(req.path)) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Not found.' });
    }
    next();
  }, express.static(path.resolve(config.uploadsRoot), { dotfiles: 'deny' }));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());
  // Log pathname, not request bodies or query strings containing private input.
  if (process.env.NODE_ENV !== 'test') app.use(morgan(':method :url :status', { skip: (req) => req.url.includes('?') }));
  app.use(session({ name: 'techhome.sid', secret: config.sessionSecret, store, resave: false,
    saveUninitialized: false, cookie: { httpOnly: true, secure: config.production, sameSite: 'lax', path: '/', maxAge: 6 * 3600 * 1000 } }));
  app.get('/member/csrf', (req, res) => res.set('Cache-Control', 'no-store').json({ csrfToken: csrfToken(req) }));
  app.use(csrfProtection(config));
  app.use((req, res, next) => {
    res.locals.member = null;
    // Admin HTML forms and ajax share the same synchronizer token.
    if (req.path.startsWith('/admin')) res.locals.csrfToken = csrfToken(req);
    next();
  });
  const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } });
  for (const route of ['/member/login', '/member/signup', '/admin/login']) app.post(route, loginLimit);
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
  app.use('/admin', routerAdmin);
  app.use('/', router);
  app.use((_req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Not found.' }));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => sendError(res, error));
  return app;
}
