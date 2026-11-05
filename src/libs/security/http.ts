import { Request, Response } from "express";
import Errors, { Message } from "../Errors";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

// Legacy services keep their HTTP status internally; clients receive stable string codes.
const legacyCodes: Record<Message, string> = {
  [Message.SOMETHING_WENT_WRONG]: 'INTERNAL_ERROR', [Message.NO_DATA_FOUND]: 'RESOURCE_NOT_FOUND',
  [Message.CREATE_FAILED]: 'CREATE_FAILED', [Message.UPDATE_FAILED]: 'UPDATE_FAILED',
  [Message.USED_NICK_PHONE]: 'ACCOUNT_EXISTS', [Message.TOKEN_CREATION_FAILED]: 'INTERNAL_ERROR',
  [Message.NO_MEMBER_NICK]: 'INVALID_CREDENTIALS', [Message.BLOCKED_USER]: 'ACCOUNT_BLOCKED',
  [Message.WRONG_PASSWORD]: 'INVALID_CREDENTIALS', [Message.NOT_AUTHENTICATED]: 'UNAUTHENTICATED',
  [Message.NOT_ALLOWED_REQUEST]: 'FORBIDDEN',
};
export function sendError(res: Response, error: unknown): void {
  res.set('Cache-Control', 'no-store');
  if (error instanceof HttpError) {
    res.status(error.status).json({ code: error.code, message: error.message });
  } else if (error instanceof Errors) {
    // 304 cannot carry a JSON error body. Failed mutations use a conflict response.
    res.status(error.code === 304 ? 409 : error.code).json({ code: legacyCodes[error.message] ?? 'REQUEST_FAILED', message: error.message });
  } else if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.parse.failed') {
    res.status(400).json({ code: 'INVALID_JSON', message: 'Please check the request format.' });
  } else if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {
    res.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'The request is too large.' });
  } else if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    res.status(409).json({ code: 'DUPLICATE_VALUE', message: 'This value is already in use.' });
  } else if (error instanceof Error && error.name === 'ValidationError') {
    res.status(400).json({ code: 'VALIDATION_FAILED', message: 'Please check your details.' });
  } else {
    // Never expose raw DB/validation errors, stack traces or submitted values.
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Unable to complete the request.' });
  }
}

export function requestMember(req: Request) {
  return (req as Request & { member?: import("../types/member").Member }).member;
}
