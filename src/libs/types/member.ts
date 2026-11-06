import { Types } from "mongoose";
import { MemberStatus, MemberType } from "../enums/member.enum";
import { Request } from "express";
import { Session } from "express-session";

export interface Member {
  _id: Types.ObjectId;
  memberType: MemberType;
  memberStatus: MemberStatus;
  memberNick: string;
  memberPhone: string;
  memberPassword?: string;
  memberAddress?: string;
  memberDesc?: string;
  memberImage?: string;
  memberPoints: number;
  /** Internal token/session revocation version; never returned to the browser. */
  authVersion?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberInput {
  memberNick: string;
  memberPhone: string;
  memberPassword: string;
  memberAddress?: string;
  memberDesc?: string;
}

export interface LoginInput {
  memberNick: string;
  memberPassword: string;
}

export interface MemberUpdateInput {
  memberNick?: string;
  memberPhone?: string;
  memberAddress?: string;
  memberDesc?: string;
  /** Only assigned by validated server upload middleware. */
  memberImage?: string;
}

export interface AdminMemberUpdateInput {
  _id: string;
  memberStatus: MemberStatus;
}

export interface MemberListWithStats {
  users: Member[];
  total: number;
  activeCount: number;
  blockedCount: number;
  deletedCount: number;
}

export interface ExtendedRequest extends Request {
  member: Member;
  file: Express.Multer.File;
  files: Express.Multer.File[];
}

export interface AdminRequest extends Request {
  member: Member;
  session: Session & { memberId?: string; memberVersion?: number; csrfToken?: string };
  file: Express.Multer.File;
  files: Express.Multer.File[];
}
