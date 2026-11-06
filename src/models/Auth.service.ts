import { AUTH_TIMER } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { Member } from "../libs/types/member";
import jwt from "jsonwebtoken";
import MemberService from "./Member.service";

class AuthService {
  private readonly memberService = new MemberService();

  private secret(): string {
    const secret = process.env.SECRET_TOKEN;
    if (!secret || secret.length < 32) throw new Error("SECRET_TOKEN must contain at least 32 characters.");
    return secret;
  }

  public async createToken(member: Member): Promise<string> {
    return jwt.sign({ version: member.authVersion ?? 0 }, this.secret(), {
      subject: String(member._id), algorithm: "HS256", expiresIn: AUTH_TIMER * 3600,
      issuer: "techhome", audience: "techhome-web",
    });
  }

  public async checkAuth(token: string): Promise<Member> {
    let claims: jwt.JwtPayload;
    try {
      const result = jwt.verify(token, this.secret(), { algorithms: ["HS256"], issuer: "techhome", audience: "techhome-web" });
      if (typeof result === 'string' || typeof result.sub !== 'string' || !Number.isInteger(result.version)) throw new Error('Invalid claims');
      claims = result;
    } catch {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    }
    // Read current role/status/version, never trust a cached JWT role.
    return this.memberService.getAuthenticatedMember(claims.sub!, claims.version);
  }
}
export default AuthService;
