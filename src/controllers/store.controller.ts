import {NextFunction, Request, Response} from "express";
import { T } from "../libs/types/common";
import MemberService from "../models/Member.service";
import { AdminRequest, LoginInput } from "../libs/types/member";
import { MemberType } from "../libs/enums/member.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
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

storeController.goHome = (req: Request, res: Response) => {
  try {
    console.log('goHome');
    res.render("home");
    // send | json | redirect | end | render
  } catch (err) {
    console.log("Error, goHome:", err);
    res.redirect("/admin");

  }
};


storeController.getLogin = (req: AdminRequest, res: Response) => {
  try {
    if (req.member) return res.redirect('/admin');
    console.log('getLogin');
    res.render("login");
  } catch (err) {
    console.log("Error, getLogin:", err);
    res.redirect("/admin");
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
    console.log('getUsers');
    const { users, total, activeCount, blockedCount, deletedCount } =
      await memberService.getAllUsers();   // ← eski memberService.getUsers() o'rniga

    res.render("users", {
      member: safeMember(req.member),   // ← endi member ham uzatiladi
      users,
      total,
      activeCount,
      blockedCount,
      deletedCount,
    });
  } catch (err) {
    console.log("Error, getUsers:", err);
    res.redirect("/admin/login");
  }
};

storeController.getAllProducts = async (req: AdminRequest, res: Response) => {
  try {
    console.log('getAllItems');
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
  } catch (err) {
    console.log("Error, getAllProducts:", err);
    res.redirect("/admin/login");
  }
};

storeController.updateChosenUser = async (req: Request, res: Response) => {
  try {
    console.log('updateChosenUser');
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
