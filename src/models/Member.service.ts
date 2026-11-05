import { LoginInput, Member, MemberInput, MemberListWithStats, MemberUpdateInput, AdminMemberUpdateInput } from "../libs/types/member";
import MemberModel from "../schema/Member.model";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { MemberStatus, MemberType } from "../libs/enums/member.enum";
import * as bcrypt from "bcryptjs"
import { shapeIntoMongooseObjectId } from "../libs/config";

import { credentials, profileFields, signupFields } from "../libs/security/member-input";
import { HttpError } from "../libs/security/http";

class MemberService {
  private readonly memberModel;

  constructor() { 
    this.memberModel = MemberModel;
  }

  /** SPA */

  public async getStore(): Promise<Member> {
    const result = await this.memberModel
      .findOne({ memberType: MemberType.STORE })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result;
  }

  public async signup(input: MemberInput): Promise<Member> {
    const fields = signupFields(input);
    const memberPassword = await bcrypt.hash(fields.memberPassword, 12);
    try {
      const result = await this.memberModel.create({ ...fields, memberPassword,
        memberType: MemberType.USER, memberStatus: MemberStatus.ACTIVE, memberPoints: 0, authVersion: 0 });
      const member = result.toJSON<Member>();
      delete member.memberPassword;
      return member;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === 11000) throw new HttpError(409, "ACCOUNT_EXISTS", "Username or phone number is already in use.");
      throw error;
    }
  }

  public async login(input: LoginInput): Promise<Member> {
    input = credentials(input as unknown as Record<string, unknown>);
    const member = await this.memberModel
      .findOne(
        {
          memberNick: input.memberNick,
          memberStatus: { $ne: MemberStatus.DELETE},
        }, // filter
        { memberNick: 1, memberPassword: 1, memberStatus: 1 } // projection
      )
      .exec();
    if (!member || !member.memberPassword) throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);
    else if (member.memberStatus === MemberStatus.BLOCK) {
      throw new Errors(HttpCode.FORBIDDEN, Message.BLOCKED_USER)
    }

    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword
    );

    if (!isMatch) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);
    }

    const result = await this.memberModel.findById(member._id).lean().exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }

  public async getMemberDetail(member: Member): Promise<Member> {
    const result = await this.memberModel.findOne({ _id: member._id, memberStatus: MemberStatus.ACTIVE }).exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

    return result;
  }

  public async updateMember(
    member: Member,
    input: MemberUpdateInput
  ): Promise<Member> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    const fields: MemberUpdateInput = profileFields(input as unknown as Record<string, unknown>);
    if (input.memberImage !== undefined) {
      if (!/^uploads\/members\/[a-f0-9-]+\.(png|jpg)$/.test(input.memberImage)) throw new HttpError(400, "INVALID_INPUT", "Invalid image.");
      fields.memberImage = input.memberImage;
    }
    if (!Object.keys(fields).length) throw new HttpError(400, "INVALID_INPUT", "No profile fields supplied.");
    const result = await this.memberModel
      .findByIdAndUpdate({ _id: memberId }, { $set: fields }, { new: true, runValidators: true })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);

    return result;
  }

  public async getAllUsers(): Promise<MemberListWithStats> {
    try {
      // Only ordinary customers belong on this list — the STORE account itself is excluded.
      const users: Member[] = await this.memberModel
    .find({ memberType: MemberType.USER })
    .lean<Member[]>()
    .exec();

      const total = users.length;
      const activeCount = users.filter((u) => u.memberStatus === MemberStatus.ACTIVE).length;
      const blockedCount = users.filter((u) => u.memberStatus === MemberStatus.BLOCK).length;
      const deletedCount = users.filter((u) => u.memberStatus === MemberStatus.DELETE).length;

      return { users, total, activeCount, blockedCount, deletedCount };
    } catch {

      throw new Errors(HttpCode.BAD_REQUEST, Message.NO_DATA_FOUND);
    }
  }

  /** Only used by the explicit bootstrap CLI, never an HTTP route. */
  public async bootstrapStore(input: MemberInput): Promise<Member> {
    if (await this.memberModel.findOne({ memberType: MemberType.STORE }).exec()) {
      throw new HttpError(409, "STORE_EXISTS", "A store account already exists.");
    }
    const fields = signupFields(input);
    const memberPassword = await bcrypt.hash(fields.memberPassword, 12);
    const result = await this.memberModel.create({ ...fields, memberPassword, memberType: MemberType.STORE,
      memberStatus: MemberStatus.ACTIVE, memberPoints: 0, authVersion: 0 });
    const member = result.toJSON<Member>();
    delete member.memberPassword;
    return member;
  }

  public async processLogin(input: LoginInput): Promise<Member> {
    const member = await this.login(input);
    if (member.memberType !== MemberType.STORE) throw new Errors(HttpCode.FORBIDDEN, Message.NOT_ALLOWED_REQUEST);
    return member;
  }

  public async getAuthenticatedMember(id: string, version: number): Promise<Member> {
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    const member = await this.memberModel.findById(id).exec();
    if (!member || member.memberStatus !== MemberStatus.ACTIVE || (member.authVersion ?? 0) !== version) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    }
    return member;
  }

  public async revokeSessions(member: Member): Promise<void> {
    await this.memberModel.updateOne({ _id: member._id }, { $inc: { authVersion: 1 } }).exec();
  }

  public async getUsers(): Promise<Member[]> {
    const result = await this.memberModel
      .find({ memberType: MemberType.USER })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

     return result;
  }

  public async updateChosenUser(input: AdminMemberUpdateInput): Promise<Member> {
    if (!/^[a-f0-9]{24}$/i.test(String(input._id)) || !Object.values(MemberStatus).includes(input.memberStatus!)) throw new HttpError(400, "INVALID_INPUT", "Invalid account status.");
    const result = await this.memberModel.findOneAndUpdate(
      { _id: shapeIntoMongooseObjectId(input._id), memberType: MemberType.USER },
      { $set: { memberStatus: input.memberStatus }, $inc: { authVersion: 1 } },
      { new: true, runValidators: true }).exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);

     return result;
  }
}


export default MemberService;
