import { NextFunction, Request, Response } from "express";
import MemberService from "../models/Member.service";
import AuthService from "../models/Auth.service";
import { ExtendedRequest, MemberUpdateInput } from "../libs/types/member";
import { T } from "../libs/types/common";
import { authCookie, SecurityConfig } from "../libs/security/config";
import { csrfToken, regenerateSession } from "../libs/security/csrf";
import { safeMember } from "../libs/security/member-input";
import { HttpError, sendError } from "../libs/security/http";

const memberService = new MemberService();
const authService = new AuthService();
const memberController: T = {};

memberController.getStore = async (_req: Request, res: Response) => {
  try {
    const member = await memberService.getStore();
    res.json({ _id: member._id, memberNick: member.memberNick, memberImage: member.memberImage, memberDesc: member.memberDesc });
  } catch (error) { sendError(res, error); }
};

for (const action of ["signup", "login"] as const) {
  memberController[action] = async (req: Request, res: Response) => {
    try {
      const member = await memberService[action](req.body);
      const token = await authService.createToken(member);
      await regenerateSession(req);
      const nextCsrfToken = csrfToken(req);
      res.cookie("accessToken", token, authCookie(req.app.locals.security as SecurityConfig));
      res.set("Cache-Control", "no-store").status(action === "signup" ? 201 : 200)
        .json({ member: safeMember(member), csrfToken: nextCsrfToken });
    } catch (error) { sendError(res, error); }
  };
}

memberController.logout = async (req: Request, res: Response) => {
  const options = authCookie(req.app.locals.security);
  res.clearCookie("accessToken", { ...options, maxAge: undefined });
  try {
    if (req.cookies.accessToken) {
      let member;
      try { member = await authService.checkAuth(req.cookies.accessToken); }
      catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 401)) throw error;
      }
      if (member) await memberService.revokeSessions(member);
    }
    await new Promise<void>((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
    res.clearCookie("techhome.sid", { ...options, maxAge: undefined });
    res.set("Cache-Control", "no-store").json({ logout: true });
  } catch (error) { sendError(res, error); }
};

memberController.getMemberDetail = (req: ExtendedRequest, res: Response) => {
  res.set("Cache-Control", "no-store").json(safeMember(req.member));
};

memberController.updateMember = async (req: ExtendedRequest, res: Response) => {
  try {
    // Image paths can only come from the validated upload middleware.
    const { memberNick, memberPhone, memberAddress, memberDesc } = req.body;
    const input: MemberUpdateInput = { memberNick, memberPhone, memberAddress, memberDesc };
    if (req.file) input.memberImage = req.file.path;
    const member = await memberService.updateMember(req.member, input);
    res.locals.uploadCommitted = true;
    res.set("Cache-Control", "no-store").json(safeMember(member));
  } catch (error) { sendError(res, error); }
};

memberController.verifyAuth = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.cookies.accessToken) throw new HttpError(401, "UNAUTHENTICATED", "Please log in.");
    req.member = await authService.checkAuth(req.cookies.accessToken);
    next();
  } catch (error) { sendError(res, error); }
};

memberController.retrieveAuth = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.cookies.accessToken) req.member = await authService.checkAuth(req.cookies.accessToken);
    next();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 401) return next();
    sendError(res, error);
  }
};
export default memberController;
