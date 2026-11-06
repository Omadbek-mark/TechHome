import { HttpError } from "./http";
import { Member, MemberInput } from "../types/member";

function field(value: unknown, max: number, required = false): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim()) || /[\u0000-\u001f]/.test(value)) {
    throw new HttpError(400, "INVALID_INPUT", "Please check your details.");
  }
  return value.trim();
}

export function credentials(input: Record<string, unknown>, signup = false) {
  // Existing accounts may have spaces or punctuation. Signup rules must not block login.
  const memberNick = field(input?.memberNick, signup ? 40 : 256, true)!;
  const password = input?.memberPassword;
  if ((signup && (!/^[\p{L}\p{N}_.-]+$/u.test(memberNick) || memberNick.length < 3)) ||
      typeof password !== 'string' || password.length < (signup ? 8 : 1) || Buffer.byteLength(password) > 72) {
    throw new HttpError(400, "INVALID_INPUT", "Please check your username and password.");
  }
  return { memberNick, memberPassword: password };
}

export function profileFields(input: Record<string, unknown>) {
  const result: { memberNick?: string; memberPhone?: string; memberAddress?: string; memberDesc?: string } = {};
  for (const [name, max] of Object.entries({ memberNick: 40, memberPhone: 24, memberAddress: 300, memberDesc: 1000 })) {
    // Missing fields are allowed on partial profile updates.
    if (input?.[name] === undefined) continue;
    const value = field(input[name], max, name === 'memberNick' || name === 'memberPhone');
    if (name === 'memberNick' && !/^[\p{L}\p{N}_.-]{3,40}$/u.test(value!)) throw new HttpError(400, 'INVALID_INPUT', 'Please check your username.');
    if (name === 'memberPhone' && !/^[+\d() -]{7,24}$/.test(value!)) throw new HttpError(400, 'INVALID_INPUT', 'Please check your phone number.');
    Object.assign(result, { [name]: value });
  }
  return result;
}

export function signupFields(input: MemberInput) {
  const login = credentials(input as unknown as Record<string, unknown>, true);
  const profile = profileFields(input as unknown as Record<string, unknown>);
  if (!profile.memberPhone) throw new HttpError(400, 'INVALID_INPUT', 'Phone number is required.');
  return { ...profile, ...login, memberPhone: profile.memberPhone };
}

export function safeMember(member: Member) {
  return {
    _id: member._id, memberNick: member.memberNick, memberPhone: member.memberPhone,
    memberType: member.memberType, memberStatus: member.memberStatus, memberPoints: member.memberPoints,
    memberAddress: member.memberAddress, memberDesc: member.memberDesc, memberImage: member.memberImage,
    createdAt: member.createdAt, updatedAt: member.updatedAt,
  };
}
