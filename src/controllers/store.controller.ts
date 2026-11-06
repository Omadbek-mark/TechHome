import { createHash, timingSafeEqual } from "node:crypto";
import {NextFunction, Request, Response} from "express";
import { T } from "../libs/types/common";
import MemberService from "../models/Member.service";
import { AdminRequest, LoginInput } from "../libs/types/member";
import { MemberType } from "../libs/enums/member.enum";
import Errors, { HttpCode } from "../libs/Errors";
import ProductService from "../models/Product.service";

import { csrfToken, regenerateSession } from "../libs/security/csrf";
import { safeMember } from "../libs/security/member-input";
import { authCookie } from "../libs/security/config";
import { sendError, HttpError } from "../libs/security/http";

const memberService = new MemberService();
const productService = new ProductService();

const storeController: T = {};
async function restoreStore(req: AdminRequest, res: Response) {
  if (!req.session.memberId) throw new HttpError(401, 'UNAUTHENTICATED', 'Please log in.');
  const member = await memberService.getAuthenticatedMember(req.session.memberId, req.session.memberVersion ?? -1);
  if (member.memberType !== MemberType.STORE) throw new HttpError(403, 'FORBIDDEN', 'Store access is required.');
  req.member = member;
  res.locals.member = safeMember(member);
  res.set('Cache-Control', 'no-store');
}

// Public Home/login still restore an existing admin session before rendering navigation.
storeController.retrieveStore = async (req: AdminRequest, res: Response, next: NextFunction) => {
  if (!req.session.memberId) return next();
  try { await restoreStore(req, res); next(); }
  catch (error) {
    const status = error instanceof HttpError ? error.status : error instanceof Errors ? error.code : undefined;
    if (status === 401 || status === 403) {
      delete req.session.memberId; delete req.session.memberVersion;
      return next();
    }
    sendError(res, error);
  }
};

storeController.goHome = (_req: Request, res: Response) => {
  try {

    res.render("home");
  } catch {

    res.redirect("/admin");

  }
};


storeController.getLogin = (req: AdminRequest, res: Response) => {
  try {
    if (req.member) return res.redirect('/admin');

    res.render("login");
  } catch {

    res.redirect("/admin");
  }
};


storeController.getSignup = async (_req: Request, res: Response) => {
  try {
    const exists = await memberService.hasStore();
    const message = exists ? 'An admin account already exists.' :
      process.env.ADMIN_SETUP_CODE ? undefined : 'Admin signup setup is unavailable. Contact the server operator.';
    res.set('Cache-Control', 'no-store').render('signup', { message, showForm: !message });
  } catch (error) { sendError(res, error); }
};

storeController.processSignup = async (req: Request, res: Response) => {
  try {
    if (await memberService.hasStore()) throw new HttpError(409, 'STORE_EXISTS', 'An admin account already exists.');
    const expected = process.env.ADMIN_SETUP_CODE;
    if (!expected) throw new HttpError(503, 'SETUP_DISABLED', 'Admin signup setup is unavailable. Contact the server operator.');
    const provided = req.body?.setupCode;
    const digest = (value: string) => createHash('sha256').update(value).digest();
    if (typeof provided !== 'string' || provided.length > 256 || !timingSafeEqual(digest(provided), digest(expected))) {
      throw new HttpError(403, 'INVALID_SETUP_CODE', 'The setup code is incorrect.');
    }
    await memberService.bootstrapStore(req.body);
    res.redirect(303, '/admin/login');
  } catch (error) {
    if (!(error instanceof HttpError)) return sendError(res, error);
    res.set('Cache-Control', 'no-store').status(error.status).render('signup', {
      message: error.message,
      showForm: error.code !== 'STORE_EXISTS' && error.code !== 'SETUP_DISABLED',
    });
  }
};

storeController.processLogin = async (req: AdminRequest, res: Response) => {
  try {
    const result = await memberService.processLogin(req.body as LoginInput);
    await regenerateSession(req);
    req.session.memberId = String(result._id);
    req.session.memberVersion = result.authVersion ?? 0;
    csrfToken(req);
    await new Promise<void>((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
    res.redirect('/admin/product/all');
  } catch (error) { sendError(res, error); }
};

storeController.logout = async (req: AdminRequest, res: Response) => {
  try {
    // Destroy only the authenticated admin session; the browser JWT is separate.
    await new Promise<void>((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
    res.clearCookie('techhome.sid', { ...authCookie(req.app.locals.security), maxAge: undefined });
    res.redirect('/admin/login');
  } catch (error) { sendError(res, error); }
};

storeController.getUsers = async (req: AdminRequest, res: Response) => {
  try {

    const { users, total, activeCount, blockedCount, deletedCount } =
      await memberService.getAllUsers();

    res.render("users", {
      member: safeMember(req.member),
      users,
      total,
      activeCount,
      blockedCount,
      deletedCount,
    });
  } catch {

    res.redirect("/admin/login");
  }
};

storeController.getAllProducts = async (req: AdminRequest, res: Response) => {
  try {

    const { products, total, activeCount, pausedCount, deletedCount, lowStockCount } =
      await productService.getAllProducts();
 
    res.render("products", {
      member: safeMember(req.member),
      products,
      total,
      activeCount,
      pausedCount,
      deletedCount,
      lowStockCount,
    });
  } catch {

    res.redirect("/admin/login");
  }
};

storeController.updateChosenUser = async (req: Request, res: Response) => {
  try {

    const result = await memberService.updateChosenUser(req.body);

    res.status(HttpCode.OK).json({ data: safeMember(result) });
  } catch (error) { sendError(res, error); }
};

storeController.checkAuthSession = (req: AdminRequest, res: Response) => {
  res.set('Cache-Control', 'no-store').json({ member: safeMember(req.member) });
};

storeController.verifyStore = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    await restoreStore(req, res);
    next();
  } catch (error) { sendError(res, error); }
};
export default storeController;
